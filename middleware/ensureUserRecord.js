// middleware/ensureUserRecord.js
// Automatically create/update user record in local database after JWT verification

const { pool } = require('../services/database');

async function ensureUserRecord(req, res, next) {
  if (!req.user?.id || !req.user?.email) {
    return next();
  }

  try {
    // Check if user exists in local database
    const existing = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [req.user.id]
    );

    if (existing.rows.length === 0) {
      // Create user record from Supabase JWT payload
      await pool.query(
        `INSERT INTO users (id, email, name, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (id) DO NOTHING`,
        [req.user.id, req.user.email, req.user.email]
      );
      
      console.log(`[Auth] Created user record for ${req.user.email}`);
    }
    
    next();
  } catch (error) {
    console.error('Failed to ensure user record:', error);
    // Don't block the request - continue anyway
    next();
  }
}

module.exports = { ensureUserRecord };
