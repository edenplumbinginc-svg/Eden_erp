// middleware/auth.js
// JWT authentication and role-based authorization middleware

const crypto = require('crypto');

const DEV = process.env.NODE_ENV !== 'production';

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

// Extract identity from dev headers (development only)
function devIdentity(req) {
  // Check for X-Dev-* headers first (preferred)
  const devEmail = req.headers['x-dev-email'] || req.headers['x-dev-user-email'];
  const devRole = req.headers['x-dev-role'] || req.headers['x-dev-user-role'];
  const devId = req.headers['x-dev-user-id'];
  
  // Fall back to X-User-* headers (legacy)
  const email = devEmail || req.headers['x-user-email'];
  const role = devRole || req.headers['x-user-role'] || 'User';
  const userId = devId || req.headers['x-user-id'];
  
  return {
    email: email || null,
    role: role,
    id: userId ? deriveStableUUID(userId) : null,
    originalId: userId
  };
}

async function verifyJwt(req) {
  const auth = req.headers.authorization || '';
  const [type, token] = auth.split(' ');
  
  if (type !== 'Bearer' || !token) {
    return null;
  }
  
  try {
    const { verifySupabaseJwt } = require('./supabaseAuth');
    const payload = await verifySupabaseJwt(token);
    
    return {
      email: payload.email,
      id: payload.sub,
      token: token,
      supabase: true
    };
  } catch (err) {
    console.error('JWT verification failed:', err.message);
    return null;
  }
}

async function requireAuth(req, res, next) {
  let user = null;

  if (DEV) {
    // Development mode: accept dev headers
    const dev = devIdentity(req);
    if (dev.email) {
      user = {
        email: dev.email,
        role: dev.role,
        id: dev.id,
        originalId: dev.originalId,
        dev: true
      };
    }
  }
  
  // Also check for Supabase JWT (works in both dev and prod)
  if (!user) {
    user = await verifyJwt(req);
  }

  if (!user) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Sign in required'
      }
    });
  }

  req.user = user;
  
  // Set Sentry user context for better error tracking
  if (user.id || user.email) {
    try {
      const Sentry = require('@sentry/node');
      Sentry.setUser({
        id: user.id,
        email: user.email,
        role: user.role
      });
    } catch (err) {
      // Sentry not initialized, skip user tagging
    }
  }
  
  next();
}

// Require specific role(s)
function requireRole(...roles) {
  return (req, res, next) => {
    const userRole = (req.user?.role || '').toLowerCase();
    const allowedRoles = roles.map(r => r.toLowerCase());
    const hasRole = allowedRoles.includes(userRole);
    
    if (!hasRole) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient role'
        }
      });
    }
    
    next();
  };
}

// Legacy authenticate function (kept for backward compatibility)
// Use requireAuth instead for new code
function authenticate(req, res, next) {
  return requireAuth(req, res, next);
}

// Legacy authorize function (kept for backward compatibility)
// Use requireRole instead for new code
function authorize(roles) {
  return requireRole(...roles);
}

module.exports = {
  requireAuth,
  requireRole,
  authenticate,  // legacy - use requireAuth
  authorize,     // legacy - use requireRole
  deriveStableUUID
};
