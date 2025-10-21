import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function seedTasksPermissions() {
  try {
    await client.connect();
    console.log('🔌 Connected to database');

    const perms = [
      ['tasks:read', 'Read tasks'],
      ['tasks:write', 'Create/update/delete tasks'],
      ['tasks:manage', 'Manage task settings & admin actions'],
    ];

    console.log('📝 Seeding tasks:* permissions...');
    for (const [code, description] of perms) {
      await client.query(
        `INSERT INTO permissions (code, description) VALUES ($1, $2)
         ON CONFLICT (code) DO NOTHING`,
        [code, description]
      );
      console.log(`   ✓ ${code}`);
    }

    async function grant(slug, codes) {
      const { rows: [role] } = await client.query(
        `SELECT id FROM roles WHERE slug = $1`,
        [slug]
      );
      if (!role) {
        console.log(`   ⚠️  Role '${slug}' not found, skipping`);
        return;
      }
      
      for (const code of codes) {
        const { rows: [perm] } = await client.query(
          `SELECT id FROM permissions WHERE code = $1`,
          [code]
        );
        if (!perm) continue;
        
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [role.id, perm.id]
        );
      }
    }

    console.log('🔐 Granting permissions to roles...');
    await grant('admin', ['tasks:read', 'tasks:write', 'tasks:manage']);
    console.log('   ✓ admin → read, write, manage');
    
    await grant('viewer', ['tasks:read']);
    console.log('   ✓ viewer → read');
    
    await grant('ops', ['tasks:read', 'tasks:write']);
    console.log('   ✓ ops → read, write');
    
    await grant('coord', ['tasks:read', 'tasks:write']);
    console.log('   ✓ coord → read, write');
    
    for (const slug of ['estimator', 'procurement', 'hr', 'marketing']) {
      await grant(slug, ['tasks:read']);
      console.log(`   ✓ ${slug} → read`);
    }

    const { rows: [counts] } = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM permissions WHERE code LIKE 'tasks:%') AS task_perms,
        (SELECT COUNT(*) FROM role_permissions rp 
         JOIN permissions p ON p.id = rp.permission_id 
         WHERE p.code LIKE 'tasks:%') AS grants
    `);

    console.log('\n✅ Tasks permissions seeded successfully');
    console.log(`   📊 ${counts.task_perms} permissions created`);
    console.log(`   📊 ${counts.grants} role grants configured`);

  } catch (error) {
    console.error('❌ Error seeding tasks permissions:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedTasksPermissions();
