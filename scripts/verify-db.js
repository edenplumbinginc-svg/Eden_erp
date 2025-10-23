require('dotenv').config();

function die(msg) { console.error(`❌ ${msg}`); process.exit(1); }
function warn(msg) { console.warn(`⚠️  ${msg}`); }

if (!process.env.DATABASE_URL) die('DATABASE_URL missing');

const url = new URL(process.env.DATABASE_URL);
console.log(`🔍 DATABASE_URL host: ${url.host}`);
const expectedHost = process.env.EXPECTED_DB_HOST;
const expectedRef  = process.env.EXPECTED_DB_PROJECT_REF;

const ref = (url.username || '').replace(/^postgres\./, '');
const hostOk = url.host === expectedHost;
const refOk = !expectedRef || ref === expectedRef;

const isAws0 = /aws-0-.*\.pooler\.supabase\.com/.test(url.host);
const isAws1 = /aws-1-.*\.pooler\.supabase\.com/.test(url.host);
const isSupabasePooler = isAws0 || isAws1;
const isSupabaseDirect = /^db\.[a-z]+\.supabase\.co/.test(url.host);
const isSupabase = isSupabasePooler || isSupabaseDirect;

if (!isSupabase) {
  die(`Host ${url.host} is not a Supabase database. Eden ERP requires Supabase (pooler or direct connection).`);
}

if (isAws1) {
  warn(`Using transaction pooler (aws-1). Session pooler (aws-0) is recommended for better compatibility.`);
  warn(`To fix: In Supabase dashboard, switch Connection Pooling mode from "Transaction" to "Session" (aws-0)`);
}

if (expectedHost && !hostOk) {
  die(`Host mismatch. Expected ${expectedHost} got ${url.host}`);
}

if (expectedRef && !refOk) {
  die(`Project ref mismatch. Expected ${expectedRef} got ${ref || '(none)'}`);
}

let connectionType;
if (isAws0) {
  connectionType = 'Supabase Session Pooler (aws-0) ✅ OPTIMAL';
} else if (isAws1) {
  connectionType = 'Supabase Transaction Pooler (aws-1) ⚠️';
} else if (isSupabaseDirect) {
  connectionType = 'Supabase Direct Connection';
} else {
  connectionType = 'Unknown Supabase connection';
}

console.log(`✅ DB checks passed: host=${url.host}, ref=${ref || '(n/a)'}, type=${connectionType}`);
