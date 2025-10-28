// middleware/permissions.js
// RBAC permission enforcement middleware

const { pool } = require('../services/database');

/**
 * Fetch all permission codes for a given user ID
 * @param {string} userId - User UUID
 * @returns {Promise<string[]>} Array of permission codes (e.g., ["projects:read", "projects:write"])
 * @throws {Error} If database query fails
 */
async function getUserPermissions(userId) {
  const result = await pool.query(`
    SELECT DISTINCT p.code
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = $1
  `, [userId]);
  
  return result.rows.map(row => row.code);
}

/**
 * Express middleware factory to require a specific permission
 * @param {string} permissionCode - Permission code (e.g., "projects:read")
 * @returns {Function} Express middleware
 */
function requirePerm(permissionCode) {
  return async (req, res, next) => {
    try {
      // User must be authenticated first (handled by requireAuth middleware)
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Sign in required'
          }
        });
      }

      // Fetch user's permissions
      const permissions = await getUserPermissions(userId);
      
      // Attach permissions to req.user for use in route handlers (defense-in-depth)
      req.user.permissions = permissions;
      
      // Admin fast-path: users with admin:manage get automatic access
      const hasAdminAccess = permissions.includes('admin:manage');
      const hasRequiredPermission = permissions.includes(permissionCode);
      
      if (hasRequiredPermission || hasAdminAccess) {
        // User has the required permission or is an admin
        return next();
      }

      // User lacks the required permission
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
          required: permissionCode
        }
      });
      
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Permission check failed'
        }
      });
    }
  };
}

/**
 * Check if a user has a specific permission (for use in route logic)
 * @param {string} userId - User UUID
 * @param {string} permissionCode - Permission code
 * @returns {Promise<boolean>}
 */
async function hasPerm(userId, permissionCode) {
  const permissions = await getUserPermissions(userId);
  return permissions.includes(permissionCode) || permissions.includes('admin:manage');
}

module.exports = {
  getUserPermissions,
  requirePerm,
  hasPerm
};
