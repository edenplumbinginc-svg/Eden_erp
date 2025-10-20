// routes/notifications.js
const express = require('express');
const router = express.Router();
const { pool } = require('../services/database');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * GET /api/notifications/recent
 * Query params:
 *   limit?: number (default 50, max 200)
 *   projectId?: uuid
 *   type?: 'task_created' | 'status_changed' | 'comment_added'
 *   since?: ISO timestamp (filters created_at >= since)
 */
router.get('/api/notifications/recent', async (req, res, next) => {
  try {
    const { projectId, type, since } = req.query;
    let { limit } = req.query;

    // Constrain limit
    limit = Math.min(Math.max(parseInt(limit || '50', 10), 1), 200);

    const clauses = [];
    const params = [];
    let idx = 1;

    if (projectId) {
      clauses.push(`project_id = $${idx++}::uuid`);
      params.push(projectId);
    }
    if (type) {
      clauses.push(`type = $${idx++}`);
      params.push(type);
    }
    if (since) {
      clauses.push(`created_at >= $${idx++}::timestamptz`);
      params.push(since);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const sql = `
      SELECT id, type, project_id, task_id, actor_email, payload,
             created_at
      FROM notifications
      ${where}
      ORDER BY id DESC
      LIMIT ${limit}
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Run notification queue (stub - just console.log)
router.post('/run', authenticate, authorize(['Admin', 'System']), async (req, res) => {
  try {
    const limit = req.query.limit || 50;
    
    // Fetch queued notifications
    const notifications = await pool.query(
      `SELECT n.*, 
              u.email as user_email, u.name as user_name,
              t.title as task_title,
              COALESCE(n.scheduled_at, n.schedule_at) as effective_scheduled_at
       FROM public.notifications n
       LEFT JOIN public.users u ON u.id = n.user_id
       LEFT JOIN public.tasks t ON t.id = n.task_id
       WHERE n.status = 'queued' 
       AND COALESCE(n.scheduled_at, n.schedule_at) <= now()
       ORDER BY COALESCE(n.scheduled_at, n.schedule_at)
       LIMIT $1`,
      [limit]
    );
    
    console.log(`Processing ${notifications.rowCount} notifications...`);
    
    // Process each notification (stub)
    for (const notif of notifications.rows) {
      console.log(`[NOTIFICATION] Type: ${notif.type}, To: ${notif.user_email || notif.user_id}, Task: ${notif.task_title}, Payload:`, notif.payload);
      
      // Mark as sent
      await pool.query(
        `UPDATE public.notifications 
         SET status = 'sent', sent_at = now() 
         WHERE id = $1`,
        [notif.id]
      );
    }
    
    res.json({
      processed: notifications.rowCount,
      notifications: notifications.rows.map(n => ({
        id: n.id,
        type: n.type,
        user: n.user_email || n.user_id,
        task: n.task_title,
        scheduled_at: n.effective_scheduled_at || n.scheduled_at || n.schedule_at
      }))
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Daily summary (stub)
router.post('/daily-summary', authenticate, authorize(['Admin', 'System']), async (req, res) => {
  try {
    // Get summary data for all users with tasks
    const summary = await pool.query(`
      SELECT u.id, u.email, u.name,
             COUNT(DISTINCT t.id) FILTER (WHERE t.ball_in_court = u.id) as tasks_in_court,
             COUNT(DISTINCT t.id) FILTER (WHERE t.ball_in_court = u.id AND t.due_at < now() + INTERVAL '1 day') as due_soon,
             COUNT(DISTINCT t.id) FILTER (WHERE t.ball_in_court = u.id AND t.due_at < now()) as overdue
      FROM public.users u
      LEFT JOIN public.tasks t ON t.ball_in_court = u.id AND t.deleted_at IS NULL
      GROUP BY u.id, u.email, u.name
      HAVING COUNT(DISTINCT t.id) FILTER (WHERE t.ball_in_court = u.id) > 0
    `);
    
    console.log(`Sending daily summary to ${summary.rowCount} users...`);
    
    for (const user of summary.rows) {
      console.log(`[DAILY SUMMARY] To: ${user.email}`);
      console.log(`  - Tasks in court: ${user.tasks_in_court}`);
      console.log(`  - Due soon: ${user.due_soon}`);
      console.log(`  - Overdue: ${user.overdue}`);
      
      // Enqueue summary notification
      await pool.query(
        `INSERT INTO public.notifications (user_id, type, payload, status, scheduled_at)
         VALUES ($1, 'daily_summary', $2, 'queued', now())`,
        [user.id, JSON.stringify({
          tasks_in_court: user.tasks_in_court,
          due_soon: user.due_soon,
          overdue: user.overdue
        })]
      );
    }
    
    res.json({
      users_notified: summary.rowCount,
      summaries: summary.rows
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Weekly digest (stub)
router.post('/weekly-digest', authenticate, authorize(['Admin', 'System']), async (req, res) => {
  try {
    // Get weekly stats
    const stats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '7 days') as tasks_created,
        COUNT(*) FILTER (WHERE status = 'done' AND updated_at >= now() - INTERVAL '7 days') as tasks_completed,
        COUNT(*) FILTER (WHERE status != 'done') as tasks_pending,
        COUNT(*) FILTER (WHERE due_at < now() AND status != 'done') as tasks_overdue
      FROM public.tasks
      WHERE deleted_at IS NULL
    `);
    
    const userStats = await pool.query(`
      SELECT u.id, u.email, u.name,
             COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'done' AND t.updated_at >= now() - INTERVAL '7 days') as completed_this_week
      FROM public.users u
      LEFT JOIN public.tasks t ON t.ball_in_court = u.id
      GROUP BY u.id, u.email, u.name
      HAVING COUNT(DISTINCT t.id) > 0
    `);
    
    console.log('[WEEKLY DIGEST] Overall stats:', stats.rows[0]);
    console.log(`Sending weekly digest to ${userStats.rowCount} users...`);
    
    for (const user of userStats.rows) {
      console.log(`[WEEKLY DIGEST] To: ${user.email}, Completed this week: ${user.completed_this_week}`);
      
      // Enqueue digest notification
      await pool.query(
        `INSERT INTO public.notifications (user_id, type, payload, status, scheduled_at)
         VALUES ($1, 'weekly_digest', $2, 'queued', now())`,
        [user.id, JSON.stringify({
          ...stats.rows[0],
          personal_completed: user.completed_this_week
        })]
      );
    }
    
    res.json({
      overall_stats: stats.rows[0],
      users_notified: userStats.rowCount
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;