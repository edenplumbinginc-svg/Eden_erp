import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { apiService } from "../services/api";

const codeRe = /^[A-Z0-9-]{1,12}$/;

export default function ProjectEdit() {
  const { id } = useParams();
  const nav = useNavigate();

  const [initial, setInitial] = useState(null);
  const [f, setF] = useState({ name: "", code: "", client: "", startDate: "", notes: "" });
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(true);

  function set(field) {
    return (e) => setF((s) => ({ ...s, [field]: e.target.value }));
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const item = await apiService.getProject(id);
        if (!alive) return;
        const startDate = item.startDate ? item.startDate.slice(0,10) : "";
        const state = {
          name: item.name || "",
          code: item.code || "",
          client: item.client || "",
          startDate,
          notes: item.notes || "",
        };
        setInitial(state);
        setF(state);
      } catch (e) {
        console.error(e);
        setErr({ form: "Failed to load project." });
      } finally {
        setBusy(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const changed = useMemo(() => {
    if (!initial) return {};
    const diff = {};
    for (const k of Object.keys(initial)) {
      if (f[k] !== initial[k]) diff[k] = f[k];
    }
    if (diff.startDate !== undefined) {
      diff.startDate = diff.startDate ? new Date(diff.startDate).toISOString() : null;
    }
    return diff;
  }, [initial, f]);

  function validate() {
    const e = {};
    if (changed.name !== undefined) {
      if (!f.name || f.name.length > 80) e.name = "Name is required (≤80).";
    }
    if (changed.code !== undefined) {
      if (!codeRe.test(f.code)) e.code = "Code A–Z, 0–9, dash, ≤12.";
    }
    if (changed.client !== undefined && f.client && f.client.length > 120) e.client = "Client ≤120.";
    if (changed.notes !== undefined && f.notes && f.notes.length > 1000) e.notes = "Notes ≤1000.";
    if (Object.keys(changed).length === 0) e.form = "No changes to save.";
    setErr(e);
    return Object.keys(e).length === 0;
  }

  async function submit(e) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      const payload = {};
      for (const k of Object.keys(changed)) {
        if (k === "client" || k === "notes") {
          payload[k] = f[k]?.trim() ? f[k].trim() : null;
        } else if (k === "name" || k === "code") {
          payload[k] = f[k].trim();
        } else {
          payload[k] = changed[k];
        }
      }
      const response = await apiService.updateProject(id, payload);
      const item = response.data;
      nav(`/project/${item.id}`);
    } catch (ex) {
      if (ex.response?.status === 409) {
        setErr({ code: "Code already exists." });
      } else if (ex.response?.status === 400) {
        setErr({ form: "Fix highlighted fields." });
      } else if (ex.response?.status === 403) {
        setErr({ form: "You don't have permission to edit this project." });
      } else if (ex.response?.status === 404) {
        setErr({ form: "Project not found." });
      } else {
        setErr({ form: "Server error. Try again." });
      }
    } finally {
      setBusy(false);
    }
  }

  if (busy) return <div className="p-4">Loading…</div>;

  return (
    <div className="p-4 max-w-xl">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold">Edit Project</h1>
        <Link to={`/project/${id}`} className="px-3 py-1 border rounded">Back</Link>
      </div>

      {err.form && <div className="mb-2 text-sm text-red-600">{err.form}</div>}

      <form onSubmit={submit} className="grid gap-3">
        <label className="grid gap-1">
          <span>Name *</span>
          <input value={f.name} onChange={set("name")} className="border rounded p-2" />
          {err.name && <small className="text-red-600">{err.name}</small>}
        </label>

        <label className="grid gap-1">
          <span>Code *</span>
          <input value={f.code} onChange={set("code")} className="border rounded p-2" placeholder="EWR-01" />
          {err.code && <small className="text-red-600">{err.code}</small>}
        </label>

        <label className="grid gap-1">
          <span>Client</span>
          <input value={f.client} onChange={set("client")} className="border rounded p-2" />
          {err.client && <small className="text-red-600">{err.client}</small>}
        </label>

        <label className="grid gap-1">
          <span>Start Date</span>
          <input type="date" value={f.startDate} onChange={set("startDate")} className="border rounded p-2" />
        </label>

        <label className="grid gap-1">
          <span>Notes</span>
          <textarea value={f.notes} onChange={set("notes")} className="border rounded p-2" rows={4} />
          {err.notes && <small className="text-red-600">{err.notes}</small>}
        </label>

        <div className="flex gap-2">
          <button className="px-3 py-2 border rounded">Save Changes</button>
          <Link to={`/project/${id}`} className="px-3 py-2 border rounded">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
