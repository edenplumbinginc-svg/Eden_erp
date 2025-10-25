// lib/metrics.js — Velocity/Metrics Core (in-memory)
const { loadSloMap, evaluateSloForSnapshot } = require("./slo");
const { loadOwners, ownerFor } = require("./owners");
const { recordIncidentForAlarm } = require("./incidents");
const now = () => Date.now();

const TREND_SPAN_MS = 300_000;  // 5m
const TREND_BUCKET_MS = 10_000; // 10s

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

function bucketize(points, spanMs, bucketMs) {
  const nowTs = Date.now();
  const start = nowTs - spanMs;
  const bucketCount = Math.ceil(spanMs / bucketMs);
  const buckets = Array.from({ length: bucketCount }, (_, i) => ({
    t: start + i * bucketMs, // bucket start
    count: 0,
    durs: [],
    ok: 0,
  }));

  let idx = 0;
  while (idx < points.length && points[idx].t < start) idx++; // skip old
  for (; idx < points.length; idx++) {
    const p = points[idx];
    const bi = Math.min(bucketCount - 1, Math.floor((p.t - start) / bucketMs));
    if (bi >= 0) {
      buckets[bi].count++;
      buckets[bi].durs.push(p.dur_ms);
      if (p.ok) buckets[bi].ok++;
    }
  }

  return buckets.map(b => ({
    t: new Date(b.t).toISOString(),
    rps: +(b.count / (bucketMs / 1000)).toFixed(3),
    p95_ms: b.durs.length ? Math.round(percentile(b.durs, 0.95)) : null,
    err_rate: b.count ? +(((b.count - b.ok) / b.count) * 100).toFixed(2) : 0,
  }));
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

  function trends() {
    const out = {};
    for (const [k, wins] of perRoute.entries()) {
      // use the 5m window (index 1) as the source of raw points
      const w5 = wins[1];
      out[k] = {
        span_ms: TREND_SPAN_MS,
        bucket_ms: TREND_BUCKET_MS,
        series: bucketize(w5.points, TREND_SPAN_MS, TREND_BUCKET_MS),
      };
    }
    return {
      service: "eden-erp-backend",
      env: process.env.SENTRY_ENV || process.env.NODE_ENV || "dev",
      generated_at: new Date().toISOString(),
      routes: out,
    };
  }

  // Exportable pure evaluator (1m summary + last 6 buckets series)
  function evaluateAlarmsForRoute(route, oneMinute, series, sloCfg, owners = {}) {
    const items = [];
    const nowIso = new Date().toISOString();
    const last6 = (series || []).slice(-6);
    const last3 = last6.slice(-3).map(b => b?.p95_ms).filter(v => v != null);
    const prev3 = last6.slice(0, 3).map(b => b?.p95_ms).filter(v => v != null);
    const avg = a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : null;
    const aLast = avg(last3);
    const aPrev = avg(prev3);
    const regress_abs = (aLast!=null && aPrev!=null) ? (aLast - aPrev) : 0;
    const regress_pct = (aLast!=null && aPrev>0) ? +(((aLast - aPrev)/aPrev)*100).toFixed(1) : 0;
    const owner = ownerFor(route, owners) || null;

    // Rule A: error rate surge in 1m (with minimum sample guard)
    if (oneMinute?.err_rate >= 5 && oneMinute?.count >= 5) {
      items.push({
        route,
        kind: "error_rate",
        severity: oneMinute.err_rate >= 20 ? "critical" : "warning",
        since: nowIso,
        evidence: { err_rate_1m: oneMinute.err_rate, samples_1m: oneMinute.count },
        owner,
        hint: "Investigate recent errors; click Sentry link for this route.",
      });
    }

    // Rule B: regression in p95 (last3 vs prev3)
    if (aLast!=null && aPrev!=null && regress_abs >= 30 && regress_pct >= 20) {
      items.push({
        route,
        kind: "p95_regress",
        severity: regress_pct >= 50 ? "critical" : "warning",
        since: nowIso,
        evidence: {
          p95_prev3_ms: Math.round(aPrev),
          p95_last3_ms: Math.round(aLast),
          regress_abs_ms: Math.round(regress_abs),
          regress_pct
        },
        owner,
        hint: "Latency increased; check recent deploys, DB, or upstreams.",
      });
    }

    // Rule C: SLO violation (critical only)
    if (sloCfg && oneMinute) {
      const sloEval = evaluateSloForSnapshot(route, oneMinute, sloCfg);
      if (sloEval.state === "critical") {
        items.push({
          route,
          kind: "slo_violation",
          severity: "critical",
          since: nowIso,
          evidence: {
            targets: sloEval.targets,
            actual: sloEval.actual,
            dims: sloEval.dims
          },
          owner,
          hint: "Route exceeds SLO targets; prioritize remediation or rollback.",
        });
      }
    }

    return items;
  }

  function alarms() {
    const nowIso = new Date().toISOString();
    const snap = snapshot();
    const tr = trends();
    const sloCfg = loadSloMap();
    const owners = loadOwners();
    const items = [];

    for (const route of Object.keys(snap.routes)) {
      const one = snap.routes[route]["1m"] || {};
      const series = tr.routes[route]?.series || [];
      evaluateAlarmsForRoute(route, one, series, sloCfg, owners).forEach(a => {
        items.push(a);
        
        // Correlate alarm to incident (non-blocking, fire-and-forget)
        recordIncidentForAlarm(a).catch((e) => {
          console.error('incident record failed', { 
            incidentKey: `${a.route}::${a.kind}`, 
            error: e.message 
          });
        });
      });
    }

    return {
      service: "eden-erp-backend",
      env: process.env.SENTRY_ENV || process.env.NODE_ENV || "dev",
      generated_at: nowIso,
      alarms: items,
    };
  }

  return { tap, snapshot, trends, alarms, evaluateAlarmsForRoute };
}

module.exports = { makeMetrics };
