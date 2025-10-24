// routes/audit.js - Audit log read API

const express = require('express');
const { requirePerm } = require('../middleware/permissions');
const { pool } = require('../services/database');

const router = express.Router();

// GET /api/admin/audit - Fetch recent audit log entries
// Query params:
//   - limit: number of entries (default: 100, max: 500)
//   - since: ISO timestamp to fetch entries after
router.get('/admin/audit', requirePerm('admin:manage'), async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const since = req.query.since;

    let query;
    let params;

    if (since) {
      query = `
        SELECT 
          id, actor_id, actor_email, action, target_type, target_id, payload, created_at
        FROM audit_logs
        WHERE created_at > $1
        ORDER BY created_at DESC
        LIMIT $2
      `;
      params = [since, limit];
    } else {
      query = `
        SELECT 
          id, actor_id, actor_email, action, target_type, target_id, payload, created_at
        FROM audit_logs
        ORDER BY created_at DESC
        LIMIT $1
      `;
      params = [limit];
    }

    const result = await pool.query(query, params);

    return res.json({ 
      items: result.rows,
      count: result.rows.length 
    });
  } catch (error) {
    console.error('[AUDIT] Error fetching audit log:', error);
    return res.status(500).json({ 
      error: { 
        code: 'INTERNAL_ERROR', 
        message: 'Failed to fetch audit log' 
      } 
    });
  }
});

module.exports = router;
