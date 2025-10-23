import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryState } from '../hooks/useQueryState';
import { apiService } from '../services/api';

const STATUS_OPTIONS = ['open', 'todo', 'in_progress', 'review', 'done'];
const STATUS_LABELS = {
  'open': 'New',
  'todo': 'To Do',
  'in_progress': 'In Progress',
  'review': 'Review',
  'done': 'Done'
};

const PRIORITY_OPTIONS = ['low', 'normal', 'high', 'urgent'];
const DEPARTMENT_OPTIONS = ['Operations', 'Procurement', 'Accounting', 'Service', 'Estimating', 'Scheduling'];

export default function TasksFilters() {
  const { getAll, set } = useQueryState();
  const qp = getAll();

  const [q, setQ] = useState(qp.q || '');
  const [assignee, setAssignee] = useState(qp.assignee || '');
  const [project, setProject] = useState(qp.project || '');
  const [department, setDepartment] = useState(qp.department || '');
  const [priority, setPriority] = useState(qp.priority || '');
  const [status, setStatus] = useState(qp.status?.split(',').filter(Boolean) || []);
  const [overdue, setOverdue] = useState(qp.overdue === 'true');
  const [idle, setIdle] = useState(qp.idle === 'true');

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiService.getUsers().then(res => res.data)
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiService.getProjects().then(res => res.data)
  });

  useEffect(() => {
    set(
      {
        q,
        assignee,
        project,
        department,
        priority,
        status: status.join(','),
        overdue: overdue ? 'true' : '',
        idle: idle ? 'true' : ''
      },
      { replace: true }
    );
  }, [q, assignee, project, department, priority, status.join(','), overdue, idle]);

  function toggleStatus(s) {
    setStatus(prev => (prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]));
  }

  function clearFilters() {
    setQ('');
    setAssignee('');
    setProject('');
    setDepartment('');
    setPriority('');
    setStatus([]);
    setOverdue(false);
    setIdle(false);
  }

  async function copyViewLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('View link copied to clipboard!');
    } catch (err) {
      alert('Failed to copy link');
    }
  }

  return (
    <div className="card p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium">Filters</h3>
        <div className="flex gap-2">
          <button className="btn text-body px-3 py-1" onClick={clearFilters}>
            Clear All
          </button>
          <button className="btn text-body px-3 py-1" onClick={copyViewLink}>
            📋 Copy View Link
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-3">
        <label className="block text-body text-muted mb-1">Search</label>
        <input
          className="input w-full"
          placeholder="Search in title or description..."
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>

      {/* Status chips */}
      <div className="mb-3">
        <label className="block text-body text-muted mb-1">Status</label>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map(s => {
            const active = status.includes(s);
            return (
              <button
                key={s}
                className={`text-body px-3 py-1 rounded-full transition-all ${
                  active
                    ? 'text-white shadow-md'
                    : 'hover:bg-gray-200'
                }`}
                style={active ? { backgroundColor: 'var(--md-primary)' } : { backgroundColor: 'var(--md-surface-variant)', color: 'var(--md-on-surface)' }}
                onClick={() => toggleStatus(s)}
              >
                {STATUS_LABELS[s]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick flags */}
      <div className="mb-3 flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={overdue}
            onChange={e => setOverdue(e.target.checked)}
            className="rounded"
          />
          <span className="text-body">Overdue only</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={idle}
            onChange={e => setIdle(e.target.checked)}
            className="rounded"
          />
          <span className="text-body">Idle only</span>
        </label>
      </div>

      {/* Advanced filters - collapsible */}
      <details className="mt-3">
        <summary className="text-body text-muted cursor-pointer mb-2">Advanced Filters</summary>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
          <div>
            <label className="block text-caption text-muted mb-1">Priority</label>
            <select className="input w-full text-body" value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="">All</option>
              {PRIORITY_OPTIONS.map(p => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-caption text-muted mb-1">Department</label>
            <select className="input w-full text-body" value={department} onChange={e => setDepartment(e.target.value)}>
              <option value="">All</option>
              {DEPARTMENT_OPTIONS.map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-caption text-muted mb-1">Project</label>
            <select 
              className="input w-full text-body" 
              value={project} 
              onChange={e => setProject(e.target.value || '')}
              disabled={projectsLoading}
            >
              <option value="">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-caption text-muted mb-1">Assignee</label>
            <select 
              className="input w-full text-body" 
              value={assignee} 
              onChange={e => setAssignee(e.target.value || '')}
              disabled={usersLoading}
            >
              <option value="">All Users</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      </details>
    </div>
  );
}
