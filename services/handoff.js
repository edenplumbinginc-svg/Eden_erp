const { pool } = require('./database');

/**
 * Perform a department handoff with a 24h duplicate guard per (task_id, to_department).
 * - If the last event to the same to_department is <24h ago, no-op (returns {skipped:true}).
 * - Otherwise:
 *    * Insert into handoff_events
 *    * Update tasks.department = to_department
 *    * Write audit entry 'task.handoff'
 *
 * @param {Object} params
 * @param {string} params.taskId - UUID of the task
 * @param {string} params.toDepartment - Destination department
 * @param {string} params.actorEmail - Email of user performing handoff
 * @returns {Promise<Object>} { ok, skipped, fromDepartment, toDepartment }
 */
async function handoffTask({ taskId, toDepartment, actorEmail }) {
  if (!taskId) throw new Error('taskId required');
  if (!toDepartment) throw new Error('to_department required');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch current department (for audit)
    const t = await client.query('SELECT department FROM tasks WHERE id = $1 FOR UPDATE', [taskId]);
    if (t.rowCount === 0) throw new Error('task not found');
    const fromDepartment = t.rows[0].department || null;

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
      `INSERT INTO handoff_events (task_id, from_department, to_department, actor_email)
       VALUES ($1, $2, $3, $4)`,
      [taskId, fromDepartment, toDepartment, actorEmail || 'system']
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
        JSON.stringify({ taskId, fromDepartment, toDepartment, actorEmail })
      ]
    );

    await client.query('COMMIT');
    return { ok: true, skipped: false, fromDepartment, toDepartment };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { handoffTask };
