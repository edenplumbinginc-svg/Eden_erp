// lib/notify.js
// Minimal event writer for the Notification Event Bus

/**
 * Insert a notification event.
 * @param {import('pg').Pool} pool
 * @param {{
 *   type: 'task_created' | 'status_changed' | 'comment_added',
 *   projectId: string|number,
 *   taskId?: string|number,
 *   actorId?: string|number|null,
 *   actorEmail?: string|null,
 *   payload?: Record<string, any>
 * }} evt
 */
async function notify(pool, evt) {
  const {
    type,
    projectId,
    taskId = null,
    actorId = null,
    actorEmail = null,
    payload = {},
  } = evt;

  // assumes a table `notifications` exists with at least these columns:
  // id (pk), type text, project_id, task_id, actor_id, actor_email, payload jsonb, created_at timestamptz default now()
  // Also includes channel and event_code for compatibility with existing schema
  const sql = `
    insert into notifications (type, project_id, task_id, actor_id, actor_email, payload, channel, event_code)
    values ($1, $2, $3, $4, $5, $6, $7, $8)
    returning id
  `;
  // Map type to event_code for compatibility
  const eventCodeMap = {
    'task_created': 'TASK_CREATED',
    'status_changed': 'STATUS_CHANGED', 
    'comment_added': 'COMMENT_ADDED'
  };
  const params = [type, projectId, taskId, actorId, actorEmail, payload, 'system', eventCodeMap[type] || type.toUpperCase()];
  await pool.query(sql, params);
}

/** Extract dev identity from headers (header names are case-insensitive) */
function actorFromHeaders(req) {
  const h = req.headers;
  // Adjust these keys only if your backend expects different header names
  const email =
    h['x-dev-email'] ||
    h['x-dev-user'] ||
    h['x-user-email'] ||
    null;

  const role =
    h['x-dev-role'] ||
    h['x-user-role'] ||
    null;

  return {
    actorEmail: Array.isArray(email) ? email[0] : email || null,
    actorRole: Array.isArray(role) ? role[0] : role || null,
  };
}

module.exports = { notify, actorFromHeaders };