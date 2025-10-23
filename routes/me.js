const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { loadRbacPermissions } = require('../middleware/loadRbacPermissions');

router.get('/me/permissions', requireAuth, loadRbacPermissions, async (req, res) => {
  try {
    const { roles = [], permissions = new Set() } = req.rbac || {};
    
    res.json({
      userId: req.user.id,
      email: req.user.email,
      roles,
      permissions: Array.from(permissions)
    });
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
