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
      environment: process.env.SENTRY_ENV || 'development',
      release: process.env.RELEASE_SHA,
      integrations: [
        nodeProfilingIntegration(),
        Sentry.httpIntegration(),
        ...(Sentry.expressIntegration ? [Sentry.expressIntegration()] : [])
      ],
      tracesSampleRate: 0.3,
      profilesSampleRate: 0.1,
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
    
    // Set release tags for build identification
    if (process.env.RELEASE_SHA) {
      Sentry.setTag("release", process.env.RELEASE_SHA);
    }
    if (process.env.BUILD_TIME) {
      Sentry.setTag("build_time", process.env.BUILD_TIME);
    }
    
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
const { v4: uuidv4 } = require('uuid');
const pinoHttp = require('pino-http');
const { bootstrapDatabase, refreshPoolMetadata, pool } = require('./services/database');
const { logActivity } = require('./middleware/audit');
const logger = require('./lib/logger');

const app = express();
app.use(express.json());

// Request ID middleware (before all other middleware)
function requestIdMiddleware(req, res, next) {
  // Preserve upstream ID if present, else create one
  const hdr = req.headers['x-request-id'];
  const id = (typeof hdr === 'string' && hdr.trim()) ? hdr.trim() : uuidv4();
  req.id = id;
  res.locals.req_id = id;
  res.setHeader('X-Request-Id', id);
  next();
}

// Pino HTTP middleware (structured logs)
const httpLogger = pinoHttp({
  logger,
  customProps: (req, res) => ({
    req_id: req.id,
    user_id: res.locals?.user?.id || null,
    user_email: res.locals?.user?.email || null,
    role: res.locals?.user?.role || null,
  }),
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
        remoteAddress: req.socket?.remoteAddress,
        remotePort: req.socket?.remotePort,
        headers: {
          'user-agent': req.headers['user-agent'],
          'x-forwarded-for': req.headers['x-forwarded-for'],
        },
      };
    },
    res(res) {
      return { statusCode: res.statusCode };
    }
  }
});

// Velocity Layer: Metrics Core
const { makeMetrics } = require('./lib/metrics');
const metrics = makeMetrics();

// Helper to get stable route key (for both Metrics and Sentry)
function routeKey(req) {
  return `${req.method} ${req.route?.path || req.path}`;
}

// Request timing + metrics collection hook + Sentry tagging
function requestTimingMiddleware(req, res, next) {
  // Name Sentry transaction by route for better grouping
  if (sentryEnabled) {
    const tx = Sentry.getCurrentHub && Sentry.getCurrentHub().getScope && Sentry.getCurrentHub().getScope().getTransaction && Sentry.getCurrentHub().getScope().getTransaction();
    if (tx) tx.setName(routeKey(req));

    // Add per-request tags early
    Sentry.setTag("route", req.route?.path || req.path);
    Sentry.setTag("method", req.method);
    if (process.env.RELEASE_SHA) Sentry.setTag("release", process.env.RELEASE_SHA);
    if (process.env.BUILD_TIME) Sentry.setTag("build_time", process.env.BUILD_TIME);
  }

  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const duration_ms = Number(end - start) / 1e6;
    const ok = res.statusCode < 400;
    
    // Feed metrics aggregator
    metrics.tap(req, res, duration_ms, ok);
    
    // Keep Pino structured logging
    req.log.info({ req_id: req.id, duration_ms, statusCode: res.statusCode }, 'req_complete');

    // Add outcome tags for Sentry breadcrumbs
    if (sentryEnabled) {
      Sentry.setTag("status_code", res.statusCode);
      Sentry.setTag("duration_ms", Math.round(duration_ms));

      // If a 5xx slipped through without throwing, report it explicitly
      if (res.statusCode >= 500) {
        Sentry.captureMessage("HTTP 5xx response", {
          level: "error",
          tags: {
            route: req.route?.path || req.path,
            method: req.method,
            status_code: res.statusCode,
            duration_ms: Math.round(duration_ms),
          },
        });
      }
    }
  });
  next();
}

// Apply correlation and logging middleware early
app.use(requestIdMiddleware);
app.use(httpLogger);
app.use(requestTimingMiddleware);

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
if (sentryEnabled && Sentry.Handlers) {
  if (Sentry.Handlers.requestHandler) {
    app.use(Sentry.Handlers.requestHandler());
  }
  if (Sentry.Handlers.tracingHandler) {
    app.use(Sentry.Handlers.tracingHandler());
  }
}

// --- Layer: Observability/Tracing — Cross-service propagation ---
app.use((req, res, next) => {
  try {
    // Get active span using Sentry v8+ API
    const span = Sentry.getActiveSpan && Sentry.getActiveSpan();

    // Build outbound headers for client to continue the trace
    if (span) {
      // Try toTraceparent (newer API) or fallback to other methods
      if (typeof span.toTraceparent === "function") {
        res.setHeader("sentry-trace", span.toTraceparent());
      } else if (span.toJSON && span.toJSON().trace_id) {
        // Fallback: manually construct sentry-trace header
        const spanContext = span.toJSON();
        const traceHeader = `${spanContext.trace_id}-${spanContext.span_id}-${spanContext.sampled ? '1' : '0'}`;
        res.setHeader("sentry-trace", traceHeader);
      }
      
      // Get baggage/dynamic sampling context
      if (typeof Sentry.getClient === 'function') {
        const client = Sentry.getClient();
        if (client && typeof client.getDynamicSamplingContext === 'function') {
          const dsc = client.getDynamicSamplingContext(span);
          if (dsc) {
            const baggageStr = Object.entries(dsc)
              .map(([key, value]) => `sentry-${key}=${value}`)
              .join(',');
            if (baggageStr) res.setHeader("baggage", baggageStr);
          }
        }
      }
    }

    // Already have req_id? Surface it, too (redundant with requestIdMiddleware but ensures it's set)
    if (req.id) res.setHeader("X-Request-Id", req.id);
  } catch (err) {
    // Silently fail - don't break requests if Sentry trace headers fail
    // This ensures the app continues working even if Sentry APIs change
  }

  next();
});

// --- Layer: Observability/Tracing — Sentry scope enrichment ---
app.use((req, res, next) => {
  try {
    // Use Sentry v8+ setTag and setUser methods
    if (req.id) {
      Sentry.setTag("req_id", req.id);
    }
    if (res.locals?.user?.id) {
      Sentry.setUser({ 
        id: String(res.locals.user.id), 
        email: res.locals.user.email || undefined 
      });
    }
  } catch (err) {
    // Silently fail - don't break requests if Sentry scope methods fail
  }
  next();
});

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
// Store promise for startup gate to await
const bootstrapPromise = bootstrapDatabase()
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
    
    return result;
  })
  .catch(err => {
    logger.critical('Unexpected error during bootstrap', { error: err.message });
    return { connected: false, error: err.message, degraded: true };
  });

// ⚙️ --- DEBUG ONLY (disabled in production) ---
const { Pool } = require('pg');

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
app.use('/api/admin', require('./routes/admin'));
app.use('/api', require('./routes/audit'));
app.use('/api', require('./routes/taskChecklist'));
app.use('/api', require('./routes/performance'));
app.use('/api', require('./routes/perfCourtFlow'));
app.use('/api/admin/decisions', require('./routes/decisionsAdmin'));
app.use('/api/admin/decisions', require('./routes/decisionsNotionSync'));
app.use('/api/admin/sla', require('./routes/adminSla'));
app.use('/api', require('./routes/ballHistory'));

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

// --- Ops Health Endpoints (Resilience Layer) ---
const { makeHealth } = require('./lib/health');
const health = makeHealth({ db: pool });

// New Resilience Layer endpoints (Velocity/Health Core)
app.get('/ops/live', (_req, res) => {
  res.status(200).send('OK');
});

app.get('/ops/ready', (_req, res) => {
  return health.readiness() ? res.status(200).send('READY') : res.status(503).send('NOT_READY');
});

app.get('/ops/health', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(health.snapshot());
});

// Liveness: app is up; returns 200 if process is healthy enough to serve (compatibility endpoint)
app.get('/healthz', async (req, res) => {
  const snap = health.snapshot();
  const code = snap.db.ok ? 200 : 503;
  res.status(code).json({ 
    endpoint: 'healthz', 
    status: snap.db.ok ? 'ok' : 'degraded',
    checks: { db: { ok: snap.db.ok, ms: snap.db.latency_ms } },
    env: snap.env,
    version: snap.version,
    build_time: snap.build_time,
    uptime_s: Math.floor(snap.uptime_ms / 1000),
    resources: {},
    latency_ms: 0
  });
});

// Readiness: stricter (fail fast if DB isn't reachable) (compatibility endpoint)
app.get('/ready', async (req, res) => {
  const snap = health.snapshot();
  const ready = snap.readiness;
  res.status(ready ? 200 : 503).json({ 
    endpoint: 'ready',
    status: snap.db.ok ? 'ok' : 'degraded',
    checks: { db: { ok: snap.db.ok, ms: snap.db.latency_ms } },
    env: snap.env,
    version: snap.version,
    build_time: snap.build_time,
    uptime_s: Math.floor(snap.uptime_ms / 1000),
    resources: {},
    latency_ms: 0
  });
});

// Version: expose version for dashboards
app.get('/version', (_req, res) => {
  res.json({
    version: process.env.RELEASE_SHA || 'dev',
    env: process.env.SENTRY_ENV || process.env.NODE_ENV || 'dev',
    build_time: process.env.BUILD_TIME || null,
    uptime_s: Math.floor(process.uptime()),
  });
});

// Velocity Metrics: per-route KPIs with rolling windows
app.get('/ops/metrics', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(metrics.snapshot());
});

app.get('/ops/metrics/trends', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(metrics.trends());
});

// Velocity → Sentry correlation: deep link to filtered Discover view
app.get('/ops/sentry-link', (req, res) => {
  const org = process.env.SENTRY_ORG_SLUG || "";
  const project = process.env.SENTRY_PROJECT_SLUG || "";
  const env = process.env.SENTRY_ENV || process.env.NODE_ENV || "dev";
  const route = req.query.route;

  if (!route) return res.status(400).json({ error: "missing route" });
  if (!org || !project) {
    return res.status(200).json({
      url: null,
      missing: {
        SENTRY_ORG_SLUG: !org,
        SENTRY_PROJECT_SLUG: !project,
      },
    });
  }
  const query = encodeURIComponent(`event.type:error environment:${env} route:"${route}"`);
  const name = encodeURIComponent(`Velocity: ${route}`);
  const url =
    `https://sentry.io/organizations/${org}/discover/results/` +
    `?name=${name}&field=timestamp&field=message&field=release&field=trace&field=transaction` +
    `&query=${query}&project=${project}&statsPeriod=1h`;

  res.json({ url });
});

// --- Sentry test route (development only) ---
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/_sentry-test', (req, res) => {
    throw new Error('Sentry test crash: boom 💥');
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
if (sentryEnabled && Sentry.Handlers && Sentry.Handlers.errorHandler) {
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

// --- Auto-Decisions v0 (Safe Rules Engine) ---
const { runDecisionCycle } = require('./services/decisions');

async function runDecisions() {
  try {
    await runDecisionCycle();
  } catch (err) {
    console.error('[DECISIONS] Cycle failed:', err);
  }
}

// Schedule decision engine every 5 minutes
cron.schedule('*/5 * * * *', runDecisions, {
  scheduled: true
});

console.log('[CRON] Scheduled decision engine (every 5 minutes)');

// --- Start server ---
const port = process.env.PORT || 3000;
app.listen(port, () => {
  logger.info('API server started', { port, env: process.env.NODE_ENV || 'development' });
  console.log(`API server running on port :${port}`);
});

// --- Active Layer: Resilience/Auto-Restart Guard — Startup gate ---
(async () => {
  try {
    // CRITICAL: Wait for database bootstrap to complete before health check
    // This prevents race condition where health check runs before pool is ready
    console.log('[STARTUP_GATE] Waiting for database bootstrap to complete...');
    await bootstrapPromise;
    console.log('[STARTUP_GATE] Database bootstrap complete, waiting for DB readiness...');
    
    // Use new health system with exponential backoff
    await health.waitUntilReady();
    
    const snap = health.snapshot();
    console.log(JSON.stringify({ level: 30, msg: "startup_gate_ok", health: { db_ok: snap.db.ok, db_latency_ms: snap.db.latency_ms } }));
  } catch (e) {
    console.error(JSON.stringify({ level: 50, msg: "startup_gate_exception", error: String(e) }));
    process.exit(42);
  }
})();

// --- Active Layer: Resilience/Auto-Restart Guard — Periodic watchdog ---
const WATCH_MS = Number(process.env.WATCHDOG_INTERVAL_MS || 30000); // 30s
const FAILS_TO_EXIT = Number(process.env.WATCHDOG_FAILS_TO_EXIT || 4); // ~2 min default
let consecutiveFails = 0;

setInterval(() => {
  try {
    const snap = health.snapshot();
    const ok = snap.db.ok === true;
    if (ok) {
      if (consecutiveFails > 0) {
        console.log(JSON.stringify({ level: 30, msg: "watchdog_recovered", consecutiveFails }));
      }
      consecutiveFails = 0;
      return;
    }
    consecutiveFails += 1;
    console.warn(JSON.stringify({ level: 40, msg: "watchdog_degraded", consecutiveFails, health: { db_ok: snap.db.ok, db_latency_ms: snap.db.latency_ms, readiness: snap.readiness } }));
    if (consecutiveFails >= FAILS_TO_EXIT) {
      console.error(JSON.stringify({ level: 50, msg: "watchdog_exit", reason: "consecutive_degraded", count: consecutiveFails }));
      process.exit(43);
    }
  } catch (e) {
    consecutiveFails += 1;
    console.error(JSON.stringify({ level: 50, msg: "watchdog_exception", error: String(e), consecutiveFails }));
    if (consecutiveFails >= FAILS_TO_EXIT) process.exit(44);
  }
}, WATCH_MS);
