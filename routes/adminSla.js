// routes/adminSla.js - Admin API for SLA threshold configuration
// Protected by admin:manage permission

const express = require('express');
const { requirePerm } = require('../middleware/permissions');
const { pool } = require('../services/database');

const router = express.Router();

/**
 * GET /api/admin/sla/unack-handoff
 * Get current SLA threshold for unacknowledged handoffs
 */
router.get('/unack-handoff', requirePerm('admin:manage'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT value_seconds FROM sla_thresholds WHERE key = 'unacknowledged_handoff_sla'
    `);
    
    const value = Number(result.rows?.[0]?.value_seconds ?? 48 * 3600);
    
    res.json({ 
      key: 'unacknowledged_handoff_sla', 
      value_seconds: value 
    });
  } catch (err) {
    console.error('[ADMIN-SLA] Failed to get SLA:', err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get SLA threshold' }
    });
  }
});

/**
 * PUT /api/admin/sla/unack-handoff
 * Update SLA threshold for unacknowledged handoffs
 * Body: { value_seconds: number }
 */
router.put('/unack-handoff', requirePerm('admin:manage'), async (req, res) => {
  try {
    const v = Number(req.body?.value_seconds);
    
    if (!Number.isFinite(v) || v < 0) {
      return res.status(400).json({ 
        ok: false, 
        error: 'value_seconds must be a non-negative number' 
      });
    }

    await pool.query(`
      INSERT INTO sla_thresholds (key, value_seconds)
      VALUES ('unacknowledged_handoff_sla', $1)
      ON CONFLICT (key) DO UPDATE 
        SET value_seconds = EXCLUDED.value_seconds, 
            updated_at = now()
    `, [v]);

    res.json({ 
      ok: true, 
      key: 'unacknowledged_handoff_sla', 
      value_seconds: v 
    });
  } catch (err) {
    console.error('[ADMIN-SLA] Failed to update SLA:', err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update SLA threshold' }
    });
  }
});

module.exports = router;
