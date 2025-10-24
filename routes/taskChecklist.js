// routes/taskChecklist.js - Task checklist RBAC endpoints
const express = require('express');
const { z } = require('zod');
const router = express.Router();
const { pool } = require('../services/database');
const { authenticate } = require('../middleware/auth');
const { requirePerm } = require('../middleware/permissions');
const { validate } = require('../middleware/validate');
const { getActor } = require('../lib/actor');
const { writeAudit } = require('../lib/audit');
const { withTx } = require('../lib/tx');

// Zod validation schemas
const CreateChecklistItemSchema = z.object({
  label: z.string().min(1).max(500),
  position: z.number().int().min(0).optional()
});

const ReorderChecklistSchema = z.object({
  order: z.array(z.string().uuid()).min(1)
});

// GET /api/tasks/:taskId/checklist - List all checklist items for a task
router.get('/tasks/:taskId/checklist', authenticate, requirePerm('tasks:checklist:read'), async (req, res) => {
  try {
    const { taskId } = req.params;
    
    // Verify task exists
    const taskCheck = await pool.query('SELECT id FROM tasks WHERE id = $1', [taskId]);
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ 
        ok: false, 
        error: { code: 'TASK_NOT_FOUND', message: 'Task not found' } 
      });
    }
    
    // Fetch checklist items ordered by position
    const result = await pool.query(
      `SELECT id, task_id, label, is_done, position, created_by, updated_by, created_at, updated_at, done_at
       FROM task_checklist_items
       WHERE task_id = $1
       ORDER BY position ASC, created_at ASC`,
      [taskId]
    );
    
    return res.json({ 
      ok: true, 
      items: result.rows 
    });
  } catch (error) {
    console.error('[CHECKLIST] Error fetching checklist:', error);
    return res.status(500).json({ 
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch checklist' } 
    });
  }
});

// POST /api/tasks/:taskId/checklist - Create new checklist item
router.post('/tasks/:taskId/checklist', authenticate, requirePerm('tasks:checklist:write'), validate(CreateChecklistItemSchema), async (req, res) => {
  try {
    const { taskId } = req.params;
    const { label, position } = req.data;
    const { actorId, actorEmail } = getActor(req);
    
    // Verify task exists
    const taskCheck = await pool.query('SELECT id FROM tasks WHERE id = $1', [taskId]);
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ 
        ok: false, 
        error: { code: 'TASK_NOT_FOUND', message: 'Task not found' } 
      });
    }
    
    // Determine position if not provided
    let finalPosition = position;
    if (finalPosition === undefined || finalPosition === null) {
      const maxPosResult = await pool.query(
        'SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM task_checklist_items WHERE task_id = $1',
        [taskId]
      );
      finalPosition = maxPosResult.rows[0].next_pos;
    }
    
    // Insert checklist item
    const result = await pool.query(
      `INSERT INTO task_checklist_items (task_id, label, position, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, task_id, label, is_done, position, created_by, updated_by, created_at, updated_at, done_at`,
      [taskId, label, finalPosition, actorId, actorId]
    );
    
    const item = result.rows[0];
    
    // Write audit log
    await writeAudit({
      actorId,
      actorEmail,
      action: 'task.checklist.create',
      targetType: 'checklist_item',
      targetId: item.id,
      payload: { task_id: taskId, label, position: finalPosition }
    });
    
    console.log(`[CHECKLIST] Item created: task=${taskId} item=${item.id} by=${actorEmail || actorId}`);
    
    return res.status(201).json({ 
      ok: true, 
      item 
    });
  } catch (error) {
    console.error('[CHECKLIST] Error creating item:', error);
    return res.status(500).json({ 
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create checklist item' } 
    });
  }
});

// POST /api/tasks/:taskId/checklist/:itemId/toggle - Toggle item done/undone
router.post('/tasks/:taskId/checklist/:itemId/toggle', authenticate, requirePerm('tasks:checklist:write'), async (req, res) => {
  try {
    const { taskId, itemId } = req.params;
    const { actorId, actorEmail } = getActor(req);
    
    // Fetch current item state
    const itemResult = await pool.query(
      'SELECT id, task_id, is_done FROM task_checklist_items WHERE id = $1 AND task_id = $2',
      [itemId, taskId]
    );
    
    if (itemResult.rows.length === 0) {
      return res.status(404).json({ 
        ok: false, 
        error: { code: 'ITEM_NOT_FOUND', message: 'Checklist item not found' } 
      });
    }
    
    const currentItem = itemResult.rows[0];
    const newIsDone = !currentItem.is_done;
    const doneAt = newIsDone ? new Date().toISOString() : null;
    
    // Update item
    const updateResult = await pool.query(
      `UPDATE task_checklist_items 
       SET is_done = $1, done_at = $2, updated_by = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING id, task_id, label, is_done, position, created_by, updated_by, created_at, updated_at, done_at`,
      [newIsDone, doneAt, actorId, itemId]
    );
    
    const item = updateResult.rows[0];
    
    // Write audit log
    const action = newIsDone ? 'task.checklist.done' : 'task.checklist.undone';
    await writeAudit({
      actorId,
      actorEmail,
      action,
      targetType: 'checklist_item',
      targetId: itemId,
      payload: { task_id: taskId, is_done: newIsDone }
    });
    
    console.log(`[CHECKLIST] Item toggled: task=${taskId} item=${itemId} is_done=${newIsDone} by=${actorEmail || actorId}`);
    
    return res.json({ 
      ok: true, 
      item 
    });
  } catch (error) {
    console.error('[CHECKLIST] Error toggling item:', error);
    return res.status(500).json({ 
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to toggle checklist item' } 
    });
  }
});

// POST /api/tasks/:taskId/checklist/reorder - Reorder checklist items
router.post('/tasks/:taskId/checklist/reorder', authenticate, requirePerm('tasks:checklist:write'), validate(ReorderChecklistSchema), async (req, res) => {
  try {
    const { taskId } = req.params;
    const { order } = req.data;
    const { actorId, actorEmail } = getActor(req);
    
    // Verify task exists
    const taskCheck = await pool.query('SELECT id FROM tasks WHERE id = $1', [taskId]);
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ 
        ok: false, 
        error: { code: 'TASK_NOT_FOUND', message: 'Task not found' } 
      });
    }
    
    // Fetch all current checklist item IDs for this task
    const currentItemsResult = await pool.query(
      'SELECT id FROM task_checklist_items WHERE task_id = $1',
      [taskId]
    );
    const currentItemIds = currentItemsResult.rows.map(row => row.id);
    
    // Validate that order array has the same length as current items
    if (order.length !== currentItemIds.length) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INCOMPLETE_ORDER',
          message: `Order must include all checklist items. Expected ${currentItemIds.length} items, got ${order.length}`
        }
      });
    }
    
    // Check for duplicates in the order array
    const uniqueOrderIds = new Set(order);
    if (uniqueOrderIds.size !== order.length) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'DUPLICATE_IDS',
          message: 'Order array contains duplicate IDs'
        }
      });
    }
    
    // Validate that all provided IDs exist in current items
    const currentItemIdSet = new Set(currentItemIds);
    for (const itemId of order) {
      if (!currentItemIdSet.has(itemId)) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'INVALID_ITEM_ID',
            message: `Item ID ${itemId} does not exist in this task's checklist`
          }
        });
      }
    }
    
    // Update positions in transaction
    await withTx(pool, async (tx) => {
      for (let i = 0; i < order.length; i++) {
        const itemId = order[i];
        await tx.query(
          `UPDATE task_checklist_items 
           SET position = $1, updated_by = $2, updated_at = NOW()
           WHERE id = $3 AND task_id = $4`,
          [i, actorId, itemId, taskId]
        );
      }
    });
    
    // Write audit log
    await writeAudit({
      actorId,
      actorEmail,
      action: 'task.checklist.reorder',
      targetType: 'task',
      targetId: taskId,
      payload: { order, count: order.length }
    });
    
    console.log(`[CHECKLIST] Items reordered: task=${taskId} count=${order.length} by=${actorEmail || actorId}`);
    
    // Fetch updated items
    const result = await pool.query(
      `SELECT id, task_id, label, is_done, position, created_by, updated_by, created_at, updated_at, done_at
       FROM task_checklist_items
       WHERE task_id = $1
       ORDER BY position ASC, created_at ASC`,
      [taskId]
    );
    
    return res.json({ 
      ok: true, 
      items: result.rows 
    });
  } catch (error) {
    console.error('[CHECKLIST] Error reordering items:', error);
    return res.status(500).json({ 
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to reorder checklist items' } 
    });
  }
});

// DELETE /api/tasks/:taskId/checklist/:itemId - Delete checklist item
router.delete('/tasks/:taskId/checklist/:itemId', authenticate, requirePerm('tasks:checklist:delete'), async (req, res) => {
  try {
    const { taskId, itemId } = req.params;
    const { actorId, actorEmail } = getActor(req);
    
    // Verify item exists and belongs to task
    const itemResult = await pool.query(
      'SELECT id, label FROM task_checklist_items WHERE id = $1 AND task_id = $2',
      [itemId, taskId]
    );
    
    if (itemResult.rows.length === 0) {
      return res.status(404).json({ 
        ok: false, 
        error: { code: 'ITEM_NOT_FOUND', message: 'Checklist item not found' } 
      });
    }
    
    const item = itemResult.rows[0];
    
    // Delete item
    await pool.query('DELETE FROM task_checklist_items WHERE id = $1', [itemId]);
    
    // Write audit log
    await writeAudit({
      actorId,
      actorEmail,
      action: 'task.checklist.delete',
      targetType: 'checklist_item',
      targetId: itemId,
      payload: { task_id: taskId, label: item.label }
    });
    
    console.log(`[CHECKLIST] Item deleted: task=${taskId} item=${itemId} by=${actorEmail || actorId}`);
    
    return res.status(204).end();
  } catch (error) {
    console.error('[CHECKLIST] Error deleting item:', error);
    return res.status(500).json({ 
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete checklist item' } 
    });
  }
});

module.exports = router;
