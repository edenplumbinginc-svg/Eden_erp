import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  
  const [handoffType, setHandoffType] = useState('department');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [note, setNote] = useState('');

  const currentDepartment = task?.department || 'Unknown';

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiService.getUsers();
      return response;
    },
    enabled: isOpen && handoffType === 'user'
  });

  const departmentHandoffMutation = useMutation({
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
      resetAndClose();
    },
    onError: (error) => {
      const errorMsg = error?.response?.data?.error?.message || error.message || 'Failed to handoff task';
      push('error', errorMsg);
    }
  });

  const userHandoffMutation = useMutation({
    mutationFn: async (toUserId) => {
      return apiService.handoffBall(task.id, {
        to_user_id: toUserId,
        note: note
      });
    },
    onSuccess: () => {
      push('success', 'Ball passed to user');
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      resetAndClose();
    },
    onError: (error) => {
      const errorMsg = error?.response?.data?.error?.message || error.message || 'Failed to handoff task';
      push('error', errorMsg);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (handoffType === 'department') {
      if (!selectedDepartment) {
        push('error', 'Please select a department');
        return;
      }
      departmentHandoffMutation.mutate(selectedDepartment);
    } else {
      if (!selectedUser) {
        push('error', 'Please select a user');
        return;
      }
      userHandoffMutation.mutate(selectedUser);
    }
  };

  const resetAndClose = () => {
    setHandoffType('department');
    setSelectedDepartment('');
    setSelectedUser('');
    setNote('');
    onClose();
  };

  const handleClose = () => {
    if (!departmentHandoffMutation.isPending && !userHandoffMutation.isPending) {
      resetAndClose();
    }
  };

  const isPending = departmentHandoffMutation.isPending || userHandoffMutation.isPending;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '550px' }}>
        <div className="modal-header">
          <h2>Pass Ball 🏀</h2>
          <button
            className="modal-close"
            onClick={handleClose}
            disabled={isPending}
          >
            &times;
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label>Hand off to:</label>
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="department"
                  checked={handoffType === 'department'}
                  onChange={(e) => setHandoffType(e.target.value)}
                  disabled={isPending}
                  style={{ marginRight: '6px' }}
                />
                <span className="text-body">Department</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="user"
                  checked={handoffType === 'user'}
                  onChange={(e) => setHandoffType(e.target.value)}
                  disabled={isPending}
                  style={{ marginRight: '6px' }}
                />
                <span className="text-body">Specific User</span>
              </label>
            </div>
          </div>

          {handoffType === 'department' && (
            <>
              <div className="text-body text-muted" style={{ marginBottom: '12px' }}>
                Current department: <span className="font-semibold" style={{color: 'var(--md-warning)'}}>
                  {currentDepartment}
                </span>
              </div>

              <div className="form-group">
                <label>Select department:</label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  disabled={isPending}
                  className="form-select"
                >
                  <option value="">Choose a department...</option>
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {handoffType === 'user' && (
            <div className="form-group">
              <label>Select user:</label>
              {usersLoading ? (
                <div className="text-body text-muted">Loading users...</div>
              ) : (
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  disabled={isPending}
                  className="form-select"
                >
                  <option value="">Choose a user...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="form-group">
            <label>Note (optional):</label>
            <textarea
              placeholder={`Why are you handing this to ${handoffType === 'department' ? 'this department' : 'this person'}?`}
              rows="3"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isPending || (handoffType === 'department' ? !selectedDepartment : !selectedUser)}
            >
              {isPending ? 'Passing...' : 'Confirm Handoff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
