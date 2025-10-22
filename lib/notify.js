// lib/notify.js
// Minimal event writer for the Notification Event Bus
const { enqueue } = require('../services/queue');

/**
 * Insert a notification event.
 * @param {import('pg').Pool|import('pg').PoolClient} db - Database pool or client
 * @param {{
 *   type: 'task_created' | 'status_changed' | 'comment_added' | 'task_assigned',
 *   projectId: string|number,
 *   taskId?: string|number,
 *   actorId?: string|number|null,
 *   actorEmail?: string|null,
 *   payload?: Record<string, any>,
 *   userId?: string|number|null
 * }} evt
 */
async function notify(db, evt) {
  const {
    type,
    projectId,
    taskId = null,
    actorId = null,
    actorEmail = null,
    payload = {},
    userId = null,
  } = evt;

  // assumes a table `notifications` exists with at least these columns:
  // id (pk), type text, project_id uuid, task_id uuid, actor_id uuid, actor_email text, payload jsonb, created_at timestamptz default now()
  // Also includes channel and event_code for compatibility with existing schema
  const sql = `
    insert into notifications (type, project_id, task_id, actor_id, actor_email, payload, channel, event_code, user_id)
    values (
      $1,
      $2::uuid,   -- project_id (explicit cast to uuid)
      $3::uuid,   -- task_id (explicit cast to uuid)  
      $4::uuid,   -- actor_id (explicit cast to uuid, NULL is ok)
      $5,         -- actor_email (text, no cast needed)
      $6::jsonb,  -- payload (explicit cast to jsonb)
      $7,         -- channel (text, no cast needed)
      $8,         -- event_code (text, no cast needed)
      $9::uuid    -- user_id (explicit cast to uuid, NULL is ok)
    )
    returning id
  `;
  // Map type to event_code for compatibility
  const eventCodeMap = {
    'task_created': 'TASK_CREATED',
    'status_changed': 'STATUS_CHANGED', 
    'comment_added': 'COMMENT_ADDED',
    'task_assigned': 'TASK_ASSIGNED'
  };
  const params = [type, projectId, taskId, actorId, actorEmail, payload, 'inapp', eventCodeMap[type] || type.toUpperCase(), userId];
  await db.query(sql, params);
  
  if (userId) {
    await enqueue("notify-user", { userId, event: type, meta: { taskId, projectId, ...payload } });
  }
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