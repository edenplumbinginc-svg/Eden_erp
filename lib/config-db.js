// lib/config-db.js
// Database configuration validation and single-database contract enforcement

const url = require('url');

const EXPECTED_DB_HOST = process.env.EXPECTED_DB_HOST?.trim();

/**
 * Parse the host (including port) from a DATABASE_URL
 * @param {string} dbUrl - PostgreSQL connection string
 * @returns {string|null} - Host:port or null if invalid
 */
function parseHostFromDatabaseUrl(dbUrl) {
  try {
    const u = new url.URL(dbUrl);
    return u.host; // includes host:port if present
  } catch {
    return null;
  }
}

/**
 * Assert that the application is configured to use exactly one database
 * Prevents configuration drift and dual-database issues
 * Fails fast on boot if misconfigured
 */
function assertSingleDatabaseUrl() {
  const dbUrl = process.env.DATABASE_URL;
  
  // Fail fast if DATABASE_URL is missing
  if (!dbUrl) {
    console.error('🚫 DATABASE_URL is missing.');
    console.error('   Set DATABASE_URL in your .env file or environment variables.');
    process.exit(1);
  }

  // Warn about legacy Supabase environment variables
  // These should not be used for direct database connections
  const legacy = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']
    .filter(k => process.env[k]);
  
  if (legacy.length) {
    console.warn(`⚠️  Legacy environment variables present: ${legacy.join(', ')}`);
    console.warn('   Ensure these are not used for database connections.');
    console.warn('   Use DATABASE_URL for all database operations.');
  }

  // Parse and validate the database host
  const host = parseHostFromDatabaseUrl(dbUrl);
  if (!host) {
    console.error('🚫 DATABASE_URL is invalid or malformed.');
    console.error(`   Received: ${dbUrl.substring(0, 50)}...`);
    process.exit(1);
  }

  // Enforce expected host if configured
  if (EXPECTED_DB_HOST && host !== EXPECTED_DB_HOST) {
    console.error('🚫 Database host mismatch detected!');
    console.error(`   Expected: ${EXPECTED_DB_HOST}`);
    console.error(`   Actual:   ${host}`);
    console.error('');
    console.error('   This prevents accidental connections to the wrong database.');
    console.error('   Update EXPECTED_DB_HOST in .env to match your DATABASE_URL host.');
    process.exit(1);
  }

  // Success - log the confirmed database host
  console.log(`🗄️  Database host: ${host}`);
}

module.exports = {
  assertSingleDatabaseUrl,
  parseHostFromDatabaseUrl
};
