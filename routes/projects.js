// routes/projects.js
const express = require('express');
const { z } = require('zod');
const router = express.Router();
const { pool } = require('../services/database');
const { authenticate, authorize } = require('../middleware/auth');
const { requirePerm } = require('../middleware/permissions');
const { validate } = require('../middleware/validate');
const { notify, actorFromHeaders } = require('../lib/notify');
const { withTx } = require('../lib/tx');
const { audit } = require('../utils/audit');

const CreateProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().optional()
});

const UpdateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided"
});

const CreateTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assignee_id: z.string().uuid().optional(),
  ball_in_court: z.string().uuid().optional(),
  ball_in_court_note: z.string().max(1000).optional(),
  due_at: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  origin: z.string().optional(),
  voice_url: z.string().url().optional(),
  voice_transcript: z.string().max(20000).optional(),
  linked_project_ids: z.array(z.string().uuid()).optional()
});

// List projects - RBAC protected with project.view permission
// Supports delta sync via ?cursor_ts=timestamp&cursor_id=uuid (composite cursor)
router.get('/', authenticate, requirePerm('project.view'), async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const cursorTs = req.query.cursor_ts || req.query.updated_after; // Support both params for backward compat
    const cursorId = req.query.cursor_id;

    let query, params;
    if (cursorTs && cursorId) {
      // Composite cursor: fetch rows after (cursor_ts, cursor_id)
      // For DESC ordering: (updated_at < $1) OR (updated_at = $1 AND id < $2)
      query = `
        SELECT id, name, code, status, created_at, updated_at 
        FROM public.projects 
        WHERE (updated_at < $1::timestamptz) OR (updated_at = $1::timestamptz AND id < $2::uuid)
        ORDER BY updated_at DESC, id DESC
        LIMIT $3
      `;
      params = [cursorTs, cursorId, limit];
    } else if (cursorTs) {
      // Fallback for old clients: use timestamp only with > to page forward
      query = `
        SELECT id, name, code, status, created_at, updated_at 
        FROM public.projects 
        WHERE updated_at > $1::timestamptz
        ORDER BY updated_at DESC, id DESC
        LIMIT $2
      `;
      params = [cursorTs, limit];
    } else {
      // Initial load
      query = `
        SELECT id, name, code, status, created_at, updated_at 
        FROM public.projects 
        ORDER BY updated_at DESC, id DESC
        LIMIT $1
      `;
      params = [limit];
    }

    const r = await pool.query(query, params);
    
    // Return with delta sync metadata - composite cursor from last row
    const lastRow = r.rows[r.rows.length - 1];
    const nextCursor = lastRow
      ? { ts: lastRow.updated_at, id: lastRow.id }
      : (cursorTs ? { ts: cursorTs, id: cursorId } : null);

    res.json({
      items: r.rows,
      meta: {
        count: r.rows.length,
        next_cursor: nextCursor,
        // Legacy field for backward compatibility
        next_updated_after: nextCursor?.ts
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get single project by ID
router.get('/:id', authenticate, requirePerm('project.view'), async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT id, name, code, status, created_at FROM public.projects WHERE id = $1',
      [req.params.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'project not found' });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create project
router.post('/', authenticate, requirePerm('project.create'), validate(CreateProjectSchema), async (req, res) => {
  try {
    const { name, code } = req.data;
    const r = await pool.query(
      `INSERT INTO public.projects (name, code, status)
       VALUES ($1,$2,'active')
       RETURNING id, name, code, status, created_at`,
      [name, code ?? null]
    );
    const project = r.rows[0];
    await audit(req.user?.id, 'project.create', `project:${project.id}`, { name, code });
    res.status(201).json(project);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update project
router.patch('/:id', authenticate, requirePerm('project.edit'), validate(UpdateProjectSchema), async (req, res) => {
  try {
    const { name, code, status } = req.data;
    const updates = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name); }
    if (code !== undefined) { updates.push(`code = $${idx++}`); values.push(code); }
    if (status !== undefined) { updates.push(`status = $${idx++}`); values.push(status); }

    values.push(req.params.id);
    const r = await pool.query(
      `UPDATE public.projects SET ${updates.join(', ')} 
       WHERE id = $${idx} 
       RETURNING id, name, code, status, created_at`,
      values
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'project not found' });
    const project = r.rows[0];
    await audit(req.user?.id, 'project.update', `project:${project.id}`, { name, code, status });
    res.json(project);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete project
router.delete('/:id', authenticate, requirePerm('project.delete'), async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM public.projects WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'project not found' });
    const projectId = r.rows[0].id;
    await audit(req.user?.id, 'project.delete', `project:${projectId}`, {});
    res.json({ deleted: true, id: projectId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// List tasks by project
router.get('/:projectId/tasks', authenticate, requirePerm('task.view'), async (req, res) => {
  try {
    const q = `
      SELECT t.id, t.title, t.description, t.status, t.priority,
             t.assignee_id, t.ball_in_court, t.ball_in_court_note, t.due_at, t.created_at, t.updated_at,
             t.tags, t.origin, t.voice_url, t.voice_transcript, t.department,
             CASE 
               WHEN t.status IN ('todo', 'open') AND t.ball_in_court IS NOT NULL 
                    AND t.updated_at < now() - INTERVAL '3 days'
               THEN EXTRACT(DAY FROM now() - t.updated_at)::int
               ELSE 0
             END as stalled_days
      FROM public.tasks t
      WHERE t.project_id = $1 AND t.deleted_at IS NULL
      ORDER BY t.created_at DESC`;
    const r = await pool.query(q, [req.params.projectId]);
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create task in project
router.post('/:projectId/tasks', authenticate, requirePerm('task.create'), validate(CreateTaskSchema), async (req, res) => {
  try {
    const { title, description, assignee_id, ball_in_court, ball_in_court_note, due_at, priority, tags, origin, voice_url, voice_transcript, linked_project_ids } = req.data;
    
    // Default status to 'todo' instead of 'open' for new convention
    const status = req.body.status || 'todo';
    
    const task = await withTx(pool, async (tx) => {
      console.log('[TX] Starting transaction for task creation');
      const q = `
        INSERT INTO public.tasks
          (project_id, title, description, status, priority, assignee_id, ball_in_court, ball_in_court_note, due_at, tags, origin, voice_url, voice_transcript)
        VALUES
          ($1::uuid, $2, $3, $4, COALESCE($5,'normal'), $6::uuid, $7::uuid, $8, $9, $10, $11, $12, $13)
        RETURNING id, title, description, status, priority, assignee_id, ball_in_court, ball_in_court_note, due_at, tags, origin, voice_url, voice_transcript, created_at, updated_at`;
      
      console.log('[TX] Inserting task with projectId:', req.params.projectId);
      const r = await tx.query(q, [
        req.params.projectId,
        title,
        description ?? null,
        status,
        priority ?? null,
        assignee_id ?? null,
        ball_in_court ?? null,
        ball_in_court_note ?? null,
        due_at ?? null,
        tags ?? [],
        origin ?? 'UI',
        voice_url ?? null,
        voice_transcript ?? null
      ]);
      
      const taskData = r.rows[0];
      console.log('[TX] Task created with ID:', taskData.id);
      
      // Multi-project linking
      if (linked_project_ids && linked_project_ids.length > 0) {
        console.log('[TX] Linking task to additional projects:', linked_project_ids);
        for (const linkedProjectId of linked_project_ids) {
          await tx.query(
            'INSERT INTO public.tasks_projects (task_id, project_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [taskData.id, linkedProjectId]
          );
        }
      }
      
      // Insert notification within the same transaction
      const { actorEmail } = actorFromHeaders(req);
      console.log('[TX] Calling notify() with projectId:', req.params.projectId, 'taskId:', taskData.id);
      try {
        await notify(tx, {
          type: 'task_created',
          projectId: req.params.projectId,
          taskId: taskData.id,
          actorId: assignee_id || null,
          actorEmail: actorEmail || null,
          payload: {
            title: taskData.title,
            priority: taskData.priority,
            due_at: taskData.due_at,
            assignee_id: taskData.assignee_id,
            tags: taskData.tags || [],
            status: taskData.status,
            origin: taskData.origin
          },
        });
        console.log('[TX] notify() succeeded');
      } catch (e) {
        console.error('[TX] notify() failed:', e);
        throw e;
      }
      
      // Enqueue user-specific notification within the same transaction
      const { enqueueNotification } = require('../services/database');
      if (ball_in_court) {
        console.log('[TX] Calling enqueueNotification() with ball_in_court:', ball_in_court);
        try {
          await enqueueNotification(tx, ball_in_court, taskData.id, 'task_created', {
            title: title,
            project_id: req.params.projectId
          });
          console.log('[TX] enqueueNotification() succeeded');
        } catch (e) {
          console.error('[TX] enqueueNotification() failed:', e);
          throw e;
        }
      }
      
      console.log('[TX] Returning task data, transaction should commit');
      return taskData;
    });
    
    // Audit log for task creation
    await audit(req.user?.id, 'task.create', `project:${req.params.projectId}`, { 
      taskId: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority
    });
    
    res.status(201).json(task);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;