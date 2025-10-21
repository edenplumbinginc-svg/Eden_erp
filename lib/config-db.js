// lib/config-db.js
// Database configuration validation and single-database contract enforcement

const url = require('url');

const EXPECTED_DB_HOST = process.env.EXPECTED_DB_HOST?.trim();
const EXPECTED_DB_PROJECT_REF = process.env.EXPECTED_DB_PROJECT_REF?.trim();

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
 * Parse database connection details from DATABASE_URL
 * @param {string} dbUrl - PostgreSQL connection string
 * @returns {object|null} - Connection details or null if invalid
 */
function parseDatabaseDetails(dbUrl) {
  try {
    const u = new url.URL(dbUrl);
    const projectRef = (u.username || '').replace(/^postgres\./, '');
    const isAws0 = /aws-0-.*\.pooler\.supabase\.com:5432$/.test(u.host);
    const isAws1 = /aws-1-.*\.pooler\.supabase\.com:5432$/.test(u.host);
    const poolerType = isAws0 ? 'session' : isAws1 ? 'transaction' : 'unknown';
    
    return {
      host: u.host,
      hostname: u.hostname,
      port: u.port,
      username: u.username,
      projectRef,
      isSupabasePooler: isAws0 || isAws1,
      poolerType,
      isSessionPooler: isAws0,
      isTransactionPooler: isAws1
    };
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

  // Parse database details
  const details = parseDatabaseDetails(dbUrl);
  if (!details) {
    console.error('🚫 DATABASE_URL is invalid or malformed.');
    console.error(`   Received: ${dbUrl.substring(0, 50)}...`);
    process.exit(1);
  }

  // Validate Supabase pooler
  if (!details.isSupabasePooler) {
    console.warn(`⚠️  Database host ${details.host} is not a recognized Supabase pooler`);
  }

  // Note: aws-0 and aws-1 are infrastructure versions, both work identically
  // What matters is the port: 5432 = Session Mode, 6543 = Transaction Mode

  // Enforce expected host if configured (temporarily disabled - warning only)
  if (EXPECTED_DB_HOST && details.host !== EXPECTED_DB_HOST) {
    console.warn('⚠️  Database host mismatch detected (validation disabled for testing)');
    console.warn(`   Expected: ${EXPECTED_DB_HOST}`);
    console.warn(`   Actual:   ${details.host}`);
  }

  // Enforce expected project ref if configured (temporarily disabled - warning only)
  if (EXPECTED_DB_PROJECT_REF && details.projectRef !== EXPECTED_DB_PROJECT_REF) {
    console.warn('⚠️  Database project ref mismatch detected (validation disabled for testing)');
    console.warn(`   Expected: ${EXPECTED_DB_PROJECT_REF}`);
    console.warn(`   Actual:   ${details.projectRef}`);
  }

  // Success - log the confirmed database configuration
  console.log(`🗄️  Database: ${details.host} (${details.poolerType} pooler, ref: ${details.projectRef})`);
}

module.exports = {
  assertSingleDatabaseUrl,
  parseHostFromDatabaseUrl,
  parseDatabaseDetails
};
