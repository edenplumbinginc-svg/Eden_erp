const { DateTime } = require('luxon');
const pool = require('../db/pool');

/**
 * Recompute overdue flags for all tasks
 * 
 * Logic:
 * - Set is_overdue = true for tasks with due_at in the past (not done/cancelled, not snoozed)
 * - Set is_overdue = false for tasks that are done, cancelled, or no longer overdue
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

    // Set is_overdue = true for past-due tasks (not done, not snoozed)
    const setTrueResult = await client.query(`
      UPDATE tasks
      SET is_overdue = true
      WHERE is_overdue = false
        AND due_at IS NOT NULL
        AND status NOT IN ('done')
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
        OR status IN ('done')
        OR due_at >= $1::timestamptz
        OR (overdue_snoozed_until IS NOT NULL AND overdue_snoozed_until >= NOW())
        OR deleted_at IS NOT NULL
      )
    `, [now]);

    const setTrue = setTrueResult.rowCount || 0;
    const setFalse = setFalseResult.rowCount || 0;

    // Write audit log
    await client.query(`
      INSERT INTO audit_logs (actor_email, action, details, created_at)
      VALUES ($1, $2, $3, NOW())
    `, [
      actor,
      'system.overdue.recompute',
      JSON.stringify({ set_true: setTrue, set_false: setFalse, timestamp: now })
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
