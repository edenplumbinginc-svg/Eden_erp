const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { loadRbacPermissions } = require('../middleware/loadRbacPermissions');
const { ensureDefaultRole } = require('../services/assignDefaultRole');
const { etagFor } = require('../lib/etag');
const { pool } = require('../services/database');
const { z } = require('zod');

const ProfilePatch = z.object({
  phone: z.string().trim().min(7).max(32).optional(),
  title: z.string().trim().max(80).optional(),
  avatar_url: z.string().url().max(512).optional(),
  timezone: z.string().trim().max(64).optional(),
  locale: z.string().trim().max(16).optional(),
  notification_prefs: z.record(z.string(), z.any()).optional(),
}).strict();

// GET /api/me/profile - Returns full profile
router.get('/me/profile', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, name, phone, title, avatar_url, timezone, locale, notification_prefs
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: "not_found" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error in /me/profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/me/profile - Updates only provided fields
router.patch('/me/profile', requireAuth, async (req, res) => {
  try {
    const data = ProfilePatch.parse(req.body || {});
    
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "no_changes" });
    }

    // Build dynamic SET clause
    const fields = Object.keys(data);
    const setClauses = fields.map((k, i) => `${k} = $${i + 1}`).join(", ");
    const values = fields.map(k => data[k]);
    values.push(req.user.id);

    const result = await pool.query(
      `UPDATE users SET ${setClauses} WHERE id = $${fields.length + 1}
       RETURNING id, email, name, phone, title, avatar_url, timezone, locale, notification_prefs`,
      values
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: "not_found" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'validation_error', details: err.errors });
    }
    console.error('Error in PATCH /me/profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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
