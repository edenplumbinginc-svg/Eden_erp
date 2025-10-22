const { pool } = require('../lib/db');

/**
 * Performance leaderboard over last N days by assignee_id.
 * Counts tasks with status='done' and updated_at within the time window.
 * 
 * @param {Object} options
 * @param {number} options.days - Number of days to look back (default: 7)
 * @returns {Promise<Array>} Array of { assignee_id, done_count } ordered by done_count DESC
 */
async function performanceSummary({ days = 7 }) {
  const d = Number.isFinite(+days) && +days > 0 ? Math.floor(+days) : 7;
  
  const { rows } = await pool.query(
    `
    SELECT
      t.assignee_id,
      COUNT(*)::int AS done_count
    FROM tasks t
    WHERE t.status = 'done'
      AND t.updated_at >= NOW() - ($1 || ' days')::interval
      AND t.deleted_at IS NULL
    GROUP BY t.assignee_id
    ORDER BY done_count DESC NULLS LAST
    `,
    [String(d)]
  );
  
  return rows;
}

module.exports = { performanceSummary };
