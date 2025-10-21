// services/database.js
const { Pool } = require('pg');
const { instrumentPool } = require('../lib/db-wrapper');

// Toggle secure → permissive SSL via environment flag
// Set DB_SSL_REJECT_UNAUTHORIZED=false to allow self-signed certs (for Replit/Supabase)
const allowInsecure = String(process.env.DB_SSL_REJECT_UNAUTHORIZED || '').toLowerCase() === 'false';
const ssl = allowInsecure ? { rejectUnauthorized: false } : { rejectUnauthorized: true };

// Strip sslmode from connection string if present (it would override our ssl config)
const connectionString = (process.env.DATABASE_URL || '').replace(/[?&]sslmode=[^&]+/, '');

console.log(`🔧 SSL Config: DB_SSL_REJECT_UNAUTHORIZED=${process.env.DB_SSL_REJECT_UNAUTHORIZED}, allowInsecure=${allowInsecure}, rejectUnauthorized=${ssl.rejectUnauthorized}`);
console.log(`🔧 Connection String (masked): ${connectionString.replace(/:([^:@]+)@/, ':***@').substring(0, 120)}`);

const rawPool = new Pool({
  connectionString,
  ssl
});

// Wrap pool with metrics and logging instrumentation
const pool = instrumentPool(rawPool);

/**
 * Bootstrap database connection and ensure required extensions
 * Schema management is now handled by Drizzle (see drizzle/schema.ts)
 * Use `npm run db:push` to sync schema changes to the database
 * 
 * Now includes retry/backoff logic for resilient startup
 */
async function bootstrapDatabase() {
  const { waitForDb } = require('./db-diagnostics');
  
  try {
    // Wait for database with retry/backoff (max 5 attempts)
    const connectionResult = await waitForDb(5);
    
    if (!connectionResult.connected) {
      console.error('⚠️ Database connection failed after retries');
      return { connected: false, error: 'Connection failed after retries', degraded: true };
    }
    
    // Ensure PostgreSQL extensions are enabled
    await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    
    // Verify database connection with a simple query
    const result = await pool.query(`SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public'`);
    const tableCount = parseInt(result.rows[0].table_count, 10);
    
    if (tableCount === 0) {
      console.warn('⚠️  No tables found in database. Run `npm run db:push` to create schema.');
      return { connected: true, tableCount: 0, degraded: true };
    } else {
      console.log(`✅ Database connected (${tableCount} tables found)`);
      return { connected: true, tableCount, degraded: false };
    }
  } catch (e) {
    console.error('⚠️ Database connection failed:', e.message);
    console.warn('⚠️ Application will start in degraded mode. Database operations will fail.');
    return { connected: false, error: e.message, degraded: true };
  }
}

// Helper function to enqueue notification
// Accepts db (pool or transaction client) for transactional writes
async function enqueueNotification(db, userId, taskId, type, payload = {}) {
  // Removed try-catch to allow errors to propagate and rollback transactions
  await db.query(
    `INSERT INTO public.notifications (user_id, task_id, type, payload, channel, event_code, schedule_at)
     VALUES ($1::uuid, $2::uuid, $3, $4::jsonb, $5, $6, now())`,
    [userId, taskId, type, payload, 'email', type.toUpperCase()]
  );
}

// Helper function to refresh pool connections (no longer needed with Drizzle)
// Kept for backward compatibility
async function refreshPoolMetadata() {
  console.log('✅ Skipping pool metadata refresh (no longer needed with Drizzle schema management)');
}

module.exports = { pool, bootstrapDatabase, enqueueNotification, refreshPoolMetadata };
