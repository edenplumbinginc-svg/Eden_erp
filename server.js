// server.js - Lean main entry point
require('dotenv').config({ override: true });

const express = require('express');
const { bootstrapDatabase } = require('./services/database');
const { logActivity } = require('./middleware/audit');

const app = express();
app.use(express.json());

// Apply audit logging middleware globally
app.use(logActivity);

// Bootstrap database on startup
bootstrapDatabase();

// --- Health check ---
app.get('/health', (_, res) => res.json({ ok: true }));

// --- DB ping ---
app.get('/db/ping', async (_, res) => {
  if (!process.env.DATABASE_URL)
    return res.status(200).json({ db: 'not_configured' });
  
  const { pool } = require('./services/database');
  try {
    const r = await pool.query('select 1 as ok');
    res.json({ db: 'ok', rows: r.rows });
  } catch (e) {
    res.status(500).json({ db: 'error', error: e.message });
  }
});

// --- Users list (legacy routes) ---
app.get('/db/users', async (_, res) => {
  const { pool } = require('./services/database');
  try {
    const r = await pool.query('select id, email, name from public.users order by email');
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/users', async (_, res) => {
  const { pool } = require('./services/database');
  try {
    const r = await pool.query('select id, email, name from public.users order by email');
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Mount modular routes ---
app.use('/api/projects', require('./routes/projects'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/reports', require('./routes/reports'));
app.use('/ops/notifications', require('./routes/notifications'));

// --- Debug: show registered routes ---
app.get('/routes', (_, res) => {
  const routes = [];
  if (app._router && app._router.stack) {
    app._router.stack.forEach(mw => {
      if (mw.route) {
        const methods = Object.keys(mw.route.methods).filter(Boolean).join(',').toUpperCase();
        routes.push({ methods, path: mw.route.path });
      }
    });
  }
  res.json(routes);
});

// --- Start server ---
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API server running on port :${port}`));