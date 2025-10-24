// lib/actor.js - Extract actor information from request

/**
 * Extract actor (user) information from request
 * Supports both real auth and dev headers
 * @param {Object} req - Express request object
 * @returns {Object} Actor information { actorId, actorEmail }
 * @throws {Error} If actor information is missing
 */
function getActor(req) {
  // Prefer real auth user; fall back to dev headers if present
  const actorId = req.user?.id || req.headers['x-dev-user-id'];
  const actorEmail = req.user?.email || req.headers['x-dev-user-email'];
  
  if (!actorId) {
    throw new Error('ACTOR_MISSING');
  }
  
  return { actorId, actorEmail };
}

module.exports = { getActor };
