require('dotenv').config({ override: true });

const express = require('express');
const { Pool } = require('pg');
const app = express();
app.use(express.json());

// --- Database connection ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// --- Health check ---
app.get('/health', (_, res) => res.json({ ok: true }));

// --- DB ping ---
app.get('/db/ping', async (_, res) => {
  if (!process.env.DATABASE_URL)
    return res.status(200).json({ db: 'not_configured' });
  try {
    const r = await pool.query('select 1 as ok');
    res.json({ db: 'ok', rows: r.rows });
  } catch (e) {
    res.status(500).json({ db: 'error', error: e.message });
  }
});

// --- Users list ---
app.get('/db/users', async (_, res) => {
  try {
    const r = await pool.query('select id, email, name from public.users order by email');
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Ensure projects table ---
(async () => {
  try {
    await pool.query(`
      create table if not exists public.projects (
        id uuid default gen_random_uuid() primary key,
        name text not null,
        code text,
        status text default 'active',
        created_at timestamptz default now()
      );
    `);
    console.log('✅ ensured projects table exists');
  } catch (e) {
    console.error('⚠️ failed to ensure projects table:', e.message);
  }
})();

// --- Projects: list ---
app.get('/api/projects', async (_, res) => {
  try {
    const r = await pool.query(
      'select id, name, code, status, created_at from public.projects order by created_at desc'
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Projects: create ---
app.post('/api/projects', async (req, res) => {
  try {
    const { name, code } = req.body ?? {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const r = await pool.query(
      `insert into public.projects (name, code, status)
       values ($1,$2,'active')
       returning id, name, code, status, created_at`,
      [name, code ?? null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Ensure tasks table ---
(async () => {
  try {
    await pool.query(`
      create table if not exists public.tasks (
        id uuid default gen_random_uuid() primary key,
        project_id uuid references public.projects(id) on delete cascade,
        title text not null,
        description text,
        status text default 'open',
        priority text default 'normal',
        assignee_id uuid,
        ball_in_court uuid,
        due_at timestamptz,
        created_at timestamptz default now()
      );
    `);
    console.log('✅ ensured tasks table exists');
  } catch (e) {
    console.error('⚠️ failed to ensure tasks table:', e.message);
  }
})();

// --- Tasks: list by project ---
app.get('/api/projects/:projectId/tasks', async (req, res) => {
  try {
    const q = `
      select t.id, t.title, t.description, t.status, t.priority,
             t.assignee_id, t.ball_in_court, t.due_at, t.created_at
      from public.tasks t
      where t.project_id = $1
      order by t.created_at desc`;
    const r = await pool.query(q, [req.params.projectId]);
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Tasks: create ---
app.post('/api/projects/:projectId/tasks', async (req, res) => {
  try {
    const { title, description, assignee_id, ball_in_court, due_at, priority } = req.body ?? {};
    if (!title) return res.status(400).json({ error: 'title required' });
    const q = `
      insert into public.tasks
        (project_id, title, description, status, priority, assignee_id, ball_in_court, due_at)
      values
        ($1, $2, $3, 'open', coalesce($7,'normal'), $4, $5, $6)
      returning id, title, description, status, priority, assignee_id, ball_in_court, due_at, created_at`;
    const r = await pool.query(q, [
      req.params.projectId,
      title,
      description ?? null,
      assignee_id ?? null,
      ball_in_court ?? null,
      due_at ?? null,
      priority ?? null
    ]);
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Debug: show registered routes ---
app.get('/routes', (_, res) => {
  const routes = [];
  if (app._router && app._router.stack) {
    app._router.stack.forEach(mw => {
      if (mw.route) {
        const methods = Object.keys(mw.route.methods)
          .filter(Boolean)
          .join(',')
          .toUpperCase();
        routes.push({ methods, path: mw.route.path });
      }
    });
  }
  res.json(routes);
});

// --- Start server ---
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`api on :${port}`));
