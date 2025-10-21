const { pool } = require('../services/database');

async function audit(userId, action, entity, meta = {}) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity, meta) VALUES ($1, $2, $3, $4)`,
      [userId || null, action, entity, JSON.stringify(meta)]
    );
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

module.exports = { audit };
