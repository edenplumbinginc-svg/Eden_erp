import { useEffect, useMemo, useState } from "react";

function fmt(n) {
  if (n === null || n === undefined) return "—";
  if (typeof n === "number" && !Number.isInteger(n)) return n.toFixed(3);
  return String(n);
}

function Sparkline({ points, accessor = (x)=>x, height = 28, width = 120, strokeWidth = 1.5, title }) {
  // points: array of numbers (length ~30)
  const padX = 2, padY = 2;
  const w = width - padX * 2, h = height - padY * 2;

  const vals = points.map(accessor).filter(v => v !== null && v !== undefined);
  const min = vals.length ? Math.min(...vals) : 0;
  const max = vals.length ? Math.max(...vals) : 1;
  const span = max - min || 1;

  const stepX = w / Math.max(1, points.length - 1);

  const d = points.map((p, i) => {
    const yVal = accessor(p);
    const yNorm = yVal == null ? null : (1 - (yVal - min) / span);
    const x = padX + i * stepX;
    const y = yNorm == null ? null : padY + yNorm * h;
    return [x, y];
  });

  const path = d.reduce((acc, [x, y], i) => {
    if (y == null) return acc + (i === 0 ? `M${x},${padY + h}` : ` L${x},${padY + h}`);
    return acc + (i === 0 ? `M${x},${y}` : ` L${x},${y}`);
  }, "");

  // last point badge
  const last = d[d.length - 1];
  return (
    <svg width={width} height={height} aria-label={title}>
      <path d={path} fill="none" stroke="currentColor" strokeWidth={strokeWidth} />
      {last && last[1] != null && (
        <circle cx={last[0]} cy={last[1]} r="2" />
      )}
    </svg>
  );
}

export default function Velocity() {
  const [snap, setSnap] = useState(null);      // from /ops/metrics
  const [trends, setTrends] = useState(null);  // from /ops/metrics/trends
  const [err, setErr] = useState(null);
  const [sortBy, setSortBy] = useState("rps");
  const [desc, setDesc] = useState(true);
  const [since, setSince] = useState(null);

  async function fetchMetrics() {
    try {
      const [a, b] = await Promise.all([
        fetch("/ops/metrics", { cache: "no-store" }),
        fetch("/ops/metrics/trends", { cache: "no-store" }),
      ]);
      if (!a.ok) throw new Error(`/ops/metrics HTTP ${a.status}`);
      if (!b.ok) throw new Error(`/ops/metrics/trends HTTP ${b.status}`);
      const j1 = await a.json();
      const j2 = await b.json();
      setSnap(j1);
      setTrends(j2);
      setErr(null);
      setSince(new Date().toLocaleTimeString());
    } catch (e) {
      setErr(e.message || String(e));
    }
  }

  useEffect(() => {
    fetchMetrics();
    const id1 = setInterval(fetchMetrics, 10_000); // match 10s bucket
    return () => clearInterval(id1);
  }, []);

  const rows = useMemo(() => {
    if (!snap?.routes) return [];
    const out = [];
    for (const [route, wins] of Object.entries(snap.routes)) {
      const w1 = wins["1m"] || {};
      const tSeries = trends?.routes?.[route]?.series || [];

      // --- Regression calc (p95 over 5m buckets) ---
      // Use last 6 buckets: last3 = most recent 3, prev3 = prior 3.
      const last6 = tSeries.slice(-6);
      const last3 = last6.slice(-3).map(b => b?.p95_ms).filter(v => v != null);
      const prev3 = last6.slice(0, 3).map(b => b?.p95_ms).filter(v => v != null);
      const avg = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : null;
      const aLast = avg(last3);
      const aPrev = avg(prev3);
      let regress_abs = 0, regress_pct = 0;
      if (aLast != null && aPrev != null && aPrev > 0) {
        regress_abs = aLast - aPrev;
        regress_pct = +( (regress_abs / aPrev) * 100 ).toFixed(1);
      }
      const is_regress = (regress_abs >= 30) && (regress_pct >= 20); // 30ms & 20%+

      out.push({
        route,
        rps: w1.rps ?? 0,
        p50_ms: w1.p50_ms ?? null,
        p95_ms: w1.p95_ms ?? null,
        err_rate: w1.err_rate ?? 0,
        count: w1.count ?? 0,
        trend: tSeries,
        regress_abs,
        regress_pct,
        is_regress,
      });
    }
    return out.sort((a, b) => {
      const va = a[sortBy] ?? -Infinity;
      const vb = b[sortBy] ?? -Infinity;
      return desc ? (vb - va) : (va - vb);
    });
  }, [snap, trends, sortBy, desc]);

  function header(label, key) {
    return (
      <th
        className="px-3 py-2 cursor-pointer select-none"
        onClick={() => { setDesc(key === sortBy ? !desc : true); setSortBy(key); }}
        title={`Sort by ${label}`}
      >
        {label} {sortBy === key ? (desc ? "▾" : "▴") : ""}
      </th>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Velocity Dashboard</h1>
        <div className="text-sm opacity-70">
          Env: {snap?.env ?? "—"} • Generated: {snap?.generated_at ?? "—"} • Last fetch: {since ?? "—"}
        </div>
      </div>

      {err && (
        <div className="p-3 rounded-md bg-red-50 text-red-700 border border-red-200">
          Failed to load metrics: {err}
        </div>
      )}

      <div className="overflow-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {header("Route", "route")}
              {header("RPS (1m)", "rps")}
              {header("p50 ms (1m)", "p50_ms")}
              {header("p95 ms (1m)", "p95_ms")}
              {header("Error % (1m)", "err_rate")}
              {header("Samples (1m)", "count")}
              <th className="px-3 py-2">p95 (5m)</th>
              <th className="px-3 py-2">RPS (5m)</th>
              {header("Regress % (p95)", "regress_pct")}
              <th className="px-3 py-2">Trace</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="px-3 py-4 text-center" colSpan="10">No data yet — hit some routes</td></tr>
            ) : rows.map((r) => (
              <tr key={r.route} className="border-t">
                <td className="px-3 py-2 font-mono">{r.route}</td>
                <td className="px-3 py-2">{fmt(r.rps)}</td>
                <td className="px-3 py-2">{fmt(r.p50_ms)}</td>
                <td className="px-3 py-2">{fmt(r.p95_ms)}</td>
                <td className={`px-3 py-2 ${r.err_rate > 5 ? "text-red-600 font-medium" : ""}`}>{fmt(r.err_rate)}</td>
                <td className="px-3 py-2">{fmt(r.count)}</td>
                <td className="px-3 py-1">
                  <Sparkline
                    points={r.trend}
                    accessor={(b)=>b?.p95_ms}
                    title={`p95 (5m) ${r.route}`}
                  />
                </td>
                <td className="px-3 py-1">
                  <Sparkline
                    points={r.trend}
                    accessor={(b)=>b?.rps}
                    title={`RPS (5m) ${r.route}`}
                  />
                </td>
                <td className="px-3 py-2">
                  {Number.isFinite(r.regress_pct)
                    ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
                          ${r.is_regress ? "bg-red-100 text-red-700 border border-red-200" : "bg-gray-100 text-gray-700 border border-gray-200"}`}>
                          {r.is_regress ? "↑ regress" : "—"} {r.is_regress ? `${r.regress_pct}%` : ""}
                        </span>
                      )
                    : "—"}
                </td>
                <td className="px-3 py-2">
                  <button
                    className="px-2 py-1 rounded-md border hover:bg-gray-50 disabled:opacity-50"
                    onClick={async () => {
                      try {
                        const res = await fetch(`/ops/sentry-link?route=${encodeURIComponent(r.route)}`, { cache: "no-store" });
                        const j = await res.json();
                        if (j?.url) return window.open(j.url, "_blank", "noopener,noreferrer");
                        if (j?.missing) {
                          alert("Configure SENTRY_ORG_SLUG and SENTRY_PROJECT_SLUG secrets to enable deep links.");
                        }
                      } catch {
                        alert("Could not create Sentry link. Check backend logs.");
                      }
                    }}
                    title="Open Sentry filtered to this route (last 1h)"
                  >
                    Sentry →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs opacity-70">
        Data sources: <code>/ops/metrics</code> (1m snapshot) & <code>/ops/metrics/trends</code> (5m, 10s buckets).
      </p>
    </div>
  );
}
