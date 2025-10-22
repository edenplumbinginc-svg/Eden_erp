import { useEffect, useState } from "react";

function Stat({label, value, sub}) {
  return (
    <div className="soft-panel p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl mt-1">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function App() {
  const [health, setHealth] = useState(null);
  useEffect(() => {
    fetch("/api/healthz").then(r => r.ok ? r.json() : null).then(setHealth).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen">
      <header className="soft-panel mx-auto max-w-6xl mt-6 p-4 flex items-center justify-between">
        <div className="text-lg font-medium">EDEN • Coordination</div>
        <div className="space-x-2">
          <button className="btn">Secondary</button>
          <button className="btn btn-primary">Create Task</button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4 space-y-4">
        <div className="soft-card p-5">
          <div className="text-sm text-gray-500">Dashboard</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <Stat label="Tasks Completed" value="5" sub="last 7 days" />
            <Stat label="In Progress" value="1" sub="now" />
            <Stat label="Overdue" value="0" sub="past due" />
            <Stat label="AI Created" value="0" sub="beta" />
          </div>
        </div>

        <div className="soft-card p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">Recent Tasks</div>
            <input className="input w-64" placeholder="Search tasks..." />
          </div>
          <div className="hr my-4"></div>
          <div className="grid gap-3">
            <div className="soft-panel p-4 hover:bg-gray-100 transition">
              <div className="text-[15px]">send price to raza</div>
              <div className="text-xs text-gray-500 mt-1">Due 2025-10-22 • Coordination • High</div>
            </div>
            <div className="soft-panel p-4 hover:bg-gray-100 transition">
              <div className="text-[15px]">book lift with Solid Hook</div>
              <div className="text-xs text-gray-500 mt-1">Due 2025-10-25 • Field • Normal</div>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          API status: {health?.status ?? "probing..."}
        </div>
      </main>
    </div>
  );
}
