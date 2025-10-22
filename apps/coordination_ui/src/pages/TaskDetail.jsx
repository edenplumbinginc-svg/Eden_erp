import React, { useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService, api } from "../services/api";
import Countdown from "../components/Countdown";
import Alert from "../components/Alert";
import ChecklistEditor from "../components/ChecklistEditor";
import { useToaster } from "../components/Toaster";
import HandoffModal from "../components/HandoffModal";
import Breadcrumbs from "../components/Breadcrumbs";

function daysSince(ts) {
  if (!ts) return null;
  const ms = Date.now() - new Date(ts).getTime();
  return Math.max(0, Math.floor(ms / (1000*60*60*24)));
}

function BallInCourt({ task }) {
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiService.getUsers();
      return response.data || response;
    }
  });

  const type = task?.ball_owner_type || (task?.ballOwnerType ?? null);
  const id   = task?.ball_owner_id   || (task?.ballOwnerId   ?? null);
  const since= task?.ball_since      || (task?.ballSince     ?? null);
  const d = daysSince(since);
  
  let label = "—";
  if (type && id) {
    if (type === 'user') {
      const user = users.find(u => u.id === id);
      label = user ? (user.name || user.email) : `User (${id.substring(0, 8)})`;
    } else {
      label = `${type}:${id.substring(0, 8)}`;
    }
  } else if (task?.ball_in_court) {
    const user = users.find(u => u.id === task.ball_in_court);
    label = user ? (user.name || user.email) : `User (${task.ball_in_court.substring(0, 8)})`;
  } else if (task?.department) {
    label = task.department;
  }
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-body font-medium">Ball in Court:</span>
      <span className="text-caption px-2 py-0.5 rounded bg-amber-50 border border-amber-300">
        {label}{d !== null ? ` • ${d} day${d===1?"":"s"}` : ""}
      </span>
    </div>
  );
}

function Comments({ taskId }) {
  const qc = useQueryClient();
  const { push } = useToaster();
  const { data } = useQuery({
    queryKey: ["comments", taskId],
    queryFn: async () => apiService.getTaskComments(taskId),
  });

  const [body, setBody] = useState("");

  const createComment = useMutation({
    mutationFn: async ({ body }) => apiService.createTaskComment(taskId, { body }),
    onSuccess: () => { 
      setBody(""); 
      qc.invalidateQueries({ queryKey: ["comments", taskId] }); 
      push("success", "Comment posted");
    },
    onError: (error) => {
      push("error", error?.response?.data?.error?.message || "Failed to post comment");
    }
  });

  return (
    <div className="space-y-3">
      <div className="font-semibold">Comments</div>
      <div className="space-y-2">
        {Array.isArray(data) && data.length > 0 ? data.map(c => (
          <div key={c.id} className="p-2 border rounded">
            <div className="text-body">{c.body}</div>
            <div className="text-caption text-muted">{new Date(c.created_at || c.createdAt).toLocaleString()}</div>
          </div>
        )) : <div className="text-body text-muted">No comments yet.</div>}
      </div>
      <div className="flex gap-2">
        <input
          className="border rounded px-2 py-1 flex-1"
          placeholder="Write a comment…"
          value={body}
          onChange={e => setBody(e.target.value)}
        />
        <button className="btn btn-primary"
          onClick={() => body.trim() && createComment.mutate({ body })}>
          Comment
        </button>
      </div>
    </div>
  );
}

function Attachments({ taskId }) {
  const qc = useQueryClient();
  const { push } = useToaster();
  const uploadRef = useRef();
  const [file, setFile] = useState(null);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadErr, setUploadErr] = useState(null);
  const [uploadOk, setUploadOk] = useState(false);

  const { data } = useQuery({
    queryKey: ["attachments", taskId],
    queryFn: async () => apiService.getTaskAttachments(taskId),
  });

  const uploadFile = useMutation({
    mutationFn: async (file) => {
      setUploadErr(null);
      setUploadOk(false);
      setUploadPct(0);

      const init = await apiService.initAttachmentUpload(taskId, {
        fileName: file.name,
        mime: file.type || "application/octet-stream",
        sizeBytes: file.size
      });

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", init.uploadUrl);
        if (file.type) xhr.setRequestHeader("Content-Type", file.type);
        xhr.upload.onprogress = (e) => {
          if (!e.lengthComputable) return;
          const pct = Math.round((e.loaded / e.total) * 100);
          setUploadPct(pct);
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(`Upload failed (${xhr.status})`));
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(file);
      });

      const done = await apiService.completeAttachmentUpload(taskId, {
        bucket: init.bucket,
        path: init.path,
        mime: file.type || "application/octet-stream",
        sizeBytes: file.size
      });

      return done;
    },
    onSuccess: () => {
      setUploadOk(true);
      setTimeout(() => setUploadOk(false), 3000);
      if (uploadRef.current) uploadRef.current.value = "";
      setFile(null);
      setUploadPct(0);
      qc.invalidateQueries({ queryKey: ["attachments", taskId] });
      push("success", "File uploaded successfully");
    },
    onError: (e) => {
      const msg = e?.response?.data?.error?.message || e.message || "Upload failed";
      setUploadErr(msg);
      push("error", msg);
    }
  });

  const files = data?.files || data || [];

  return (
    <div className="space-y-2">
      <div className="font-semibold">Attachments</div>
      {files.length === 0 ? <div className="text-body text-muted">No files yet.</div> :
        <ul className="space-y-2">
          {files.map(f => (
            <li key={f.id} className="flex items-center justify-between border rounded p-2">
              <div>
                <div className="text-body">{f.file_name || f.fileName || f.path}</div>
                <div className="text-caption text-muted">{f.mime} • {f.size_bytes || f.sizeBytes} bytes</div>
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
          className="btn btn-secondary"
          disabled={!file || uploadFile.isPending}
          onClick={() => file && uploadFile.mutate(file)}>
          {uploadFile.isPending ? "Uploading…" : "Upload file"}
        </button>
      </div>

      {uploadFile.isPending && (
        <div className="mt-2">
          <div className="h-2 w-full bg-gray-200 rounded">
            <div
              className="h-2 bg-black rounded"
              style={{ width: `${uploadPct}%`, transition: "width 120ms linear" }}
            />
          </div>
          <div className="text-caption text-muted mt-1">{uploadPct}%</div>
        </div>
      )}

      {uploadErr && (
        <div className="mt-2"><Alert>{uploadErr}</Alert></div>
      )}
      {uploadOk && (
        <div className="mt-2"><Alert kind="success">Upload complete.</Alert></div>
      )}
    </div>
  );
}

export default function TaskDetail() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { data: task, isLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => apiService.getTask(taskId),
    enabled: !!taskId
  });

  const [invite, setInvite] = useState(null);
  const [inviteErr, setInviteErr] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [handoffModalOpen, setHandoffModalOpen] = useState(false);

  if (!taskId) {
    return <div className="mx-auto max-w-6xl p-4">No task ID provided</div>;
  }

  if (isLoading) {
    return <div className="mx-auto max-w-6xl p-4">Loading task...</div>;
  }

  const breadcrumbs = [
    { label: 'All Tasks', path: '/alltasks' },
    { label: task?.title || 'Task', path: `/task/${taskId}` }
  ];

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-6">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Breadcrumbs items={breadcrumbs} />
        <button 
          className="btn btn-secondary" 
          onClick={() => navigate('/alltasks')}
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          ← Back to All Tasks
        </button>
      </div>

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-xl font-semibold">{task?.title || "Task"}</h2>
            {task?.origin && (
              <span className="text-caption px-2 py-0.5 rounded bg-blue-50 border border-blue-300 text-blue-700">
                {task.origin === 'voice' ? '🎤 Voice' : task.origin === 'email' ? '📧 Email' : '💻 UI'}
              </span>
            )}
          </div>
          <div className="text-body text-muted">{task?.description}</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <BallInCourt task={task} />
          <button
            className="btn btn-primary"
            onClick={() => setHandoffModalOpen(true)}
          >
            Pass Ball 🏀
          </button>
        </div>
      </div>

      {task?.voice_transcript && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="font-semibold text-purple-900 mb-2">🎤 Voice Note Transcript</div>
          <p className="text-body text-purple-800 italic">{task.voice_transcript}</p>
          {task?.voice_url && (
            <div className="mt-3">
              <audio controls className="w-full max-w-md">
                <source src={task.voice_url} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}
        </div>
      )}

      {task?.ball_in_court_note && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="font-semibold text-amber-900 mb-2">🏀 Ball in Court Note</div>
          <p className="text-body text-amber-800">{task.ball_in_court_note}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <ChecklistEditor taskId={taskId} canEdit={true} />
          <Comments taskId={taskId} />
        </div>
        <div className="space-y-6">
          <Attachments taskId={taskId} />

          <div className="space-y-2">
            <div className="font-semibold">Guest Invite</div>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-secondary"
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
              {inviteErr && <span className="text-body text-red-600">{inviteErr}</span>}
            </div>

            {invite && (
              <div className="card">
                <div className="text-caption text-muted mb-1">Expires in: <Countdown target={invite.expiresAt} /></div>
                <div className="flex items-center gap-2">
                  <input
                    className="border p-1 rounded w-full text-body"
                    readOnly
                    value={invite.url}
                    onFocus={(e)=>e.target.select()}
                  />
                  <button
                    className="btn btn-primary"
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

      <HandoffModal
        isOpen={handoffModalOpen}
        onClose={() => setHandoffModalOpen(false)}
        task={task}
      />
    </div>
  );
}
