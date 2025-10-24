// routes/performance.js - Performance metrics API endpoints (read-only)
const express = require('express');
const router = express.Router();
const { pool } = require('../services/database');

// GET /api/perf/fastest-week - Top 20 performers this week
router.get('/perf/fastest-week', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM v_perf_fastest_week LIMIT 20');
    return res.json({ 
      ok: true,
      items: result.rows 
    });
  } catch (error) {
    console.error('[PERF] Error fetching fastest-week:', error);
    return res.status(500).json({ 
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch weekly leaderboard' } 
    });
  }
});

// GET /api/perf/dept-month - Department rankings last 30 days
router.get('/perf/dept-month', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM v_perf_dept_month');
    return res.json({ 
      ok: true,
      items: result.rows 
    });
  } catch (error) {
    console.error('[PERF] Error fetching dept-month:', error);
    return res.status(500).json({ 
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch department rankings' } 
    });
  }
});

// GET /api/perf/me/recent - Current user's 30 most recent completions
router.get('/perf/me/recent', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        ok: false,
        error: { code: 'UNAUTHENTICATED', message: 'User not authenticated' } 
      });
    }
    
    const result = await pool.query(
      `SELECT
        created_at,
        duration_ms,
        department,
        action,
        task_id,
        checklist_item_id
       FROM performance_events
       WHERE actor_id = $1 AND action = 'checklist.done'
       ORDER BY created_at DESC
       LIMIT 30`,
      [userId]
    );
    
    return res.json({ 
      ok: true,
      items: result.rows 
    });
  } catch (error) {
    console.error('[PERF] Error fetching me/recent:', error);
    return res.status(500).json({ 
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch personal stats' } 
    });
  }
});

module.exports = router;
