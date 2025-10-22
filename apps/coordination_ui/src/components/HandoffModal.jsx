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
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>Pass Ball 🏀</h2>
          <button
            className="modal-close"
            onClick={handleClose}
            disabled={handoffMutation.isPending}
          >
            &times;
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="form">
          <div>
            <div className="text-sm text-gray-600 mb-2">
              Current department: <span className="font-semibold text-amber-700">{currentDepartment}</span>
            </div>
          </div>

          <div className="form-group">
            <label>Hand off to department:</label>
            <select
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

          <div className="form-group">
            <label>Note (optional):</label>
            <textarea
              placeholder="Optional: reason for handoff"
              rows="3"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={handoffMutation.isPending}
            />
          </div>

          <div className="actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={handoffMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
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
