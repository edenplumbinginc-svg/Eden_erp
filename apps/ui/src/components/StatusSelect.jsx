import { useState } from "react";
import { api } from "../lib/api";

async function patchTask(id, payload) {
  try {
    const r = await api.patch(`/api/tasks/${id}`, payload);
    return r.data;
  } catch (err) {
    console.error(err);
    throw new Error("Update failed");
  }
}

export default function StatusSelect({ task, projectId, onChange }) {
  const [value, setValue] = useState(task.status || "todo");
  const [saving, setSaving] = useState(false);
  
  const options = [
    { k: "todo", label: "To do" },
    { k: "in_progress", label: "In progress" },
    { k: "blocked", label: "Blocked" },
    { k: "complete", label: "Complete" },
    { k: "cancelled", label: "Cancelled" },
  ];

  async function handleChange(e) {
    const next = e.target.value;
    setValue(next); // optimistic
    setSaving(true);
    
    try {
      const updated = await patchTask(task.id, { status: next });
      onChange?.(updated || { ...task, status: next });
    } catch (err) {
      console.error(err);
      alert("Could not update status.");
      setValue(task.status || "todo"); // rollback
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      className="input h-9 w-[170px]"
      value={value}
      onChange={handleChange}
      disabled={saving}
      title="Change status"
    >
      {options.map(o => <option key={o.k} value={o.k}>{o.label}</option>)}
    </select>
  );
}
