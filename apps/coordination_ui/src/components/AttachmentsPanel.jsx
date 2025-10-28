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
      qc.invalidateQueries({ queryKey: ["tasks"] });
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

  const onDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) m.mutate(file);
  };

  return (
    <div
      className="border rounded-xl p-4 mt-3"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <div className="flex items-center gap-3">
        <input
          id="task-file"
          type="file"
          className="hidden"
          onChange={onSelect}
          accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.csv,.xlsx"
        />
        <label 
          htmlFor="task-file" 
          className="cursor-pointer px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
          style={{ cursor: m.isPending ? 'not-allowed' : 'pointer' }}
        >
          {m.isPending ? "Uploading..." : "Upload file"}
        </label>
        {m.isError && <span className="text-xs text-red-600">Upload failed</span>}
      </div>
      <p className="mt-2 text-xs opacity-70">
        Max 10MB. Allowed: pdf, jpg, jpeg, png, webp, heic, csv, xlsx. Drag & drop supported.
      </p>
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
          <div className="mb-2">
            <h3 className="text-base font-semibold">Attachments</h3>
          </div>

          {isLoading && <div className="text-sm opacity-70">Loading attachments…</div>}
          {isError && <div className="text-sm text-red-600">Failed to load attachments.</div>}
          {!isLoading && !isError && (!data || data.length === 0) && (
            <div className="text-sm opacity-70">No attachments yet.</div>
          )}
          
          {!isLoading && !isError && data && data.length > 0 && (
            <ul className="mt-2 space-y-2">
              {data.map(it => (
                <li key={it.id} className="flex items-center justify-between border rounded-lg p-3 bg-white">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{it.filename}</div>
                    <div className="text-xs opacity-70 mt-0.5">
                      {humanFileSize(it.size)} • {it.mime}
                    </div>
                  </div>
                  <a 
                    href={it.url} 
                    className="text-sm underline ml-3 flex-shrink-0" 
                    rel="noopener"
                    download={it.filename}
                  >
                    Download
                  </a>
                </li>
              ))}
            </ul>
          )}

          <RequirePermission resource="tasks.files" action="create" fallback={null}>
            <AttachmentsUploader taskId={taskId} onUploaded={() => refetch()} />
          </RequirePermission>
        </section>
      </RoutePermission>
    </FeatureGate>
  );
}
