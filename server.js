require('dotenv').config({ override: true });

const express = require('express');
const { Pool } = require('pg');
const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Health
app.get('/health', (_, res) => res.json({ ok: true }));

// DB ping
app.get('/db/ping', async (_, res) => {
  if (!process.env.DATABASE_URL) return res.status(200).json({ db: 'not_configured' });
  try { const r = await pool.query('select 1 as ok'); res.json({ db: 'ok', rows: r.rows }); }
  catch (e) { res.status(500).json({ db: 'error', error: e.message }); }
});

// Users
app.get('/db/users', async (_, res) => {
  try { const r = await pool.query('select id, email, name from public.users order by email'); res.json(r.rows); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Ensure projects table (safety)
(async () => {
  try {
    await pool.query(`
      create table if not exists public.projects (
        id uuid default gen_random_uuid() primary key,
        name text not null,
        code text,
        status text default 'active',
        created_at timestamptz default now()
      );`);
    console.log('✅ ensured projects table exists');
  } catch (e) {
    console.error('⚠️ failed to ensure projects table:', e.message);
  }
})();

// Projects: list
app.get('/api/projects', async (_, res) => {
  try {
    const q = `select id, name, code, status, created_at from public.projects order by created_at desc`;
    const r = await pool.query(q);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Projects: create
app.post('/api/projects', async (req, res) => {
  try {
    const { name, code } = req.body ?? {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const q = `insert into public.projects (name, code, status) values ($1,$2,'active') returning id,name,code,status,created_at`;
    const r = await pool.query(q, [name, code ?? null]);
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Debug: list registered routes
app.get('/routes', (_, res) => {
  const routes = [];
  app._router.stack.forEach(mw => {
    if (mw.route && mw.route.path) {
      const methods = Object.keys(mw.route.methods).filter(Boolean).join(',').toUpperCase();
      routes.push({ methods, path: mw.route.path });
    }
  });
  res.json(routes);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`api on :${port}`));
