const { db } = require('../services/database');
const { idempotency } = require('../drizzle/schema');
const { eq } = require('drizzle-orm');

const requireIdempotency = (scope) => {
  return async (req, res, next) => {
    const key = req.header('Idempotency-Key');
    
    if (!key) {
      return res.status(409).json({
        error: {
          code: 'MISSING_IDEMPOTENCY_KEY',
          message: 'Idempotency-Key header is required for this endpoint'
        }
      });
    }
    
    const scopedKey = `${scope}:${key}`;
    
    try {
      const exists = await db.query.idempotency.findFirst({
        where: eq(idempotency.key, scopedKey)
      });
      
      if (exists) {
        return res.status(201).json({
          ok: true,
          idempotent: true,
          message: 'Request already processed'
        });
      }
      
      await db.insert(idempotency).values({ key: scopedKey });
      
      next();
    } catch (error) {
      console.error('Idempotency check failed:', error);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Idempotency check failed'
        }
      });
    }
  };
};

module.exports = { requireIdempotency };
