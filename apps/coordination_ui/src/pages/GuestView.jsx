import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";

export default function GuestView() {
  const [sp] = useSearchParams();
  const token = sp.get("token");
  const [data, setData] = useState({ loading: true, err: null, payload: null });

  useEffect(() => {
    if (!token) {
      setData({ loading: false, err: "Missing token", payload: null });
      return;
    }
    
    axios.get(`/api/guest/resolve`, { params: { token } })
      .then(r => setData({ loading: false, err: null, payload: r.data }))
      .catch(e => setData({ 
        loading: false, 
        err: e?.response?.data?.error?.message || "Failed to load", 
        payload: null 
      }));
  }, [token]);

  if (data.loading) return <div className="p-6">Loading…</div>;
  if (data.err) return <div className="p-6 text-red-600">Error: {data.err}</div>;

  const p = data.payload;
  
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Eden Guest View</h1>
        <div className="text-body text-muted">
          Expires: {new Date(p.expiresAt).toLocaleString()}
        </div>
      </div>

      {p.scope === "task" && p.task && (
        <div className="space-y-4">
          <div className="rounded-lg border p-4 bg-white">
            <div className="font-medium">{p.task.title}</div>
            <div className="text-body text-muted">
              Status: {p.task.status} • Priority: {p.task.priority || "—"} • Due: {p.task.due_at ? new Date(p.task.due_at).toLocaleDateString() : "—"}
            </div>
            {p.task.ball_owner_type && (
              <div className="text-caption mt-2">
                Ball in Court: {p.task.ball_owner_type}:{String(p.task.ball_owner_id || "").slice(0, 8)}
              </div>
            )}
          </div>

          <div className="rounded-lg border p-4 bg-white">
            <div className="font-semibold mb-2">Attachments</div>
            {p.attachments.length === 0 ? (
              <div className="text-body text-muted">No files.</div>
            ) : (
              <ul className="text-body space-y-1">
                {p.attachments.map(a => (
                  <li key={a.id}>
                    {a.file_name} ({Math.round(a.size_bytes / 1024)} KB) • {a.mime_type}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border p-4 bg-white">
            <div className="font-semibold mb-2">Recent Comments</div>
            {p.comments.length === 0 ? (
              <div className="text-body text-muted">No comments yet.</div>
            ) : (
              <ul className="text-body space-y-3">
                {p.comments.map(c => (
                  <li key={c.id}>
                    <div>{c.body}</div>
                    <div className="text-caption text-muted">
                      {new Date(c.created_at).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="text-body">
            Need edit access? Contact your Eden PM. <Link className="underline" to="/">Back to app</Link>
          </div>
        </div>
      )}

      {p.scope === "project" && p.project && (
        <div className="space-y-4">
          <div className="rounded-lg border p-4 bg-white">
            <div className="font-medium">{p.project.name}</div>
            <div className="text-body text-muted">
              Code: {p.project.code} • Status: {p.project.status}
            </div>
          </div>
          
          <div className="rounded-lg border p-4 bg-white">
            <div className="font-semibold mb-2">Recent Tasks</div>
            {(!p.tasks || p.tasks.length === 0) ? (
              <div className="text-body text-muted">No tasks yet.</div>
            ) : (
              <ul className="text-body space-y-2">
                {p.tasks.map(t => (
                  <li key={t.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{t.title}</div>
                      <div className="text-caption text-muted">
                        Status: {t.status} • Due: {t.due_at ? new Date(t.due_at).toLocaleDateString() : "—"}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="text-body">
            Need edit access? Contact your Eden PM. <Link className="underline" to="/">Back to app</Link>
          </div>
        </div>
      )}
    </div>
  );
}
