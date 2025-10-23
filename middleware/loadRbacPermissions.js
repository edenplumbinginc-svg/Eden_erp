const { storage } = require('../server/storage');

async function loadRbacPermissions(req, res, next) {
  if (!req.user?.id) {
    return next();
  }

  try {
    const userId = req.user.id;
    
    const userRoles = await storage.query(
      `SELECT role_id FROM user_roles WHERE user_id = $1`,
      [userId]
    );
    
    const roleIds = userRoles.rows.map(r => r.role_id);
    
    if (roleIds.length === 0) {
      req.rbac = { permissions: new Set(), roles: [] };
      return next();
    }
    
    const roleData = await storage.query(
      `SELECT slug FROM roles WHERE id = ANY($1::uuid[])`,
      [roleIds]
    );
    const roleSlugs = roleData.rows.map(r => r.slug);
    
    const permData = await storage.query(
      `SELECT DISTINCT p.code 
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = ANY($1::uuid[])`,
      [roleIds]
    );
    
    const permissions = new Set(permData.rows.map(p => p.code));
    
    req.rbac = {
      permissions,
      roles: roleSlugs,
      roleIds
    };
    
  } catch (err) {
    console.error('Failed to load RBAC permissions:', err);
    req.rbac = { permissions: new Set(), roles: [] };
  }
  
  next();
}

function requirePerm(permissionCode) {
  return (req, res, next) => {
    if (!req.rbac?.permissions?.has(permissionCode)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Missing required permission: ${permissionCode}`
        }
      });
    }
    next();
  };
}

module.exports = {
  loadRbacPermissions,
  requirePerm
};
