// lib/metrics.js — Velocity/Metrics Core (in-memory)
const now = () => Date.now();

function makeWindow(ms) {
  return { ms, points: [] }; // points: {t, dur_ms, ok}
}

function record(win, dur_ms, ok) {
  const t = now();
  win.points.push({ t, dur_ms, ok });
  // drop old
  const cutoff = t - win.ms;
  while (win.points.length && win.points[0].t < cutoff) win.points.shift();
}

function percentile(arr, p) {
  if (!arr.length) return null;
  const sorted = arr.slice().sort((a,b)=>a-b);
  const idx = Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)));
  return sorted[idx];
}

function summarize(win) {
  const pts = win.points;
  const n = pts.length;
  if (!n) return { count: 0, rps: 0, p50_ms: null, p95_ms: null, err_rate: 0 };
  const dur = pts.map(p=>p.dur_ms);
  const okCount = pts.filter(p=>p.ok).length;
  const span_s = win.ms / 1000;
  return {
    count: n,
    rps: +(n / span_s).toFixed(3),
    p50_ms: Math.round(percentile(dur, 0.50)),
    p95_ms: Math.round(percentile(dur, 0.95)),
    err_rate: +(((n - okCount) / n) * 100).toFixed(2), // %
  };
}

function makeMetrics() {
  // windows: 1m, 5m, 15m
  const windows = [60_000, 300_000, 900_000].map(makeWindow);
  const perRoute = new Map(); // key: METHOD path

  function key(req) {
    // collapse query strings; keep path and method
    return `${req.method} ${req.route?.path || req.path}`;
  }

  function tap(req, res, dur_ms, ok) {
    const k = key(req);
    if (!perRoute.has(k)) {
      // create new windows for this route
      perRoute.set(k, [makeWindow(60_000), makeWindow(300_000), makeWindow(900_000)]);
    }
    const arr = perRoute.get(k);
    arr.forEach(w => record(w, dur_ms, ok));
  }

  function snapshot() {
    const out = {};
    for (const [k, wins] of perRoute.entries()) {
      out[k] = {
        "1m": summarize(wins[0]),
        "5m": summarize(wins[1]),
        "15m": summarize(wins[2]),
      };
    }
    return {
      service: "eden-erp-backend",
      env: process.env.SENTRY_ENV || process.env.NODE_ENV || "dev",
      generated_at: new Date().toISOString(),
      routes: out,
    };
  }

  return { tap, snapshot };
}

module.exports = { makeMetrics };
