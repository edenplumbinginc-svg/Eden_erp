import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { useToaster } from './Toaster';

const DEPARTMENTS = [
  'Operations',
  'Procurement',
  'Accounting',
  'Service',
  'Estimating',
  'Scheduling'
];

export default function HandoffModal({ isOpen, onClose, task }) {
  const queryClient = useQueryClient();
  const { push } = useToaster();
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [note, setNote] = useState('');

  const currentDepartment = task?.department || 'Unknown';

  const handoffMutation = useMutation({
    mutationFn: async (toDepartment) => {
      return apiService.handoffTask(task.id, toDepartment, note);
    },
    onSuccess: (data) => {
      if (data.skipped) {
        push('info', 'Already passed to this department recently');
      } else {
        push('success', `Ball passed to ${data.toDepartment}`);
        queryClient.invalidateQueries({ queryKey: ['task', task.id] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      }
      onClose();
      setSelectedDepartment('');
      setNote('');
    },
    onError: (error) => {
      const errorMsg = error?.response?.data?.error?.message || error.message || 'Failed to handoff task';
      push('error', errorMsg);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedDepartment) {
      push('error', 'Please select a department');
      return;
    }
    handoffMutation.mutate(selectedDepartment);
  };

  const handleClose = () => {
    if (!handoffMutation.isPending) {
      setSelectedDepartment('');
      setNote('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-lg">
          <h2 className="text-xl font-semibold">Pass Ball 🏀</h2>
          <button
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            onClick={handleClose}
            disabled={handoffMutation.isPending}
          >
            &times;
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <div className="text-sm text-gray-600 mb-2">
              Current department: <span className="font-semibold text-amber-700">{currentDepartment}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Hand off to department:
            </label>
            <select
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              disabled={handoffMutation.isPending}
            >
              <option value="">Select department...</option>
              {DEPARTMENTS.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Note (optional):
            </label>
            <textarea
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black resize-none"
              placeholder="Optional: reason for handoff"
              rows="3"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={handoffMutation.isPending}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              className="flex-1 px-4 py-2 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              onClick={handleClose}
              disabled={handoffMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded bg-black text-white hover:bg-gray-800 disabled:opacity-50"
              disabled={handoffMutation.isPending || !selectedDepartment}
            >
              {handoffMutation.isPending ? 'Passing...' : 'Confirm Handoff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
