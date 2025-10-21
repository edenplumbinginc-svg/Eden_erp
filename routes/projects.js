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
  due_at: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  origin: z.string().optional()
});

// List projects - RBAC protected with projects:read permission
router.get('/', authenticate, requirePerm('projects:read'), async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT id, name, code, status, created_at FROM public.projects ORDER BY created_at DESC'
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create project
router.post('/', authenticate, validate(CreateProjectSchema), async (req, res) => {
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
router.patch('/:id', authenticate, validate(UpdateProjectSchema), async (req, res) => {
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
router.delete('/:id', authenticate, authorize(['Admin', 'Manager']), async (req, res) => {
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
router.get('/:projectId/tasks', authenticate, async (req, res) => {
  try {
    const q = `
      SELECT t.id, t.title, t.description, t.status, t.priority,
             t.assignee_id, t.ball_in_court, t.due_at, t.created_at, t.updated_at,
             t.tags, t.origin,
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
router.post('/:projectId/tasks', authenticate, validate(CreateTaskSchema), async (req, res) => {
  try {
    const { title, description, assignee_id, ball_in_court, due_at, priority, tags, origin } = req.data;
    
    // Default status to 'todo' instead of 'open' for new convention
    const status = req.body.status || 'todo';
    
    const task = await withTx(pool, async (tx) => {
      console.log('[TX] Starting transaction for task creation');
      const q = `
        INSERT INTO public.tasks
          (project_id, title, description, status, priority, assignee_id, ball_in_court, due_at, tags, origin)
        VALUES
          ($1::uuid, $2, $3, $4, COALESCE($5,'normal'), $6::uuid, $7::uuid, $8, $9, $10)
        RETURNING id, title, description, status, priority, assignee_id, ball_in_court, due_at, tags, origin, created_at, updated_at`;
      
      console.log('[TX] Inserting task with projectId:', req.params.projectId);
      const r = await tx.query(q, [
        req.params.projectId,
        title,
        description ?? null,
        status,
        priority ?? null,
        assignee_id ?? null,
        ball_in_court ?? null,
        due_at ?? null,
        tags ?? [],
        origin ?? null
      ]);
      
      const taskData = r.rows[0];
      console.log('[TX] Task created with ID:', taskData.id);
      
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
    
    res.status(201).json(task);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;