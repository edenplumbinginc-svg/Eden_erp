import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "../services/api";
import Breadcrumbs from "../components/Breadcrumbs";
import { getStatusLabel } from "../constants/statusLabels";
import RequirePermission from "../components/RequirePermission";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToaster } from "../components/Toaster";

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { push } = useToaster();
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

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

  const archiveMutation = useMutation({
    mutationFn: () => apiService.archiveProject(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      push("success", "Project archived successfully");
      setShowArchiveConfirm(false);
    },
    onError: (error) => {
      push("error", error?.response?.data?.error?.message || "Failed to archive project");
      setShowArchiveConfirm(false);
    }
  });

  const breadcrumbs = [
    { label: 'Projects', path: '/' },
    { label: project?.name || 'Project', path: `/project/${projectId}` }
  ];

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-6">
      <Breadcrumbs items={breadcrumbs} />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            {project?.name || "Project"}
            {project?.archived && (
              <span className="ml-2 text-xs px-2 py-1 border rounded bg-gray-100">
                Archived
              </span>
            )}
          </h1>
          <div className="text-body text-muted">Code: {project?.code}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <RequirePermission resource="archive" action="batch" fallback={null}>
            {!project?.archived && (
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowArchiveConfirm(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                📦 Archive
              </button>
            )}
          </RequirePermission>
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            ← Back to Projects
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        onConfirm={() => archiveMutation.mutate()}
        title="Archive Project"
        message={`Are you sure you want to archive "${project?.name}"? This will hide it from active project lists but won't delete any data.`}
        confirmText="Archive"
        cancelText="Cancel"
        danger={false}
      />

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
                    {getStatusLabel(t.status)} • due {t.due_at ? new Date(t.due_at).toLocaleDateString() : "—"}
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
