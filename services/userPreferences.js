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

    if (typeof tasks_group_by !== 'undefined') {
      const validOptions = ['status', 'due', 'none'];
      if (!validOptions.includes(tasks_group_by)) {
        throw new Error(`Invalid tasks_group_by: must be one of ${validOptions.join(', ')}`);
      }
    }

    const currentPrefs = await getUserPreferences(userId);
    const newDefaultProjectId = typeof default_project_id !== 'undefined' ? (default_project_id || null) : currentPrefs.default_project_id;
    const newTasksGroupBy = typeof tasks_group_by !== 'undefined' ? tasks_group_by : currentPrefs.tasks_group_by;

    await client.query(
      `INSERT INTO user_preferences (user_id, default_project_id, tasks_group_by, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         default_project_id = EXCLUDED.default_project_id,
         tasks_group_by = EXCLUDED.tasks_group_by,
         updated_at = EXCLUDED.updated_at`,
      [userId, newDefaultProjectId, newTasksGroupBy]
    );

    await client.query(
      `INSERT INTO audit_logs (actor_id, actor_email, action, target_type, target_id, payload, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        userId,
        actorEmail,
        'user.preferences.update',
        'user',
        userId,
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
