const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { loadRbacPermissions } = require('../middleware/loadRbacPermissions');
const { ensureDefaultRole } = require('../services/assignDefaultRole');
const { etagFor } = require('../lib/etag');

router.get('/me/permissions', requireAuth, loadRbacPermissions, async (req, res) => {
  try {
    let { roles = [], permissions = new Set() } = req.rbac || {};
    
    // Auto-assign viewer role if user has no roles
    if (roles.length === 0) {
      await ensureDefaultRole(req.user.id);
      // Reload permissions after assignment
      const { loadRbacPermissions: reloadPerms } = require('../middleware/loadRbacPermissions');
      await new Promise((resolve, reject) => {
        reloadPerms(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      roles = req.rbac?.roles || [];
      permissions = req.rbac?.permissions || new Set();
    }
    
    const payload = {
      userId: req.user.id,
      email: req.user.email,
      roles,
      permissions: Array.from(permissions)
    };
    
    const tag = etagFor(payload);
    res.setHeader('ETag', tag);
    
    const clientTag = req.headers['if-none-match'];
    if (clientTag === tag) {
      return res.status(304).end();
    }
    
    res.json(payload);
  } catch (err) {
    console.error('Error in /me/permissions:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    res.json({
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      dev: req.user.dev || false
    });
  } catch (err) {
    console.error('Error in /me:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
