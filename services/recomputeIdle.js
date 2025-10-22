const { DateTime } = require('luxon');
const { pool } = require('./database');

/**
 * Recompute idle reminder flags for all tasks
 * 
 * Logic:
 * - Set needs_idle_reminder = true for tasks with updated_at older than N days (default 3)
 * - Excludes done/cancelled statuses, excludes snoozed tasks
 * - Set needs_idle_reminder = false for recently updated, done, cancelled, or snoozed tasks
 * 
 * @param {string} actor - Who triggered the recompute (email or 'system' or 'cron')
 * @returns {Promise<{setTrue: number, setFalse: number}>}
 */
async function recomputeIdle(actor = 'system') {
  const now = DateTime.now().setZone('America/Toronto').toISO();
  const idleDays = parseInt(process.env.IDLE_DAYS || '3', 10);
  
  console.log(`[RecomputeIdle] Starting recompute at ${now} (actor: ${actor}, idle_days: ${idleDays})`);
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Set needs_idle_reminder = true for idle tasks (not done/cancelled, not snoozed)
    const setTrueResult = await client.query(`
      UPDATE tasks
      SET needs_idle_reminder = true
      WHERE needs_idle_reminder = false
        AND status NOT IN ('done', 'cancelled')
        AND updated_at < (NOW() - INTERVAL '${idleDays} days')
        AND (idle_snoozed_until IS NULL OR idle_snoozed_until < NOW())
        AND deleted_at IS NULL
    `);

    // Set needs_idle_reminder = false for tasks that are no longer idle
    const setFalseResult = await client.query(`
      UPDATE tasks
      SET needs_idle_reminder = false
      WHERE needs_idle_reminder = true AND (
        status IN ('done', 'cancelled')
        OR updated_at >= (NOW() - INTERVAL '${idleDays} days')
        OR (idle_snoozed_until IS NOT NULL AND idle_snoozed_until >= NOW())
        OR deleted_at IS NOT NULL
      )
    `);

    const setTrue = setTrueResult.rowCount || 0;
    const setFalse = setFalseResult.rowCount || 0;

    // Write audit log
    await client.query(`
      INSERT INTO audit_logs (user_id, action, entity, meta, created_at)
      VALUES (NULL, $1, $2, $3, NOW())
    `, [
      'system.idle.recompute',
      'system',
      JSON.stringify({ set_true: setTrue, set_false: setFalse, idle_days: idleDays, timestamp: now, actor })
    ]);

    await client.query('COMMIT');
    
    console.log(`[RecomputeIdle] Complete: ${setTrue} set to true, ${setFalse} set to false`);
    
    return { setTrue, setFalse };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[RecomputeIdle] Error:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { recomputeIdle };
