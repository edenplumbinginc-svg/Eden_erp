// routes/ballHistory.js
// Read-only API for ball-in-court event history
// Provides comprehensive audit trail for task handoffs and responsibility transfers

const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { pool } = require('../services/database');

const router = Router();

/**
 * GET /api/tasks/:id/ball-history
 * Retrieve all ball-in-court events for a task
 * Returns events in reverse chronological order (newest first)
 */
router.get('/tasks/:id/ball-history', requireAuth, async (req, res) => {
  try {
    const taskId = req.params.id;

    const result = await pool.query(`
      SELECT 
        id,
        task_id,
        from_role,
        to_role,
        from_user_email,
        to_user_email,
        reason,
        triggered_by_policy,
        acknowledged,
        acknowledged_by,
        created_at
      FROM ball_in_court_events
      WHERE task_id = $1
      ORDER BY created_at DESC
    `, [taskId]);

    res.json({
      ok: true,
      task_id: taskId,
      events: result.rows,
      count: result.rows.length
    });
  } catch (err) {
    console.error('[BALL-HISTORY] Failed to fetch events:', err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch ball-in-court history' }
    });
  }
});

module.exports = router;
