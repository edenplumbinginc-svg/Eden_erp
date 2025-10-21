const { db } = require('../services/database');
const { auditLogs } = require('../drizzle/schema');

async function audit(userId, action, entity, meta = {}) {
  try {
    await db.insert(auditLogs).values({
      userId: userId || null,
      action,
      entity,
      meta
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

module.exports = { audit };
