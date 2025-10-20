import React, { useState, useEffect } from 'react';
import { taskApi } from '../lib/api';
import { AttachmentsPanel } from './AttachmentsPanel';

interface TaskDetailDrawerProps {
  task: any;
  onClose: () => void;
  onUpdate: () => void;
}

export function TaskDetailDrawer({ task, onClose, onUpdate }: TaskDetailDrawerProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [ballHandoffId, setBallHandoffId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadComments();
  }, [task.id]);

  const loadComments = async () => {
    try {
      const data = await taskApi.getComments(task.id);
      setComments(data);
    } catch (err: any) {
      console.error('Failed to load comments:', err);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      todo: ['in_progress'],
      in_progress: ['review', 'todo'],
      review: ['done', 'in_progress'],
      done: []
    };

    if (!validTransitions[task.status]?.includes(newStatus)) {
      setError(`Cannot transition from ${task.status} to ${newStatus}`);
      return;
    }

    try {
      setLoading(true);
      await taskApi.update(task.id, { status: newStatus });
      await onUpdate();
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await taskApi.addComment(task.id, newComment);
      setNewComment('');
      await loadComments();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleBallHandoff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ballHandoffId.trim()) {
      setError('Target user ID is required');
      return;
    }

    try {
      setLoading(true);
      await taskApi.handoffBall(task.id, ballHandoffId);
      setBallHandoffId('');
      await onUpdate();
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      right: 0,
      top: 0,
      bottom: 0,
      width: '500px',
      backgroundColor: 'white',
      boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid #e9ecef',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>{task.title}</h2>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{
                padding: '2px 8px',
                backgroundColor: 
                  task.priority === 'urgent' ? '#f8d7da' :
                  task.priority === 'high' ? '#fff3cd' :
                  '#e2e3e5',
                color:
                  task.priority === 'urgent' ? '#721c24' :
                  task.priority === 'high' ? '#856404' :
                  '#383d41',
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                {task.priority}
              </span>
              {task.tags?.map((tag: string, idx: number) => (
                <span
                  key={idx}
                  style={{
                    padding: '2px 6px',
                    backgroundColor: '#e9ecef',
                    color: '#495057',
                    borderRadius: '3px',
                    fontSize: '11px'
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6c757d'
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        {error && (
          <div style={{ 
            backgroundColor: '#fee', 
            color: '#c00', 
            padding: '10px', 
            borderRadius: '4px',
            marginBottom: '20px' 
          }}>
            {error}
          </div>
        )}

        {/* Status Buttons */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '10px', fontWeight: '600' }}>Status</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            {['todo', 'in_progress', 'review', 'done'].map((status) => {
              const isCurrent = task.status === status;
              const validTransitions: Record<string, string[]> = {
                todo: ['in_progress'],
                in_progress: ['review', 'todo'],
                review: ['done', 'in_progress'],
                done: []
              };
              const canTransition = validTransitions[task.status]?.includes(status);
              
              return (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={loading || isCurrent || !canTransition}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: isCurrent ? '#007bff' : '#fff',
                    color: isCurrent ? '#fff' : '#000',
                    border: `1px solid ${isCurrent ? '#007bff' : '#ccc'}`,
                    borderRadius: '4px',
                    cursor: canTransition && !loading ? 'pointer' : 'not-allowed',
                    opacity: (!canTransition && !isCurrent) ? 0.5 : 1
                  }}
                >
                  {status.replace('_', ' ')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Ball Handoff */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '10px', fontWeight: '600' }}>Ball Handoff</h3>
          {task.ball_owner_email && (
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
              Current owner: {task.ball_owner_email}
            </p>
          )}
          <form onSubmit={handleBallHandoff} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Target user UUID"
              value={ballHandoffId}
              onChange={(e) => setBallHandoffId(e.target.value)}
              style={{
                flex: 1,
                padding: '6px 12px',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '6px 20px',
                backgroundColor: loading ? '#ccc' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              Handoff
            </button>
          </form>
        </div>

        {/* Comments */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '10px', fontWeight: '600' }}>
            Comments ({comments.length})
          </h3>
          <div style={{ marginBottom: '15px' }}>
            {comments.length === 0 ? (
              <p style={{ color: '#666', fontSize: '14px' }}>No comments yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    style={{
                      backgroundColor: '#f8f9fa',
                      padding: '10px',
                      borderRadius: '6px'
                    }}
                  >
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#6c757d',
                      marginBottom: '5px'
                    }}>
                      {comment.author_email || 'Unknown'} • {new Date(comment.created_at).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '14px' }}>{comment.body}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              style={{
                flex: 1,
                padding: '6px 12px',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
            <button
              type="submit"
              style={{
                padding: '6px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Add
            </button>
          </form>
        </div>

        {/* Attachments */}
        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '10px', fontWeight: '600' }}>
            Attachments
          </h3>
          <AttachmentsPanel taskId={task.id} />
        </div>
      </div>
    </div>
  );
}