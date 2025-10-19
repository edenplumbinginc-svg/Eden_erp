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

      {err && <div style={{ color: "red" }}>Error: {err}</div>}

      <section style={{ marginTop: 24 }}>
        <h2>Tasks by Status</h2>
        {!statusRows ? (
          <p>Loading…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {statusRows.map((r) => (
                <tr key={r.status}>
                  <td>{r.status}</td>
                  <td>{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Tasks by Owner (Ball In Court)</h2>
        {!ballRows ? (
          <p>Loading…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Owner</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {ballRows.map((r) => (
                <tr key={r.owner}>
                  <td>{r.owner}</td>
                  <td>{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Tasks by Priority</h2>
        {!priorityRows ? (
          <p>Loading…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Priority</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {priorityRows.map((r) => (
                <tr key={r.priority}>
                  <td>{r.priority}</td>
                  <td>{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Overdue Tasks</h2>
        {overdueCount === null ? (
          <p>Loading…</p>
        ) : overdueCount === 0 ? (
          <p>None</p>
        ) : (
          <p>{overdueCount}</p>
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Recent Activity (7 days)</h2>
        {!activityRows ? (
          <p>Loading…</p>
        ) : activityRows.length === 0 ? (
          <p>No recent activity</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Tasks Created</th>
              </tr>
            </thead>
            <tbody>
              {activityRows.map((r) => (
                <tr key={r.date}>
                  <td>{r.date}</td>
                  <td>{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
