import fs from 'fs';
import { Client } from 'pg';
const url = process.env.DATABASE_URL;
const ca  = fs.readFileSync('./direct-chain.pem', 'utf8');
(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: true, ca } });
  try {
    await c.connect();
    const r = await c.query('select current_user as user, current_database() as db, now() as ts');
    console.log('✅ DIRECT (strict TLS, pinned):', r.rows[0]);
  } catch (e) {
    console.error('❌ DIRECT (strict TLS, pinned):', e.message);
    process.exit(1);
  } finally {
    try { await c.end(); } catch {}
  }
})();
