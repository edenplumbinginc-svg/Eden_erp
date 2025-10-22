const { pool } = require('../server/db');
const { audit } = require('../lib/audit');

/**
 * Auto-close parent task when all subtasks are done
 * Guard: respects status_locked to prevent auto-updates
 * 
 * Rules:
 * - All subtasks done => parent status = 'complete'
 * - Any subtask not done + parent is complete => reopen parent to 'in_progress'
 * - If parent has status_locked = true, skip all updates
 * 
 * @param {string} taskId - The parent task ID
 * @returns {Promise<void>}
 */
async function maybeAutoCloseParent(taskId) {
  if (!taskId) return;

  try {
    // Check if parent exists and is locked
    const parentRes = await pool.query(
      `SELECT id, status, COALESCE(status_locked, false) as status_locked
       FROM tasks 
       WHERE id = $1`,
      [taskId]
    );

    if (parentRes.rowCount === 0) return; // Parent doesn't exist
    const parent = parentRes.rows[0];
    
    if (parent.status_locked) {
      console.log(`[AutoClose] Task ${taskId} is locked, skipping auto-update`);
      return;
    }

    // Count total and done subtasks
    const aggRes = await pool.query(
      `SELECT 
        COUNT(*)::int as total,
        SUM(CASE WHEN done = true THEN 1 ELSE 0 END)::int as done_count
       FROM subtasks 
       WHERE task_id = $1`,
      [taskId]
    );

    const { total, done_count } = aggRes.rows[0];
    
    if (total === 0) {
      console.log(`[AutoClose] Task ${taskId} has no subtasks, skipping`);
      return; // No subtasks, nothing to auto-close
    }

    const allDone = done_count === total;
    const anyNotDone = done_count < total;

    let nextStatus = null;
    let reason = null;

    // Rule: all subtasks done => parent complete
    if (allDone && parent.status !== 'complete') {
      nextStatus = 'complete';
      reason = 'all_subtasks_done';
    }
    // Rule: any subtask not done + parent is complete => reopen parent
    else if (anyNotDone && parent.status === 'complete') {
      nextStatus = 'in_progress';
      reason = 'subtask_reopened';
    }

    if (!nextStatus) {
      console.log(`[AutoClose] Task ${taskId} status unchanged (${parent.status})`);
      return; // No change needed
    }

    // Update parent task status
    await pool.query(
      `UPDATE tasks 
       SET status = $1, updated_at = NOW() 
       WHERE id = $2`,
      [nextStatus, taskId]
    );

    console.log(`[AutoClose] Task ${taskId}: ${parent.status} → ${nextStatus} (${reason})`);

    // Write audit log
    try {
      await audit(null, 'task.autoclose', `task:${taskId}`, {
        old_status: parent.status,
        new_status: nextStatus,
        reason,
        done_count,
        total,
      });
    } catch (auditErr) {
      console.error('[AutoClose] Audit log failed:', auditErr.message);
    }

  } catch (err) {
    console.error('[AutoClose] Error:', err.message);
    // Don't throw - this is a background enhancement, shouldn't break the main flow
  }
}

module.exports = { maybeAutoCloseParent };
