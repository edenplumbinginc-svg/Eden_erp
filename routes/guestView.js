const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { pool } = require('../services/database');
const { audit } = require('../utils/audit');

const limiter = rateLimit({ 
  windowMs: 60_000, 
  max: 60,
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } }
});

router.use(limiter);

// GET /api/guest/resolve?token=UUID
router.get('/resolve', async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ 
        error: { code: 'BAD_REQUEST', message: 'token required' } 
      });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      return res.status(404).json({ 
        error: { code: 'NOT_FOUND', message: 'invalid or expired link' } 
      });
    }

    const { rows } = await pool.query(
      `SELECT scope, scope_id, expires_at FROM guest_links WHERE token=$1 LIMIT 1`,
      [token]
    );

    if (!rows.length) {
      return res.status(404).json({ 
        error: { code: 'NOT_FOUND', message: 'invalid or expired link' } 
      });
    }

    const link = rows[0];
    if (new Date(link.expires_at) < new Date()) {
      return res.status(410).json({ 
        error: { code: 'EXPIRED', message: 'link expired' } 
      });
    }

    if (link.scope === 'task') {
      const t = await pool.query(`
        SELECT id, project_id, title, description, status, priority, due_at,
               ball_owner_type, ball_owner_id, ball_since
        FROM tasks WHERE id=$1
      `, [link.scope_id]);

      const comments = await pool.query(`
        SELECT id, author_id, body, created_at 
        FROM task_comments 
        WHERE task_id=$1 
        ORDER BY created_at DESC 
        LIMIT 100
      `, [link.scope_id]);

      const files = await pool.query(`
        SELECT id, file_name, mime_type, size_bytes, created_at
        FROM task_attachments 
        WHERE task_id=$1 
        ORDER BY created_at DESC
      `, [link.scope_id]);

      await audit(null, 'guest.view', `task:${link.scope_id}`, { 
        tokenPreview: String(token).slice(0, 8) 
      });

      return res.json({
        scope: 'task',
        task: t.rows[0] || null,
        comments: comments.rows,
        attachments: files.rows,
        expiresAt: link.expires_at
      });
    }

    if (link.scope === 'project') {
      const p = await pool.query(
        `SELECT id, name, code, status FROM projects WHERE id=$1`,
        [link.scope_id]
      );

      const tasks = await pool.query(`
        SELECT id, title, status, priority, due_at
        FROM tasks 
        WHERE project_id=$1 
        ORDER BY created_at DESC 
        LIMIT 200
      `, [link.scope_id]);

      await audit(null, 'guest.view', `project:${link.scope_id}`, { 
        tokenPreview: String(token).slice(0, 8) 
      });

      return res.json({
        scope: 'project',
        project: p.rows[0] || null,
        tasks: tasks.rows,
        expiresAt: link.expires_at
      });
    }

    return res.status(400).json({ 
      error: { code: 'BAD_SCOPE', message: 'unsupported link scope' } 
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
