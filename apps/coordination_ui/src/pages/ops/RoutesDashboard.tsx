import React, { useState, useEffect } from "react";
import { StatusBadge } from "../../components/StatusBadge";
import { routeStatus } from "../../routes/statusMap";

export default function RoutesDashboard() {
  const [rows, setRows] = useState<string[]>(Object.keys(routeStatus).sort());

  useEffect(() => {
    // Try to load showcase routes dynamically
    const loadShowcase = async () => {
      try {
        // @ts-ignore - optional file written by generator
        const imported = await import("../../showcase/routes.json");
        const data = imported.default as { routes: { route: string; label: string }[] };
        const showcase = data.routes.map(r => r.route);
        const combined = Array.from(new Set([...showcase, ...Object.keys(routeStatus)])).sort();
        setRows(combined);
      } catch {
        // File doesn't exist or can't be loaded, stick with routeStatus keys
      }
    };
    loadShowcase();
  }, []);
  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Routes Dashboard</h1>
          <p className="text-sm text-zinc-500">
            Inventory of app routes with implementation status. Promote routes from missing → skeleton → ready.
          </p>
        </div>
      </header>

      <div className="rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50">
            <tr className="text-left">
              <th className="p-3 font-medium text-zinc-600">Route</th>
              <th className="p-3 font-medium text-zinc-600">Status</th>
              <th className="p-3 font-medium text-zinc-600">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((path) => {
              const status = routeStatus[path] ?? "missing";
              return (
                <tr key={path} className="border-t border-zinc-100 hover:bg-zinc-50/50">
                  <td className="p-3">
                    <a href={path} className="text-blue-600 hover:underline">
                      {path}
                    </a>
                  </td>
                  <td className="p-3">
                    <StatusBadge status={status} />
                  </td>
                  <td className="p-3 text-zinc-500">
                    {status === "missing"
                      ? "Needs skeleton page"
                      : status === "skeleton"
                      ? "Wire real data & interactions"
                      : "Looks good—QA next"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Total Routes:</strong> {rows.length} | 
          <strong className="ml-3">Ready:</strong> {rows.filter(r => (routeStatus[r] ?? "missing") === "ready").length} | 
          <strong className="ml-3">Skeleton:</strong> {rows.filter(r => (routeStatus[r] ?? "missing") === "skeleton").length} | 
          <strong className="ml-3">Missing:</strong> {rows.filter(r => (routeStatus[r] ?? "missing") === "missing").length}
        </p>
      </div>
    </div>
  );
}
