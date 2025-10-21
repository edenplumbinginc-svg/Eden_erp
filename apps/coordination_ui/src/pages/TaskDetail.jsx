import React, { useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "../services/api";
import Countdown from "../components/Countdown";

function Badge({ children, title }) {
  return <span title={title} className="text-xs px-2 py-0.5 rounded bg-gray-100 border">{children}</span>;
}

function BallInCourt({ task }) {
  const label = task?.ball_in_court ?? (task?.ballOwnerType ? `${task.ballOwnerType}:${task.ballOwnerId}` : "—");
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">Ball in Court:</span>
      <Badge title="Active owner separate from assignee">{label}</Badge>
    </div>
  );
}

function Checklist({ task }) {
  const items = Array.isArray(task?.checklist) ? task.checklist : [];
  return (
    <div className="space-y-2">
      <div className="font-semibold">Checklist</div>
      {items.length === 0 ? <div className="text-sm text-gray-500">No checklist yet.</div> :
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li key={i} className="flex items-center gap-2">
              <input type="checkbox" checked={!!it.done} readOnly className="h-4 w-4" />
              <span className={it.done ? "line-through text-gray-500" : ""}>{it.title || `Item ${i+1}`}</span>
            </li>
          ))}
        </ul>
      }
    </div>
  );
}

function Comments({ taskId }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["comments", taskId],
    queryFn: async () => apiService.getTaskComments(taskId),
  });

  const [body, setBody] = useState("");

  const createComment = useMutation({
    mutationFn: async ({ body }) => apiService.createTaskComment(taskId, { body }),
    onSuccess: () => { setBody(""); qc.invalidateQueries({ queryKey: ["comments", taskId] }); }
  });

  return (
    <div className="space-y-3">
      <div className="font-semibold">Comments</div>
      <div className="space-y-2">
        {Array.isArray(data) && data.length > 0 ? data.map(c => (
          <div key={c.id} className="p-2 border rounded">
            <div className="text-sm">{c.body}</div>
            <div className="text-xs text-gray-500">{new Date(c.created_at || c.createdAt).toLocaleString()}</div>
          </div>
        )) : <div className="text-sm text-gray-500">No comments yet.</div>}
      </div>
      <div className="flex gap-2">
        <input
          className="border rounded px-2 py-1 flex-1"
          placeholder="Write a comment…"
          value={body}
          onChange={e => setBody(e.target.value)}
        />
        <button className="px-3 py-1 rounded bg-black text-white"
          onClick={() => body.trim() && createComment.mutate({ body })}>
          Comment
        </button>
      </div>
    </div>
  );
}

function Attachments({ taskId }) {
  const qc = useQueryClient();
  const uploadRef = useRef();
  const [file, setFile] = useState(null);

  const { data } = useQuery({
    queryKey: ["attachments", taskId],
    queryFn: async () => apiService.getTaskAttachments(taskId),
  });

  const uploadFile = useMutation({
    mutationFn: async (file) => {
      const init = await apiService.initAttachmentUpload(taskId, {
        fileName: file.name,
        mime: file.type,
        sizeBytes: file.size
      });

      await fetch(init.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type }
      });

      return apiService.completeAttachmentUpload(taskId, {
        bucket: init.bucket,
        path: init.path,
        mime: file.type,
        sizeBytes: file.size
      });
    },
    onSuccess: () => {
      if (uploadRef.current) uploadRef.current.value = "";
      setFile(null);
      qc.invalidateQueries({ queryKey: ["attachments", taskId] });
    }
  });

  const files = data?.files || data || [];

  return (
    <div className="space-y-2">
      <div className="font-semibold">Attachments</div>
      {files.length === 0 ? <div className="text-sm text-gray-500">No files yet.</div> :
        <ul className="space-y-2">
          {files.map(f => (
            <li key={f.id} className="flex items-center justify-between border rounded p-2">
              <div>
                <div className="text-sm">{f.file_name || f.fileName || f.path}</div>
                <div className="text-xs text-gray-500">{f.mime} • {f.size_bytes || f.sizeBytes} bytes</div>
              </div>
            </li>
          ))}
        </ul>
      }
      <div className="flex items-center gap-2">
        <input
          ref={uploadRef}
          type="file"
          accept="image/*,video/*,audio/*,application/pdf"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
        />
        <button
          className="px-3 py-1 rounded border disabled:opacity-50"
          disabled={!file || uploadFile.isPending}
          onClick={() => file && uploadFile.mutate(file)}>
          {uploadFile.isPending ? "Uploading…" : "Upload file"}
        </button>
      </div>
    </div>
  );
}

export default function TaskDetail() {
  const { taskId } = useParams();
  const { data: task, isLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => apiService.getTask(taskId),
    enabled: !!taskId
  });

  const [invite, setInvite] = useState(null);
  const [inviteErr, setInviteErr] = useState(null);
  const [inviting, setInviting] = useState(false);

  if (!taskId) {
    return <div className="mx-auto max-w-6xl p-4">No task ID provided</div>;
  }

  if (isLoading) {
    return <div className="mx-auto max-w-6xl p-4">Loading task...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">{task?.title || "Task"}</h2>
          <div className="text-sm text-gray-600">{task?.description}</div>
        </div>
        <BallInCourt task={task} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Checklist task={task} />
          <Comments taskId={taskId} />
        </div>
        <div className="space-y-6">
          <Attachments taskId={taskId} />

          <div className="space-y-2">
            <div className="font-semibold">Guest Invite</div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1 rounded border"
                disabled={inviting}
                onClick={async () => {
                  try {
                    setInviting(true);
                    setInviteErr(null);
                    const res = await apiService.createGuestLink({ scope: "task", id: taskId, expiresIn: "7d" });
                    setInvite(res);
                  } catch (e) {
                    setInviteErr(e?.response?.data?.error?.message || e.message);
                    setInvite(null);
                  } finally {
                    setInviting(false);
                  }
                }}
              >
                {inviting ? "Generating…" : "Generate guest link"}
              </button>
              {inviteErr && <span className="text-sm text-red-600">{inviteErr}</span>}
            </div>

            {invite && (
              <div className="rounded border p-3 bg-white">
                <div className="text-xs text-gray-500 mb-1">Expires in: <Countdown target={invite.expiresAt} /></div>
                <div className="flex items-center gap-2">
                  <input
                    className="border p-1 rounded w-full text-sm"
                    readOnly
                    value={invite.url}
                    onFocus={(e)=>e.target.select()}
                  />
                  <button
                    className="px-2 py-1 rounded bg-black text-white text-sm"
                    onClick={() => navigator.clipboard.writeText(invite.url)}
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
