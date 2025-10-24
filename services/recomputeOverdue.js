const { DateTime } = require('luxon');
const { pool } = require('./database');

/**
 * Recompute overdue flags for all tasks
 * 
 * Logic:
 * - Set is_overdue = true for tasks with due_at in the past (excludes done/cancelled statuses, excludes snoozed tasks)
 * - Set is_overdue = false for tasks that are done, cancelled, deleted, or no longer overdue
 * 
 * @param {string} actor - Who triggered the recompute (email or 'system' or 'cron')
 * @returns {Promise<{setTrue: number, setFalse: number}>}
 */
async function recomputeOverdue(actor = 'system') {
  const now = DateTime.now().setZone('America/Toronto').toISO();
  
  console.log(`[RecomputeOverdue] Starting recompute at ${now} (actor: ${actor})`);
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Set is_overdue = true for past-due tasks (not done/cancelled, not snoozed)
    const setTrueResult = await client.query(`
      UPDATE tasks
      SET is_overdue = true
      WHERE is_overdue = false
        AND due_at IS NOT NULL
        AND status NOT IN ('done', 'cancelled')
        AND due_at < $1::timestamptz
        AND (overdue_snoozed_until IS NULL OR overdue_snoozed_until < NOW())
        AND deleted_at IS NULL
    `, [now]);

    // Set is_overdue = false for tasks that are no longer overdue
    const setFalseResult = await client.query(`
      UPDATE tasks
      SET is_overdue = false
      WHERE is_overdue = true AND (
        due_at IS NULL
        OR status IN ('done', 'cancelled')
        OR due_at >= $1::timestamptz
        OR (overdue_snoozed_until IS NOT NULL AND overdue_snoozed_until >= NOW())
        OR deleted_at IS NOT NULL
      )
    `, [now]);

    const setTrue = setTrueResult.rowCount || 0;
    const setFalse = setFalseResult.rowCount || 0;

    // Write audit log
    await client.query(`
      INSERT INTO audit_logs (actor_id, actor_email, action, target_type, target_id, payload, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      '00000000-0000-0000-0000-000000000001',
      actor,
      'system.overdue.recompute',
      'system',
      null,
      JSON.stringify({ set_true: setTrue, set_false: setFalse, timestamp: now, actor })
    ]);

    await client.query('COMMIT');
    
    console.log(`[RecomputeOverdue] Complete: ${setTrue} set to true, ${setFalse} set to false`);
    
    return { setTrue, setFalse };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[RecomputeOverdue] Error:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { recomputeOverdue };
