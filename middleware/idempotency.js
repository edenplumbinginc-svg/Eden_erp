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
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        const checkResult = await client.query(
          'SELECT key FROM idempotency WHERE key = $1 FOR UPDATE',
          [scopedKey]
        );
        
        if (checkResult.rows.length > 0) {
          await client.query('COMMIT');
          return res.status(201).json({
            ok: true,
            idempotent: true,
            message: 'Request already processed'
          });
        }
        
        await client.query(
          'INSERT INTO idempotency (key) VALUES ($1)',
          [scopedKey]
        );
        
        await client.query('COMMIT');
        
        next();
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      if (error.code === '23505') {
        return res.status(201).json({
          ok: true,
          idempotent: true,
          message: 'Request already processed'
        });
      }
      
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
