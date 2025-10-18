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

// --- Ensure task_comments table ---
(async () => {
  try {
    await pool.query(`
      create table if not exists public.task_comments (
        id uuid default gen_random_uuid() primary key,
        task_id uuid references public.tasks(id) on delete cascade,
        author_id uuid,
        body text not null,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );
    `);
    console.log('✅ ensured task_comments table exists');
  } catch (e) {
    console.error('⚠️ failed to ensure task_comments table:', e.message);
  }
})();

// --- Task comments: list ---
app.get('/api/tasks/:taskId/comments', async (req, res) => {
  try {
    const r = await pool.query(
      `select id, task_id, author_id, body, created_at, updated_at
       from public.task_comments
       where task_id = $1
       order by created_at asc`,
      [req.params.taskId]
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Task comments: create ---
app.post('/api/tasks/:taskId/comments', async (req, res) => {
  try {
    const { body, author_id } = req.body ?? {};
    if (!body) return res.status(400).json({ error: 'body required' });
    const r = await pool.query(
      `insert into public.task_comments (task_id, author_id, body)
       values ($1, $2, $3)
       returning id, task_id, author_id, body, created_at, updated_at`,
      [req.params.taskId, author_id ?? null, body]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Ensure ball_history table ---
(async () => {
  try {
    await pool.query(`
      create table if not exists public.ball_history (
        id uuid default gen_random_uuid() primary key,
        task_id uuid not null references public.tasks(id) on delete cascade,
        from_user_id uuid,
        to_user_id uuid,
        note text,
        changed_at timestamptz not null default now()
      );
    `);
    console.log('✅ ensured ball_history table exists');
  } catch (e) {
    console.error('⚠️ failed to ensure ball_history table:', e.message);
  }
})();

// --- Ball handoff: set ball_in_court and record history ---
app.post('/api/tasks/:taskId/ball', async (req, res) => {
  try {
    const { to_user_id, from_user_id, note } = req.body ?? {};
    if (!to_user_id) return res.status(400).json({ error: 'to_user_id required' });

    // update task owner
    const up = await pool.query(
      `update public.tasks
         set ball_in_court = $1, updated_at = now()
       where id = $2
       returning id, project_id, title, ball_in_court, updated_at`,
      [to_user_id, req.params.taskId]
    );
    if (up.rowCount === 0) return res.status(404).json({ error: 'task not found' });

    // write history
    await pool.query(
      `insert into public.ball_history (task_id, from_user_id, to_user_id, note)
       values ($1,$2,$3,$4)`,
      [req.params.taskId, from_user_id ?? null, to_user_id, note ?? null]
    );

    res.json(up.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Ball history: list for a task ---
app.get('/api/tasks/:taskId/ball', async (req, res) => {
  try {
    const r = await pool.query(
      `select id, task_id, from_user_id, to_user_id, note, changed_at
         from public.ball_history
        where task_id = $1
        order by changed_at desc`,
      [req.params.taskId]
    );
    res.json(r.rows);
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
