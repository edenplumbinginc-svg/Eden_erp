import React, { useState, useEffect } from 'react';
import { useQueryState } from '../hooks/useQueryState';

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
          <button className="btn text-sm px-3 py-1" onClick={clearFilters}>
            Clear All
          </button>
          <button className="btn text-sm px-3 py-1" onClick={copyViewLink}>
            📋 Copy View Link
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-3">
        <label className="block text-sm text-gray-600 mb-1">Search</label>
        <input
          className="input w-full"
          placeholder="Search in title or description..."
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>

      {/* Status chips */}
      <div className="mb-3">
        <label className="block text-sm text-gray-600 mb-1">Status</label>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map(s => {
            const active = status.includes(s);
            return (
              <button
                key={s}
                className={`text-sm px-3 py-1 rounded-full transition-all ${
                  active
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
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
          <span className="text-sm">Overdue only</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={idle}
            onChange={e => setIdle(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Idle only</span>
        </label>
      </div>

      {/* Advanced filters - collapsible */}
      <details className="mt-3">
        <summary className="text-sm text-gray-600 cursor-pointer mb-2">Advanced Filters</summary>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Priority</label>
            <select className="input w-full text-sm" value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="">All</option>
              {PRIORITY_OPTIONS.map(p => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Department</label>
            <select className="input w-full text-sm" value={department} onChange={e => setDepartment(e.target.value)}>
              <option value="">All</option>
              {DEPARTMENT_OPTIONS.map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Project ID</label>
            <input
              className="input w-full text-sm"
              placeholder="UUID"
              value={project}
              onChange={e => setProject(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Assignee ID</label>
            <input
              className="input w-full text-sm"
              placeholder="UUID"
              value={assignee}
              onChange={e => setAssignee(e.target.value)}
            />
          </div>
        </div>
      </details>
    </div>
  );
}
