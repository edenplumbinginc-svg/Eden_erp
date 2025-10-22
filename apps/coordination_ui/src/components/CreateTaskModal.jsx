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

  return (
    <div className="modal-overlay">
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
}
