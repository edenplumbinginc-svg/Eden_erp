import fs from 'fs';
import { Client } from 'pg';

const url = process.env.DATABASE_URL;
if (!url) { console.error('❌ No DATABASE_URL set'); process.exit(2); }

const CANDIDATE_CA_PATHS = [
  '/etc/ssl/certs/ca-certificates.crt',   // Debian/Ubuntu (commonly present on Replit)
  '/etc/ssl/cert.pem',                    // macOS-style
  '/etc/pki/tls/certs/ca-bundle.crt',     // RHEL/CentOS
  '/etc/ssl/ca-bundle.pem'                // fallback
];

let caPath = CANDIDATE_CA_PATHS.find(p => { try { fs.accessSync(p); return true; } catch { return false; } });
let ca;
if (caPath) {
  ca = fs.readFileSync(caPath, 'utf8');
  console.log('🔐 Using CA bundle:', caPath);
} else {
  console.warn('⚠️  No system CA bundle found; strict TLS may fail.');
}

const sslStrict = ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true };

(async () => {
  const c = new Client({ connectionString: url, ssl: sslStrict });
  try {
    await c.connect();
    const r = await c.query('select current_user as user, current_database() as db, now() as ts');
    console.log('✅ POOLER (strict TLS):', r.rows[0]);
    process.exit(0);
  } catch (e) {
    console.error('❌ POOLER (strict TLS):', e.message);
    process.exit(1);
  } finally {
    try { await c.end(); } catch {}
  }
})();
