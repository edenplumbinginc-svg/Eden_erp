// routes/tasks.js
const express = require('express');
const { z } = require('zod');
const router = express.Router();
const { pool, enqueueNotification } = require('../services/database');
const { authenticate, deriveStableUUID } = require('../middleware/auth');
const { requirePerm } = require('../middleware/permissions');
const { validate } = require('../middleware/validate');
const { notify, actorFromHeaders } = require('../lib/notify');
const { withTx } = require('../lib/tx');
const { audit } = require('../utils/audit');
const { maybeAutoCloseParent } = require('../services/taskAutoClose');
const { handoffTask } = require('../services/handoff');
const { parseQuery, fetchTasks } = require('../services/taskQuery');
const { createNotification } = require('../services/notifications');

// Zod validation schemas
const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(20000).optional(),
  status: z.enum(['open', 'todo', 'in_progress', 'review', 'done']).optional(),
  priority: z.string().optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  ball_in_court: z.string().uuid().nullable().optional(),
  ball_in_court_note: z.string().max(1000).nullable().optional(),
  ballOwnerType: z.enum(['user', 'vendor', 'dept', 'system']).nullable().optional(),
  ballOwnerId: z.string().uuid().nullable().optional(),
  due_at: z.string().datetime().nullable().optional(),
  tags: z.array(z.string().min(1).max(64)).max(50).optional(),
  origin: z.string().optional(),
  voice_url: z.string().url().nullable().optional(),
  voice_transcript: z.string().max(20000).nullable().optional()
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided"
});

const CreateCommentSchema = z.object({
  body: z.string().min(1).max(20000),
  author_id: z.string().optional()
});

const CreateSubtaskSchema = z.object({
  title: z.string().min(1).max(200),
  done: z.boolean().optional(),
  order_index: z.number().int().optional()
});

const UpdateSubtaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  done: z.boolean().optional(),
  order_index: z.number().int().optional()
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided"
});

const BallHandoffSchema = z.object({
  to_user_id: z.string().min(1),
  from_user_id: z.string().optional(),
  note: z.string().max(1000).optional()
});

const CreateDependencySchema = z.object({
  blocks_task_id: z.string().uuid()
});

const HandoffSchema = z.object({
  to_department: z.enum(['Operations', 'Procurement', 'Accounting', 'Service', 'Estimating', 'Scheduling']),
  note: z.string().max(1000).optional()
});

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

// List all tasks with filtering, pagination, and sorting
router.get('/', authenticate, requirePerm('tasks:read'), async (req, res) => {
  try {
    const filters = parseQuery(req.query);
    const result = await fetchTasks(filters);
    res.setHeader('X-Total-Count', String(result.total ?? 0));
    res.json({ ok: true, ...result });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ ok: false, error: e.message });
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get single task (with computed fields)
router.get('/:id', authenticate, requirePerm('tasks:read'), async (req, res) => {
  try {
    const q = `
      SELECT t.id, t.title, t.description, t.status, t.priority,
             t.assignee_id, t.ball_in_court, t.ball_in_court_note, t.ball_owner_type, t.ball_owner_id, t.ball_since,
             t.due_at, t.created_at, t.updated_at,
             t.tags, t.origin, t.voice_url, t.voice_transcript, t.project_id, t.department,
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
router.patch('/:id', authenticate, requirePerm('tasks:write'), validate(UpdateTaskSchema), async (req, res) => {
  try {
    const { title, description, status, priority, assignee_id, ball_in_court, ball_in_court_note, ballOwnerType, ballOwnerId, due_at, tags, origin, voice_url, voice_transcript } = req.data;
    
    // Fetch current task data if needed
    let currentStatus = null;
    let currentTaskData = null;
    let currentTask = null;
    
    if (status !== undefined || assignee_id !== undefined || ballOwnerType !== undefined || ballOwnerId !== undefined) {
      currentTask = await pool.query(
        'SELECT status, assignee_id, ball_in_court, ball_owner_type, ball_owner_id, ball_since, project_id, title, priority, due_at, created_by FROM public.tasks WHERE id = $1', 
        [req.params.id]
      );
      if (currentTask.rowCount === 0) return res.status(404).json({ error: 'task not found' });
      currentTaskData = currentTask.rows[0];
      currentStatus = currentTaskData.status;
      
      // Validate status transition if status is being updated
      if (status !== undefined) {
        let newStatus = status === 'open' ? 'todo' : status;
        if (!isValidStatusTransition(currentStatus, newStatus)) {
          return res.status(400).json({ 
            error: `Invalid status transition from '${currentStatus}' to '${newStatus}'` 
          });
        }
      }
    }
    
    // Detect ball owner change
    let setBallSince = false;
    let finalBallOwnerType = ballOwnerType;
    let finalBallOwnerId = ballOwnerId;
    
    if (currentTaskData && (ballOwnerType !== undefined || ballOwnerId !== undefined)) {
      const typeChanged = ballOwnerType !== undefined && ballOwnerType !== currentTaskData.ball_owner_type;
      const idChanged = ballOwnerId !== undefined && ballOwnerId !== currentTaskData.ball_owner_id;
      
      if (typeChanged || idChanged) {
        setBallSince = true;
        finalBallOwnerType = ballOwnerType ?? currentTaskData.ball_owner_type ?? null;
        finalBallOwnerId = ballOwnerId ?? currentTaskData.ball_owner_id ?? null;
      }
    }
    
    const result = await withTx(pool, async (tx) => {
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
      if (ball_in_court_note !== undefined) { updates.push(`ball_in_court_note = $${idx++}`); values.push(ball_in_court_note); }
      if (ballOwnerType !== undefined) { updates.push(`ball_owner_type = $${idx++}`); values.push(finalBallOwnerType); }
      if (ballOwnerId !== undefined) { updates.push(`ball_owner_id = $${idx++}`); values.push(finalBallOwnerId); }
      if (setBallSince) { updates.push(`ball_since = $${idx++}`); values.push(new Date().toISOString()); }
      if (due_at !== undefined) { updates.push(`due_at = $${idx++}`); values.push(due_at); }
      if (tags !== undefined) { updates.push(`tags = $${idx++}`); values.push(tags); }
      if (origin !== undefined) { updates.push(`origin = $${idx++}`); values.push(origin); }
      if (voice_url !== undefined) { updates.push(`voice_url = $${idx++}`); values.push(voice_url); }
      if (voice_transcript !== undefined) { updates.push(`voice_transcript = $${idx++}`); values.push(voice_transcript); }

      if (updates.length === 0) throw new Error('no fields to update');

      updates.push(`updated_at = now()`);
      values.push(req.params.id);
      const r = await tx.query(
        `UPDATE public.tasks SET ${updates.join(', ')} 
         WHERE id = $${idx} 
         RETURNING id, title, description, status, priority, assignee_id, ball_in_court, ball_in_court_note,
                   ball_owner_type, ball_owner_id, ball_since, due_at, tags, origin, voice_url, voice_transcript,
                   created_at, updated_at, project_id`,
        values
      );
      if (r.rowCount === 0) throw new Error('task not found');
      
      const updatedTask = r.rows[0];
      
      // Insert notification within the same transaction if status changed
      if (status !== undefined && currentStatus !== null) {
        const newStatus = status === 'open' ? 'todo' : status;
        // Notify task creator on status change (if not the actor)
        if (currentStatus !== newStatus && currentTaskData.created_by && currentTaskData.created_by !== req.user?.id) {
          const { actorEmail } = actorFromHeaders(req);
          await notify(tx, {
            type: 'status_changed',
            projectId: currentTaskData.project_id,
            taskId: req.params.id,
            actorId: req.user?.id || null,
            actorEmail: actorEmail || null,
            userId: currentTaskData.created_by,
            payload: {
              title: currentTaskData.title,
              old_status: currentStatus,
              new_status: newStatus,
              priority: currentTaskData.priority,
              due_date: currentTaskData.due_at
            }
          });
        }
      }
      
      // Insert notification within the same transaction if assignee changed
      if (assignee_id !== undefined && currentTaskData && assignee_id !== currentTaskData.assignee_id && assignee_id !== null) {
        const { actorEmail } = actorFromHeaders(req);
        await notify(tx, {
          type: 'task_assigned',
          projectId: currentTaskData.project_id,
          taskId: req.params.id,
          actorId: req.user?.id || null,
          actorEmail: actorEmail || null,
          userId: assignee_id,
          payload: {
            title: currentTaskData.title,
            priority: currentTaskData.priority,
            due_date: currentTaskData.due_at
          }
        });
      }
      
      return updatedTask;
    });
    
    await audit(req.user?.id, 'task.update', `task:${req.params.id}`, { 
      title, description, status, priority, assignee_id, ball_in_court, ballOwnerType, ballOwnerId, due_at, tags, origin 
    });
    
    // Audit ball owner change
    if (setBallSince) {
      await audit(req.user?.id, 'ball.owner_set', `task:${req.params.id}`, {
        type: finalBallOwnerType,
        id: finalBallOwnerId,
        since: result.ball_since
      });
    }
    
    // Create user-specific notification for status change
    if (status !== undefined && currentStatus !== null && currentTaskData) {
      const newStatus = status === 'open' ? 'todo' : status;
      if (currentStatus !== newStatus && currentTaskData.created_by && currentTaskData.created_by !== req.user?.id) {
        try {
          const { actorEmail } = actorFromHeaders(req);
          await createNotification({
            userId: currentTaskData.created_by,
            type: 'status_changed',
            taskId: req.params.id,
            projectId: currentTaskData.project_id,
            actorId: req.user?.id || null,
            actorEmail: actorEmail || 'unknown',
            payload: { 
              title: currentTaskData.title, 
              oldStatus: currentStatus, 
              newStatus: newStatus 
            }
          });
          console.log(`[STATUS CHANGE] Notified creator about status change on task ${req.params.id}`);
        } catch (notifError) {
          console.error('[STATUS CHANGE] Failed to create notification:', notifError.message);
        }
      }
    }
    
    res.json(result);
  } catch (e) {
    if (e.message === 'no fields to update') {
      return res.status(400).json({ error: e.message });
    }
    if (e.message === 'task not found') {
      return res.status(404).json({ error: e.message });
    }
    res.status(500).json({ error: e.message });
  }
});

// Delete task (soft delete)
router.delete('/:id', authenticate, requirePerm('tasks:write'), async (req, res) => {
  try {
    const r = await pool.query(
      'UPDATE public.tasks SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id',
      [req.params.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'task not found' });
    
    await audit(req.user?.id, 'task.delete', `task:${req.params.id}`, {});
    
    res.json({ deleted: true, id: r.rows[0].id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Task comments
router.get('/:taskId/comments', authenticate, requirePerm('tasks:read'), async (req, res) => {
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

router.post('/:taskId/comments', authenticate, requirePerm('tasks:write'), validate(CreateCommentSchema), async (req, res) => {
  try {
    const { body, author_id } = req.data;
    
    // Fetch task to get project_id and context for event bus
    const task = await pool.query('SELECT id, project_id, title FROM public.tasks WHERE id = $1', [req.params.taskId]);
    if (task.rowCount === 0) return res.status(404).json({ error: 'task not found' });
    const taskData = task.rows[0];
    
    // Convert author_id to UUID if provided
    const finalAuthorId = author_id ? deriveStableUUID(author_id) : (req.user?.id ?? null);
    
    const comment = await withTx(pool, async (tx) => {
      const r = await tx.query(
        `INSERT INTO public.task_comments (task_id, author_id, body)
         VALUES ($1, $2, $3)
         RETURNING id, task_id, author_id, body, created_at, updated_at`,
        [req.params.taskId, finalAuthorId, body]
      );
      
      const commentData = r.rows[0];
      
      // Insert notification within the same transaction
      const { actorEmail } = actorFromHeaders(req);
      await notify(tx, {
        type: 'comment_added',
        projectId: taskData.project_id,
        taskId: taskData.id,
        actorId: finalAuthorId,
        actorEmail: actorEmail || null,
        payload: {
          task_title: taskData.title,
          comment_preview: String(body || '').slice(0, 160)
        }
      });
      
      return commentData;
    });
    
    await audit(req.user?.id, 'comment.create', `task:${req.params.taskId}`, { 
      commentId: comment.id, 
      bodyLength: body.length 
    });
    
    // Create user-specific notifications for comment
    try {
      const taskDetails = await pool.query(
        'SELECT created_by, assignee_id, ball_in_court, project_id, title FROM public.tasks WHERE id = $1',
        [req.params.taskId]
      );
      
      if (taskDetails.rowCount > 0) {
        const task = taskDetails.rows[0];
        const notifyUsers = new Set([task.created_by, task.assignee_id, task.ball_in_court]);
        notifyUsers.delete(finalAuthorId);
        notifyUsers.delete(null);
        
        const { actorEmail } = actorFromHeaders(req);
        for (const userId of notifyUsers) {
          await createNotification({
            userId,
            type: 'comment_added',
            taskId: req.params.taskId,
            projectId: task.project_id,
            actorId: finalAuthorId,
            actorEmail: actorEmail || 'unknown',
            payload: { 
              title: task.title, 
              commentPreview: body.substring(0, 100) 
            }
          });
        }
        console.log(`[COMMENT] Notified ${notifyUsers.size} users about comment on task ${req.params.taskId}`);
      }
    } catch (notifError) {
      console.error('[COMMENT] Failed to create notifications:', notifError.message);
    }
    
    res.status(201).json(comment);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Ball handoff
router.post('/:taskId/ball', authenticate, requirePerm('tasks:write'), validate(BallHandoffSchema), async (req, res) => {
  try {
    const { to_user_id, from_user_id, note } = req.data;

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

    await audit(req.user?.id, 'ball.handoff', `task:${req.params.taskId}`, { 
      from_user_id: finalFromUserId, 
      to_user_id: finalToUserId 
    });

    res.json(up.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:taskId/ball', authenticate, requirePerm('tasks:read'), async (req, res) => {
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
router.get('/:id/subtasks', authenticate, requirePerm('tasks:read'), async (req, res) => {
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

router.post('/:id/subtasks', authenticate, requirePerm('tasks:write'), validate(CreateSubtaskSchema), async (req, res) => {
  try {
    const { title, done, order_index } = req.data;
    
    const r = await pool.query(
      `INSERT INTO public.subtasks (task_id, title, done, order_index)
       VALUES ($1, $2, $3, $4)
       RETURNING id, task_id, title, done, order_index, created_at, updated_at`,
      [req.params.id, title, done ?? false, order_index ?? 0]
    );
    
    await audit(req.user?.id, 'subtask.create', `task:${req.params.id}`, { 
      subtaskId: r.rows[0].id, 
      title 
    });
    
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Subtask operations (by subtask ID)
router.patch('/subtasks/:id', authenticate, requirePerm('tasks:write'), validate(UpdateSubtaskSchema), async (req, res) => {
  try {
    const { title, done, order_index } = req.data;
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
    
    await audit(req.user?.id, 'subtask.update', `subtask:${req.params.id}`, { title, done, order_index });
    
    // Auto-close parent task if all subtasks are done
    const subtask = r.rows[0];
    await maybeAutoCloseParent(subtask.task_id);
    
    res.json(subtask);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/subtasks/:id', authenticate, requirePerm('tasks:write'), async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM public.subtasks WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'subtask not found' });
    
    await audit(req.user?.id, 'subtask.delete', `subtask:${req.params.id}`, {});
    
    res.json({ deleted: true, id: r.rows[0].id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Task dependencies
router.get('/:id/dependencies', authenticate, requirePerm('tasks:read'), async (req, res) => {
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

router.post('/:id/dependencies', authenticate, requirePerm('tasks:write'), validate(CreateDependencySchema), async (req, res) => {
  try {
    const { blocks_task_id } = req.data;
    
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
    
    await audit(req.user?.id, 'dependency.create', `task:${req.params.id}`, { blocks_task_id });
    
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id/dependencies/:blocksId', authenticate, requirePerm('tasks:write'), async (req, res) => {
  try {
    const r = await pool.query(
      `DELETE FROM public.task_dependencies 
       WHERE task_id = $1 AND blocks_task_id = $2 
       RETURNING task_id, blocks_task_id`,
      [req.params.id, req.params.blocksId]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'dependency not found' });
    
    await audit(req.user?.id, 'dependency.delete', `task:${req.params.id}`, { 
      blocks_task_id: req.params.blocksId 
    });
    
    res.json({ deleted: true, ...r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Soft delete endpoint
router.delete('/:id/soft', authenticate, requirePerm('tasks:write'), async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE public.tasks
       SET deleted_at = now(), updated_at = now()
       WHERE id = $1
       RETURNING id`,
      [req.params.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'task not found' });
    
    await audit(req.user?.id, 'task.soft_delete', `task:${req.params.id}`, {});
    
    res.json({ deleted: true, id: r.rows[0].id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Snooze idle reminder for a task
router.put('/:id/snooze_idle', authenticate, requirePerm('tasks:write'), async (req, res) => {
  try {
    const days = parseInt(req.body?.days || '3', 10);
    if (days <= 0 || days > 30) {
      return res.status(400).json({ error: 'days must be between 1 and 30' });
    }

    const r = await pool.query(
      `UPDATE public.tasks
       SET idle_snoozed_until = NOW() + ($1 || ' days')::interval,
           needs_idle_reminder = false,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, idle_snoozed_until, needs_idle_reminder`,
      [days, req.params.id]
    );
    
    if (r.rowCount === 0) return res.status(404).json({ error: 'task not found' });
    
    await audit(req.user?.id, 'task.idle.snooze', `task:${req.params.id}`, { days });
    
    res.json({ ok: true, data: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Department handoff with 24h duplicate guard
router.post('/:id/handoff', authenticate, requirePerm('tasks:write'), validate(HandoffSchema), async (req, res) => {
  try {
    const taskId = req.params.id;
    const toDepartment = req.body.to_department;
    const note = req.body.note;
    const actorEmail = req.user?.email || 'unknown';
    
    const result = await handoffTask({ taskId, toDepartment, actorEmail, note });
    res.json(result);
  } catch (e) {
    if (e.message === 'task not found') {
      return res.status(404).json({ ok: false, error: 'task not found' });
    }
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;