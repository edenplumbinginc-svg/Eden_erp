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
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Create New Task</h2>
          <button
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            onClick={onClose}
            disabled={createTaskMutation.isPending}
          >
            &times;
          </button>
        </div>
        
        <div className="px-6 py-4">
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
