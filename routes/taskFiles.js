// routes/taskFiles.js
// File attachments for tasks using local disk storage with multer
// RBAC: tasks.files.create, tasks.files.read

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../services/database');
const { authenticate } = require('../middleware/auth');
const { requirePerm } = require('../middleware/permissions');
const { audit } = require('../utils/audit');

const router = express.Router({ mergeParams: true });

// Storage directory (outside web root)
const UPLOAD_ROOT = process.env.TASK_UPLOAD_ROOT || path.join(__dirname, '../uploads/tasks');

// Multer disk storage configuration
const diskStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const taskId = req.params.id;
    const dir = path.join(UPLOAD_ROOT, taskId);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (err) {
      // Directory may already exist, ignore error
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: uuid + original extension (lowercase)
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

// Multer configuration with 10MB limit
const upload = multer({
  storage: diskStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Allowed MIME types (server allowlist)
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'text/csv',
  'application/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // .xlsx
]);

/**
 * Multer error handler middleware
 * Catches multer-specific errors (e.g., LIMIT_FILE_SIZE) and returns appropriate status codes
 */
function handleMulterError(err, req, res, next) {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'file too large', maxSize: '10MB' });
    }
    // Other multer errors
    return res.status(400).json({ error: err.message || 'upload failed' });
  }
  next();
}

/**
 * POST /api/tasks/:id/files
 * Upload a file attachment to a task
 * 
 * RBAC: tasks.files.create
 * Validation:
 * - 10MB max (multer + DB CHECK)
 * - MIME type allowlist
 * - Task existence
 * 
 * Returns:
 * - 201 { item: {...} } on success
 * - 400 if no file or disallowed type
 * - 403 if missing permission
 * - 404 if task not found
 * - 413 if file too large (multer limit or DB CHECK violation)
 */
router.post(
  '/',
  authenticate,
  requirePerm('tasks.files.create'),
  upload.single('file'),
  handleMulterError,
  async (req, res) => {
    try {
      const taskId = req.params.id;
      const uploadedFile = req.file;

      // Validate file was uploaded
      if (!uploadedFile) {
        return res.status(400).json({ error: 'file required' });
      }

      // Verify task exists
      const taskResult = await pool.query(
        'SELECT id FROM tasks WHERE id = $1',
        [taskId]
      );

      if (taskResult.rowCount === 0) {
        // Clean up uploaded file
        try {
          await fs.unlink(uploadedFile.path);
        } catch (unlinkErr) {
          console.error('Failed to clean up file after task not found:', unlinkErr);
        }
        return res.status(404).json({ error: 'Task not found' });
      }

      // Validate MIME type against allowlist
      if (!ALLOWED_MIME_TYPES.has(uploadedFile.mimetype)) {
        // Remove stored file if type rejected
        try {
          await fs.unlink(uploadedFile.path);
        } catch (unlinkErr) {
          console.error('Failed to clean up disallowed file:', unlinkErr);
        }
        return res.status(400).json({
          error: 'disallowed type',
          allowed: Array.from(ALLOWED_MIME_TYPES)
        });
      }

      // Build secure file URL (for future download endpoint)
      // Format: /api/files/:fileId/download
      // This prevents direct filesystem access and allows RBAC enforcement
      const secureUrl = `/api/files/${taskId}/${uploadedFile.filename}`;

      // Insert into task_files table
      const insertResult = await pool.query(
        `INSERT INTO task_files (task_id, url, filename, mime, size, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, task_id, url, filename, mime, size, created_at, created_by`,
        [
          taskId,
          secureUrl,
          uploadedFile.originalname,
          uploadedFile.mimetype,
          uploadedFile.size,
          req.user.id
        ]
      );

      const fileRecord = insertResult.rows[0];

      // Audit log
      await audit(
        req.user.id,
        'file.upload',
        `task:${taskId}`,
        {
          fileId: fileRecord.id,
          filename: uploadedFile.originalname,
          mime: uploadedFile.mimetype,
          size: uploadedFile.size
        }
      );

      return res.status(201).json({
        item: {
          id: fileRecord.id,
          taskId: fileRecord.task_id,
          url: fileRecord.url,
          filename: fileRecord.filename,
          mime: fileRecord.mime,
          size: fileRecord.size,
          createdAt: fileRecord.created_at,
          createdBy: fileRecord.created_by
        }
      });

    } catch (error) {
      console.error('File upload error:', error);

      // DB CHECK constraint violation (size > 10MB)
      if (error.code === '23514') {
        return res.status(413).json({ error: 'file too large' });
      }

      return res.status(500).json({ error: 'upload failed' });
    }
  }
);

/**
 * GET /api/tasks/:id/files?include=archived
 * List all file attachments for a task
 * 
 * RBAC: tasks.files.read
 * 
 * Query params:
 * - include=archived: Include soft-deleted files (shows deletedAt timestamp)
 * 
 * Returns:
 * - 200 { items: [...] }
 * - 403 if missing permission
 * - 404 if task not found
 */
router.get(
  '/',
  authenticate,
  requirePerm('tasks.files.read'),
  async (req, res) => {
    try {
      const taskId = req.params.id;
      const includeArchived = req.query.include === 'archived';

      // Verify task exists (optional, maintains parity with POST)
      const taskResult = await pool.query(
        'SELECT id FROM tasks WHERE id = $1',
        [taskId]
      );

      if (taskResult.rowCount === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Fetch files for this task (with optional archived)
      const baseQuery = `
        SELECT id, task_id, url, filename, mime, size, created_at, created_by, deleted_at
        FROM task_files
        WHERE task_id = $1
      `;

      const sql = includeArchived
        ? `${baseQuery} ORDER BY (deleted_at IS NULL) DESC, created_at DESC`
        : `${baseQuery} AND deleted_at IS NULL ORDER BY created_at DESC`;

      const filesResult = await pool.query(sql, [taskId]
      );

      return res.json({
        items: filesResult.rows.map(row => ({
          id: row.id,
          taskId: row.task_id,
          url: row.url,
          filename: row.filename,
          mime: row.mime,
          size: row.size,
          createdAt: row.created_at,
          createdBy: row.created_by,
          deletedAt: row.deleted_at
        }))
      });

    } catch (error) {
      console.error('List files error:', error);
      return res.status(500).json({ error: 'failed to list files' });
    }
  }
);

module.exports = router;
