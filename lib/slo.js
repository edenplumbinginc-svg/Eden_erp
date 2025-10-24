// lib/slo.js — Velocity/SLO Core
// Configure via env or inline defaults. You can get fancy later (DB/config UI).
const DEFAULTS = {
  // global fallbacks
  p95_ms: +(process.env.SLO_P95_MS || 300),      // 300 ms
  err_pct: +(process.env.SLO_ERR_PCT || 1.0),    // 1.0 %
  // per-route overrides (examples)
  // "GET /api/notifications/recent": { p95_ms: 120, err_pct: 0.5 },
};

function loadSloMap() {
  // Optionally parse JSON from env SLO_OVERRIDES='{"GET /api/foo":{"p95_ms":200,"err_pct":0.5}}'
  let overrides = {};
  try {
    if (process.env.SLO_OVERRIDES) overrides = JSON.parse(process.env.SLO_OVERRIDES);
  } catch { /* ignore bad JSON */ }
  return { defaults: { p95_ms: DEFAULTS.p95_ms, err_pct: DEFAULTS.err_pct }, routes: overrides };
}

function classify(value, target, warnFactor = 1.2) {
  if (value == null) return { state: "no_data" };
  if (value <= target) return { state: "ok" };
  if (value <= target * warnFactor) return { state: "warn" };
  return { state: "critical" };
}

function evaluateSloForSnapshot(routeKey, oneMinute, sloCfg) {
  const target = sloCfg.routes[routeKey] || sloCfg.defaults;
  const p95v = oneMinute?.p95_ms ?? null;
  const errv = oneMinute?.err_rate ?? null; // already a percent
  const p95 = classify(p95v, target.p95_ms);
  const err = classify(errv, target.err_pct);
  // overall state = worse of the two
  const rank = { no_data: 0, ok: 1, warn: 2, critical: 3 };
  const overall = (rank[p95.state] >= rank[err.state]) ? p95.state : err.state;

  return {
    route: routeKey,
    targets: { p95_ms: target.p95_ms, err_pct: target.err_pct },
    actual:  { p95_ms: p95v, err_pct: errv, samples_1m: oneMinute?.count ?? 0 },
    state: overall,
    dims: { p95: p95.state, err: err.state },
  };
}

module.exports = { loadSloMap, evaluateSloForSnapshot };
