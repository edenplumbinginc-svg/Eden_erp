const { pool } = require('../services/database');

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
      const checkResult = await pool.query(
        'SELECT key FROM idempotency WHERE key = $1',
        [scopedKey]
      );
      
      if (checkResult.rows.length > 0) {
        return res.status(201).json({
          ok: true,
          idempotent: true,
          message: 'Request already processed'
        });
      }
      
      await pool.query(
        'INSERT INTO idempotency (key) VALUES ($1)',
        [scopedKey]
      );
      
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
