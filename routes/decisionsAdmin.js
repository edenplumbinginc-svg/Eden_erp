// routes/decisionsAdmin.js - Admin API for Auto-Decisions v0
// Manage decision policies and view execution audit trail
// Protected by admin:manage permission

const express = require('express');
const { requirePerm } = require('../middleware/permissions');
const { pool } = require('../services/database');
const { runDecisionCycle } = require('../services/decisions');

const router = express.Router();

/**
 * GET /api/admin/decisions/policies
 * List all decision policies (enabled and disabled)
 */
router.get('/policies', requirePerm('admin:manage'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, slug, enabled, dry_run, description, condition, action, created_at, updated_at
      FROM decision_policies
      ORDER BY slug
    `);

    res.json({ ok: true, items: result.rows });
  } catch (err) {
    console.error('[DECISIONS-ADMIN] Failed to list policies:', err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list policies' }
    });
  }
});

/**
 * POST /api/admin/decisions/run-once
 * Manually trigger a decision cycle (for testing)
 */
router.post('/run-once', requirePerm('admin:manage'), async (req, res) => {
  try {
    await runDecisionCycle();
    res.json({ ok: true, message: 'Decision cycle executed' });
  } catch (err) {
    console.error('[DECISIONS-ADMIN] Manual run failed:', err);
    res.status(500).json({
      ok: false,
      error: { code: 'EXECUTION_FAILED', message: 'Decision cycle failed' }
    });
  }
});

/**
 * POST /api/admin/decisions/toggle
 * Toggle policy enabled/dry_run flags
 * Body: { slug, enabled?, dry_run? }
 */
router.post('/toggle', requirePerm('admin:manage'), async (req, res) => {
  try {
    const { slug, enabled, dry_run } = req.body || {};

    if (!slug) {
      return res.status(400).json({
        ok: false,
        error: { code: 'MISSING_SLUG', message: 'Policy slug is required' }
      });
    }

    // Build dynamic update query (only update provided fields)
    const updates = [];
    const values = [];
    let paramCounter = 1;

    if (typeof enabled === 'boolean') {
      updates.push(`enabled = $${paramCounter++}`);
      values.push(enabled);
    }

    if (typeof dry_run === 'boolean') {
      updates.push(`dry_run = $${paramCounter++}`);
      values.push(dry_run);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        ok: false,
        error: { code: 'NO_UPDATES', message: 'No updates provided (enabled or dry_run)' }
      });
    }

    updates.push('updated_at = now()');
    values.push(slug);

    const query = `
      UPDATE decision_policies
      SET ${updates.join(', ')}
      WHERE slug = $${paramCounter}
      RETURNING id, slug, enabled, dry_run, description
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: { code: 'POLICY_NOT_FOUND', message: `Policy '${slug}' not found` }
      });
    }

    res.json({ ok: true, item: result.rows[0] });
  } catch (err) {
    console.error('[DECISIONS-ADMIN] Toggle failed:', err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to toggle policy' }
    });
  }
});

/**
 * GET /api/admin/decisions/executions
 * List recent decision executions (audit trail)
 * Query params: limit (default 50, max 200)
 */
router.get('/executions', requirePerm('admin:manage'), async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 50), 200);

    const result = await pool.query(`
      SELECT id, policy_slug, matched, dry_run, effect, target_type, target_id, payload, created_at
      FROM decision_executions
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);

    res.json({ ok: true, items: result.rows });
  } catch (err) {
    console.error('[DECISIONS-ADMIN] Failed to list executions:', err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list executions' }
    });
  }
});

module.exports = router;
