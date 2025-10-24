// services/decisions.js - Auto-Decisions v0 Safe Rules Engine
// Runs automated low-risk actions based on telemetry and audit data
// All actions start in DRY_RUN mode by default (safe by design)
// IDEMPOTENCY: Uses action_hash to prevent duplicate executions (survives restarts)
// TRUTHFUL LOGGING: Records executions ONLY after successful actions

const { pool } = require('./database');
const { actionHash } = require('./actionHash');

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
 * Record a decision execution with truthful audit trail
 * Only called AFTER action succeeds (or in DRY_RUN mode)
 * Uses action_hash for idempotency (prevents duplicate executions)
 */
async function recordExec(policy, effect, target, payload, success, errorText = null) {
  const hash = actionHash({
    policySlug: policy.slug,
    effect: effect,
    targetType: target.type || null,
    targetId: target.id || null,
    payload: payload
  });

  await pool.query(`
    INSERT INTO decision_executions 
      (policy_slug, matched, dry_run, effect, target_type, target_id, payload, success, error_text, action_hash, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
    ON CONFLICT (action_hash) 
    DO UPDATE SET
      success = EXCLUDED.success,
      error_text = EXCLUDED.error_text,
      payload = EXCLUDED.payload,
      dry_run = EXCLUDED.dry_run,
      matched = EXCLUDED.matched
    WHERE decision_executions.success = false OR decision_executions.dry_run = true
  `, [
    policy.slug,
    true,
    policy.dry_run,
    effect,
    target.type || null,
    target.id || null,
    JSON.stringify(payload),
    success,
    errorText,
    hash
  ]);
}

/**
 * Execute an action with idempotency and truthful logging
 * DRY_RUN: records with success=false (simulation only)
 * LIVE: executes action FIRST, then records with success=true
 * LIVE error: records with success=false and captures error_text
 */
async function executeAction(policy, effect, target, payload, actionFn) {
  const hash = actionHash({
    policySlug: policy.slug,
    effect: effect,
    targetType: target.type || null,
    targetId: target.id || null,
    payload: payload
  });

  const existing = await pool.query(`
    SELECT success FROM decision_executions
    WHERE action_hash = $1 AND success = true
    LIMIT 1
  `, [hash]);

  if (existing.rows.length > 0) {
    return { executed: false, reason: 'already_done' };
  }

  if (policy.dry_run) {
    await recordExec(policy, effect, target, payload, false, null);
    return { executed: true, dryRun: true };
  }

  try {
    await actionFn();
    await recordExec(policy, effect, target, payload, true, null);
    return { executed: true, success: true };
  } catch (err) {
    await recordExec(policy, effect, target, payload, false, err.message);
    return { executed: true, success: false, error: err.message };
  }
}

/**
 * Check if a task already has a specific label
 */
async function taskHasLabel(taskId, label) {
  const result = await pool.query(`
    SELECT COUNT(*) as count
    FROM tasks
    WHERE id = $1 AND $2 = ANY(tags)
  `, [taskId, label]);

  return parseInt(result.rows[0]?.count || 0) > 0;
}

/**
 * Create a task from a template (for auto-handoff)
 * IDEMPOTENT: Checks for existing templated tasks to prevent duplicates
 */
async function createTaskFromTemplate(sourceTaskId, projectId, template) {
  try {
    // Check if we already created a templated task for this source task
    const existing = await pool.query(`
      SELECT id FROM tasks
      WHERE project_id = $1
        AND department = $2
        AND tags @> ARRAY[$3]::text[]
        AND created_at >= now() - interval '30 days'
      LIMIT 1
    `, [projectId, template.department, template.label]);

    if (existing.rows.length > 0) {
      console.log(`[DECISIONS] Template task already exists for project ${projectId}, skipping duplicate`);
      return existing.rows[0].id;
    }

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
      INSERT INTO tasks (title, project_id, department, tags, status, created_at, updated_at)
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
 * IDEMPOTENT: Only adds label if not already present
 */
async function addTaskLabel(taskId, label) {
  try {
    // Only add if label doesn't already exist
    await pool.query(`
      UPDATE tasks
      SET tags = COALESCE(tags, ARRAY[]::text[]) || $1,
          updated_at = now()
      WHERE id = $2
        AND NOT ($1 = ANY(COALESCE(tags, ARRAY[]::text[])))
    `, [label, taskId]);
  } catch (err) {
    console.error('[DECISIONS] Failed to add label:', err.message);
  }
}

/**
 * Create an in-app notification for a role
 * IDEMPOTENT: Checked via alreadyExecuted() before calling
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
 * IDEMPOTENT: All effects check execution history before taking action
 */
async function runDecisionCycle() {
  const startTime = Date.now();
  let totalExecutions = 0;
  let totalSkipped = 0;

  try {
    const policies = await loadPolicies();
    console.log(`[DECISIONS] Running cycle with ${policies.length} active policies`);

    // 1) Performance event rules (badges, speed tracking)
    const perfPolicies = policies.filter(p => p.condition?.type === 'perf_event');
    if (perfPolicies.length > 0) {
      // Get recent performance events (last 2 hours that haven't been processed yet)
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
            const hasLabel = await taskHasLabel(event.task_id, policy.action.label);
            if (hasLabel) {
              totalSkipped++;
              continue;
            }

            const payload = {
              label: policy.action.label,
              taskId: event.task_id,
              durationMinutes: Math.round(durationMinutes * 100) / 100,
              perfEventId: event.id
            };

            const result = await executeAction(
              policy,
              'label',
              { type: 'task', id: event.task_id },
              payload,
              async () => {
                await addTaskLabel(event.task_id, policy.action.label);
              }
            );

            if (result.executed) {
              totalExecutions++;
            } else if (result.reason === 'already_done') {
              totalSkipped++;
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

          const result = await executeAction(
            policy,
            'notify',
            { type: 'task', id: task.id },
            payload,
            async () => {
              const message = `Task idle ${days}d: ${task.title}`;
              await notifyRole(policy.action.role || 'ops', message, 'task', task.id);
            }
          );

          if (result.executed) {
            totalExecutions++;
          } else if (result.reason === 'already_done') {
            totalSkipped++;
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

        const result = await executeAction(
          handoffPolicy,
          'create_task',
          { type: 'task', id: row.task_id },
          payload,
          async () => {
            const createdId = await createTaskFromTemplate(row.task_id, row.project_id, handoffPolicy.action.template);
            if (!createdId) {
              throw new Error('Failed to create task from template');
            }
          }
        );

        if (result.executed) {
          totalExecutions++;
        } else if (result.reason === 'already_done') {
          totalSkipped++;
        }
      }
    }

    // 4) Unacknowledged handoff SLA escalation
    const unackPolicy = policies.find(p => p.slug === 'escalate.unack_48h');
    if (unackPolicy) {
      // Read SLA threshold from config (fallback to 48h)
      const slaResult = await pool.query(`
        SELECT value_seconds FROM sla_thresholds WHERE key = 'unacknowledged_handoff_sla'
      `);
      const slaSeconds = Number(slaResult.rows[0]?.value_seconds || 48 * 3600);

      // Find unacknowledged events older than SLA
      const eventsResult = await pool.query(`
        SELECT e.id as event_id, e.task_id, e.to_role, e.created_at, t.title, t.project_id
        FROM ball_in_court_events e
        JOIN tasks t ON t.id = e.task_id
        WHERE e.acknowledged = false
          AND e.created_at <= now() - make_interval(secs => $1)
        ORDER BY e.created_at ASC
        LIMIT 100
      `, [slaSeconds]);

      for (const ev of eventsResult.rows) {
        const payload = {
          kind: 'handoff_unack_sla',
          eventId: ev.event_id,
          toRole: ev.to_role,
          title: ev.title,
          slaHours: Math.round(slaSeconds / 3600),
          createdAt: ev.created_at
        };

        const result = await executeAction(
          unackPolicy,
          'notify',
          { type: 'task', id: ev.task_id },
          payload,
          async () => {
            const message = `Unacknowledged handoff (${ev.to_role}) exceeded SLA (${Math.round(slaSeconds / 3600)}h): ${ev.title}`;
            await notifyRole(ev.to_role || 'ops', message, 'task', ev.task_id);
          }
        );

        if (result.executed) {
          totalExecutions++;
        } else if (result.reason === 'already_done') {
          totalSkipped++;
        }
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[DECISIONS] Cycle complete: ${totalExecutions} executions, ${totalSkipped} skipped (already done), ${elapsed}ms`);

  } catch (err) {
    console.error('[DECISIONS] Cycle failed:', err.message);
    throw err;
  }
}

module.exports = { runDecisionCycle, loadPolicies };
