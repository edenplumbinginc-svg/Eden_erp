// services/db-diagnostics.js
const dns = require('dns').promises;
const { pool } = require('./database');

/**
 * Resolve DB host to see IP family (IPv4/IPv6) + available addresses
 */
async function resolveDbHost(host) {
  const out = { host, ipv4: [], ipv6: [] };
  
  try {
    out.ipv4 = await dns.resolve4(host);
  } catch (err) {
    out.ipv4_error = err.code || err.message;
  }
  
  try {
    out.ipv6 = await dns.resolve6(host);
  } catch (err) {
    out.ipv6_error = err.code || err.message;
  }
  
  return out;
}

/**
 * Wait for database with exponential backoff retry logic
 * Prevents cascading failures and gives clear visibility into connection attempts
 */
async function waitForDb(maxAttempts = 5) {
  let attempt = 0;
  let lastErr;
  
  while (attempt < maxAttempts) {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1 as health_check');
      client.release();
      console.log('✅ Database connection established', { 
        attempt: attempt + 1, 
        max_attempts: maxAttempts 
      });
      return { connected: true, attempts: attempt + 1 };
    } catch (err) {
      lastErr = err;
      attempt++;
      
      if (attempt < maxAttempts) {
        const delay = Math.min(5000, 500 * attempt); // Cap at 5 seconds
        console.error('⚠️ Database connection attempt failed', {
          attempt,
          max_attempts: maxAttempts,
          retry_in_ms: delay,
          error: err.message,
          error_code: err.code
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error('❌ Database connection failed after all retry attempts', {
    attempts: maxAttempts,
    final_error: lastErr.message,
    error_code: lastErr.code
  });
  
  throw lastErr;
}

/**
 * Get comprehensive database diagnostics
 * Returns connection info, DNS resolution, latency, and configuration
 */
async function getDatabaseDiagnostics() {
  const start = Date.now();
  const diagnostics = {
    timestamp: new Date().toISOString(),
    status: 'unknown',
    latency_ms: null,
    config: {
      node_env: process.env.NODE_ENV || 'development',
      tls_mode: process.env.PGSSLMODE || 'prefer',
      db_ssl_reject_unauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED,
      health_tls_relax: process.env.HEALTH_TLS_RELAX,
      ip_family_pref: process.env.IP_FAMILY || 'auto',
    },
    connection: null,
    resolved_ips: null,
    database: null,
    error: null
  };
  
  try {
    // Parse DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL not configured');
    }
    
    const url = new URL(dbUrl);
    const host = url.hostname;
    const port = url.port || '5432';
    
    diagnostics.connection = {
      host,
      port,
      database: url.pathname.substring(1),
      user: url.username
    };
    
    // Resolve DNS
    diagnostics.resolved_ips = await resolveDbHost(host);
    
    // Test database connection with a query
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          current_database() as database,
          current_schema() as schema,
          inet_server_addr() as server_ip,
          version() as postgres_version,
          now() as server_time
      `);
      
      diagnostics.database = result.rows[0];
      diagnostics.status = 'up';
    } finally {
      client.release();
    }
    
  } catch (err) {
    diagnostics.status = 'down';
    diagnostics.error = {
      message: err.message,
      code: err.code,
      type: err.constructor.name
    };
  } finally {
    diagnostics.latency_ms = Date.now() - start;
  }
  
  return diagnostics;
}

module.exports = {
  resolveDbHost,
  waitForDb,
  getDatabaseDiagnostics
};
