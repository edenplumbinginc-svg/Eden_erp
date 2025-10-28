const { pool } = require('../services/database');

async function audit(userId, action, entity, meta = {}) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, target_type, target_id, payload) VALUES ($1, $2, $3, $4, $5)`,
      [userId || null, action, entity || 'unknown', meta.targetId || null, JSON.stringify(meta)]
    );
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

module.exports = { audit };
