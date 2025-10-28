// routes/taskFilesAdmin.js
// Soft delete and restore for task files
// RBAC: tasks.files.delete

const express = require('express');
const { pool } = require('../services/database');
const { authenticate } = require('../middleware/auth');
const { requirePerm } = require('../middleware/permissions');

const router = express.Router();

/**
 * DELETE /:id
 * Soft delete a file attachment (sets deleted_at = now())
 * - Requires tasks.files.delete permission
 * - Returns 404 if file not found or already deleted
 * - Returns 200 { ok: true } on success
 */
router.delete('/:id', authenticate, requirePerm('tasks.files', 'delete'), async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE task_files
       SET deleted_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, task_id AS "taskId"`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'file not found or already deleted' });
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('Delete error:', error);
    return res.status(500).json({ error: 'delete failed' });
  }
});

/**
 * POST /:id/restore
 * Restore a soft-deleted file attachment (sets deleted_at = NULL)
 * - Requires tasks.files.delete permission
 * - Returns 404 if file not found or not deleted
 * - Returns 200 { ok: true } on success
 */
router.post('/:id/restore', authenticate, requirePerm('tasks.files', 'delete'), async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE task_files
       SET deleted_at = NULL
       WHERE id = $1 AND deleted_at IS NOT NULL
       RETURNING id, task_id AS "taskId"`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'file not found or not deleted' });
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('Restore error:', error);
    return res.status(500).json({ error: 'restore failed' });
  }
});

module.exports = router;
