// services/database.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

/**
 * Bootstrap database connection and ensure required extensions
 * Schema management is now handled by Drizzle (see drizzle/schema.ts)
 * Use `npm run db:push` to sync schema changes to the database
 */
async function bootstrapDatabase() {
  try {
    // Ensure PostgreSQL extensions are enabled
    await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    
    // Verify database connection with a simple query
    const result = await pool.query(`SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public'`);
    const tableCount = parseInt(result.rows[0].table_count, 10);
    
    if (tableCount === 0) {
      console.warn('⚠️  No tables found in database. Run `npm run db:push` to create schema.');
    } else {
      console.log(`✅ Database connected (${tableCount} tables found)`);
    }
  } catch (e) {
    console.error('⚠️ Database connection failed:', e.message);
    throw e;
  }
}

// Helper function to enqueue notification
async function enqueueNotification(userId, taskId, type, payload = {}) {
  try {
    await pool.query(
      `INSERT INTO public.notifications (user_id, task_id, type, payload, status, scheduled_at)
       VALUES ($1, $2, $3, $4, 'queued', now())`,
      [userId, taskId, type, JSON.stringify(payload)]
    );
  } catch (e) {
    console.error('Failed to enqueue notification:', e.message);
  }
}

// Helper function to refresh pool connections (no longer needed with Drizzle)
// Kept for backward compatibility
async function refreshPoolMetadata() {
  console.log('✅ Skipping pool metadata refresh (no longer needed with Drizzle schema management)');
}

module.exports = { pool, bootstrapDatabase, enqueueNotification, refreshPoolMetadata };
