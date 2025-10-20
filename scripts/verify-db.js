require('dotenv').config({ override: true });

function die(msg) { console.error(`❌ ${msg}`); process.exit(1); }
function warn(msg) { console.warn(`⚠️  ${msg}`); }

if (!process.env.DATABASE_URL) die('DATABASE_URL missing');

const url = new URL(process.env.DATABASE_URL);
const expectedHost = process.env.EXPECTED_DB_HOST;
const expectedRef  = process.env.EXPECTED_DB_PROJECT_REF;

const ref = (url.username || '').replace(/^postgres\./, '');
const hostOk = url.host === expectedHost;
const refOk = !expectedRef || ref === expectedRef;

const isAws0 = /aws-0-.*\.pooler\.supabase\.com:5432$/.test(url.host);
const isAws1 = /aws-1-.*\.pooler\.supabase\.com:5432$/.test(url.host);
const isSupabasePooler = isAws0 || isAws1;

if (!isSupabasePooler) {
  die(`Host ${url.host} is not a Supabase pooler (expected aws-0 or aws-1 ...pooler.supabase.com:5432)`);
}

if (isAws1) {
  warn(`Using transaction pooler (aws-1). Session pooler (aws-0) is recommended for better compatibility.`);
  warn(`To fix: Update DATABASE_URL to use aws-0-us-east-2.pooler.supabase.com instead of aws-1`);
}

if (expectedHost && !hostOk) {
  die(`Host mismatch. Expected ${expectedHost} got ${url.host}`);
}

if (expectedRef && !refOk) {
  die(`Project ref mismatch. Expected ${expectedRef} got ${ref || '(none)'}`);
}

const poolerType = isAws0 ? 'session (aws-0)' : 'transaction (aws-1)';
console.log(`✅ DB checks passed: host=${url.host}, ref=${ref || '(n/a)'}, pooler=${poolerType}`);
