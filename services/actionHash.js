// services/actionHash.js - Deterministic action hash for idempotency
// Generates stable SHA-256 hash from policy + effect + target + payload
// Used to prevent duplicate executions of the same action

const crypto = require('crypto');

/**
 * Generate a stable hash for an action to enable idempotent execution
 * Same inputs always produce the same hash, preventing duplicates
 * 
 * @param {Object} input - Action parameters
 * @param {string} input.policySlug - Policy identifier (e.g., "auto-handoff-estimation")
 * @param {string} input.effect - Effect type (e.g., "create_task", "notify", "label")
 * @param {string} [input.targetType] - Target type (e.g., "task", "user", "project")
 * @param {string} [input.targetId] - Target identifier (UUID or other ID)
 * @param {Object} input.payload - Full action payload (canonicalized)
 * @returns {string} - 64-character hex SHA-256 hash
 */
function actionHash(input) {
  // Canonicalize to prevent key-order flukes and null/undefined differences
  const canonical = JSON.stringify({
    policy: input.policySlug || '',
    effect: input.effect || '',
    target_type: input.targetType || null,
    target_id: input.targetId || null,
    // Sort object keys to ensure stable serialization
    payload: sortObjectKeys(input.payload || {})
  });

  return crypto
    .createHash('sha256')
    .update(canonical, 'utf8')
    .digest('hex');
}

/**
 * Recursively sort object keys for stable JSON serialization
 * Handles nested objects and arrays
 */
function sortObjectKeys(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }

  const sorted = {};
  Object.keys(obj)
    .sort()
    .forEach(key => {
      sorted[key] = sortObjectKeys(obj[key]);
    });

  return sorted;
}

module.exports = { actionHash };
