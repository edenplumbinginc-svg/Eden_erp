const { pool } = require('./database');
const { sendSMS, smsCapabilities } = require('../providers/sms.twilio');

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

/**
 * Send SMS notification
 * @param {Object} params
 * @param {string} params.to - Phone number (E.164 format, e.g., +1234567890)
 * @param {string} params.body - Message body
 * @param {string} params.template - Optional template name
 * @param {Object} params.data - Optional template data
 * @returns {Promise<Object>} Result with ok, sid, error fields
 */
async function sendSMSNotification({ to, body, template, data }) {
  try {
    let messageBody = body;
    
    if (!messageBody && template && data) {
      messageBody = renderSMSTemplate(template, data);
    }
    
    if (!messageBody) {
      throw new Error('Either body or (template + data) must be provided');
    }
    
    const result = await sendSMS({ to, body: messageBody });
    
    if (result.ok) {
      console.log('[SMS NOTIFICATION SENT]', {
        to,
        sid: result.sid,
        length: messageBody.length
      });
    } else {
      console.error('[SMS NOTIFICATION FAILED]', {
        to,
        error: result.error
      });
    }
    
    return result;
  } catch (error) {
    console.error('[SMS NOTIFICATION ERROR]', error.message, { to });
    return {
      ok: false,
      error: error.message
    };
  }
}

/**
 * Simple template renderer for SMS messages
 * @private
 */
function renderSMSTemplate(template, data) {
  const templates = {
    task_assigned: ({ taskTitle, projectName }) => 
      `Eden ERP: New task assigned - "${taskTitle}" in ${projectName}`,
    task_overdue: ({ taskTitle }) => 
      `Eden ERP: Task overdue - "${taskTitle}" needs attention`,
    ball_handoff: ({ taskTitle, fromName }) => 
      `Eden ERP: Ball handed to you - "${taskTitle}" from ${fromName}`,
    urgent_alert: ({ message }) => 
      `Eden ERP URGENT: ${message}`
  };
  
  const renderer = templates[template];
  if (!renderer) {
    throw new Error(`Unknown SMS template: ${template}`);
  }
  
  return renderer(data);
}

/**
 * Get provider capabilities for diagnostics
 */
function providerCapabilities() {
  return {
    sms: smsCapabilities()
  };
}

module.exports = {
  createNotification,
  getDepartmentUsers,
  sendSMSNotification,
  providerCapabilities
};
