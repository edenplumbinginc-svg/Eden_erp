// routes/attachments.js
const express = require('express');
const { z } = require('zod');
const router = express.Router();
const { pool } = require('../services/database');
const { authenticate, deriveStableUUID } = require('../middleware/auth');
const { requirePerm } = require('../middleware/permissions');
const { validate } = require('../middleware/validate');
const { audit } = require('../utils/audit');
const storage = require('../services/storage');

// Zod validation schemas
const CompleteUploadSchema = z.object({
  storage_key: z.string().min(1).max(2048),
  filename: z.string().min(1).max(255),
  mime: z.string().min(3).max(255).optional(),
  size_bytes: z.number().int().nonnegative().max(1024 * 1024 * 200).optional() // <= 200 MB
});

// POST /api/tasks/:id/attachments/init - Initialize attachment upload
router.post('/tasks/:id/attachments/init', authenticate, requirePerm('tasks:write'), async (req, res) => {
  try {
    const taskId = req.params.id;
    
    // Verify task exists
    const taskResult = await pool.query(
      'SELECT id FROM public.tasks WHERE id = $1',
      [taskId]
    );
    
    if (taskResult.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Initialize upload
    const result = await storage.initUpload(taskId);
    
    await audit(req.user?.id, 'file.init', `task:${taskId}`, { 
      uploadId: result?.uploadId,
      bucket: result?.bucket 
    });
    
    res.json(result);
  } catch (error) {
    console.error('Attachment init error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tasks/:id/attachments/complete - Complete attachment upload
router.post('/tasks/:id/attachments/complete', authenticate, requirePerm('tasks:write'), validate(CompleteUploadSchema), async (req, res) => {
  try {
    const taskId = req.params.id;
    const { storage_key, filename, mime, size_bytes } = req.data;
    
    // Verify task exists
    const taskResult = await pool.query(
      'SELECT id FROM public.tasks WHERE id = $1',
      [taskId]
    );
    
    if (taskResult.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Complete the upload in storage
    await storage.completeUpload({
      storage_key,
      filename,
      mime: mime || 'application/octet-stream',
      size_bytes: size_bytes || 0
    });
    
    // Get user ID (derive stable UUID if needed)
    const userId = req.user?.id ? deriveStableUUID(req.user.id) : null;
    
    // Save attachment record to database
    const attachmentResult = await pool.query(
      `INSERT INTO public.attachments (task_id, filename, mime, size_bytes, storage_key, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, task_id, filename, mime, size_bytes, storage_key, uploaded_by, created_at`,
      [taskId, filename, mime, size_bytes, storage_key, userId]
    );
    
    const attachment = attachmentResult.rows[0];
    
    // Audit log (replaces activity_log)
    await audit(userId, 'file.upload', `task:${taskId}`, { 
      attachmentId: attachment.id,
      filename,
      storage_key,
      mime,
      size_bytes
    });
    
    res.json(attachment);
  } catch (error) {
    console.error('Attachment complete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tasks/:id/attachments - List attachments for a task
router.get('/tasks/:id/attachments', authenticate, requirePerm('tasks:read'), async (req, res) => {
  try {
    const taskId = req.params.id;
    
    // Verify task exists
    const taskResult = await pool.query(
      'SELECT id FROM public.tasks WHERE id = $1',
      [taskId]
    );
    
    if (taskResult.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Get attachments
    const attachmentsResult = await pool.query(
      `SELECT id, task_id, filename, mime, size_bytes, storage_key, uploaded_by, created_at
       FROM public.attachments
       WHERE task_id = $1
       ORDER BY created_at DESC`,
      [taskId]
    );
    
    res.json(attachmentsResult.rows);
  } catch (error) {
    console.error('List attachments error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/attachments/:attachmentId - Delete an attachment
router.delete('/attachments/:attachmentId', authenticate, requirePerm('tasks:write'), async (req, res) => {
  try {
    const attachmentId = req.params.attachmentId;
    const userId = req.user?.id ? deriveStableUUID(req.user.id) : null;
    
    // Get attachment details
    const attachmentResult = await pool.query(
      'SELECT id, task_id, filename, storage_key, uploaded_by FROM public.attachments WHERE id = $1',
      [attachmentId]
    );
    
    if (attachmentResult.rowCount === 0) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    
    const attachment = attachmentResult.rows[0];
    
    // Additional permission check: Admin or uploader can delete (tasks:write already checked)
    // This adds an extra layer beyond RBAC for ownership validation
    const hasAdminPerm = req.user?.permissions?.includes('admin:manage');
    const isOwner = userId && attachment.uploaded_by === userId;
    
    if (!hasAdminPerm && !isOwner) {
      return res.status(403).json({ error: 'You can only delete your own attachments unless you have admin:manage permission' });
    }
    
    // Remove from storage
    try {
      await storage.removeObject(attachment.storage_key);
    } catch (storageError) {
      console.error('Failed to remove from storage:', storageError);
      // Continue with database deletion even if storage removal fails
    }
    
    // Delete from database
    await pool.query(
      'DELETE FROM public.attachments WHERE id = $1',
      [attachmentId]
    );
    
    // Audit log (replaces activity_log)
    await audit(userId, 'file.delete', `attachment:${attachmentId}`, { 
      filename: attachment.filename, 
      storage_key: attachment.storage_key,
      task_id: attachment.task_id
    });
    
    res.json({ deleted: true, id: attachmentId });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;