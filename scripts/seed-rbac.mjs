import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;

const client = new Client({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false' 
    ? { rejectUnauthorized: false } 
    : undefined
});

await client.connect();

try {
  // 14 Roles from RBAC design
  const roles = [
    { slug: 'admin', name: 'Admin' },
    { slug: 'ops_lead', name: 'Ops Lead' },
    { slug: 'scheduler', name: 'Scheduler' },
    { slug: 'field_ops', name: 'Field Ops' },
    { slug: 'project_manager', name: 'Project Manager' },
    { slug: 'client_guest', name: 'Client Guest' },
    { slug: 'contributor', name: 'Contributor' },
    { slug: 'accounting', name: 'Accounting' },
    { slug: 'viewer', name: 'Viewer' },
    { slug: 'inventory_manager', name: 'Inventory Manager' },
    { slug: 'trainer', name: 'Trainer' },
    { slug: 'office_admin', name: 'Office Admin' },
    { slug: 'estimator', name: 'Estimator' },
    { slug: 'subcontractor', name: 'Subcontractor' },
  ];

  // Comprehensive permission set based on RBAC matrix
  const permissions = [
    // Projects
    { code: 'projects:read', description: 'View projects' },
    { code: 'projects:read_assigned', description: 'View assigned projects only' },
    { code: 'projects:read_shared', description: 'View shared projects only' },
    { code: 'projects:create', description: 'Create projects' },
    { code: 'projects:edit', description: 'Edit projects' },
    { code: 'projects:edit_own', description: 'Edit own projects only' },
    { code: 'projects:delete', description: 'Delete projects' },
    
    // Tasks
    { code: 'tasks:read', description: 'View all tasks' },
    { code: 'tasks:read_shared', description: 'View shared tasks only' },
    { code: 'tasks:create', description: 'Create tasks' },
    { code: 'tasks:edit', description: 'Edit tasks' },
    { code: 'tasks:edit_own', description: 'Edit own tasks' },
    { code: 'tasks:edit_estimates', description: 'Edit estimate tasks only' },
    { code: 'tasks:assign', description: 'Assign tasks' },
    { code: 'tasks:complete', description: 'Complete tasks' },
    { code: 'tasks:complete_assigned', description: 'Complete assigned tasks only' },
    { code: 'tasks:delete', description: 'Delete tasks' },
    
    // Comments
    { code: 'comments:read', description: 'View comments' },
    { code: 'comments:write', description: 'Write comments' },
    { code: 'comments:write_optional', description: 'Write comments (optional)' },
    
    // Attachments
    { code: 'attachments:upload', description: 'Upload attachments' },
    { code: 'attachments:upload_optional', description: 'Upload attachments (optional)' },
    
    // Scheduling
    { code: 'scheduling:limited', description: 'Limited scheduling access' },
    { code: 'scheduling:full', description: 'Full scheduling access' },
    { code: 'scheduling:update_timing', description: 'Update task timing' },
    
    // Archive
    { code: 'archive:own', description: 'Archive own items' },
    { code: 'archive:batch', description: 'Batch archive' },
    { code: 'archive:timing', description: 'Archive timing-related items' },
    
    // Delete
    { code: 'delete:batch', description: 'Batch delete' },
    
    // Role Management
    { code: 'role_management:full', description: 'Full role management' },
  ];

  console.log('Inserting roles...');
  for (const r of roles) {
    await client.query(
      'INSERT INTO roles (slug, name) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING',
      [r.slug, r.name]
    );
  }

  console.log('Inserting permissions...');
  for (const p of permissions) {
    await client.query(
      'INSERT INTO permissions (code, description) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING',
      [p.code, p.description]
    );
  }

  const { rows: roleRows } = await client.query('SELECT id, slug FROM roles');
  const { rows: permRows } = await client.query('SELECT id, code FROM permissions');
  
  const bySlug = Object.fromEntries(roleRows.map(r => [r.slug, r.id]));
  const byCode = Object.fromEntries(permRows.map(p => [p.code, p.id]));

  async function grant(slug, codes) {
    const roleId = bySlug[slug];
    if (!roleId) {
      console.warn(`Role ${slug} not found`);
      return;
    }
    
    for (const code of codes) {
      const permissionId = byCode[code];
      if (!permissionId) {
        console.warn(`Permission ${code} not found`);
        continue;
      }
      
      await client.query(
        'INSERT INTO role_permissions(role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [roleId, permissionId]
      );
    }
  }

  console.log('Granting permissions to roles...');
  
  // Admin - Full access to everything
  await grant('admin', permRows.map(p => p.code));
  
  // Ops Lead - batch archive, upload attachments, write comments, read projects, limited scheduling, create/edit/assign tasks
  await grant('ops_lead', [
    'projects:read',
    'tasks:create', 'tasks:edit', 'tasks:assign',
    'comments:write',
    'attachments:upload',
    'scheduling:limited',
    'archive:batch'
  ]);
  
  // Scheduler - read projects, full scheduling, assign/update timing
  await grant('scheduler', [
    'projects:read',
    'tasks:read', 'tasks:assign', 'scheduling:update_timing',
    'scheduling:full',
    'archive:timing'
  ]);
  
  // Field Ops - upload attachments, write comments, read assigned projects, create/edit/assign field scope tasks
  await grant('field_ops', [
    'projects:read_assigned',
    'tasks:create', 'tasks:edit', 'tasks:assign',
    'comments:write',
    'attachments:upload'
  ]);
  
  // Project Manager - upload attachments, write comments, create/edit own projects, own project archive, create/edit/assign own tasks
  await grant('project_manager', [
    'projects:create', 'projects:edit_own',
    'tasks:create', 'tasks:edit', 'tasks:assign',
    'comments:write',
    'attachments:upload',
    'archive:own'
  ]);
  
  // Client Guest - read shared projects/tasks, optional comments/attachments
  await grant('client_guest', [
    'projects:read_shared',
    'tasks:read_shared',
    'comments:write_optional',
    'attachments:upload_optional'
  ]);
  
  // Contributor - upload attachments, write comments, read assigned projects, create/edit own+team tasks
  await grant('contributor', [
    'projects:read_assigned',
    'tasks:create', 'tasks:edit_own',
    'comments:write',
    'attachments:upload'
  ]);
  
  // Accounting - upload attachments, write comments, read projects, read tasks
  await grant('accounting', [
    'projects:read',
    'tasks:read',
    'comments:write',
    'attachments:upload'
  ]);
  
  // Viewer - read projects, read tasks
  await grant('viewer', [
    'projects:read',
    'tasks:read'
  ]);
  
  // Inventory Manager - write comments, read tasks
  await grant('inventory_manager', [
    'tasks:read',
    'comments:write'
  ]);
  
  // Trainer - upload attachments, write comments, read projects, read tasks
  await grant('trainer', [
    'projects:read',
    'tasks:read',
    'comments:write',
    'attachments:upload'
  ]);
  
  // Office Admin - create/edit projects, archive, upload attachments, write comments, create/edit/assign tasks
  await grant('office_admin', [
    'projects:create', 'projects:edit',
    'tasks:create', 'tasks:edit', 'tasks:assign',
    'comments:write',
    'attachments:upload',
    'archive:batch'
  ]);
  
  // Estimator - upload attachments, write comments, read projects, create/edit estimates
  await grant('estimator', [
    'projects:read',
    'tasks:create', 'tasks:edit_estimates',
    'comments:write',
    'attachments:upload'
  ]);
  
  // Subcontractor - read assigned projects, read/complete assigned tasks, write comments, upload attachments
  await grant('subcontractor', [
    'projects:read_assigned',
    'tasks:read', 'tasks:complete_assigned',
    'comments:write',
    'attachments:upload'
  ]);

  console.log('✅ RBAC seed complete.');
  
  const { rows: stats } = await client.query(`
    SELECT 
      (SELECT COUNT(*) FROM roles) as role_count,
      (SELECT COUNT(*) FROM permissions) as perm_count,
      (SELECT COUNT(*) FROM role_permissions) as role_perm_count
  `);
  
  console.log(`📊 Stats: ${stats[0].role_count} roles, ${stats[0].perm_count} permissions, ${stats[0].role_perm_count} role-permission assignments`);

} catch (error) {
  console.error('❌ RBAC seed failed:', error);
  process.exit(1);
} finally {
  await client.end();
}
