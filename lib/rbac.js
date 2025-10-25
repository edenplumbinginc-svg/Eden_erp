// lib/rbac.js
// RBAC middleware for ops admin endpoints

const logger = require('./logger');

const OPS_ADMIN_ROLE = process.env.OPS_ADMIN_ROLE || 'ops_admin';

function requireOpsAdmin(req, res, next) {
  const userId = req.user?.id || 'unknown';
  const userEmail = req.user?.email || 'unknown';
  const roles = req.rbac?.roles || [];
  
  if (!roles.includes(OPS_ADMIN_ROLE)) {
    logger.security('ops_admin_access_denied', 'warning', {
      user_id: userId,
      user_email: userEmail,
      required_role: OPS_ADMIN_ROLE,
      user_roles: roles,
      path: req.path,
      method: req.method,
      req_id: req.id,
    });
    
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: `Access denied. Required role: ${OPS_ADMIN_ROLE}`
      }
    });
  }
  
  logger.info({
    event: 'ops_admin_access_granted',
    user_id: userId,
    user_email: userEmail,
    role: OPS_ADMIN_ROLE,
    path: req.path,
    method: req.method,
    req_id: req.id,
  }, 'ops_admin_access');
  
  next();
}

module.exports = {
  requireOpsAdmin,
  OPS_ADMIN_ROLE
};
