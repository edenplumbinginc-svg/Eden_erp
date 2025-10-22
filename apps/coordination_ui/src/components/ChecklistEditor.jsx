import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiService } from "../services/api";

export default function ChecklistEditor({ taskId, canEdit }) {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["subtasks", taskId],
    queryFn: () => apiService.listSubtasks(taskId),
    enabled: !!taskId
  });

  const [title, setTitle] = useState("");

  const mCreate = useMutation({
    mutationFn: (t) => apiService.createSubtask(taskId, { title: t }),
    onSuccess: () => { 
      setTitle(""); 
      qc.invalidateQueries({ queryKey: ["subtasks", taskId] }); 
    }
  });

  const mToggle = useMutation({
    mutationFn: ({ id, done }) => apiService.updateSubtask(id, { done }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subtasks", taskId] })
  });

  const mRename = useMutation({
    mutationFn: ({ id, title }) => apiService.updateSubtask(id, { title }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subtasks", taskId] })
  });

  const mDelete = useMutation({
    mutationFn: (id) => apiService.deleteSubtask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subtasks", taskId] })
  });

  return (
    <div className="space-y-3">
      <div className="font-semibold">Checklist</div>

      {isLoading ? <div className="text-sm text-gray-500">Loading…</div> : (
        <ul className="space-y-2">
          {items.length === 0 && <li className="text-sm text-gray-500">No checklist yet.</li>}
          {items.map(it => (
            <li key={it.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={!!it.done}
                disabled={!canEdit || mToggle.isPending}
                onChange={e => mToggle.mutate({ id: it.id, done: e.target.checked })}
              />
              {canEdit ? (
                <input
                  className="border rounded px-2 py-1 flex-1"
                  value={it.title || ""}
                  onChange={e => mRename.mutate({ id: it.id, title: e.target.value })}
                />
              ) : (
                <span className={it.done ? "line-through text-gray-500" : ""}>{it.title}</span>
              )}
              {canEdit && (
                <button
                  className="text-xs px-2 py-1 border rounded"
                  onClick={() => mDelete.mutate(it.id)}
                  disabled={mDelete.isPending}
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="flex items-center gap-2">
          <input
            className="border rounded px-2 py-1 flex-1"
            placeholder="New checklist item…"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <button
            className="px-3 py-1 rounded border"
            onClick={() => title.trim() && mCreate.mutate(title.trim())}
            disabled={mCreate.isPending}
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
