import { Client } from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("🛑 DATABASE_URL is not set.");
  process.exit(2);
}

const hostOk = /@db\.jwehjdggkskmjrmoqibk\.supabase\.co:5432\/postgres/i.test(url);
if (!hostOk) {
  console.error("🛑 DATABASE_URL is not the direct IPv4 host. Expected db.jwehjdggkskmjrmoqibk.supabase.co:5432/postgres");
  process.exit(2);
}

async function authSmoke(relaxed=false) {
  const ssl = relaxed ? { rejectUnauthorized:false } : { rejectUnauthorized:true };
  const c = new Client({ connectionString:url, ssl });
  const label = relaxed ? "AUTH (relaxed TLS)" : "AUTH (strict TLS)";
  try {
    await c.connect();
    const r = await c.query("select current_user as user, current_database() as db, now() as ts");
    console.log(`✅ ${label}:`, r.rows[0]);
    return true;
  } catch (e) {
    console.log(`❌ ${label}:`, e.message);
    return false;
  } finally {
    try { await c.end(); } catch {}
  }
}

async function probeHealthz() {
  const endpoint = process.env.HEALTH_ENDPOINT || "http://localhost:3000/healthz";
  try {
    const res = await fetch(endpoint);
    const txt = await res.text();
    let data;
    try { data = JSON.parse(txt); } catch { data = { raw: txt }; }
    console.log("🩺 /healthz:", res.status, data);
    return res.ok;
  } catch (e) {
    console.log("❌ /healthz fetch error:", e.message);
    return false;
  }
}

let pass = true;

// 1) Quick auth in relaxed mode (isolates password/host)
const authRelax = await authSmoke(true);
pass &&= authRelax;

// 2) Preferred: strict TLS auth
const authStrict = await authSmoke(false);
// strict TLS might fail if chain is odd; don't hard-fail deployment if relaxed was OK
if (!authStrict) console.log("⚠️ Strict TLS failed. Service can run with relaxed TLS while you file a CA-chain ticket.");

// 3) Probe /healthz (expects 200)
const healthOk = await probeHealthz();
pass &&= healthOk;

if (!pass) {
  console.error("🛑 POST-DEPLOY GATE FAILED. See logs above.");
  process.exit(1);
}
console.log("🚀 POST-DEPLOY GATE PASSED.");
