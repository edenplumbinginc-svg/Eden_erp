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

      {isLoading ? <div className="text-body text-muted">Loading…</div> : (
        <ul className="space-y-2">
          {items.length === 0 && <li className="text-body text-muted">No checklist yet.</li>}
          {items.map(it => (
            <li key={it.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                style={{height: '16px', width: '16px'}}
                checked={!!it.done}
                disabled={!canEdit || mToggle.isPending}
                onChange={e => mToggle.mutate({ id: it.id, done: e.target.checked })}
              />
              {canEdit ? (
                <input
                  className="flex-1"
                  style={{
                    border: '1px solid var(--md-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '4px 8px'
                  }}
                  value={it.title || ""}
                  onChange={e => mRename.mutate({ id: it.id, title: e.target.value })}
                />
              ) : (
                <span className={it.done ? "text-muted" : ""} style={it.done ? {textDecoration: 'line-through'} : {}}>{it.title}</span>
              )}
              {canEdit && (
                <button
                  className="text-caption btn btn-secondary"
                  style={{padding: '4px 8px'}}
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
            className="flex-1"
            style={{
              border: '1px solid var(--md-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 8px'
            }}
            placeholder="New checklist item…"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <button
            className="btn btn-secondary"
            style={{padding: '8px 12px'}}
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
