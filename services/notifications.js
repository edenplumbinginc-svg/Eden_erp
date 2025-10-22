const { pool } = require('./database');

/**
 * Create an in-app notification
 * @param {Object} params
 * @param {string} params.userId - UUID of user to notify
 * @param {string} params.type - Notification type (ball_handoff, comment_added, status_changed, etc.)
 * @param {string} params.taskId - UUID of related task
 * @param {string} params.projectId - UUID of related project
 * @param {string} params.actorId - UUID of user who triggered the notification (optional)
 * @param {string} params.actorEmail - Email of user who triggered the notification (optional)
 * @param {Object} params.payload - Additional data for the notification
 * @returns {Promise<Object>} Created notification
 */
async function createNotification({ userId, type, taskId, projectId, actorId, actorEmail, payload = {} }) {
  try {
    if (!userId) throw new Error('userId is required');
    if (!type) throw new Error('type is required');

    const result = await pool.query(
      `INSERT INTO notifications 
        (user_id, channel, event_code, type, task_id, project_id, actor_id, actor_email, payload, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING *`,
      [userId, 'in_app', type, type, taskId || null, projectId || null, actorId || null, actorEmail || null, JSON.stringify(payload)]
    );

    console.log('[NOTIFICATION CREATED]', {
      id: result.rows[0].id,
      type,
      userId,
      taskId,
      actorEmail
    });

    return result.rows[0];
  } catch (error) {
    console.error('[NOTIFICATION ERROR]', error.message, { userId, type, taskId });
    throw error;
  }
}

/**
 * Get all users in a specific department
 * @param {string} department - Department name
 * @returns {Promise<Array>} Array of user objects with id, email, name
 */
async function getDepartmentUsers(department) {
  try {
    if (!department) throw new Error('department is required');

    const { rows } = await pool.query(
      'SELECT id, email, name FROM users WHERE department = $1',
      [department]
    );

    console.log(`[GET DEPARTMENT USERS] ${department}: ${rows.length} users found`);
    return rows;
  } catch (error) {
    console.error('[GET DEPARTMENT USERS ERROR]', error.message, { department });
    throw error;
  }
}

module.exports = {
  createNotification,
  getDepartmentUsers
};
