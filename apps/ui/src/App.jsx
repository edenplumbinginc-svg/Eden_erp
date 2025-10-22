import { useEffect, useMemo, useState } from "react";
import { api, getJSON } from "./lib/api";
import CreateTaskModal from "./components/CreateTaskModal";
import StatusSelect from "./components/StatusSelect";
import BICChip from "./components/BICChip";

function Stat({label, value, sub}) {
  return (
    <div className="soft-panel p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl mt-1">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function OverdueBadge({ due_at, status }) {
  if (!due_at) return null;
  const overdue = new Date(due_at) < new Date() && String(status).toLowerCase() !== "complete";
  if (!overdue) return null;
  return (
    <span className="inline-flex items-center px-2 h-6 rounded-full bg-red-50 text-red-700 text-xs border border-red-200">
      Overdue
    </span>
  );
}

function IdleBadge({ needsIdleReminder }) {
  if (!needsIdleReminder) return null;
  return (
    <span className="inline-flex items-center px-2 h-6 rounded-full bg-yellow-50 text-yellow-700 text-xs border border-yellow-200">
      Idle
    </span>
  );
}

function TaskItem({ t, projectId, onChanged }) {
  const [snoozingIdle, setSnoozingIdle] = useState(false);
  const dueISO = t.due_at ? new Date(t.due_at).toISOString().slice(0,10) : "—";
  
  const handleSnoozeIdle = async () => {
    setSnoozingIdle(true);
    try {
      await api.put(`/api/tasks/${t.id}/snooze_idle`, {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 3 })
      });
      onChanged();
    } catch (err) {
      console.error('[SnoozeIdle] Error:', err);
      alert('Failed to snooze idle reminder');
    } finally {
      setSnoozingIdle(false);
    }
  };
  
  return (
    <div className="soft-panel p-4 hover:bg-gray-100 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="text-[15px]">{t.title}</div>
          <div className="mt-1 flex items-center gap-2">
            <BICChip value={t.ball_in_court || t.bic} />
            <OverdueBadge due_at={t.due_at} status={t.status} />
            <IdleBadge needsIdleReminder={t.needs_idle_reminder} />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Due {dueISO} • {t.priority ?? "—"} • ID {t.id.slice(0,8)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {t.needs_idle_reminder && (
            <button
              className="btn text-xs px-2 py-1"
              style={{background: "#fefce8", border: "1px solid #fde047"}}
              onClick={handleSnoozeIdle}
              disabled={snoozingIdle}
              title="Snooze idle reminder for 3 days"
            >
              {snoozingIdle ? "..." : "Snooze 3d"}
            </button>
          )}
          <StatusSelect task={t} projectId={projectId} onChange={onChanged} />
        </div>
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
  const [recomputingOverdue, setRecomputingOverdue] = useState(false);
  const [tasksGroupBy, setTasksGroupBy] = useState("status");
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  // Load user preferences and projects
  useEffect(() => {
    (async () => {
      const hz = await getJSON("/healthz");
      setHealth(hz || { status: "ok" });
      
      // Load user preferences
      try {
        const prefs = await getJSON("/api/me/preferences");
        if (prefs?.ok && prefs?.data) {
          if (prefs.data.tasks_group_by) setTasksGroupBy(prefs.data.tasks_group_by);
        }
      } catch (err) {
        console.log('[Preferences] Failed to load, using defaults');
      }
      setLoadingPrefs(false);
      
      // Fetch projects
      const p = await getJSON("/api/projects", { limit: 50 });
      const items = Array.isArray(p?.items) ? p.items : Array.isArray(p) ? p : [];
      setProjects(items);
      
      // Set default project from preferences or first project
      try {
        const prefs = await getJSON("/api/me/preferences");
        if (prefs?.ok && prefs?.data?.default_project_id && items.some(proj => proj.id === prefs.data.default_project_id)) {
          setProjectId(prefs.data.default_project_id);
        } else if (items.length && !projectId) {
          setProjectId(items[0].id);
        }
      } catch {
        if (items.length && !projectId) setProjectId(items[0].id);
      }
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

  async function handleRefreshOverdue() {
    setRecomputingOverdue(true);
    try {
      const res = await api.post('/api/ops/overdue/recompute');
      const data = await res.json();
      if (data.ok) {
        alert(`✓ Overdue flags updated\n${data.set_true} set to overdue\n${data.set_false} no longer overdue`);
        // Reload tasks to reflect updated overdue badges
        await loadTasks(projectId);
      } else {
        alert('Failed to refresh overdue flags');
      }
    } catch (err) {
      console.error('[RefreshOverdue] Error:', err);
      alert('Error refreshing overdue flags: ' + err.message);
    } finally {
      setRecomputingOverdue(false);
    }
  }

  async function handleGroupByChange(newGroupBy) {
    setTasksGroupBy(newGroupBy);
    try {
      await api.put('/api/me/preferences', {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks_group_by: newGroupBy })
      });
    } catch (err) {
      console.error('[Preferences] Failed to update group by:', err);
    }
  }

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
          <button 
            className="btn"
            style={{background: "#f3f4f6", border: "1px solid #e5e7eb"}}
            onClick={handleRefreshOverdue}
            disabled={recomputingOverdue}
            title="Recompute overdue flags for all tasks"
          >
            {recomputingOverdue ? "Refreshing..." : "Refresh Overdue"}
          </button>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Group:</label>
            <select
              className="input w-32"
              value={tasksGroupBy}
              onChange={(e) => handleGroupByChange(e.target.value)}
              disabled={loadingPrefs}
              title="Group tasks by"
            >
              <option value="status">Status</option>
              <option value="due">Due Date</option>
              <option value="none">None</option>
            </select>
          </div>
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
                filtered.map(t => (
                  <TaskItem
                    key={t.id}
                    t={t}
                    projectId={projectId}
                    onChanged={(updated) => {
                      setTasks(prev => prev.map(x => 
                        x.id === (updated?.id || t.id) 
                          ? { ...x, ...(updated || {}) } 
                          : x
                      ));
                    }}
                  />
                ))
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
