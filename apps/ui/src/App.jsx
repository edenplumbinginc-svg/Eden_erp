import { useEffect, useState } from "react";

function Stat({label,value,sub}) {
  return (
    <div className="rounded-2xl p-5 bg-gray-900 shadow">
      <div className="text-sm text-gray-400">{label}</div>
      <div className="text-3xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

export default function App(){
  const [health, setHealth] = useState(null);
  useEffect(()=>{
    fetch("/api/healthz").then(r=>r.ok?r.json():null).then(setHealth).catch(()=>{});
  },[]);
  return (
    <div className="min-h-screen grid grid-cols-[260px_1fr]">
      <aside className="bg-gray-900/70 border-r border-gray-800 p-4">
        <div className="text-lg font-bold mb-6">EDEN MEP</div>
        <nav className="space-y-2 text-sm">
          <a href="#" className="block px-3 py-2 rounded-lg hover:bg-gray-800">Dashboard</a>
          <a href="#" className="block px-3 py-2 rounded-lg hover:bg-gray-800">Projects</a>
          <a href="#" className="block px-3 py-2 rounded-lg hover:bg-gray-800">Tasks</a>
          <a href="#" className="block px-3 py-2 rounded-lg hover:bg-gray-800">Reports</a>
          <a href="#" className="block px-3 py-2 rounded-lg hover:bg-gray-800">Settings</a>
        </nav>
        <div className="mt-8 text-xs text-gray-500">
          {health ? `API: ${health.status}` : "API: probing..."}
        </div>
      </aside>

      <main className="p-6 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Coordination Dashboard</h1>
          <button className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500">Create Task</button>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Stat label="Tasks Completed" value="0" sub="last 7 days"/>
          <Stat label="In Progress" value="0" sub="now"/>
          <Stat label="Overdue" value="0" sub="past due"/>
          <Stat label="AI Created" value="0" sub="beta"/>
        </section>

        <section className="rounded-2xl bg-gray-900 p-5 shadow">
          <div className="text-sm text-gray-400 mb-3">Recent Tasks</div>
          <div className="text-gray-500 text-sm">Wire up to /api/tasks next.</div>
        </section>
      </main>
    </div>
  );
}
