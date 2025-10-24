// routes/admin.js - RBAC admin endpoints for role management
const express = require('express');
const { requirePerm } = require('../middleware/permissions');
const { pool } = require('../services/database');

const router = express.Router();

// Helper function to validate user exists
async function validateUserExists(userId) {
  const result = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
  return result.rows.length > 0;
}

// Assign role to user
// POST /api/admin/users/:userId/roles/:roleSlug
router.post('/users/:userId/roles/:roleSlug', requirePerm('admin:manage'), async (req, res) => {
  try {
    const { userId, roleSlug } = req.params;

    // Validate user exists
    const userExists = await validateUserExists(userId);
    if (!userExists) {
      return res.status(404).json({ 
        error: { 
          code: 'USER_NOT_FOUND', 
          message: `User '${userId}' not found` 
        } 
      });
    }

    // Find role by slug
    const roleResult = await pool.query(
      'SELECT id, slug, name FROM roles WHERE slug = $1',
      [roleSlug]
    );

    if (roleResult.rows.length === 0) {
      return res.status(404).json({ 
        error: { 
          code: 'ROLE_NOT_FOUND', 
          message: `Role '${roleSlug}' not found` 
        } 
      });
    }

    const role = roleResult.rows[0];

    // Insert user_role (with ON CONFLICT DO NOTHING to handle duplicates)
    await pool.query(
      `INSERT INTO user_roles (user_id, role_id) 
       VALUES ($1, $2) 
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [userId, role.id]
    );

    // Log the action for audit trail
    console.log(`[RBAC] Role assigned: user=${userId} role=${roleSlug} by=${req.user?.email || req.user?.id}`);

    return res.status(204).end();
  } catch (error) {
    console.error('[RBAC] Error assigning role:', error);
    return res.status(500).json({ 
      error: { 
        code: 'INTERNAL_ERROR', 
        message: 'Failed to assign role' 
      } 
    });
  }
});

// Remove role from user
// DELETE /api/admin/users/:userId/roles/:roleSlug
router.delete('/users/:userId/roles/:roleSlug', requirePerm('admin:manage'), async (req, res) => {
  try {
    const { userId, roleSlug } = req.params;

    // Validate user exists
    const userExists = await validateUserExists(userId);
    if (!userExists) {
      return res.status(404).json({ 
        error: { 
          code: 'USER_NOT_FOUND', 
          message: `User '${userId}' not found` 
        } 
      });
    }

    // Find role by slug
    const roleResult = await pool.query(
      'SELECT id, slug, name FROM roles WHERE slug = $1',
      [roleSlug]
    );

    if (roleResult.rows.length === 0) {
      return res.status(404).json({ 
        error: { 
          code: 'ROLE_NOT_FOUND', 
          message: `Role '${roleSlug}' not found` 
        } 
      });
    }

    const role = roleResult.rows[0];

    // Delete user_role
    const deleteResult = await pool.query(
      'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2',
      [userId, role.id]
    );

    // Log the action for audit trail
    console.log(`[RBAC] Role removed: user=${userId} role=${roleSlug} by=${req.user?.email || req.user?.id} affected=${deleteResult.rowCount}`);

    return res.status(204).end();
  } catch (error) {
    console.error('[RBAC] Error removing role:', error);
    return res.status(500).json({ 
      error: { 
        code: 'INTERNAL_ERROR', 
        message: 'Failed to remove role' 
      } 
    });
  }
});

// List all roles (for UI dropdown/selection)
// GET /api/admin/roles
router.get('/roles', requirePerm('admin:manage'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, slug, name, created_at FROM roles ORDER BY name'
    );
    
    return res.json({ roles: result.rows });
  } catch (error) {
    console.error('[RBAC] Error fetching roles:', error);
    return res.status(500).json({ 
      error: { 
        code: 'INTERNAL_ERROR', 
        message: 'Failed to fetch roles' 
      } 
    });
  }
});

// Get user's roles (for verification/debugging)
// GET /api/admin/users/:userId/roles
router.get('/users/:userId/roles', requirePerm('admin:manage'), async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate user exists
    const userExists = await validateUserExists(userId);
    if (!userExists) {
      return res.status(404).json({ 
        error: { 
          code: 'USER_NOT_FOUND', 
          message: `User '${userId}' not found` 
        } 
      });
    }

    const result = await pool.query(
      `SELECT r.id, r.slug, r.name, r.created_at
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1
       ORDER BY r.name`,
      [userId]
    );

    return res.json({ 
      user_id: userId,
      roles: result.rows 
    });
  } catch (error) {
    console.error('[RBAC] Error fetching user roles:', error);
    return res.status(500).json({ 
      error: { 
        code: 'INTERNAL_ERROR', 
        message: 'Failed to fetch user roles' 
      } 
    });
  }
});

module.exports = router;
