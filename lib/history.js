const DEFAULTS = {
  everyMs: +(process.env.HISTORY_SNAPSHOT_SEC || 30) * 1000,
  retentionDays: +(process.env.HISTORY_RETENTION_DAYS || 14),
  batchMax: 500,
};

function rowsFromSnapshot(snap) {
  const out = [];
  const env = snap.env || process.env.SENTRY_ENV || process.env.NODE_ENV || "dev";
  const ts = new Date(snap.generated_at || new Date().toISOString());
  const rel = process.env.RELEASE_SHA || null;
  const bld = process.env.BUILD_TIME || null;

  for (const [route, wins] of Object.entries(snap.routes || {})) {
    const w = wins["1m"] || {};
    if (!w || !Number.isFinite(w.rps)) continue;
    if (!w.count || w.count <= 0) continue;
    out.push({
      ts,
      env,
      route,
      rps: w.rps,
      p50_ms: w.p50_ms ?? null,
      p95_ms: w.p95_ms ?? null,
      err_rate_pct: w.err_rate ?? 0,
      samples_1m: w.count ?? 0,
      release_sha: rel,
      build_time: bld,
    });
  }
  return out;
}

async function insertBatch(pool, rows) {
  if (!rows.length) return;
  const text = `
    INSERT INTO velocity_metrics
      (ts, env, route, rps, p50_ms, p95_ms, err_rate_pct, samples_1m, release_sha, build_time)
    VALUES ${rows.map((_, i) =>
      `($${i*10+1}, $${i*10+2}, $${i*10+3}, $${i*10+4}, $${i*10+5}, $${i*10+6}, $${i*10+7}, $${i*10+8}, $${i*10+9}, $${i*10+10})`
    ).join(",")}
  `;
  const values = rows.flatMap(r => [
    r.ts, r.env, r.route, r.rps, r.p50_ms, r.p95_ms, r.err_rate_pct, r.samples_1m, r.release_sha, r.build_time
  ]);
  await pool.query(text, values);
}

async function pruneOld(pool, retentionDays) {
  await pool.query(`DELETE FROM velocity_metrics WHERE ts < now() - ($1 || ' days')::interval`, [retentionDays]);
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function makeHistory({ pool, metrics, logger = console, cfg = {} }) {
  const opts = { ...DEFAULTS, ...cfg };
  let running = false;

  async function tick() {
    if (running) return;
    running = true;
    try {
      const snap = metrics.snapshot();
      const rows = rowsFromSnapshot(snap).slice(0, opts.batchMax);
      if (rows.length) {
        for (const part of chunk(rows, 100)) {
          await insertBatch(pool, part);
        }
        logger.info?.({ count: rows.length }, "velocity_history_inserted");
      }
      const m = new Date().getMinutes();
      if (m % 60 === 0) {
        await pruneOld(pool, opts.retentionDays);
        logger.info?.({ days: opts.retentionDays }, "velocity_history_pruned");
      }
    } catch (e) {
      logger.error?.({ err: String(e) }, "velocity_history_error");
    } finally {
      running = false;
    }
  }

  function start() {
    const id = setInterval(() => tick(), opts.everyMs);
    id.unref?.();
    return { stop: () => clearInterval(id), tick };
  }

  return { start, tick };
}

module.exports = { makeHistory };
