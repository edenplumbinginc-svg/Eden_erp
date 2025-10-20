// routes/tasks.js
const express = require('express');
const router = express.Router();
const { pool, enqueueNotification } = require('../services/database');
const { authenticate, deriveStableUUID } = require('../middleware/auth');

// Status flow validation
const validStatusTransitions = {
  'open': ['todo', 'in_progress'],
  'todo': ['in_progress'],
  'in_progress': ['review', 'todo'],
  'review': ['done', 'in_progress'],
  'done': ['todo', 'in_progress'] // Can reopen
};

// Helper to validate status transition
function isValidStatusTransition(currentStatus, newStatus) {
  // Map 'open' to 'todo' for backward compatibility
  if (currentStatus === 'open') currentStatus = 'todo';
  if (newStatus === 'open') newStatus = 'todo';
  
  if (currentStatus === newStatus) return true;
  const validNext = validStatusTransitions[currentStatus];
  return validNext && validNext.includes(newStatus);
}

// Get single task (with computed fields)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const q = `
      SELECT t.id, t.title, t.description, t.status, t.priority,
             t.assignee_id, t.ball_in_court, t.due_at, t.created_at, t.updated_at,
             t.tags, t.origin, t.project_id,
             CASE 
               WHEN t.status IN ('todo', 'open') AND t.ball_in_court IS NOT NULL 
                    AND t.updated_at < now() - INTERVAL '3 days'
               THEN EXTRACT(DAY FROM now() - t.updated_at)::int
               ELSE 0
             END as stalled_days
      FROM public.tasks t
      WHERE t.id = $1 AND t.deleted_at IS NULL`;
    const r = await pool.query(q, [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'task not found' });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update task
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { title, description, status, priority, assignee_id, ball_in_court, due_at, tags, origin } = req.body ?? {};
    
    // If status is being updated, validate the transition
    if (status !== undefined) {
      const currentTask = await pool.query('SELECT status, ball_in_court FROM public.tasks WHERE id = $1', [req.params.id]);
      if (currentTask.rowCount === 0) return res.status(404).json({ error: 'task not found' });
      
      let currentStatus = currentTask.rows[0].status;
      let newStatus = status === 'open' ? 'todo' : status; // Map open to todo
      
      if (!isValidStatusTransition(currentStatus, newStatus)) {
        return res.status(400).json({ 
          error: `Invalid status transition from '${currentStatus}' to '${newStatus}'` 
        });
      }
      
      // Enqueue notification for status change
      if (currentStatus !== newStatus && currentTask.rows[0].ball_in_court) {
        await enqueueNotification(currentTask.rows[0].ball_in_court, req.params.id, 'status_changed', {
          old_status: currentStatus,
          new_status: newStatus
        });
      }
    }
    
    const updates = [];
    const values = [];
    let idx = 1;

    if (title !== undefined) { updates.push(`title = $${idx++}`); values.push(title); }
    if (description !== undefined) { updates.push(`description = $${idx++}`); values.push(description); }
    if (status !== undefined) { 
      const mappedStatus = status === 'open' ? 'todo' : status;
      updates.push(`status = $${idx++}`); 
      values.push(mappedStatus); 
    }
    if (priority !== undefined) { updates.push(`priority = $${idx++}`); values.push(priority); }
    if (assignee_id !== undefined) { updates.push(`assignee_id = $${idx++}`); values.push(assignee_id); }
    if (ball_in_court !== undefined) { updates.push(`ball_in_court = $${idx++}`); values.push(ball_in_court); }
    if (due_at !== undefined) { updates.push(`due_at = $${idx++}`); values.push(due_at); }
    if (tags !== undefined) { updates.push(`tags = $${idx++}`); values.push(tags); }
    if (origin !== undefined) { updates.push(`origin = $${idx++}`); values.push(origin); }

    if (updates.length === 0) return res.status(400).json({ error: 'no fields to update' });

    updates.push(`updated_at = now()`);
    values.push(req.params.id);
    const r = await pool.query(
      `UPDATE public.tasks SET ${updates.join(', ')} 
       WHERE id = $${idx} 
       RETURNING id, title, description, status, priority, assignee_id, ball_in_court, due_at, tags, origin, created_at, updated_at`,
      values
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'task not found' });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete task (soft delete)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const r = await pool.query(
      'UPDATE public.tasks SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id',
      [req.params.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'task not found' });
    res.json({ deleted: true, id: r.rows[0].id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Task comments
router.get('/:taskId/comments', authenticate, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, task_id, author_id, body, created_at, updated_at
       FROM public.task_comments
       WHERE task_id = $1
       ORDER BY created_at ASC`,
      [req.params.taskId]
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:taskId/comments', authenticate, async (req, res) => {
  try {
    const { body, author_id } = req.body ?? {};
    if (!body) return res.status(400).json({ error: 'body required' });
    
    // Convert author_id to UUID if provided
    const finalAuthorId = author_id ? deriveStableUUID(author_id) : (req.user?.id ?? null);
    
    const r = await pool.query(
      `INSERT INTO public.task_comments (task_id, author_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, task_id, author_id, body, created_at, updated_at`,
      [req.params.taskId, finalAuthorId, body]
    );
    
    // Enqueue notification for comment
    const task = await pool.query('SELECT ball_in_court FROM public.tasks WHERE id = $1', [req.params.taskId]);
    if (task.rows[0]?.ball_in_court) {
      await enqueueNotification(task.rows[0].ball_in_court, req.params.taskId, 'comment_added', {
        comment_snippet: body.substring(0, 100)
      });
    }
    
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Ball handoff
router.post('/:taskId/ball', authenticate, async (req, res) => {
  try {
    const { to_user_id, from_user_id, note } = req.body ?? {};
    if (!to_user_id) return res.status(400).json({ error: 'to_user_id required' });

    // Convert user IDs to UUIDs
    const finalToUserId = deriveStableUUID(to_user_id);
    const finalFromUserId = from_user_id ? deriveStableUUID(from_user_id) : (req.user?.id ?? null);

    const up = await pool.query(
      `UPDATE public.tasks
         SET ball_in_court = $1, updated_at = now()
       WHERE id = $2
       RETURNING id, project_id, title, ball_in_court, updated_at`,
      [finalToUserId, req.params.taskId]
    );
    if (up.rowCount === 0) return res.status(404).json({ error: 'task not found' });

    await pool.query(
      `INSERT INTO public.ball_history (task_id, from_user_id, to_user_id, note)
       VALUES ($1,$2,$3,$4)`,
      [req.params.taskId, finalFromUserId, finalToUserId, note ?? null]
    );

    res.json(up.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:taskId/ball', authenticate, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, task_id, from_user_id, to_user_id, note, changed_at
         FROM public.ball_history
        WHERE task_id = $1
        ORDER BY changed_at DESC`,
      [req.params.taskId]
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Subtasks
router.get('/:id/subtasks', authenticate, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, task_id, title, done, order_index, created_at, updated_at
       FROM public.subtasks
       WHERE task_id = $1
       ORDER BY order_index, created_at`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/subtasks', authenticate, async (req, res) => {
  try {
    const { title, done, order_index } = req.body ?? {};
    if (!title) return res.status(400).json({ error: 'title required' });
    
    const r = await pool.query(
      `INSERT INTO public.subtasks (task_id, title, done, order_index)
       VALUES ($1, $2, $3, $4)
       RETURNING id, task_id, title, done, order_index, created_at, updated_at`,
      [req.params.id, title, done ?? false, order_index ?? 0]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Subtask operations (by subtask ID)
router.patch('/subtasks/:id', authenticate, async (req, res) => {
  try {
    const { title, done, order_index } = req.body ?? {};
    const updates = [];
    const values = [];
    let idx = 1;

    if (title !== undefined) { updates.push(`title = $${idx++}`); values.push(title); }
    if (done !== undefined) { updates.push(`done = $${idx++}`); values.push(done); }
    if (order_index !== undefined) { updates.push(`order_index = $${idx++}`); values.push(order_index); }

    if (updates.length === 0) return res.status(400).json({ error: 'no fields to update' });

    updates.push(`updated_at = now()`);
    values.push(req.params.id);
    const r = await pool.query(
      `UPDATE public.subtasks SET ${updates.join(', ')} 
       WHERE id = $${idx} 
       RETURNING id, task_id, title, done, order_index, created_at, updated_at`,
      values
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'subtask not found' });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/subtasks/:id', authenticate, async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM public.subtasks WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'subtask not found' });
    res.json({ deleted: true, id: r.rows[0].id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Task dependencies
router.get('/:id/dependencies', authenticate, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT td.task_id, td.blocks_task_id, 
              t.title as blocks_task_title, t.status as blocks_task_status
       FROM public.task_dependencies td
       JOIN public.tasks t ON t.id = td.blocks_task_id
       WHERE td.task_id = $1`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/dependencies', authenticate, async (req, res) => {
  try {
    const { blocks_task_id } = req.body ?? {};
    if (!blocks_task_id) return res.status(400).json({ error: 'blocks_task_id required' });
    
    // Check for circular dependency
    const circular = await pool.query(
      `SELECT 1 FROM public.task_dependencies 
       WHERE task_id = $1 AND blocks_task_id = $2`,
      [blocks_task_id, req.params.id]
    );
    if (circular.rowCount > 0) {
      return res.status(400).json({ error: 'Circular dependency detected' });
    }
    
    const r = await pool.query(
      `INSERT INTO public.task_dependencies (task_id, blocks_task_id)
       VALUES ($1, $2)
       ON CONFLICT (task_id, blocks_task_id) DO NOTHING
       RETURNING task_id, blocks_task_id`,
      [req.params.id, blocks_task_id]
    );
    
    if (r.rowCount === 0) {
      return res.status(409).json({ error: 'Dependency already exists' });
    }
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id/dependencies/:blocksId', authenticate, async (req, res) => {
  try {
    const r = await pool.query(
      `DELETE FROM public.task_dependencies 
       WHERE task_id = $1 AND blocks_task_id = $2 
       RETURNING task_id, blocks_task_id`,
      [req.params.id, req.params.blocksId]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'dependency not found' });
    res.json({ deleted: true, ...r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Soft delete endpoint
router.delete('/:id/soft', authenticate, async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE public.tasks
       SET deleted_at = now(), updated_at = now()
       WHERE id = $1
       RETURNING id`,
      [req.params.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'task not found' });
    res.json({ deleted: true, id: r.rows[0].id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;