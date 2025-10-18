const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

// DB pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neondb') ? { rejectUnauthorized: false } : false
});

// Health
app.get('/health', (_, res) => res.json({ ok: true }));

// DB ping
app.get('/db/ping', async (_, res) => {
  if (!process.env.DATABASE_URL) return res.status(200).json({ db: 'not_configured' });
  try { const r = await pool.query('select 1 as ok'); res.json({ db: 'ok', rows: r.rows }); }
  catch (e) { res.status(500).json({ db: 'error', error: e.message }); }
});

// Users list
app.get('/db/users', async (_, res) => {
  try {
    const r = await pool.query('select id, email, name from public.users order by email');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Start
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`api on :${port}`));
