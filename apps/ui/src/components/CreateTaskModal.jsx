import { useState } from "react";
import { api } from "../lib/api";

export default function CreateTaskModal({ open, onClose, projectId, onCreated }) {
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  
  if (!open) return null;

  async function handleCreate() {
    if (!projectId) return alert("Pick a project first.");
    if (!title.trim()) return alert("Title required.");
    setSaving(true);
    
    try {
      // Use nested route: /api/projects/:id/tasks
      const res = await api.post(`/api/projects/${projectId}/tasks`, {
        title,
        status: "todo",
        priority: "normal",
      });
      onCreated?.(res.data);
      setTitle("");
      onClose?.();
    } catch (e) {
      console.error(e);
      alert("Create failed. Check console for details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="soft-card p-5 w-[480px]">
        <div className="text-lg font-medium">Create Task</div>
        <div className="mt-4">
          <input 
            className="input" 
            placeholder="Task title…" 
            value={title} 
            onChange={e=>setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
            {saving ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
