// server.js - Lean main entry point
require('dotenv').config();

// Sentry initialization (must be first)
const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

let sentryEnabled = false;
if (process.env.SENTRY_DSN && process.env.SENTRY_DSN.startsWith('https://')) {
  try {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      integrations: [
        nodeProfilingIntegration()
      ],
      tracesSampleRate: 0.2,
      profilesSampleRate: 0.2,
      beforeSend(event) {
        const scrub = (obj) => {
          if (!obj || typeof obj !== 'object') return obj;
          return JSON.parse(JSON.stringify(obj, (key, value) => {
            if (typeof value === 'string' && 
                /password|token|secret|api|ssn|sin|email|authorization|cookie/i.test(key)) {
              return '[REDACTED]';
            }
            return value;
          }));
        };
        
        if (event.request) event.request = scrub(event.request);
        if (event.user) event.user = scrub(event.user);
        if (event.extra) event.extra = scrub(event.extra);
        
        return event;
      }
    });
    sentryEnabled = true;
  } catch (err) {
    console.error('Failed to initialize Sentry:', err.message);
  }
}

// Enforce single-database contract (fail fast on misconfiguration)
const { assertSingleDatabaseUrl } = require('./lib/config-db');
assertSingleDatabaseUrl();

const express = require('express');
const rateLimit = require('express-rate-limit');
const { bootstrapDatabase, refreshPoolMetadata } = require('./services/database');
const { logActivity } = require('./middleware/audit');
const { metricsMiddleware } = require('./lib/metrics');
const logger = require('./lib/logger');

const app = express();
app.use(express.json());

const authRateLimiter = rateLimit({
  windowMs: 60000,
  max: 20,
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many auth requests, please try again later' } }
});

const webhookRateLimiter = rateLimit({
  windowMs: 60000,
  max: 60,
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many webhook requests' } }
});

// Sentry request handler and tracing (must be after express.json, before routes)
if (sentryEnabled) {
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

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
    
    // Send Sentry boot signal if configured
    if (sentryEnabled) {
      Sentry.captureMessage('SENTRY_INIT_OK');
      logger.info('Sentry monitoring active');
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

// --- Mount comprehensive health check routes with module change beacons ---
app.use('/api/health', require('./routes/health'));

// --- Public health check endpoint (simple alias) ---
app.get('/health', (_, res) => res.json({ status: 'ok' }));

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

// --- Comprehensive database diagnostics endpoint ---
const { getDatabaseDiagnostics } = require('./services/db-diagnostics');
app.get('/diag/db', async (req, res) => {
  try {
    const diagnostics = await getDatabaseDiagnostics();
    const statusCode = diagnostics.status === 'up' ? 200 : 503;
    res.status(statusCode).json(diagnostics);
  } catch (err) {
    res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 'error',
      error: {
        message: err.message,
        type: err.constructor.name
      }
    });
  }
});

// --- Public guest view routes (MUST be before auth middleware) ---
app.use('/api/guest', require('./routes/guestView'));

// --- User info endpoints (requires auth) ---
app.use('/api', require('./routes/me'));

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
app.use('/api/guest-links', require('./routes/guestLinks'));
app.use('/api/ops', require('./routes/ops'));
app.use('/api', require('./routes/preferences'));

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

// --- Sentry test route (development only) ---
if (process.env.NODE_ENV !== 'production') {
  app.get('/boom', (req, res) => {
    throw new Error('Sentry test error');
  });
}

// --- Serve production frontend (static files) ---
const path = require('path');
const fs = require('fs');
const frontendDistPath = path.join(__dirname, 'apps', 'coordination_ui', 'dist');

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  
  // Catch-all route for SPA (must be after all API routes)
  app.use((req, res, next) => {
    // Skip if it's an API, health check, or database route
    if (req.path.startsWith('/api') || req.path.startsWith('/db') || req.path.startsWith('/health') || req.path.startsWith('/diag') || req.path.startsWith('/routes')) {
      return next();
    }
    // Serve index.html for all other routes (SPA client-side routing)
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
  
  logger.info('Serving production frontend from dist folder');
}

// --- Sentry error handler (must be after routes, before other error handlers) ---
if (sentryEnabled) {
  app.use(Sentry.Handlers.errorHandler());
}

// --- Error handling (must be last) ---
const { notFoundHandler, errorHandler } = require('./middleware/error-handler');
app.use(notFoundHandler);
app.use(errorHandler);

// --- Nightly overdue notifier + recompute ---
const cron = require('node-cron');
const { enqueue } = require('./services/queue');
const { recomputeOverdue } = require('./services/recomputeOverdue');
const { recomputeIdle } = require('./services/recomputeIdle');

async function runDailyOverdue() {
  try {
    console.log('[DAILY-JOB] Running overdue check...');
    
    // First, recompute is_overdue flags (server-side truth)
    const { setTrue, setFalse } = await recomputeOverdue('cron');
    console.log(`[DAILY-JOB] Overdue flags recomputed: ${setTrue} set to true, ${setFalse} set to false`);
    
    // Then, send notifications for overdue tasks
    const { rows } = await pool.query(`
      SELECT t.id, t.title, t.assignee_id, t.project_id, t.due_at
      FROM tasks t
      WHERE t.due_at IS NOT NULL 
        AND t.due_at < now() 
        AND t.status NOT IN ('done','closed')
        AND t.deleted_at IS NULL
    `);
    
    console.log(`[DAILY-JOB] Found ${rows.length} overdue tasks`);
    
    for (const r of rows) {
      if (r.assignee_id) {
        await enqueue("notify-user", { 
          userId: r.assignee_id, 
          event: "task.overdue", 
          meta: { 
            taskId: r.id, 
            title: r.title, 
            due_at: r.due_at, 
            project_id: r.project_id 
          } 
        });
      }
    }
    
    await enqueue("daily-summary", { dateIso: new Date().toISOString().slice(0,10) });
    console.log('[DAILY-JOB] Overdue check complete');
  } catch (err) {
    console.error('[DAILY-JOB] Error running overdue check:', err);
  }
}

// Run once at startup (after 10s delay)
setTimeout(runDailyOverdue, 10000);

// Schedule daily at 3:00 AM America/Toronto timezone
cron.schedule('0 3 * * *', runDailyOverdue, {
  scheduled: true,
  timezone: 'America/Toronto'
});

console.log('[CRON] Scheduled daily overdue check for 3:00 AM America/Toronto');

// --- Daily idle reminder check ---
async function runDailyIdle() {
  try {
    console.log('[DAILY-JOB] Running idle reminder check...');
    
    // Recompute needs_idle_reminder flags (server-side truth)
    const { setTrue, setFalse } = await recomputeIdle('cron');
    console.log(`[DAILY-JOB] Idle reminder flags recomputed: ${setTrue} set to true, ${setFalse} set to false`);
    
    // Optional: Send notifications for idle tasks
    const { rows } = await pool.query(`
      SELECT t.id, t.title, t.assignee_id, t.project_id, t.updated_at
      FROM tasks t
      WHERE t.needs_idle_reminder = true
        AND t.deleted_at IS NULL
    `);
    
    console.log(`[DAILY-JOB] Found ${rows.length} idle tasks`);
    
    for (const r of rows) {
      if (r.assignee_id) {
        await enqueue("notify-user", { 
          userId: r.assignee_id, 
          event: "task.idle", 
          meta: { 
            taskId: r.id, 
            title: r.title, 
            last_updated: r.updated_at, 
            project_id: r.project_id 
          } 
        });
      }
    }
    
    console.log('[DAILY-JOB] Idle reminder check complete');
  } catch (err) {
    console.error('[DAILY-JOB] Error running idle reminder check:', err);
  }
}

// Schedule idle reminder check daily at 9:05 AM America/Toronto timezone
cron.schedule('5 9 * * *', runDailyIdle, {
  scheduled: true,
  timezone: 'America/Toronto'
});

console.log('[CRON] Scheduled daily idle reminder check for 9:05 AM America/Toronto');

// --- Start server ---
const port = process.env.PORT || 3000;
app.listen(port, () => {
  logger.info('API server started', { port, env: process.env.NODE_ENV || 'development' });
  console.log(`API server running on port :${port}`);
});
