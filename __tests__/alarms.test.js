// __tests__/alarms.test.js
const { makeMetrics } = require("../lib/metrics");

function mkSeries(vals) {
  // vals: array of p95 values for 6 buckets; null allowed
  // produce objects like { t, rps, p95_ms, err_rate } (only p95_ms is used by evaluator)
  const now = Date.now();
  const bucketMs = 10_000;
  return vals.map((v, i) => ({
    t: new Date(now - (vals.length - 1 - i) * bucketMs).toISOString(),
    rps: 1,
    p95_ms: v,
    err_rate: 0,
  }));
}

describe("Velocity Alarms evaluator", () => {
  test("triggers error_rate warning at ≥5% with sample guard", () => {
    const { evaluateAlarmsForRoute } = makeMetrics(); // get pure fn
    const oneMinute = { err_rate: 7.5, count: 10, p50_ms: 50, p95_ms: 120, rps: 0.2 };
    const series = mkSeries([120,130,110, 115,118,119]); // irrelevant for error rule
    const alarms = evaluateAlarmsForRoute("GET /api/foo", oneMinute, series);
    const a = alarms.find(x => x.kind === "error_rate");
    expect(a).toBeTruthy();
    expect(a.severity).toBe("warning");
    expect(a.evidence.err_rate_1m).toBeCloseTo(7.5);
    expect(a.evidence.samples_1m).toBe(10);
  });

  test("does not trigger error_rate if samples < 5", () => {
    const { evaluateAlarmsForRoute } = makeMetrics();
    const oneMinute = { err_rate: 50, count: 3, p95_ms: 100 };
    const alarms = evaluateAlarmsForRoute("GET /api/foo", oneMinute, mkSeries([100,100,100,100,100,100]));
    expect(alarms.find(x => x.kind === "error_rate")).toBeFalsy();
  });

  test("triggers p95_regress when last3 ≥20% and ≥30ms above prev3", () => {
    const { evaluateAlarmsForRoute } = makeMetrics();
    // prev3 avg = 100ms, last3 avg = 140ms → +40ms, +40%
    const series = mkSeries([90,100,110, 130,140,150]);
    const oneMinute = { err_rate: 0, count: 30, p95_ms: 140 };
    const alarms = evaluateAlarmsForRoute("GET /api/bar", oneMinute, series);
    const a = alarms.find(x => x.kind === "p95_regress");
    expect(a).toBeTruthy();
    expect(a.severity).toBe("warning"); // +40% < 50% threshold for critical
    expect(a.evidence.regress_abs_ms).toBeGreaterThanOrEqual(30);
    expect(a.evidence.regress_pct).toBeGreaterThanOrEqual(20);
  });

  test("no p95_regress if absolute delta < 30ms even if pct ≥20%", () => {
    const { evaluateAlarmsForRoute } = makeMetrics();
    // prev3 avg = 100ms, last3 avg = 118ms → +18ms, +18%
    const series = mkSeries([95,100,105, 110,118,126].map(x => x - 8)); // keep delta < 30ms and <20%
    const oneMinute = { err_rate: 0, count: 30, p95_ms: 118 };
    const alarms = evaluateAlarmsForRoute("GET /api/baz", oneMinute, series);
    expect(alarms.find(x => x.kind === "p95_regress")).toBeFalsy();
  });

  test("triggers slo_violation when p95 exceeds SLO target by >20%", () => {
    const { evaluateAlarmsForRoute } = makeMetrics();
    // Default SLO: p95 ≤ 300ms. Test with 420ms → 40% over target → critical
    const oneMinute = { err_rate: 0, count: 18, p50_ms: 200, p95_ms: 420, rps: 0.3 };
    const series = mkSeries([400, 410, 420, 425, 430, 420]);
    const sloCfg = { defaults: { p95_ms: 300, err_pct: 1 }, routes: {} };
    const alarms = evaluateAlarmsForRoute("GET /api/slow", oneMinute, series, sloCfg);
    const a = alarms.find(x => x.kind === "slo_violation");
    expect(a).toBeTruthy();
    expect(a.severity).toBe("critical");
    expect(a.evidence.targets.p95_ms).toBe(300);
    expect(a.evidence.actual.p95_ms).toBe(420);
    expect(a.evidence.dims.p95).toBe("critical");
  });

  test("triggers slo_violation when error rate exceeds SLO target by >20%", () => {
    const { evaluateAlarmsForRoute } = makeMetrics();
    // Default SLO: err ≤ 1%. Test with 2.5% → 150% over target → critical
    const oneMinute = { err_rate: 2.5, count: 100, p50_ms: 50, p95_ms: 100, rps: 1.7 };
    const series = mkSeries([100, 100, 100, 100, 100, 100]);
    const sloCfg = { defaults: { p95_ms: 300, err_pct: 1 }, routes: {} };
    const alarms = evaluateAlarmsForRoute("GET /api/flaky", oneMinute, series, sloCfg);
    const a = alarms.find(x => x.kind === "slo_violation");
    expect(a).toBeTruthy();
    expect(a.severity).toBe("critical");
    expect(a.evidence.targets.err_pct).toBe(1);
    expect(a.evidence.actual.err_pct).toBe(2.5);
    expect(a.evidence.dims.err).toBe("critical");
  });

  test("no slo_violation when within targets (state: ok)", () => {
    const { evaluateAlarmsForRoute } = makeMetrics();
    const oneMinute = { err_rate: 0.5, count: 100, p50_ms: 50, p95_ms: 100, rps: 1.7 };
    const series = mkSeries([100, 100, 100, 100, 100, 100]);
    const sloCfg = { defaults: { p95_ms: 300, err_pct: 1 }, routes: {} };
    const alarms = evaluateAlarmsForRoute("GET /api/healthy", oneMinute, series, sloCfg);
    expect(alarms.find(x => x.kind === "slo_violation")).toBeFalsy();
  });

  test("no slo_violation when in warn state (only critical triggers alarm)", () => {
    const { evaluateAlarmsForRoute } = makeMetrics();
    // p95 = 320ms → target*1.067 → warn state (between target and target*1.2)
    const oneMinute = { err_rate: 0, count: 50, p50_ms: 150, p95_ms: 320, rps: 0.8 };
    const series = mkSeries([310, 315, 320, 325, 320, 315]);
    const sloCfg = { defaults: { p95_ms: 300, err_pct: 1 }, routes: {} };
    const alarms = evaluateAlarmsForRoute("GET /api/borderline", oneMinute, series, sloCfg);
    expect(alarms.find(x => x.kind === "slo_violation")).toBeFalsy();
  });
});
