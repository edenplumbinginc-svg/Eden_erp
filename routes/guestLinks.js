const express = require('express');
const router = express.Router();
const { z } = require('zod');
const crypto = require('crypto');
const { pool } = require('../services/database');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { requirePerm, hasPerm } = require('../middleware/permissions');
const { audit } = require('../utils/audit');

const CreateGuestLinkSchema = z.object({
  scope: z.enum(['task', 'project']),
  id: z.string().uuid(),
  expiresIn: z.string().regex(/^\d+(h|d)$/).default('7d')
});

function addDurationToNow(str) {
  const n = parseInt(str.slice(0, -1), 10);
  const unit = str.at(-1);
  const ms = unit === 'd' ? n * 24 * 60 * 60 * 1000 : n * 60 * 60 * 1000;
  return new Date(Date.now() + ms);
}

router.post(
  '/',
  authenticate,
  async (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        error: { code: 'UNAUTHENTICATED', message: 'Sign in required' }
      });
    }
    
    const hasCoordManage = await hasPerm(userId, 'coord:manage');
    const hasProjectsWrite = await hasPerm(userId, 'projects:write');
    
    if (!hasCoordManage && !hasProjectsWrite) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
          required: 'coord:manage OR projects:write'
        }
      });
    }
    
    next();
  },
  validate(CreateGuestLinkSchema),
  async (req, res, next) => {
    try {
      const userId = req.user?.id ?? null;
      const { scope, id: scopeId, expiresIn } = req.data;
      const token = crypto.randomUUID();
      const expiresAt = addDurationToNow(expiresIn);

      await pool.query(
        `INSERT INTO guest_links (scope, scope_id, token, expires_at, created_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [scope, scopeId, token, expiresAt.toISOString(), userId]
      );

      const base = process.env.PUBLIC_BASE_URL || process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : 'http://localhost:5000';
      const url = `${base}/guest?token=${token}`;

      await audit(userId, 'guest.invite', `${scope}:${scopeId}`, { 
        expiresIn, 
        tokenPreview: token.slice(0, 8) 
      });

      return res.status(201).json({ url, expiresAt: expiresAt.toISOString() });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
