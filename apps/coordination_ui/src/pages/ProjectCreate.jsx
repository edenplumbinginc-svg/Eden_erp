import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';

const codeRe = /^[A-Z0-9-]{1,12}$/;

export default function ProjectCreate() {
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', code: '', client: '', startDate: '', notes: '' });
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);

  function set(field) {
    return (e) => setF((s) => ({ ...s, [field]: e.target.value }));
  }

  function validate() {
    const e = {};
    if (!f.name || f.name.length > 80) e.name = 'Name is required (≤80).';
    if (!codeRe.test(f.code)) e.code = 'Code A–Z, 0–9, dash, ≤12.';
    if (f.client && f.client.length > 120) e.client = 'Client ≤120.';
    if (f.notes && f.notes.length > 1000) e.notes = 'Notes ≤1000.';
    setErr(e);
    return Object.keys(e).length === 0;
  }

  async function submit(e) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      const payload = {
        name: f.name.trim(),
        code: f.code.trim(),
        client: f.client.trim() || undefined,
        startDate: f.startDate ? new Date(f.startDate).toISOString() : undefined,
        notes: f.notes.trim() || undefined,
      };
      const response = await apiService.createProject(payload);
      const projectId = response.data?.id;
      nav(`/project/${projectId}`);
    } catch (ex) {
      const status = ex.response?.status;
      const errorData = ex.response?.data;
      
      if (status === 409) {
        setErr({ code: 'Code already exists.' });
      } else if (status === 400 && errorData?.error?.issues) {
        setErr({ form: 'Fix highlighted fields.' });
      } else if (status === 403) {
        setErr({ form: "You don't have permission to create projects." });
      } else {
        setErr({ form: 'Server error. Try again.' });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 max-w-xl">
      <h1 className="text-xl font-semibold mb-3">New Project</h1>
      {err.form && <div className="mb-2 text-sm text-red-600">{err.form}</div>}
      <form onSubmit={submit} className="grid gap-3">
        <label className="grid gap-1">
          <span>Name *</span>
          <input 
            value={f.name} 
            onChange={set('name')} 
            className="border rounded p-2" 
            autoFocus
          />
          {err.name && <small className="text-red-600">{err.name}</small>}
        </label>

        <label className="grid gap-1">
          <span>Code *</span>
          <input 
            value={f.code} 
            onChange={set('code')} 
            className="border rounded p-2" 
            placeholder="EWR-01" 
          />
          {err.code && <small className="text-red-600">{err.code}</small>}
        </label>

        <label className="grid gap-1">
          <span>Client</span>
          <input 
            value={f.client} 
            onChange={set('client')} 
            className="border rounded p-2" 
          />
          {err.client && <small className="text-red-600">{err.client}</small>}
        </label>

        <label className="grid gap-1">
          <span>Start Date</span>
          <input 
            type="date" 
            value={f.startDate} 
            onChange={set('startDate')} 
            className="border rounded p-2" 
          />
        </label>

        <label className="grid gap-1">
          <span>Notes</span>
          <textarea 
            value={f.notes} 
            onChange={set('notes')} 
            className="border rounded p-2" 
            rows={4} 
          />
          {err.notes && <small className="text-red-600">{err.notes}</small>}
        </label>

        <div className="flex gap-2">
          <button 
            disabled={busy} 
            className="px-3 py-2 border rounded bg-primary text-white disabled:opacity-50"
          >
            {busy ? 'Creating...' : 'Create Project'}
          </button>
          <button 
            type="button" 
            onClick={() => nav(-1)} 
            className="px-3 py-2 border rounded"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
