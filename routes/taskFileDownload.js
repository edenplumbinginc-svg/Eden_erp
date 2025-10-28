// routes/taskFileDownload.js
// Secure file download with RBAC and audit trail
// RBAC: tasks.files.read

const express = require('express');
const fs = require('fs');
const path = require('path');
const { pool } = require('../services/database');
const { authenticate } = require('../middleware/auth');
const { requirePerm } = require('../middleware/permissions');

const router = express.Router();

// Storage directory (outside web root)
const UPLOAD_ROOT = process.env.TASK_UPLOAD_ROOT || path.join(__dirname, '../uploads/tasks');

/**
 * GET /:fileId/download
 * Secure file download with RBAC enforcement and audit trail
 * - Verifies user has tasks.files.read permission
 * - Prevents path traversal by looking up file by ID only
 * - Logs download to audit table
 * - Streams file with proper Content-Disposition header
 */
router.get('/:fileId/download', authenticate, requirePerm('tasks.files', 'read'), async (req, res) => {
  try {
    const { fileId } = req.params;

    // Look up file by ID (prevents path traversal)
    const result = await pool.query(
      `SELECT tf.id, tf.task_id, tf.url, tf.filename, tf.mime
       FROM task_files tf
       WHERE tf.id = $1`,
      [fileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'file not found' });
    }

    const file = result.rows[0];

    // Map stored url → disk path
    // URL format: /secure/tasks/<taskId>/<filename>
    // Disk path: <UPLOAD_ROOT>/<taskId>/<filename>
    const pathFromUrl = file.url.replace(/^\/secure\/tasks\//, UPLOAD_ROOT + '/');
    
    // Verify file exists on disk
    if (!fs.existsSync(pathFromUrl)) {
      return res.status(404).json({ error: 'file not found on disk' });
    }

    // Audit: Log download (best-effort, don't block on failure)
    try {
      await pool.query(
        `INSERT INTO file_downloads (file_id, user_id, ip, user_agent)
         VALUES ($1, $2, $3, $4)`,
        [file.id, req.user.id, req.ip, req.get('user-agent') || null]
      );
    } catch (auditErr) {
      // Log but don't fail the download
      console.error('Audit logging failed:', auditErr);
    }

    // Stream file with proper headers
    res.setHeader('Content-Type', file.mime);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.filename)}"`);
    
    const stream = fs.createReadStream(pathFromUrl);
    stream.on('error', (err) => {
      console.error('Stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'download failed' });
      }
    });
    stream.pipe(res);

  } catch (error) {
    console.error('Download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'download failed' });
    }
  }
});

module.exports = router;
