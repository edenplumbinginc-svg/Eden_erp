import React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "../services/api";

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => apiService.getProject(projectId),
    enabled: !!projectId
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["project_tasks", projectId],
    queryFn: () => apiService.listProjectTasks(projectId),
    enabled: !!projectId
  });

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{project?.name || "Project"}</h1>
          <div className="text-body text-muted">Code: {project?.code}</div>
        </div>
        <button className="text-body underline" onClick={() => navigate(-1)}>Back</button>
      </div>

      <div className="space-y-2">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
          <div className="font-semibold">Tasks</div>
          <Link to={`/tasks/new?project=${projectId}`} className="btn btn-primary">
            + Create Task
          </Link>
        </div>
        {isLoading ? (
          <div className="text-body text-muted">Loading…</div>
        ) : tasks.length === 0 ? (
          <div className="text-body text-muted">No tasks yet.</div>
        ) : (
          <ul className="divide-y border rounded bg-white">
            {tasks.map(t => (
              <li key={t.id} className="p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{t.title}</div>
                  <div className="text-caption text-muted">
                    {t.status} • due {t.due_at ? new Date(t.due_at).toLocaleDateString() : "—"}
                  </div>
                </div>
                <Link
                  className="px-3 py-1 rounded border text-body"
                  to={`/task/${t.id}`}
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
