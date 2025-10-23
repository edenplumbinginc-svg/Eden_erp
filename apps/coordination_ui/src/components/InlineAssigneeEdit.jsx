import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

export default function InlineAssigneeEdit({ 
  value,
  onSave, 
  disabled = false,
  className = ''
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [isSaving, setIsSaving] = useState(false);
  const selectRef = useRef(null);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiService.getUsers().then(res => res.data)
  });

  useEffect(() => {
    if (isEditing && selectRef.current) {
      selectRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value || '');
  }, [value]);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue || null);
      setIsEditing(false);
    } catch (error) {
      setEditValue(value || '');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const getDisplayName = (userId) => {
    if (!userId) return 'Unassigned';
    const user = users.find(u => u.id === userId);
    return user ? (user.name || user.email) : 'Unknown User';
  };

  if (disabled) {
    return (
      <div className={className}>
        <span className="text-body">
          <span className="font-medium">Assignee:</span> {getDisplayName(value)}
        </span>
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div className={className}>
        <div
          className="inline-flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1 transition-colors duration-200"
          onClick={() => setIsEditing(true)}
          title="Click to change assignee"
        >
          <span className="text-body">
            <span className="font-medium">Assignee:</span> {getDisplayName(value)}
          </span>
          <span className="text-caption text-muted">✏️</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-edit-form ${className}`}>
      <label className="block text-caption text-muted mb-1">Change Assignee</label>
      <select
        ref={selectRef}
        className="input w-full max-w-md text-body"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isSaving}
      >
        <option value="">Unassigned</option>
        {users.map(u => (
          <option key={u.id} value={u.id}>
            {u.name || u.email}
          </option>
        ))}
      </select>
      <div className="flex gap-2 mt-2">
        <button
          className="btn btn-primary btn-sm"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleCancel}
          disabled={isSaving}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
