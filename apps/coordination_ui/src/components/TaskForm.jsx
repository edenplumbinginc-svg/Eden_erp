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
    <form onSubmit={handleSubmit} className="form">
      <div className="form-group">
        <label>
          Title <span style={{color: 'var(--md-error)'}}>*</span>
        </label>
        <input
          type="text"
          style={errors.title ? {borderColor: 'var(--md-error)'} : {}}
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Enter task title"
          autoFocus
        />
        {errors.title && <div className="text-caption mt-1" style={{color: 'var(--md-error)'}}>{errors.title}</div>}
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea
          rows={3}
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Enter task description (optional)"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="form-group">
          <label>Status</label>
          <select
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

        <div className="form-group">
          <label>Priority</label>
          <select
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
        <div className="form-group">
          <label>Project</label>
          <select
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

        <div className="form-group">
          <label>Assignee</label>
          <select
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

      <div className="form-group">
        <label>Due Date</label>
        <input
          type="date"
          value={formData.due_at}
          onChange={(e) => handleChange('due_at', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Department (Ball-in-Court)</label>
        <select
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

      <details className="card" style={{ cursor: 'pointer' }}>
        <summary className="font-medium">
          Advanced Options (Voice/Email)
        </summary>
        <div className="space-y-3 mt-3">
          <div className="form-group">
            <label>Origin</label>
            <select
              value={formData.origin}
              onChange={(e) => handleChange('origin', e.target.value)}
            >
              <option value="UI">UI</option>
              <option value="voice">Voice</option>
              <option value="email">Email</option>
            </select>
          </div>

          <div className="form-group">
            <label>Voice URL</label>
            <input
              type="url"
              style={errors.voice_url ? {borderColor: 'var(--md-error)'} : {}}
              value={formData.voice_url}
              onChange={(e) => handleChange('voice_url', e.target.value)}
              placeholder="https://example.com/audio.mp3"
            />
            {errors.voice_url && <div className="text-caption mt-1" style={{color: 'var(--md-error)'}}>{errors.voice_url}</div>}
          </div>

          <div className="form-group">
            <label>Voice Transcript</label>
            <textarea
              rows={2}
              value={formData.voice_transcript}
              onChange={(e) => handleChange('voice_transcript', e.target.value)}
              placeholder="Transcript of voice note"
            />
          </div>

          <div className="form-group">
            <label>Ball-in-Court Note</label>
            <textarea
              rows={2}
              value={formData.ball_in_court_note}
              onChange={(e) => handleChange('ball_in_court_note', e.target.value)}
              placeholder="Note about current ball-in-court status"
            />
          </div>
        </div>
      </details>

      <div className="actions">
        {onCancel && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
