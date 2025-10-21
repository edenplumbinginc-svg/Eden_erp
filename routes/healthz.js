// routes/healthz.js
// Self-contained health check with configurable TLS
const { Client } = require('pg');

async function healthz(req, res) {
  const started = Date.now();

  // Strict TLS by default; flip to relaxed only if you set HEALTH_TLS_RELAX=1
  const strict = process.env.HEALTH_TLS_RELAX !== "1";
  const ssl = strict ? { rejectUnauthorized: true } : { rejectUnauthorized: false };

  const client = new Client({ 
    connectionString: process.env.DATABASE_URL, 
    ssl 
  });

  try {
    await client.connect();
    const r = await client.query("SELECT 1 as ok, now() as ts");
    const ms = Date.now() - started;
    
    return res.status(200).json({
      status: "ok",
      db: "up",
      tls: strict ? "strict" : "relaxed",
      latency_ms: ms,
      ts: r.rows[0].ts
    });
  } catch (e) {
    const ms = Date.now() - started;
    return res.status(503).json({
      status: "degraded",
      db: "error",
      tls: strict ? "strict" : "relaxed",
      latency_ms: ms,
      error: e.message,
      code: e.code
    });
  } finally {
    try { 
      await client.end(); 
    } catch {}
  }
}

module.exports = { healthz };
