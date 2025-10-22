import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

const STATUS_OPTIONS = ['open', 'todo', 'in_progress', 'review', 'done'];
const STATUS_LABELS = {
  'open': 'Open',
  'todo': 'To Do',
  'in_progress': 'In Progress',
  'review': 'Review',
  'done': 'Done'
};

const PRIORITY_OPTIONS = ['low', 'normal', 'high', 'urgent'];
const DEPARTMENT_OPTIONS = ['Operations', 'Procurement', 'Accounting', 'Service', 'Estimating', 'Scheduling'];

export default function TaskForm({ onSubmit, onCancel, initialData = {}, submitLabel = "Create Task", isSubmitting = false }) {
  const [formData, setFormData] = useState({
    title: initialData.title || '',
    description: initialData.description || '',
    status: initialData.status || 'open',
    priority: initialData.priority || 'normal',
    assignee_id: initialData.assignee_id || '',
    due_at: initialData.due_at || '',
    project_id: initialData.project_id || '',
    origin: initialData.origin || 'UI',
    voice_url: initialData.voice_url || '',
    voice_transcript: initialData.voice_transcript || '',
    ball_in_court_note: initialData.ball_in_court_note || '',
    ball_owner_department: initialData.ball_owner_department || ''
  });

  const [errors, setErrors] = useState({});

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await apiService.getProjects();
      return res.data || [];
    }
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await apiService.getUsers();
      return res.data || [];
    }
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (formData.voice_url && formData.voice_url.trim()) {
      try {
        new URL(formData.voice_url);
      } catch (e) {
        newErrors.voice_url = 'Invalid URL format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = { ...formData };
    Object.keys(payload).forEach(key => {
      if (payload[key] === '') delete payload[key];
    });

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          className={`w-full border rounded px-3 py-2 ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Enter task title"
          autoFocus
        />
        {errors.title && <div className="text-xs text-red-600 mt-1">{errors.title}</div>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          className="w-full border border-gray-300 rounded px-3 py-2"
          rows={3}
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Enter task description (optional)"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            className="w-full border border-gray-300 rounded px-3 py-2"
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select
            className="w-full border border-gray-300 rounded px-3 py-2"
            value={formData.priority}
            onChange={(e) => handleChange('priority', e.target.value)}
          >
            {PRIORITY_OPTIONS.map(p => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
          <select
            className="w-full border border-gray-300 rounded px-3 py-2"
            value={formData.project_id}
            onChange={(e) => handleChange('project_id', e.target.value)}
          >
            <option value="">No project</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.title || p.name || p.id}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
          <select
            className="w-full border border-gray-300 rounded px-3 py-2"
            value={formData.assignee_id}
            onChange={(e) => handleChange('assignee_id', e.target.value)}
          >
            <option value="">Unassigned</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
        <input
          type="date"
          className="w-full border border-gray-300 rounded px-3 py-2"
          value={formData.due_at}
          onChange={(e) => handleChange('due_at', e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Department (Ball-in-Court)</label>
        <select
          className="w-full border border-gray-300 rounded px-3 py-2"
          value={formData.ball_owner_department}
          onChange={(e) => handleChange('ball_owner_department', e.target.value)}
        >
          <option value="">None</option>
          {DEPARTMENT_OPTIONS.map(d => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <details className="border rounded p-3">
        <summary className="text-sm font-medium text-gray-700 cursor-pointer">
          Advanced Options (Voice/Email)
        </summary>
        <div className="space-y-3 mt-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Origin</label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2"
              value={formData.origin}
              onChange={(e) => handleChange('origin', e.target.value)}
            >
              <option value="UI">UI</option>
              <option value="voice">Voice</option>
              <option value="email">Email</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Voice URL</label>
            <input
              type="url"
              className={`w-full border rounded px-3 py-2 ${errors.voice_url ? 'border-red-500' : 'border-gray-300'}`}
              value={formData.voice_url}
              onChange={(e) => handleChange('voice_url', e.target.value)}
              placeholder="https://example.com/audio.mp3"
            />
            {errors.voice_url && <div className="text-xs text-red-600 mt-1">{errors.voice_url}</div>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Voice Transcript</label>
            <textarea
              className="w-full border border-gray-300 rounded px-3 py-2"
              rows={2}
              value={formData.voice_transcript}
              onChange={(e) => handleChange('voice_transcript', e.target.value)}
              placeholder="Transcript of voice note"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ball-in-Court Note</label>
            <textarea
              className="w-full border border-gray-300 rounded px-3 py-2"
              rows={2}
              value={formData.ball_in_court_note}
              onChange={(e) => handleChange('ball_in_court_note', e.target.value)}
              placeholder="Note about current ball-in-court status"
            />
          </div>
        </div>
      </details>

      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <button
            type="button"
            className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800 disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
