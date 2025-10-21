import { Client } from 'pg';

const url = process.env.DATABASE_URL;
if (!url) { console.error('❌ No DATABASE_URL set'); process.exit(2); }

async function run(label, ssl) {
  const c = new Client({ connectionString: url, ssl });
  try {
    await c.connect();
    const r = await c.query('select current_user as user, current_database() as db, now() as ts');
    console.log(`✅ ${label}:`, r.rows[0]);
  } catch (e) {
    console.error(`❌ ${label}:`, e.message);
  } finally {
    try { await c.end(); } catch {}
  }
}

await run('POOLER (relaxed TLS)', { rejectUnauthorized: false });  // prove auth + routing first
