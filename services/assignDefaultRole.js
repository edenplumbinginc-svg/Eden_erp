const { pool } = require('./database');

async function ensureDefaultRole(userId) {
  try {
    // Find viewer role
    const viewerResult = await pool.query(
      `SELECT id FROM roles WHERE slug = $1`,
      ['viewer']
    );
    
    if (viewerResult.rows.length === 0) {
      console.warn('Viewer role not found in database');
      return;
    }
    
    const viewerId = viewerResult.rows[0].id;
    
    // Insert user role (using ON CONFLICT DO NOTHING to handle duplicates)
    await pool.query(
      `INSERT INTO user_roles (user_id, role_id) 
       VALUES ($1, $2)
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [userId, viewerId]
    );
    
    console.log(`Assigned viewer role to user ${userId}`);
  } catch (error) {
    console.error('Error assigning default role:', error);
    throw error;
  }
}

module.exports = { ensureDefaultRole };
