import React, { useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService, api } from "../services/api";
import Countdown from "../components/Countdown";
import Alert from "../components/Alert";
import Checklist from "../components/Checklist";
import { useToaster } from "../components/Toaster";
import HandoffModal from "../components/HandoffModal";
import Breadcrumbs from "../components/Breadcrumbs";
import InlineEdit from "../components/InlineEdit";
import InlineAssigneeEdit from "../components/InlineAssigneeEdit";
import ConfirmDialog from "../components/ConfirmDialog";
import TagsEditor from "../components/TagsEditor";
import BallHistoryPanel from "../components/BallHistoryPanel";
import TaskSlaBanner from "../components/TaskSlaBanner";
import VoiceRecorder from "../components/VoiceRecorder";
import VoiceNotesList from "../components/VoiceNotesList";
import FeatureGate from "../components/FeatureGate";
import { getStatusLabel } from "../constants/statusLabels";
import { useHasPermission } from "../hooks/usePermissions";
import RequirePermission from "../components/RequirePermission";

function TaskMetadata({ task }) {
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiService.getProjects().then(res => res.data?.items || [])
  });

  const project = projects.find(p => p.id === task?.project_id);

  return (
    <div className="card">
      <div className="font-semibold mb-3">Task Details</div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-caption text-muted">Project</div>
          <div className="text-body font-medium">{project?.name || project?.title || 'No project'}</div>
        </div>
        <div>
          <div className="text-caption text-muted">Department</div>
          <div className="text-body font-medium">{task?.department || 'Not assigned'}</div>
        </div>
        <div>
          <div className="text-caption text-muted">Status</div>
          <div className="text-body font-medium">{getStatusLabel(task?.status)}</div>
        </div>
        <div>
          <div className="text-caption text-muted">Priority</div>
          <div className="text-body font-medium capitalize">{task?.priority || 'Normal'}</div>
        </div>
        <div>
          <div className="text-caption text-muted">Due Date</div>
          <div className="text-body font-medium">
            {task?.due_at ? new Date(task.due_at).toLocaleDateString() : 'No due date'}
          </div>
        </div>
        <div>
          <div className="text-caption text-muted">Created</div>
          <div className="text-body font-medium">
            {task?.created_at ? new Date(task.created_at).toLocaleDateString() : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const canComment = useHasPermission('task.comment');
  const canDeleteComment = useHasPermission('task.delete');
  
  const { data } = useQuery({
    queryKey: ["comments", taskId],
    queryFn: async () => apiService.getTaskComments(taskId),
  });

  const [body, setBody] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

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

  const deleteComment = useMutation({
    mutationFn: async (commentId) => apiService.deleteComment(commentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", taskId] });
      push("success", "Comment deleted");
    },
    onError: (error) => {
      push("error", error?.response?.data?.error?.message || "Failed to delete comment");
    }
  });

  return (
    <div className="space-y-3">
      <div className="font-semibold">Comments</div>
      <div className="space-y-2">
        {Array.isArray(data) && data.length > 0 ? data.map(c => (
          <div key={c.id} className="p-2 border rounded flex items-start justify-between group">
            <div className="flex-1">
              <div className="text-body">{c.body}</div>
              <div className="text-caption text-muted">{new Date(c.created_at || c.createdAt).toLocaleString()}</div>
            </div>
            {canDeleteComment && (
              <RequirePermission resource="tasks" action="delete">
                <button
                  className="btn-icon text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setDeleteConfirm(c.id)}
                  title="Delete comment"
                >
                  🗑️
                </button>
              </RequirePermission>
            )}
          </div>
        )) : <div className="text-body text-muted">No comments yet.</div>}
      </div>
      {canComment && (
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
      )}
      
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteComment.mutate(deleteConfirm)}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        danger={true}
      />
    </div>
  );
}

function getFileIcon(mime) {
  if (mime?.startsWith('image/')) return '🖼️';
  if (mime?.startsWith('video/')) return '🎥';
  if (mime?.startsWith('audio/')) return '🎵';
  if (mime?.includes('pdf')) return '📄';
  if (mime?.includes('word') || mime?.includes('document')) return '📝';
  if (mime?.includes('sheet') || mime?.includes('excel')) return '📊';
  if (mime?.includes('zip') || mime?.includes('archive')) return '📦';
  return '📎';
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function Attachments({ taskId }) {
  const qc = useQueryClient();
  const { push } = useToaster();
  const canEdit = useHasPermission('task.edit');
  const uploadRef = useRef();
  const [file, setFile] = useState(null);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadErr, setUploadErr] = useState(null);
  const [uploadOk, setUploadOk] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

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
      setPreviewUrl(null);
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

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0] ?? null;
    setFile(selectedFile);
    
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result);
      reader.readAsDataURL(selectedFile);
    } else {
      setPreviewUrl(null);
    }
  };

  const files = data?.files || data || [];

  return (
    <div className="space-y-3">
      <div className="font-semibold">Attachments</div>
      {files.length === 0 ? <div className="text-body text-muted">No files yet.</div> :
        <ul className="space-y-2">
          {files.map(f => {
            const mime = f.mime || f.mimeType;
            const size = f.size_bytes || f.sizeBytes;
            const name = f.file_name || f.fileName || f.path;
            const isImage = mime?.startsWith('image/');
            
            return (
              <li key={f.id} className="border rounded p-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{getFileIcon(mime)}</div>
                  <div className="flex-1">
                    <div className="text-body font-medium">{name}</div>
                    <div className="text-caption text-muted">{formatFileSize(size)} • {mime || 'Unknown type'}</div>
                    {isImage && f.url && (
                      <img 
                        src={f.url} 
                        alt={name} 
                        className="mt-2 max-w-xs rounded border"
                        style={{ maxHeight: '200px' }}
                      />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      }
      
      {canEdit && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              ref={uploadRef}
              type="file"
              onChange={handleFileChange}
              className="text-body"
            />
            <button
              className="btn btn-primary"
              disabled={!file || uploadFile.isPending}
              onClick={() => file && uploadFile.mutate(file)}>
              {uploadFile.isPending ? "Uploading…" : "Upload"}
            </button>
          </div>

        {previewUrl && (
          <div>
            <div className="text-caption text-muted mb-1">Preview:</div>
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="max-w-xs rounded border"
              style={{ maxHeight: '150px' }}
            />
          </div>
        )}

        {uploadFile.isPending && (
          <div>
            <div className="flex justify-between text-caption text-muted mb-1">
              <span>Uploading {file?.name}...</span>
              <span>{uploadPct}%</span>
            </div>
            <div className="h-2 w-full bg-gray-200 rounded overflow-hidden">
              <div
                className="h-2 bg-primary rounded transition-all duration-300"
                style={{ width: `${uploadPct}%` }}
              />
            </div>
          </div>
        )}

        {uploadErr && (
          <div className="mt-2"><Alert>{uploadErr}</Alert></div>
        )}
          {uploadOk && (
            <div className="mt-2"><Alert kind="success">Upload complete!</Alert></div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TaskDetail() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { push } = useToaster();

  const canEditTask = useHasPermission('task.edit');
  const canDeleteTask = useHasPermission('task.delete');
  const canNudge = useHasPermission('admin:manage');

  const { data: task, isLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => apiService.getTask(taskId),
    enabled: !!taskId
  });

  const updateTask = useMutation({
    mutationFn: async (updates) => apiService.updateTask(taskId, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task", taskId] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      push("success", "Task updated successfully");
    },
    onError: (error) => {
      push("error", error?.response?.data?.error?.message || "Failed to update task");
    }
  });

  const [invite, setInvite] = useState(null);
  const [inviteErr, setInviteErr] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [handoffModalOpen, setHandoffModalOpen] = useState(false);

  if (!taskId) {
    return <div className="mx-auto max-w-6xl p-4"><h2>No task ID provided</h2></div>;
  }

  if (isLoading) {
    return <div className="mx-auto max-w-6xl p-4"><h2>Loading task...</h2></div>;
  }

  const breadcrumbs = [
    { label: 'All Tasks', path: '/alltasks' },
    { label: task?.title || 'Task', path: `/task/${taskId}` }
  ];

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-6">
      <div className="task-detail-header">
        <Breadcrumbs items={breadcrumbs} />
        <button 
          className="btn btn-secondary" 
          onClick={() => navigate('/alltasks')}
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          ← Back to All Tasks
        </button>
      </div>

      <TaskSlaBanner taskId={taskId} canNudge={canNudge} />

      <div className="task-detail-main">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2">
            {canEditTask ? (
              <InlineEdit
                value={task?.title}
                onSave={(newTitle) => updateTask.mutateAsync({ title: newTitle })}
                className="flex-1"
                displayClassName="text-xl font-semibold"
                placeholder="Enter task title..."
              />
            ) : (
              <h1 className="text-xl font-semibold">{task?.title}</h1>
            )}
            {task?.origin && (
              <span className="text-caption px-2 py-0.5 rounded bg-blue-50 border border-blue-300 text-blue-700">
                {task.origin === 'voice' ? '🎤 Voice' : task.origin === 'email' ? '📧 Email' : '💻 UI'}
              </span>
            )}
          </div>
          {canEditTask ? (
            <>
              <InlineEdit
                value={task?.description}
                onSave={(newDescription) => updateTask.mutateAsync({ description: newDescription })}
                multiline
                className="w-full"
                displayClassName="text-body text-muted"
                placeholder="Add a description..."
              />
              <InlineAssigneeEdit
                value={task?.assigned_to}
                onSave={(newAssignee) => updateTask.mutateAsync({ assigned_to: newAssignee })}
              />
              <TagsEditor
                tags={task?.tags}
                onSave={(newTags) => updateTask.mutateAsync({ tags: newTags })}
              />
            </>
          ) : (
            <>
              {task?.description && (
                <p className="text-body text-muted">{task.description}</p>
              )}
              {task?.assigned_to && (
                <div className="text-body">
                  <span className="text-muted">Assigned to: </span>
                  <span>{task.assigned_to}</span>
                </div>
              )}
              {task?.tags && task.tags.length > 0 && (
                <div className="flex gap-2">
                  {task.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-100 rounded text-caption">{tag}</span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <div className="task-detail-actions">
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

      <TaskMetadata task={task} />

      <BallHistoryPanel taskId={taskId} />

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Checklist taskId={taskId} />
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

      <FeatureGate feature="voiceToText">
        <div className="space-y-6">
          <RequirePermission resource="voice" action="create" fallback={null}>
            <VoiceRecorder 
              taskId={taskId} 
              onSuccess={() => {
                qc.invalidateQueries({ queryKey: ['voiceNotes', taskId] });
              }}
            />
          </RequirePermission>
          
          <RequirePermission resource="voice" action="read" fallback={null}>
            <VoiceNotesList taskId={taskId} />
          </RequirePermission>
        </div>
      </FeatureGate>

      <HandoffModal
        isOpen={handoffModalOpen}
        onClose={() => setHandoffModalOpen(false)}
        task={task}
      />
    </div>
  );
}
