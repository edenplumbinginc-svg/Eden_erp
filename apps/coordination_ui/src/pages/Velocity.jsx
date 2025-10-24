import { useEffect, useMemo, useState } from "react";

function fmt(n) {
  if (n === null || n === undefined) return "—";
  if (typeof n === "number" && !Number.isInteger(n)) return n.toFixed(3);
  return String(n);
}

export default function Velocity() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [sortBy, setSortBy] = useState("rps");
  const [desc, setDesc] = useState(true);
  const [since, setSince] = useState(null);

  async function fetchMetrics() {
    try {
      const res = await fetch("/ops/metrics", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setErr(null);
      setSince(new Date().toLocaleTimeString());
    } catch (e) {
      setErr(e.message || String(e));
    }
  }

  useEffect(() => {
    fetchMetrics();
    const id = setInterval(fetchMetrics, 5000);
    return () => clearInterval(id);
  }, []);

  const rows = useMemo(() => {
    if (!data?.routes) return [];
    const out = [];
    for (const [route, wins] of Object.entries(data.routes)) {
      const w1 = wins["1m"] || {};
      out.push({
        route,
        rps: w1.rps ?? 0,
        p50_ms: w1.p50_ms ?? null,
        p95_ms: w1.p95_ms ?? null,
        err_rate: w1.err_rate ?? 0,
        count: w1.count ?? 0,
      });
    }
    return out.sort((a, b) => {
      const va = a[sortBy] ?? -Infinity;
      const vb = b[sortBy] ?? -Infinity;
      return desc ? (vb - va) : (va - vb);
    });
  }, [data, sortBy, desc]);

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
          Env: {data?.env ?? "—"} • Generated: {data?.generated_at ?? "—"} • Last fetch: {since ?? "—"}
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
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="px-3 py-4 text-center" colSpan="6">No data yet — hit some routes</td></tr>
            ) : rows.map((r) => (
              <tr key={r.route} className="border-t">
                <td className="px-3 py-2 font-mono">{r.route}</td>
                <td className="px-3 py-2">{fmt(r.rps)}</td>
                <td className="px-3 py-2">{fmt(r.p50_ms)}</td>
                <td className="px-3 py-2">{fmt(r.p95_ms)}</td>
                <td className={`px-3 py-2 ${r.err_rate > 5 ? "text-red-600 font-medium" : ""}`}>{fmt(r.err_rate)}</td>
                <td className="px-3 py-2">{fmt(r.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs opacity-70">
        Data source: <code>/ops/metrics</code> (rolling 1m window shown; 5m/15m available for trend charts later).
      </p>
    </div>
  );
}
