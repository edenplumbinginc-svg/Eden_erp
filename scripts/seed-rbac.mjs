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
  const baseRoles = [
    { slug: 'admin', name: 'Administrator' },
    { slug: 'ops', name: 'Operations' },
    { slug: 'estimator', name: 'Estimator' },
    { slug: 'procurement', name: 'Procurement' },
    { slug: 'coord', name: 'Coordination' },
    { slug: 'hr', name: 'HR' },
    { slug: 'viewer', name: 'Read-Only Viewer' },
  ];

  const modules = [
    'estimation', 'precon', 'projects', 'procurement', 'coord', 'hr', 'marketing', 'admin'
  ];
  const actions = ['read', 'write', 'manage'];

  const perms = [];
  for (const m of modules) {
    for (const a of actions) {
      perms.push({
        code: `${m}:${a}`,
        description: `${m} -> ${a}`
      });
    }
  }

  console.log('Inserting roles...');
  for (const r of baseRoles) {
    await client.query(
      'INSERT INTO roles (slug, name) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING',
      [r.slug, r.name]
    );
  }

  console.log('Inserting permissions...');
  for (const p of perms) {
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
  
  await grant('admin', permRows.map(p => p.code));
  
  await grant('viewer', permRows.filter(p => p.code.endsWith(':read')).map(p => p.code));
  
  await grant('estimator', ['estimation:read', 'estimation:write']);
  
  await grant('procurement', ['procurement:read', 'procurement:write']);
  
  await grant('ops', ['projects:read', 'projects:write']);
  
  await grant('coord', ['coord:read', 'coord:write']);
  
  await grant('hr', ['hr:read', 'hr:write']);

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
