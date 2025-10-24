// services/decisions.js - Auto-Decisions v0 Safe Rules Engine
// Runs automated low-risk actions based on telemetry and audit data
// All actions start in DRY_RUN mode by default (safe by design)

const { pool } = require('./database');

/**
 * Load all enabled decision policies from the database
 */
async function loadPolicies() {
  const result = await pool.query(`
    SELECT slug, enabled, dry_run, condition, action, description
    FROM decision_policies
    WHERE enabled = true
    ORDER BY slug
  `);
  return result.rows;
}

/**
 * Record a decision execution (audit trail)
 */
async function recordExec(policy, matched, effect, target, payload) {
  await pool.query(`
    INSERT INTO decision_executions (policy_slug, matched, dry_run, effect, target_type, target_id, payload)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [
    policy.slug,
    matched,
    policy.dry_run,
    effect,
    target.type || null,
    target.id || null,
    JSON.stringify(payload)
  ]);
}

/**
 * Create a task from a template (for auto-handoff)
 */
async function createTaskFromTemplate(taskId, projectId, template) {
  try {
    // Get project name if inheriting
    let projectName = '';
    if (template.inherit_project && projectId) {
      const projResult = await pool.query('SELECT name FROM projects WHERE id = $1', [projectId]);
      projectName = projResult.rows[0]?.name || '';
    }

    const title = `${template.title_prefix || ''}${projectName}`.trim();
    const dept = template.department || null;
    const label = template.label || null;

    const result = await pool.query(`
      INSERT INTO tasks (title, project_id, department, labels, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'open', now(), now())
      RETURNING id
    `, [
      title,
      projectId,
      dept,
      label ? [label] : null
    ]);

    return result.rows[0]?.id;
  } catch (err) {
    console.error('[DECISIONS] Failed to create task from template:', err.message);
    return null;
  }
}

/**
 * Add a label to a task (for badges, auto-tagging)
 */
async function addTaskLabel(taskId, label) {
  try {
    await pool.query(`
      UPDATE tasks
      SET labels = COALESCE(labels, ARRAY[]::text[]) || $1,
          updated_at = now()
      WHERE id = $2
    `, [label, taskId]);
  } catch (err) {
    console.error('[DECISIONS] Failed to add label:', err.message);
  }
}

/**
 * Create an in-app notification for a role
 */
async function notifyRole(role, message, targetType, targetId) {
  try {
    // Create notification for users with the specified role
    await pool.query(`
      INSERT INTO notifications (user_id, channel, event_code, payload, type, created_at)
      SELECT ur.user_id, 'inapp', 'DECISION_ESCALATE', $1::jsonb, 'decision', now()
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE r.slug = $2
    `, [
      JSON.stringify({ message, target_type: targetType, target_id: targetId }),
      role
    ]);
  } catch (err) {
    // Non-critical failure (notifications table might not exist in dev)
    console.error('[DECISIONS] Failed to create notification:', err.message);
  }
}

/**
 * Main decision cycle runner
 * Evaluates all enabled policies and executes matching actions
 */
async function runDecisionCycle() {
  const startTime = Date.now();
  let totalExecutions = 0;

  try {
    const policies = await loadPolicies();
    console.log(`[DECISIONS] Running cycle with ${policies.length} active policies`);

    // 1) Performance event rules (badges, speed tracking)
    const perfPolicies = policies.filter(p => p.condition?.type === 'perf_event');
    if (perfPolicies.length > 0) {
      // Get recent performance events (last 2 hours)
      const perfResult = await pool.query(`
        SELECT pe.id, pe.actor_id, pe.actor_email, pe.task_id, pe.checklist_item_id,
               pe.duration_ms, pe.created_at, pe.department
        FROM performance_events pe
        WHERE pe.created_at >= now() - interval '2 hours'
          AND pe.action = 'checklist.done'
        ORDER BY pe.created_at DESC
        LIMIT 100
      `);

      for (const policy of perfPolicies) {
        for (const event of perfResult.rows) {
          const durationMinutes = Number(event.duration_ms) / 60000.0;
          const ltMinutes = Number(policy.condition.lt_minutes || 0);
          const matched = durationMinutes > 0 && durationMinutes < ltMinutes;

          if (!matched) continue;

          const effect = policy.action?.effect;
          if (effect === 'label' && event.task_id) {
            const payload = {
              label: policy.action.label,
              taskId: event.task_id,
              durationMinutes: Math.round(durationMinutes * 100) / 100
            };

            await recordExec(policy, true, 'label', { type: 'task', id: event.task_id }, payload);
            totalExecutions++;

            if (!policy.dry_run) {
              await addTaskLabel(event.task_id, policy.action.label);
            }
          }
        }
      }
    }

    // 2) Idle task rules (escalation, reminders)
    const idlePolicies = policies.filter(p => p.condition?.type === 'task_idle');
    if (idlePolicies.length > 0) {
      for (const policy of idlePolicies) {
        const days = Number(policy.condition.days || 7);

        const idleResult = await pool.query(`
          SELECT id, title, updated_at, department
          FROM tasks
          WHERE status <> 'done'
            AND updated_at < now() - ($1::text || ' days')::interval
          ORDER BY updated_at ASC
          LIMIT 50
        `, [days]);

        for (const task of idleResult.rows) {
          const payload = {
            title: task.title,
            idleDays: days,
            lastUpdate: task.updated_at,
            department: task.department
          };

          await recordExec(policy, true, 'notify', { type: 'task', id: task.id }, payload);
          totalExecutions++;

          if (!policy.dry_run) {
            const message = `Task idle ${days}d: ${task.title}`;
            await notifyRole(policy.action.role || 'ops', message, 'task', task.id);
          }
        }
      }
    }

    // 3) Checklist completion handoff (Estimation → Procurement)
    const handoffPolicy = policies.find(p => p.slug === 'handoff.estimation_to_procurement');
    if (handoffPolicy) {
      const dept = handoffPolicy.condition.department || 'Estimating';

      // Find tasks with 100% checklist completion in the target department
      const handoffResult = await pool.query(`
        WITH progress AS (
          SELECT t.id as task_id, t.project_id, t.title,
                 COUNT(*) FILTER (WHERE true) as total,
                 COUNT(*) FILTER (WHERE is_done) as done
          FROM task_checklist_items tci
          JOIN tasks t ON tci.task_id = t.id
          WHERE t.department = $1
            AND t.status <> 'done'
          GROUP BY t.id, t.project_id, t.title
        )
        SELECT p.task_id, p.project_id, p.title
        FROM progress p
        WHERE p.total > 0 AND p.total = p.done
        LIMIT 30
      `, [dept]);

      for (const row of handoffResult.rows) {
        const payload = {
          fromTask: row.task_id,
          fromTitle: row.title,
          projectId: row.project_id
        };

        await recordExec(handoffPolicy, true, 'create_task', { type: 'project', id: row.project_id }, payload);
        totalExecutions++;

        if (!handoffPolicy.dry_run) {
          const createdId = await createTaskFromTemplate(row.task_id, row.project_id, handoffPolicy.action.template);
          if (createdId) {
            await recordExec(handoffPolicy, true, 'create_task', { type: 'task', id: createdId }, {
              ...payload,
              createdTaskId: createdId
            });
          }
        }
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[DECISIONS] Cycle complete: ${totalExecutions} executions in ${elapsed}ms`);

  } catch (err) {
    console.error('[DECISIONS] Cycle failed:', err.message);
    throw err;
  }
}

module.exports = { runDecisionCycle, loadPolicies };
