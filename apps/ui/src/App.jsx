import { useEffect, useMemo, useState } from "react";
import { api, getJSON } from "./lib/api";
import CreateTaskModal from "./components/CreateTaskModal";

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
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [tasks, setTasks] = useState([]);
  const [q, setQ] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Health + projects
  useEffect(() => {
    (async () => {
      const hz = await getJSON("/healthz");
      setHealth(hz || { status: "ok" });
      
      // Fetch projects
      const p = await getJSON("/api/projects", { limit: 50 });
      const items = Array.isArray(p?.items) ? p.items : Array.isArray(p) ? p : [];
      setProjects(items);
      if (items.length && !projectId) setProjectId(items[0].id);
    })();
  }, []);

  // Fetch tasks for selected project
  async function loadTasks(pid) {
    if (!pid) { 
      setTasks([]); 
      return; 
    }
    
    setLoading(true);
    const nested = await getJSON(`/api/projects/${pid}/tasks`, { limit: 50 });
    if (Array.isArray(nested?.items) || Array.isArray(nested)) {
      setTasks(Array.isArray(nested?.items) ? nested.items : nested);
    } else {
      setTasks([]);
    }
    setLoading(false);
  }

  useEffect(() => { 
    loadTasks(projectId); 
  }, [projectId]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return tasks;
    return tasks.filter(t => 
      (t.title||"").toLowerCase().includes(s) || 
      (t.id||"").toLowerCase().includes(s)
    );
  }, [q, tasks]);

  const stats = useMemo(() => {
    const done = tasks.filter(t => (t.status||"").toLowerCase() === "complete").length;
    const inprog = tasks.filter(t => (t.status||"").toLowerCase().includes("progress")).length;
    const overdue = tasks.filter(t => t.due_at && new Date(t.due_at) < new Date() && (t.status||"").toLowerCase() !== "complete").length;
    return { done, inprog, overdue };
  }, [tasks]);

  return (
    <div className="min-h-screen">
      <header className="soft-panel mx-auto max-w-6xl mt-6 p-4 flex items-center justify-between">
        <div className="text-lg font-medium">EDEN • Coordination</div>
        <div className="flex items-center gap-2">
          <select
            className="input w-64"
            value={projectId}
            onChange={e=>setProjectId(e.target.value)}
            title="Select Project"
          >
            <option value="" disabled>Select a project…</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name || p.code || p.id}
              </option>
            ))}
          </select>
          <button 
            className="btn btn-primary" 
            onClick={()=>setOpenModal(true)}
            disabled={!projectId}
          >
            Create Task
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4 space-y-4">
        <div className="soft-card p-5">
          <div className="text-sm text-gray-500">Dashboard</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <Stat label="Tasks Completed" value={stats.done} sub="(current project)" />
            <Stat label="In Progress" value={stats.inprog} sub="now" />
            <Stat label="Overdue" value={stats.overdue} sub="past due" />
            <Stat label="API" value={health?.status || "ok"} sub="/healthz" />
          </div>
        </div>

        <div className="soft-card p-5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm text-gray-500">Recent Tasks</div>
            <input 
              className="input w-64" 
              placeholder="Search tasks or ID…" 
              value={q} 
              onChange={e=>setQ(e.target.value)} 
            />
          </div>
          <div className="hr my-4"></div>
          {loading ? (
            <div className="text-sm text-gray-500">Loading tasks...</div>
          ) : (
            <div className="grid gap-3">
              {filtered.length === 0 ? (
                <div className="text-sm text-gray-500">No tasks found.</div>
              ) : (
                filtered.map(t => <TaskItem key={t.id} t={t} />)
              )}
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500">
          API status: {health?.status ?? "ok"} • {tasks.length} tasks loaded
        </div>
      </main>

      <CreateTaskModal
        open={openModal}
        onClose={()=>setOpenModal(false)}
        projectId={projectId}
        onCreated={()=>loadTasks(projectId)}
      />
    </div>
  );
}
