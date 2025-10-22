const { pool } = require('./database');

async function getUserPreferences(userId) {
  const { rows } = await pool.query(
    `SELECT user_id, default_project_id, tasks_group_by, updated_at
     FROM user_preferences WHERE user_id = $1`,
    [userId]
  );
  
  if (rows.length === 0) {
    return {
      user_id: userId,
      default_project_id: null,
      tasks_group_by: 'status',
      updated_at: null
    };
  }
  
  return rows[0];
}

async function updateUserPreferences(userId, { default_project_id, tasks_group_by }, actorEmail = 'system') {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const sets = [];
    const vals = [userId];
    let paramIndex = 2;

    if (typeof default_project_id !== 'undefined') {
      sets.push(`default_project_id = $${paramIndex++}`);
      vals.push(default_project_id || null);
    }
    
    if (typeof tasks_group_by !== 'undefined') {
      const validOptions = ['status', 'due', 'none'];
      if (!validOptions.includes(tasks_group_by)) {
        throw new Error(`Invalid tasks_group_by: must be one of ${validOptions.join(', ')}`);
      }
      sets.push(`tasks_group_by = $${paramIndex++}`);
      vals.push(tasks_group_by);
    }

    if (sets.length === 0) {
      await client.query('ROLLBACK');
      return getUserPreferences(userId);
    }

    sets.push(`updated_at = NOW()`);

    const defaultProjectId = typeof default_project_id === 'undefined' ? null : (default_project_id || null);
    const tasksGroupBy = typeof tasks_group_by === 'undefined' ? 'status' : tasks_group_by;

    await client.query(
      `INSERT INTO user_preferences (user_id, default_project_id, tasks_group_by, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id) DO UPDATE SET ${sets.join(', ')}`,
      [userId, defaultProjectId, tasksGroupBy]
    );

    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, meta, created_at)
       VALUES (NULL, $1, $2, $3, NOW())`,
      [
        'user.preferences.update',
        `user:${userId}`,
        JSON.stringify({ userId, default_project_id, tasks_group_by, actor: actorEmail })
      ]
    );

    await client.query('COMMIT');
    return getUserPreferences(userId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { getUserPreferences, updateUserPreferences };
