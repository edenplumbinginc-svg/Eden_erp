import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { useToaster } from '../components/Toaster';
import TaskForm from '../components/TaskForm';

export default function CreateTaskPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { push } = useToaster();

  const createTaskMutation = useMutation({
    mutationFn: (taskData) => apiService.createTaskGlobal(taskData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      push('success', 'Task created successfully!');
      if (data?.id) {
        navigate(`/task/${data.id}`);
      } else {
        navigate('/alltasks');
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

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Create New Task</h1>
        <p className="text-gray-600 text-sm mt-1">Fill in the details below to create a new task.</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <TaskForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Create Task"
          isSubmitting={createTaskMutation.isPending}
        />
      </div>
    </div>
  );
}
