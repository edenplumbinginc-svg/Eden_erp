// server.js - Lean main entry point
require('dotenv').config();

// Enforce single-database contract (fail fast on misconfiguration)
const { assertSingleDatabaseUrl } = require('./lib/config-db');
assertSingleDatabaseUrl();

const express = require('express');
const { bootstrapDatabase, refreshPoolMetadata } = require('./services/database');
const { logActivity } = require('./middleware/audit');
const { metricsMiddleware } = require('./lib/metrics');
const logger = require('./lib/logger');

const app = express();
app.use(express.json());

// Apply metrics collection middleware
app.use(metricsMiddleware);

// Enable CORS for frontend development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Dev-User-Id, X-Dev-User-Role, X-Dev-User-Email');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Apply audit logging middleware globally
app.use(logActivity);

// Bootstrap database on startup (verify connection and extensions)
bootstrapDatabase()
  .then((result) => {
    if (result.connected && !result.degraded) {
      logger.info('Database bootstrap successful', { tableCount: result.tableCount });
    } else if (result.connected && result.degraded) {
      logger.warn('Database connected but degraded', { tableCount: result.tableCount });
    } else {
      logger.error('Database bootstrap failed, running in degraded mode', { error: result.error });
    }
  })
  .catch(err => {
    logger.critical('Unexpected error during bootstrap', { error: err.message });
  });

// ⚙️ --- DEBUG ONLY (disabled in production) ---
const { Pool } = require('pg');
const { pool } = require('./services/database');

// Only enable debug endpoint in development
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/debug/dbinfo', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      select current_database() as db,
             inet_server_addr() as db_ip,
             version() as pg_version,
             current_schema() as schema,
             now() at time zone 'utc' as utc_now;
    `);
    
    const { parseDatabaseDetails } = require('./lib/config-db');
    const details = parseDatabaseDetails(process.env.DATABASE_URL);
    
    res.json({
      environment: {
        node_env: process.env.NODE_ENV || 'development',
        expected_db_host: process.env.EXPECTED_DB_HOST || null,
        expected_db_project_ref: process.env.EXPECTED_DB_PROJECT_REF || null,
      },
      connection_config: details ? {
        host: details.host,
        project_ref: details.projectRef,
        pooler_type: details.poolerType,
        is_session_pooler: details.isSessionPooler,
        is_transaction_pooler: details.isTransactionPooler,
        is_supabase_pooler: details.isSupabasePooler,
      } : null,
      db_runtime: rows[0],
      warnings: details && details.isTransactionPooler ? [
        'Using transaction pooler (aws-1). Session pooler (aws-0) recommended for better compatibility.'
      ] : [],
    });
  } catch (e) {
    res.status(500).json({ error: { code: 'DBINFO_FAIL', message: e.message } });
  }
  });
} else {
  // Return 404 in production
  app.get('/api/debug/dbinfo', (req, res) => {
    res.status(404).json({ error: 'Debug endpoints disabled in production' });
  });
}
// ⚙️ --- END DEBUG ---

// --- Public health check endpoints (legacy) ---
app.get(['/health', '/api/health'], (_, res) => res.json({ status: 'ok' }));

// --- Mount comprehensive health check routes ---
app.use('/api/health', require('./routes/health'));

// --- Self-contained health check with TLS configuration ---
const { healthz } = require('./routes/healthz');
app.get('/healthz', healthz);

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

// --- Enforce authentication on all /api/* routes ---
const { requireAuth } = require('./middleware/auth');
app.use('/api', requireAuth);

// --- Protected API endpoints ---
app.get('/api/users', async (_, res) => {
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
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api', require('./routes/attachments'));

// --- Subtask routes need to be at /api level ---
app.patch('/api/subtasks/:id', async (req, res) => {
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

app.delete('/api/subtasks/:id', async (req, res) => {
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

// --- Error handling (must be last) ---
const { notFoundHandler, errorHandler } = require('./middleware/error-handler');
app.use(notFoundHandler);
app.use(errorHandler);

// --- Start server ---
const port = process.env.PORT || 3000;
app.listen(port, () => {
  logger.info('API server started', { port, env: process.env.NODE_ENV || 'development' });
  console.log(`API server running on port :${port}`);
});
