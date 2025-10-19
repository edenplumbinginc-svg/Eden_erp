// middleware/auth.js
// JWT authentication and role-based authorization middleware

// Simple dev mode authentication when JWT_SECRET not set
function authenticate(req, res, next) {
  // If JWT_SECRET not set, allow dev passthrough
  if (!process.env.JWT_SECRET) {
    // In dev mode, optionally use header X-User-Id for testing
    const userId = req.headers['x-user-id'];
    const userEmail = req.headers['x-user-email'];
    const userRole = req.headers['x-user-role'] || 'User';
    const userDepartment = req.headers['x-user-department'];
    
    if (userId) {
      req.user = {
        id: userId,
        email: userEmail || 'dev@example.com',
        role: userRole,
        department: userDepartment
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
    req.user = {
      id: req.headers['x-user-id'] || 'stub-user-id',
      email: req.headers['x-user-email'] || 'user@example.com',
      role: req.headers['x-user-role'] || 'User',
      department: req.headers['x-user-department']
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

module.exports = { authenticate, authorize };