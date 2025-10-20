// routes/attachments.js
const express = require('express');
const router = express.Router();
const { pool } = require('../services/database');
const { authenticate, deriveStableUUID } = require('../middleware/auth');
const storage = require('../services/storage');

// POST /api/tasks/:id/attachments/init - Initialize attachment upload
router.post('/tasks/:id/attachments/init', authenticate, async (req, res) => {
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
    
    res.json(result);
  } catch (error) {
    console.error('Attachment init error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tasks/:id/attachments/complete - Complete attachment upload
router.post('/tasks/:id/attachments/complete', authenticate, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { storage_key, filename, mime, size_bytes } = req.body;
    
    if (!storage_key || !filename) {
      return res.status(400).json({ error: 'storage_key and filename are required' });
    }
    
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
    
    // Log activity
    try {
      await pool.query(
        `INSERT INTO public.activity_log (actor_id, entity_type, entity_id, action, meta, ip)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          'attachment',
          attachment.id,
          'attachment.add',
          JSON.stringify({ filename, storage_key, task_id: taskId }),
          req.ip || null
        ]
      );
    } catch (logError) {
      console.error('Failed to log attachment activity:', logError);
    }
    
    res.json(attachment);
  } catch (error) {
    console.error('Attachment complete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tasks/:id/attachments - List attachments for a task
router.get('/tasks/:id/attachments', authenticate, async (req, res) => {
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
router.delete('/attachments/:attachmentId', authenticate, async (req, res) => {
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
    
    // Check permissions: Manager/Admin or uploader can delete
    const canDelete = req.user?.role === 'Manager' || 
                     req.user?.role === 'Admin' ||
                     (userId && attachment.uploaded_by === userId);
    
    if (!canDelete) {
      return res.status(403).json({ error: 'Insufficient permissions to delete this attachment' });
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
    
    // Log activity
    try {
      await pool.query(
        `INSERT INTO public.activity_log (actor_id, entity_type, entity_id, action, meta, ip)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          'attachment',
          attachmentId,
          'attachment.delete',
          JSON.stringify({ 
            filename: attachment.filename, 
            storage_key: attachment.storage_key,
            task_id: attachment.task_id
          }),
          req.ip || null
        ]
      );
    } catch (logError) {
      console.error('Failed to log attachment deletion:', logError);
    }
    
    res.json({ deleted: true, id: attachmentId });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;