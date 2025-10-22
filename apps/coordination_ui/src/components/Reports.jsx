import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiService } from "../services/api";

const Card = ({ title, children }) => (
  <div className="rounded-lg shadow-sm border bg-white">
    <div className="px-4 py-3 border-b font-semibold">{title}</div>
    <div className="p-4">{children}</div>
  </div>
);

export default function Reports() {
  const { data: byStatus = [] } = useQuery({ 
    queryKey: ["r_status"], 
    queryFn: () => apiService.getTasksByStatus().then(res => res.data) 
  });
  
  const { data: byOwner = [] } = useQuery({ 
    queryKey: ["r_owner"], 
    queryFn: () => apiService.getTasksByOwner().then(res => res.data) 
  });
  
  const { data: overdue = [] } = useQuery({ 
    queryKey: ["r_overdue"], 
    queryFn: () => apiService.getOverdueTasks().then(res => res.data) 
  });
  
  const { data: activity = [] } = useQuery({ 
    queryKey: ["r_activity"], 
    queryFn: () => apiService.getRecentActivity().then(res => res.data) 
  });

  return (
    <div className="mx-auto max-w-7xl p-4 space-y-6">
      <h1 className="text-xl font-semibold">Coordination Reports</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Tasks by Status">
          <table className="w-full text-body">
            <thead>
              <tr>
                <th className="text-left py-1">Status</th>
                <th className="text-right">Count</th>
              </tr>
            </thead>
            <tbody>
              {byStatus.map(r => (
                <tr key={r.status}>
                  <td className="py-1 capitalize">{r.status}</td>
                  <td className="py-1 text-right">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Tasks by Owner">
          <table className="w-full text-body">
            <thead>
              <tr>
                <th className="text-left py-1">Owner</th>
                <th className="text-right">Count</th>
              </tr>
            </thead>
            <tbody>
              {byOwner.map(r => (
                <tr key={r.owner || Math.random()}>
                  <td className="py-1">{r.owner || "Unassigned"}</td>
                  <td className="py-1 text-right">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Overdue Tasks">
          {overdue.length === 0 ? (
            <div className="text-body text-muted">No overdue tasks 🎉</div>
          ) : (
            <ul className="text-body space-y-2">
              {overdue.map(t => (
                <li key={t.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t.title}</div>
                    <div className="text-caption text-muted">
                      Due {t.due_at ? new Date(t.due_at).toLocaleDateString() : "—"} • {t.priority}
                    </div>
                  </div>
                  <Link className="px-2 py-1 border rounded text-caption" to={`/task/${t.id}`}>
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent Activity (7 days)">
          {activity.length === 0 ? (
            <div className="text-body text-muted">No recent activity.</div>
          ) : (
            <ul className="text-body space-y-2">
              {activity.map((e, i) => (
                <li key={i} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{new Date(e.day).toLocaleDateString()}</div>
                    <div className="text-caption text-muted">
                      {e.tasks_created} task{e.tasks_created !== 1 ? 's' : ''} created
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
