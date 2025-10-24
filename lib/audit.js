// lib/audit.js - Audit log writer utility

const { pool } = require('../services/database');

/**
 * Write an audit log entry for compliance and governance tracking
 * @param {Object} entry - Audit entry data
 * @param {string} entry.actorId - UUID of the user performing the action
 * @param {string} [entry.actorEmail] - Email of the actor (for readability)
 * @param {string} entry.action - Action code (e.g., 'rbac.role.assign', 'task.create')
 * @param {string} entry.targetType - Type of target ('user', 'task', 'project', 'role')
 * @param {string} [entry.targetId] - UUID or slug of the target
 * @param {Object} [entry.payload] - Additional context or diff
 */
async function writeAudit(entry) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (actor_id, actor_email, action, target_type, target_id, payload)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        entry.actorId,
        entry.actorEmail || null,
        entry.action,
        entry.targetType,
        entry.targetId || null,
        JSON.stringify(entry.payload || {})
      ]
    );
  } catch (error) {
    console.error('[AUDIT] Failed to write audit log:', error);
  }
}

module.exports = { writeAudit };
