import { useEffect, useState } from "react";

type StatusRow = { status: string; count: number };
type BallRow = { owner: string; count: number };
type PriorityRow = { priority: string; count: number };
type ActivityRow = { date: string; count: number }; // new type

async function fetchJSON<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}

export default function ReportsPage() {
  const [statusRows, setStatusRows] = useState<StatusRow[] | null>(null);
  const [ballRows, setBallRows] = useState<BallRow[] | null>(null);
  const [priorityRows, setPriorityRows] = useState<PriorityRow[] | null>(null);
  const [overdueCount, setOverdueCount] = useState<number | null>(null);
  const [activityRows, setActivityRows] = useState<ActivityRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  function pick<K extends string>(rows: { [k in K]: string }[] | null, key: K, value: string): number {
    if (!rows) return 0;
    const r = rows.find(x => x[key] === value) as any;
    return r ? (r.count ?? 0) : 0;
  }

  async function loadReports() {
    try {
      setLoading(true);
      const [s, b, p, o, a] = await Promise.all([
        fetchJSON<StatusRow[]>("/api/reports/tasks/status"),
        fetchJSON<BallRow[]>("/api/reports/tasks/ball"),
        fetchJSON<PriorityRow[]>("/api/reports/tasks/priority"),
        fetchJSON<any[]>("/api/reports/tasks/overdue"),
        fetchJSON<ActivityRow[]>("/api/reports/activity/recent"),
      ]);
      setStatusRows(s);
      setBallRows(b);
      setPriorityRows(p);
      setOverdueCount(Array.isArray(o) ? o.length : 0);
      setActivityRows(a);
      setErr(null);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h1>Dashboard Reports</h1>
      <button onClick={loadReports} disabled={loading}>
        {loading ? "Refreshing…" : "Refresh Reports"}
      </button>

      {err && {/* KPI summary */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 16 }}>
      <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
        <div style={{ fontSize: 12, color: "#666" }}>Total Tasks</div>
        <div style={{ fontSize: 24 }}>
          {(statusRows ?? []).reduce((a, b) => a + b.count, 0)}
        </div>
      </div>
      <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
        <div style={{ fontSize: 12, color: "#666" }}>Open</div>
        <div style={{ fontSize: 24 }}>
          {pick(statusRows as any, "status", "open")}
        </div>
      </div>
      <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
        <div style={{ fontSize: 12, color: "#666" }}>In Progress</div>
        <div style={{ fontSize: 24 }}>
          {pick(statusRows as any, "status", "in_progress")}
        </div>
      </div>
      <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
        <div style={{ fontSize: 12, color: "#666" }}>Overdue</div>
        <div style={{ fontSize: 24 }}>
          {overdueCount === null ? "…" : overdueCount}
        </div>
      </div>
    </div>

  );
}
