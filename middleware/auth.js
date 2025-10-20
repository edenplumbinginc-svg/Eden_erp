// middleware/auth.js
// JWT authentication and role-based authorization middleware

const crypto = require('crypto');

// Derive a stable UUID from any string for dev mode
function deriveStableUUID(str) {
  // Check if already a valid UUID
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(str)) {
    return str.toLowerCase();
  }
  
  // Create a stable UUID from the string using SHA-256
  const hash = crypto.createHash('sha256').update(str).digest('hex');
  
  // Format as UUID v4-like structure (but deterministic)
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '4' + hash.slice(13, 16), // Version 4
    ((parseInt(hash.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + hash.slice(17, 20), // Variant
    hash.slice(20, 32)
  ].join('-');
}

// Simple dev mode authentication when JWT_SECRET not set
function authenticate(req, res, next) {
  // If JWT_SECRET not set, allow dev passthrough
  if (!process.env.JWT_SECRET) {
    // Check for X-Dev-User-* headers first (new style)
    const devUserId = req.headers['x-dev-user-id'];
    const devUserEmail = req.headers['x-dev-user-email'];
    const devUserRole = req.headers['x-dev-user-role'];
    const devUserDepartment = req.headers['x-dev-user-department'];
    
    // Fall back to X-User-* headers (existing style)
    const userId = devUserId || req.headers['x-user-id'];
    const userEmail = devUserEmail || req.headers['x-user-email'];
    const userRole = devUserRole || req.headers['x-user-role'] || 'User';
    const userDepartment = devUserDepartment || req.headers['x-user-department'];
    
    if (userId) {
      // Convert non-UUID user IDs to stable UUIDs
      const stableUserId = deriveStableUUID(userId);
      
      req.user = {
        id: stableUserId,
        email: userEmail || 'dev@example.com',
        role: userRole,
        department: userDepartment,
        originalId: userId // Keep original for reference
      };
    }
    return next();
  }

  // JWT validation would go here
  // For now, just parse Authorization header for basic JWT structure
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  // In production, would validate JWT here
  // For stub, just extract basic info if provided
  try {
    // This is a stub - in production you'd use jsonwebtoken library
    const token = authHeader.substring(7);
    // Decode token (stub implementation)
    const userId = req.headers['x-user-id'] || 'stub-user-id';
    const stableUserId = deriveStableUUID(userId);
    
    req.user = {
      id: stableUserId,
      email: req.headers['x-user-email'] || 'user@example.com',
      role: req.headers['x-user-role'] || 'User',
      department: req.headers['x-user-department'],
      originalId: userId // Keep original for reference
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Role-based authorization
function authorize(roles) {
  return (req, res, next) => {
    // In dev mode without JWT, allow all
    if (!process.env.JWT_SECRET) {
      return next();
    }

    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check if user has required role
    if (roles && roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

module.exports = { authenticate, authorize, deriveStableUUID };