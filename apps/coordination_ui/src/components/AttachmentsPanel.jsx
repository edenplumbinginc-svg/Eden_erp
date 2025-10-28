import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FeatureGate from "./FeatureGate";
import RoutePermission from "./RoutePermission";
import RequirePermission from "./RequirePermission";
import { api } from "../services/api";
import { useParams } from "react-router-dom";

function humanFileSize(bytes) {
  if (!Number.isFinite(bytes)) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0, n = bytes;
  while (n >= 1024 && i < units.length - 1) { 
    n /= 1024; 
    i++; 
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function AttachmentsUploader({ taskId, onUploaded }) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: async (file) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post(`/tasks/${taskId}/files`, fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      return res.data.item;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task", taskId, "files"] });
      qc.invalidateQueries({ queryKey: ["tasks", "list"] });
      onUploaded?.();
    },
    onError: (error) => {
      console.error("Upload failed:", error);
    }
  });

  const onSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) m.mutate(file);
  };

  return (
    <div className="flex items-center gap-2">
      <input
        id="task-file"
        type="file"
        className="hidden"
        onChange={onSelect}
        accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.csv,.xlsx"
      />
      <label htmlFor="task-file" className="cursor-pointer px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50 transition-colors">
        Upload file
      </label>
      {m.isPending && <span className="text-xs opacity-70">Uploading…</span>}
      {m.isError && <span className="text-xs text-red-600">Upload failed</span>}
    </div>
  );
}

export default function AttachmentsPanel() {
  const { taskId } = useParams();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["task", taskId, "files"],
    queryFn: async () => {
      const res = await api.get(`/tasks/${taskId}/files`);
      return res.data.items;
    },
    staleTime: 30_000,
    enabled: !!taskId
  });

  return (
    <FeatureGate feature="taskAttachments">
      <RoutePermission resource="tasks.files" action="read" fallback={null}>
        <section className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold">Attachments</h3>
            {/* Upload only if user can create */}
            <RequirePermission resource="tasks.files" action="create" fallback={null}>
              <AttachmentsUploader taskId={taskId} onUploaded={() => refetch()} />
            </RequirePermission>
          </div>

          {isLoading && <div className="text-sm opacity-70">Loading attachments…</div>}
          {isError && <div className="text-sm text-red-600">Failed to load attachments.</div>}
          {!isLoading && !isError && (!data || data.length === 0) && (
            <div className="text-sm opacity-70">No attachments yet.</div>
          )}
          <ul className="mt-2 space-y-2">
            {data?.map(it => (
              <li key={it.id} className="flex items-center justify-between border rounded-lg p-2">
                <div className="min-w-0">
                  <div className="truncate text-sm">{it.filename}</div>
                  <div className="text-xs opacity-70">{humanFileSize(it.size)} • {it.mime}</div>
                </div>
                {/* v1 direct link; replace with signed download route later */}
                <a href={it.url} className="text-sm underline" rel="noopener">
                  Download
                </a>
              </li>
            ))}
          </ul>
        </section>
      </RoutePermission>
    </FeatureGate>
  );
}
