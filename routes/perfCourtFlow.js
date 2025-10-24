// routes/perfCourtFlow.js
// Court-flow analytics: per-department handoff KPIs and bottleneck identification
// Provides 30-day metrics for ops intelligence and dashboards

const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { pool } = require('../services/database');

const router = Router();

/**
 * GET /api/perf/court-flow
 * Returns 30-day per-department court-flow metrics
 * 
 * Response shape:
 * {
 *   range: '30d',
 *   items: [
 *     {
 *       dept: 'Procurement',
 *       passes_in: 12,
 *       acks: 10,
 *       unacked: 2,
 *       avg_hold_s: 86400,
 *       p50_hold_s: 43200,
 *       max_hold_s: 432000
 *     }
 *   ]
 * }
 */
router.get('/perf/court-flow', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM v_court_flow_30d 
      ORDER BY avg_hold_s DESC NULLS LAST
    `);

    res.json({
      range: '30d',
      items: result.rows || []
    });
  } catch (err) {
    console.error('[COURT-FLOW] Query failed:', err);
    res.status(500).json({
      error: { 
        code: 'INTERNAL_ERROR', 
        message: 'Failed to fetch court-flow metrics' 
      }
    });
  }
});

module.exports = router;
