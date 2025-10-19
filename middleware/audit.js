// middleware/audit.js
const { pool } = require('../services/database');

// Log activity for mutations (POST, PATCH, PUT, DELETE)
async function logActivity(req, res, next) {
  // Only log mutations
  const method = req.method;
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
    return next();
  }

  // Store original send method
  const originalSend = res.send;
  const originalJson = res.json;

  // Extract entity info from URL
  const pathParts = req.path.split('/').filter(p => p);
  let entityType = null;
  let entityId = null;

  // Parse common patterns
  if (pathParts.includes('projects')) {
    entityType = 'project';
    const idx = pathParts.indexOf('projects');
    if (pathParts[idx + 1] && pathParts[idx + 1].match(/^[a-f0-9-]{36}$/)) {
      entityId = pathParts[idx + 1];
    }
  } else if (pathParts.includes('tasks')) {
    entityType = 'task';
    const idx = pathParts.indexOf('tasks');
    if (pathParts[idx + 1] && pathParts[idx + 1].match(/^[a-f0-9-]{36}$/)) {
      entityId = pathParts[idx + 1];
    }
  } else if (pathParts.includes('subtasks')) {
    entityType = 'subtask';
    const idx = pathParts.indexOf('subtasks');
    if (pathParts[idx + 1] && pathParts[idx + 1].match(/^[a-f0-9-]{36}$/)) {
      entityId = pathParts[idx + 1];
    }
  } else if (pathParts.includes('comments')) {
    entityType = 'comment';
  } else if (pathParts.includes('ball')) {
    entityType = 'ball_handoff';
  } else if (pathParts.includes('dependencies')) {
    entityType = 'dependency';
  }

  // Determine action based on method
  let action = method.toLowerCase();
  if (method === 'POST') action = 'create';
  if (method === 'PATCH' || method === 'PUT') action = 'update';
  if (method === 'DELETE') action = 'delete';

  // Override response methods to capture entity ID if created
  res.json = function(data) {
    // Capture entity ID from response if not already set
    if (!entityId && data) {
      if (data.id) entityId = data.id;
      else if (Array.isArray(data) && data[0]?.id) entityId = data[0].id;
    }

    // Log the activity
    logToDB(req, entityType, entityId, action);

    // Call original method
    return originalJson.call(this, data);
  };

  res.send = function(data) {
    // Try to parse JSON response
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      if (!entityId && parsed) {
        if (parsed.id) entityId = parsed.id;
        else if (Array.isArray(parsed) && parsed[0]?.id) entityId = parsed[0].id;
      }
    } catch (e) {
      // Not JSON, ignore
    }

    // Log the activity
    logToDB(req, entityType, entityId, action);

    // Call original method
    return originalSend.call(this, data);
  };

  next();
}

// Helper to log to database
async function logToDB(req, entityType, entityId, action) {
  if (!entityType) return;

  try {
    const actorId = req.user?.id || null;
    const ip = req.ip || req.connection?.remoteAddress || null;
    const meta = {
      method: req.method,
      path: req.path,
      body: req.body,
      query: req.query,
      params: req.params
    };

    await pool.query(
      `INSERT INTO public.activity_log (actor_id, entity_type, entity_id, action, meta, ip)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [actorId, entityType, entityId, action, meta, ip]
    );
  } catch (error) {
    console.error('Failed to log activity:', error.message);
  }
}

module.exports = { logActivity };