// server.js - Lean main entry point
require('dotenv').config({ override: true });

const express = require('express');
const { bootstrapDatabase } = require('./services/database');
const { logActivity } = require('./middleware/audit');

const app = express();
app.use(express.json());

// Enable CORS for frontend development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Dev-User-Id, X-Dev-User-Role, X-Dev-User-Email');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

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
app.use('/api', require('./routes/attachments'));

// --- Subtask routes need to be at /api level ---
const { pool } = require('./services/database');
const { authenticate } = require('./middleware/auth');

app.patch('/api/subtasks/:id', authenticate, async (req, res) => {
  try {
    const { title, done, order_index } = req.body ?? {};
    const updates = [];
    const values = [];
    let idx = 1;

    if (title !== undefined) { updates.push(`title = $${idx++}`); values.push(title); }
    if (done !== undefined) { updates.push(`done = $${idx++}`); values.push(!!done); }
    if (order_index !== undefined) { updates.push(`order_index = $${idx++}`); values.push(order_index); }

    if (updates.length === 0) return res.status(400).json({ error: 'no fields to update' });
    
    updates.push(`updated_at = now()`);
    values.push(req.params.id);
    
    const r = await pool.query(
      `UPDATE public.subtasks SET ${updates.join(', ')} 
       WHERE id = $${idx} 
       RETURNING id, task_id, title, done, order_index, created_at, updated_at`,
      values
    );
    
    if (r.rowCount === 0) return res.status(404).json({ error: 'subtask not found' });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/subtasks/:id', authenticate, async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM public.subtasks WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'subtask not found' });
    res.json({ deleted: true, id: r.rows[0].id });
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