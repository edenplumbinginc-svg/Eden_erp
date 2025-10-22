const { pool } = require('./database');
const { createNotification, getDepartmentUsers } = require('./notifications');

/**
 * Perform a department handoff with a 24h duplicate guard per (task_id, to_department).
 * - If the last event to the same to_department is <24h ago, no-op (returns {skipped:true}).
 * - Otherwise:
 *    * Insert into handoff_events
 *    * Update tasks.department = to_department
 *    * Write audit entry 'task.handoff'
 *    * Create notifications for all users in the target department
 *
 * @param {Object} params
 * @param {string} params.taskId - UUID of the task
 * @param {string} params.toDepartment - Destination department
 * @param {string} params.actorEmail - Email of user performing handoff
 * @param {string} params.note - Optional note for the handoff
 * @returns {Promise<Object>} { ok, skipped, fromDepartment, toDepartment }
 */
async function handoffTask({ taskId, toDepartment, actorEmail, note }) {
  if (!taskId) throw new Error('taskId required');
  if (!toDepartment) throw new Error('to_department required');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch current department and task details (for audit and notifications)
    const t = await client.query('SELECT department, title, project_id FROM tasks WHERE id = $1 FOR UPDATE', [taskId]);
    if (t.rowCount === 0) throw new Error('task not found');
    const task = t.rows[0];
    const fromDepartment = task.department || null;

    // Duplicate-fire guard (24h)
    const dup = await client.query(
      `SELECT 1
       FROM handoff_events
       WHERE task_id = $1 AND to_department = $2
         AND created_at >= NOW() - INTERVAL '24 hours'
       LIMIT 1`,
      [taskId, toDepartment]
    );
    
    if (dup.rowCount > 0) {
      // Log skipped handoff to audit
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, meta, created_at)
         VALUES (NULL, $1, $2, $3, NOW())`,
        [
          'task.handoff.skipped',
          `task:${taskId}`,
          JSON.stringify({ taskId, fromDepartment, toDepartment, reason: 'duplicate_24h', actorEmail })
        ]
      );
      await client.query('COMMIT');
      return { ok: true, skipped: true, reason: 'duplicate_24h' };
    }

    // Insert handoff event
    await client.query(
      `INSERT INTO handoff_events (task_id, from_department, to_department, actor_email, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [taskId, fromDepartment, toDepartment, actorEmail || 'system', note || null]
    );

    // Update task department
    await client.query(
      `UPDATE tasks SET department = $2, updated_at = NOW() WHERE id = $1`,
      [taskId, toDepartment]
    );

    // Audit
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, meta, created_at)
       VALUES (NULL, $1, $2, $3, NOW())`,
      [
        'task.handoff',
        `task:${taskId}`,
        JSON.stringify({ taskId, fromDepartment, toDepartment, actorEmail, note })
      ]
    );

    await client.query('COMMIT');

    // Create notifications for all users in the target department (after commit)
    try {
      const departmentUsers = await getDepartmentUsers(toDepartment);
      console.log(`[HANDOFF] Notifying ${departmentUsers.length} users in ${toDepartment} department`);
      
      for (const user of departmentUsers) {
        await createNotification({
          userId: user.id,
          type: 'ball_handoff',
          taskId: taskId,
          projectId: task.project_id,
          actorEmail: actorEmail,
          payload: {
            title: task.title,
            fromDepartment,
            toDepartment,
            note: note || null
          }
        });
      }
    } catch (notifError) {
      console.error('[HANDOFF] Failed to create notifications:', notifError.message);
    }

    return { ok: true, skipped: false, fromDepartment, toDepartment };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { handoffTask };
