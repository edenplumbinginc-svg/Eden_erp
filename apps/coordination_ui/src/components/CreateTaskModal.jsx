import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { useToaster } from './Toaster';
import TaskForm from './TaskForm';

export default function CreateTaskModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { push } = useToaster();

  const createTaskMutation = useMutation({
    mutationFn: (taskData) => apiService.createTaskGlobal(taskData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      push('success', 'Task created successfully!');
      onClose();
      if (data?.id) {
        navigate(`/task/${data.id}`);
      }
    },
    onError: (error) => {
      const errorMsg = error?.response?.data?.error?.message || error.message || 'Failed to create task';
      push('error', errorMsg);
    }
  });

  const handleSubmit = (taskData) => {
    createTaskMutation.mutate(taskData);
  };

  if (!isOpen) return null;

  // Debug logging
  console.log('[CreateTaskModal] Rendering modal...');

  try {
    return (
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal" style={{ maxWidth: '800px' }}>
          <div className="modal-header">
            <h2>Create New Task</h2>
            <button
              className="modal-close"
              onClick={onClose}
              disabled={createTaskMutation.isPending}
            >
              &times;
            </button>
          </div>
          
          <div>
            <TaskForm
              onSubmit={handleSubmit}
              onCancel={onClose}
              submitLabel="Create Task"
              isSubmitting={createTaskMutation.isPending}
            />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('[CreateTaskModal] Render error:', error);
    return (
      <div className="modal-overlay">
        <div className="modal" style={{ maxWidth: '600px', background: 'var(--md-surface)', padding: 'var(--space-4)' }}>
          <h2>Error Loading Modal</h2>
          <p>Error: {error.message}</p>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }
}
