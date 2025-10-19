import { useEffect, useState } from "react";

type StatusRow = { status: string; count: number };
type BallRow = { owner: string; count: number };

async function fetchJSON<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}

export default function ReportsPage() {
  const [statusRows, setStatusRows] = useState<StatusRow[] | null>(null);
  const [ballRows, setBallRows] = useState<BallRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadReports() {
    try {
      setLoading(true);
      const [s, b] = await Promise.all([
        fetchJSON<StatusRow[]>("/api/reports/tasks/status"),
        fetchJSON<BallRow[]>("/api/reports/tasks/ball"),
      ]);
      setStatusRows(s);
      setBallRows(b);
      setErr(null);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadReports(); }, []);

  return (
    <div style={{ padding: 16 }}>
      <h1>Dashboard Reports</h1>
      <button
        onClick={loadReports}
        style={{ background: "#2563eb", color: "white", padding: "8px 16px", border: "none", borderRadius: 6, cursor: "pointer" }}
      >
        {loading ? "Refreshing..." : "Refresh Reports"}
      </button>
      {err && <div style={{ color: "red" }}>Error: {err}</div>}

      <section style={{ marginTop: 24 }}>
        <h2>Tasks by Status</h2>
        {!statusRows ? <p>Loading…</p> : (
          <table>
            <thead><tr><th>Status</th><th>Count</th></tr></thead>
            <tbody>
              {statusRows.map(r => (
                <tr key={r.status}><td>{r.status}</td><td>{r.count}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Tasks by Owner (Ball In Court)</h2>
        {!ballRows ? <p>Loading…</p> : (
          <table>
            <thead><tr><th>Owner</th><th>Count</th></tr></thead>
            <tbody>
              {ballRows.map(r => (
                <tr key={r.owner}><td>{r.owner}</td><td>{r.count}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
