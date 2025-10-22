// routes/reports.js
const express = require('express');
const router = express.Router();
const { pool } = require('../services/database');
const { authenticate } = require('../middleware/auth');
const { performanceSummary } = require('../services/performanceReport');

// Tasks by status
router.get('/tasks/status', authenticate, async (_, res) => {
  try {
    const r = await pool.query(`
      SELECT status, count(*)::int as count
      FROM public.tasks
      WHERE deleted_at IS NULL
      GROUP BY status
      ORDER BY status
    `);
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Tasks by ball_in_court
router.get('/tasks/ball', authenticate, async (_, res) => {
  try {
    const r = await pool.query(`
      SELECT coalesce(u.email, 'unassigned') as owner, count(*)::int as count
      FROM public.tasks t
      LEFT JOIN public.users u ON u.id = t.ball_in_court
      WHERE t.deleted_at IS NULL
      GROUP BY owner
      ORDER BY owner
    `);
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Tasks by priority
router.get('/tasks/priority', authenticate, async (_, res) => {
  try {
    const r = await pool.query(`
      SELECT priority, count(*)::int as count
      FROM public.tasks
      WHERE deleted_at IS NULL
      GROUP BY priority
      ORDER BY 
        CASE priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'normal' THEN 3
          WHEN 'low' THEN 4
        END
    `);
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Overdue tasks
router.get('/tasks/overdue', authenticate, async (_, res) => {
  try {
    const r = await pool.query(`
      SELECT t.id, t.title, t.priority, t.due_at, 
             p.name as project_name,
             coalesce(u.email, 'unassigned') as owner
      FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      LEFT JOIN public.users u ON u.id = t.ball_in_court
      WHERE t.due_at < now() AND t.status != 'closed' AND t.status != 'done' AND t.deleted_at IS NULL
      ORDER BY t.due_at ASC
    `);
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Activity summary (tasks created/updated in last 7 days)
router.get('/activity/recent', authenticate, async (_, res) => {
  try {
    const r = await pool.query(`
      SELECT 
        date_trunc('day', created_at) as day,
        count(*)::int as tasks_created
      FROM public.tasks
      WHERE created_at >= now() - INTERVAL '7 days' AND deleted_at IS NULL
      GROUP BY day
      ORDER BY day DESC
    `);
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Performance leaderboard (JSON)
router.get('/performance', authenticate, async (req, res) => {
  try {
    const days = Number(req.query.days) || 7;
    const rows = await performanceSummary({ days });
    res.json({ ok: true, days, data: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Performance leaderboard (CSV download)
router.get('/performance.csv', authenticate, async (req, res) => {
  try {
    const days = Number(req.query.days) || 7;
    const rows = await performanceSummary({ days });
    
    const header = 'assignee_id,done_count';
    const body = rows.map(r => `${r.assignee_id || ''},${r.done_count}`).join('\n');
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="performance_${days}d.csv"`);
    res.send([header, body].join('\n'));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;