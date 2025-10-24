// routes/ballHistory.js
// Read-only API for ball-in-court event history
// Provides comprehensive audit trail for task handoffs and responsibility transfers

const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { requirePerm } = require('../middleware/permissions');
const { pool } = require('../services/database');

const router = Router();

/**
 * GET /api/tasks/:id/ball-history
 * Retrieve all ball-in-court events for a task with hold-time calculation
 * Returns events in reverse chronological order (newest first)
 */
router.get('/tasks/:id/ball-history', requireAuth, async (req, res) => {
  try {
    const taskId = req.params.id;

    const result = await pool.query(`
      SELECT 
        e.id,
        e.task_id,
        e.from_role,
        e.to_role,
        e.from_user_email,
        e.to_user_email,
        e.reason,
        e.triggered_by_policy,
        e.acknowledged,
        e.acknowledged_by,
        e.acknowledged_at,
        e.acknowledged_by_email,
        e.created_at,
        v.hold_seconds
      FROM ball_in_court_events e
      LEFT JOIN v_ball_hold_time v ON v.event_id = e.id
      WHERE e.task_id = $1
      ORDER BY e.created_at DESC
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

/**
 * PATCH /api/tasks/:taskId/ball-history/:eventId/ack
 * Acknowledge receipt of a ball-in-court handoff
 * Records who acknowledged and when
 */
router.patch('/tasks/:taskId/ball-history/:eventId/ack', requireAuth, async (req, res) => {
  try {
    const { taskId, eventId } = req.params;
    const userEmail = req.user?.email || 'unknown';

    const result = await pool.query(`
      UPDATE ball_in_court_events
      SET 
        acknowledged = true,
        acknowledged_at = now(),
        acknowledged_by = $3,
        acknowledged_by_email = $3
      WHERE id = $1 AND task_id = $2
      RETURNING id, acknowledged, acknowledged_at, acknowledged_by_email
    `, [eventId, taskId, userEmail]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Ball-in-court event not found' }
      });
    }

    console.log(`[BALL-ACK] Event ${eventId} acknowledged by ${userEmail}`);

    res.json({
      ok: true,
      event: result.rows[0]
    });
  } catch (err) {
    console.error('[BALL-ACK] Failed to acknowledge event:', err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to acknowledge handoff' }
    });
  }
});

/**
 * GET /api/tasks/:id/ball-late
 * Get the latest unacknowledged event with SLA status
 * Returns null if no unacknowledged events exist
 */
router.get('/tasks/:id/ball-late', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      WITH sla AS (
        SELECT COALESCE(
          (SELECT value_seconds FROM sla_thresholds WHERE key='unacknowledged_handoff_sla'), 
          48*3600
        ) AS v
      )
      SELECT 
        e.id, 
        e.task_id, 
        e.to_role, 
        e.created_at,
        EXTRACT(EPOCH FROM (now() - e.created_at))::bigint AS age_s,
        (SELECT v FROM sla) AS sla_s,
        (EXTRACT(EPOCH FROM (now() - e.created_at))::bigint) > (SELECT v FROM sla) AS late
      FROM ball_in_court_events e
      WHERE e.task_id = $1 AND e.acknowledged = false
      ORDER BY e.created_at DESC
      LIMIT 1
    `, [id]);

    res.json({ 
      ok: true, 
      late: result.rows?.[0] ?? null 
    });
  } catch (err) {
    console.error('[BALL-LATE] Failed to check SLA status:', err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to check SLA status' }
    });
  }
});

/**
 * POST /api/tasks/:id/ball-nudge
 * Send a one-off reminder to the recipient of the latest unacknowledged handoff
 * Requires admin:manage permission
 */
router.post('/tasks/:id/ball-nudge', requirePerm('admin:manage'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT e.id, e.task_id, e.to_role, e.created_at
      FROM ball_in_court_events e
      WHERE e.task_id = $1 AND e.acknowledged = false
      ORDER BY e.created_at DESC
      LIMIT 1
    `, [id]);

    const ev = result.rows?.[0];
    if (!ev) {
      return res.status(404).json({ 
        ok: false, 
        error: 'No unacknowledged handoff for this task' 
      });
    }

    // Create one-off notification (NOT logged as decision execution; this is a manual nudge)
    await pool.query(`
      INSERT INTO notifications (user_id, channel, event_code, payload, type, created_at)
      SELECT ur.user_id, 'inapp', 'BALL_NUDGE', $1::jsonb, 'nudge', now()
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE r.slug = $2
    `, [
      JSON.stringify({ 
        message: `Reminder: Please acknowledge the handoff for this task.`,
        target_type: 'task', 
        target_id: ev.task_id,
        kind: 'handoff_nudge',
        event_id: ev.id
      }),
      ev.to_role || 'ops'
    ]);

    console.log(`[BALL-NUDGE] Sent nudge for task ${id}, event ${ev.id}, to role ${ev.to_role}`);

    res.json({ 
      ok: true, 
      nudged: true, 
      event_id: ev.id 
    });
  } catch (err) {
    console.error('[BALL-NUDGE] Failed to send nudge:', err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to send nudge' }
    });
  }
});

module.exports = router;
