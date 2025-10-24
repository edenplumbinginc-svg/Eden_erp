// lib/health.js - Active Layer: Resilience/Health
const os = require("os");

/**
 * Build health check function
 * @param {Object} config - Configuration object
 * @param {Object} config.pool - PostgreSQL pool instance (pg.Pool)
 * @returns {Function} Async health check function
 */
function buildHealth({ pool }) {
  return async function getHealth() {
    const started = Date.now();

    // --- DB probe ---
    let db_ok = true;
    let db_ms = null;
    try {
      const t0 = Date.now();
      // Simple round trip query using pg.Pool
      await pool.query("SELECT 1");
      db_ms = Date.now() - t0;
    } catch (e) {
      db_ok = false;
    }

    // --- Resources ---
    const mu = process.memoryUsage();
    const rss_mb = +(mu.rss / 1024 / 1024).toFixed(1);
    const heap_mb = +(mu.heapUsed / 1024 / 1024).toFixed(1);
    const load1 = +os.loadavg()[0].toFixed(2);

    const status = db_ok ? "ok" : "degraded";

    return {
      status,
      checks: {
        db: { ok: db_ok, ms: db_ms },
      },
      env: process.env.SENTRY_ENV || process.env.NODE_ENV || "dev",
      version: process.env.RELEASE_SHA || "dev",
      build_time: process.env.BUILD_TIME || null,
      uptime_s: Math.floor(process.uptime()),
      resources: { rss_mb, heap_mb, load1 },
      latency_ms: Date.now() - started,
    };
  };
}

module.exports = { buildHealth };
