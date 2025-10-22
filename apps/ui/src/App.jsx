import { useEffect, useMemo, useState } from "react";
import { api, healthCheck } from "./lib/api";

function Stat({label, value, sub}) {
  return (
    <div className="soft-panel p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl mt-1">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function TaskItem({ t }) {
  const due = t.due_at ? new Date(t.due_at).toISOString().slice(0,10) : "—";
  return (
    <div className="soft-panel p-4 hover:bg-gray-100 transition cursor-pointer">
      <div className="text-[15px]">{t.title}</div>
      <div className="text-xs text-gray-500 mt-1">
        Due {due} • {t.priority ?? "—"} • {t.status ?? "—"}
      </div>
    </div>
  );
}

export default function App() {
  const [health, setHealth] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch health check (not under /api)
    healthCheck().then(r => setHealth(r.data)).catch(() => setHealth({ status: "error" }));
    
    // Fetch projects and then all tasks from all projects
    api.get("/projects", { params: { limit: 10 } })
      .then(async (projectsRes) => {
        const projects = projectsRes.data;
        if (projects && projects.length > 0) {
          // Fetch tasks from all projects and merge them
          const taskPromises = projects.map(project => 
            api.get(`/projects/${project.id}/tasks`).catch(() => ({ data: [] }))
          );
          const allTasksResponses = await Promise.all(taskPromises);
          const allTasks = allTasksResponses.flatMap(res => res.data || []);
          setTasks(allTasks);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch tasks:", err);
        setTasks([]);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return tasks;
    return tasks.filter(t =>
      (t.title || "").toLowerCase().includes(s) ||
      (t.id || "").toLowerCase().includes(s)
    );
  }, [q, tasks]);

  const stats = useMemo(() => {
    const done = tasks.filter(t => (t.status || "").toLowerCase() === "complete").length;
    const inprog = tasks.filter(t => (t.status || "").toLowerCase().includes("progress")).length;
    const overdue = tasks.filter(t => t.due_at && new Date(t.due_at) < new Date() && (t.status||"").toLowerCase() !== "complete").length;
    return { done, inprog, overdue };
  }, [tasks]);

  return (
    <div className="min-h-screen">
      <header className="soft-panel mx-auto max-w-6xl mt-6 p-4 flex items-center justify-between">
        <div className="text-lg font-medium">EDEN • Coordination</div>
        <div className="space-x-2">
          <button className="btn">Secondary</button>
          <button className="btn btn-primary" onClick={() => alert("Hook to /api/projects/:id/tasks (POST)")}>Create Task</button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4 space-y-4">
        <div className="soft-card p-5">
          <div className="text-sm text-gray-500">Dashboard</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <Stat label="Tasks Completed" value={stats.done} sub="(all time, demo)" />
            <Stat label="In Progress" value={stats.inprog} sub="now" />
            <Stat label="Overdue" value={stats.overdue} sub="past due" />
            <Stat label="API" value={health?.status || "probing…"} sub="/healthz" />
          </div>
        </div>

        <div className="soft-card p-5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm text-gray-500">Recent Tasks</div>
            <input className="input w-64" placeholder="Search tasks or ID…" value={q} onChange={e=>setQ(e.target.value)} />
          </div>
          <div className="hr my-4"></div>
          {loading ? (
            <div className="text-sm text-gray-500">Loading tasks...</div>
          ) : (
            <div className="grid gap-3">
              {filtered.length === 0 ? (
                <div className="text-sm text-gray-500">No tasks found.</div>
              ) : (
                filtered.slice(0, 20).map(t => <TaskItem key={t.id} t={t} />)
              )}
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500">
          API status: {health?.status ?? "probing…"} • {tasks.length} tasks loaded
        </div>
      </main>
    </div>
  );
}
