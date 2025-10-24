// routes/health.js
// Health check and monitoring endpoints

const express = require('express');
const router = express.Router();
const { runHealthChecks, quickHealthCheck } = require('../lib/health-checks');
const { metrics } = require('../lib/metrics');
const { pool } = require('../services/database');

/**
 * Comprehensive health check endpoint
 * Returns detailed health information about all system components
 */
router.get('/detailed', async (req, res) => {
  try {
    const health = await runHealthChecks();
    const statusCode = health.healthy ? 200 : 503;
    
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(500).json({
      healthy: false,
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * Quick health check endpoint
 * For load balancers and simple uptime monitoring
 */
router.get('/quick', async (req, res) => {
  try {
    const health = await quickHealthCheck();
    const statusCode = health.healthy ? 200 : 503;
    
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(500).json({
      healthy: false,
      status: 'error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Simple health endpoint with module change beacons
 * Returns last_change timestamps for tasks and projects
 * Used by frontend for realtime-lite refresh detection
 */
router.get('/', async (req, res) => {
  try {
    const [tasksResult, projectsResult] = await Promise.all([
      pool.query('SELECT MAX(updated_at) as max FROM tasks'),
      pool.query('SELECT MAX(updated_at) as max FROM projects')
    ]);

    const tasksMax = tasksResult.rows[0]?.max;
    const projectsMax = projectsResult.rows[0]?.max;

    res.json({
      ok: true,
      modules: {
        tasks: { last_change: tasksMax || null },
        projects: { last_change: projectsMax || null }
      },
      now: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message,
      now: new Date().toISOString()
    });
  }
});

/**
 * Liveness probe
 * Simple check that the process is running
 */
router.get('/live', (req, res) => {
  res.json({
    alive: true,
    timestamp: new Date().toISOString()
  });
});

/**
 * Readiness probe
 * Check if the service is ready to accept traffic
 */
router.get('/ready', async (req, res) => {
  try {
    const health = await quickHealthCheck();
    
    if (health.healthy) {
      res.json({
        ready: true,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        ready: false,
        reason: health.status,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(503).json({
      ready: false,
      reason: 'health_check_failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Metrics endpoint
 * Returns application metrics
 */
router.get('/metrics', (req, res) => {
  try {
    const snapshot = metrics.getSnapshot();
    res.json(snapshot);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to collect metrics',
      message: error.message
    });
  }
});

/**
 * Combined monitoring dashboard endpoint
 * Health + Metrics in one response
 */
router.get('/status', async (req, res) => {
  try {
    const [health, metricsSnapshot] = await Promise.all([
      runHealthChecks(),
      Promise.resolve(metrics.getSnapshot())
    ]);
    
    res.json({
      timestamp: new Date().toISOString(),
      health,
      metrics: metricsSnapshot
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get status',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
