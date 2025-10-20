// lib/health-checks.js
// Comprehensive health check utilities for production monitoring

const { pool } = require('../services/database');

/**
 * Health check result structure
 * @typedef {Object} HealthCheckResult
 * @property {boolean} healthy - Overall health status
 * @property {string} status - 'healthy', 'degraded', or 'unhealthy'
 * @property {number} timestamp - Unix timestamp
 * @property {Object} checks - Individual health check results
 */

/**
 * Check database connectivity and performance
 */
async function checkDatabase() {
  const start = Date.now();
  try {
    if (!process.env.DATABASE_URL) {
      return {
        healthy: false,
        status: 'unconfigured',
        message: 'DATABASE_URL not configured',
        responseTime: 0
      };
    }

    // Test connection with simple query
    const result = await pool.query('SELECT 1 as health_check, now() as db_time');
    const responseTime = Date.now() - start;

    // Check pool statistics
    const poolStats = {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount
    };

    return {
      healthy: true,
      status: 'healthy',
      message: 'Database connected',
      responseTime,
      dbTime: result.rows[0].db_time,
      pool: poolStats
    };
  } catch (error) {
    return {
      healthy: false,
      status: 'unhealthy',
      message: error.message,
      error: error.code || 'UNKNOWN',
      responseTime: Date.now() - start
    };
  }
}

/**
 * Check database schema integrity
 */
async function checkDatabaseSchema() {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT table_name) as table_count,
        COUNT(*) as column_count
      FROM information_schema.columns
      WHERE table_schema = 'public'
    `);

    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    const critical_tables = ['users', 'projects', 'tasks', 'roles', 'permissions'];
    const existing_tables = tables.rows.map(r => r.table_name);
    const missing_tables = critical_tables.filter(t => !existing_tables.includes(t));

    return {
      healthy: missing_tables.length === 0,
      status: missing_tables.length === 0 ? 'healthy' : 'degraded',
      message: missing_tables.length === 0 ? 'Schema intact' : `Missing tables: ${missing_tables.join(', ')}`,
      tableCount: parseInt(result.rows[0].table_count),
      columnCount: parseInt(result.rows[0].column_count),
      missingTables: missing_tables
    };
  } catch (error) {
    return {
      healthy: false,
      status: 'unknown',
      message: 'Cannot verify schema',
      error: error.message
    };
  }
}

/**
 * Check API responsiveness
 */
async function checkAPI() {
  const start = Date.now();
  try {
    // This is a self-check, so we just verify the process is running
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    
    return {
      healthy: true,
      status: 'healthy',
      message: 'API responding',
      uptime: Math.floor(uptime),
      responseTime: Date.now() - start,
      memory: {
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
        rss: Math.round(memory.rss / 1024 / 1024),
        external: Math.round(memory.external / 1024 / 1024)
      }
    };
  } catch (error) {
    return {
      healthy: false,
      status: 'unhealthy',
      message: error.message,
      responseTime: Date.now() - start
    };
  }
}

/**
 * Check system resources
 */
async function checkSystem() {
  try {
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Calculate memory usage percentage (approximate)
    const memoryUsagePercent = Math.round((memory.heapUsed / memory.heapTotal) * 100);
    
    // Determine health status based on memory usage
    let status = 'healthy';
    let healthy = true;
    if (memoryUsagePercent > 90) {
      status = 'critical';
      healthy = false;
    } else if (memoryUsagePercent > 75) {
      status = 'degraded';
    }

    return {
      healthy,
      status,
      message: `Memory ${memoryUsagePercent}% used`,
      uptime: Math.floor(uptime),
      memory: {
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
        rss: Math.round(memory.rss / 1024 / 1024),
        usagePercent: memoryUsagePercent
      },
      cpu: {
        user: Math.round(cpuUsage.user / 1000),
        system: Math.round(cpuUsage.system / 1000)
      },
      pid: process.pid,
      nodeVersion: process.version
    };
  } catch (error) {
    return {
      healthy: false,
      status: 'unknown',
      message: error.message
    };
  }
}

/**
 * Check environment configuration
 */
async function checkEnvironment() {
  const requiredVars = ['DATABASE_URL', 'NODE_ENV'];
  const optionalVars = ['PORT', 'EXPECTED_DB_HOST', 'EXPECTED_DB_PROJECT_REF'];
  
  const missing = requiredVars.filter(v => !process.env[v]);
  const configured = requiredVars.filter(v => process.env[v]);
  const optional = optionalVars.filter(v => process.env[v]);

  return {
    healthy: missing.length === 0,
    status: missing.length === 0 ? 'healthy' : 'degraded',
    message: missing.length === 0 ? 'Environment configured' : `Missing: ${missing.join(', ')}`,
    required: {
      configured: configured.length,
      missing: missing
    },
    optional: {
      configured: optional.length,
      total: optionalVars.length
    },
    nodeEnv: process.env.NODE_ENV || 'development'
  };
}

/**
 * Comprehensive health check
 * Runs all health checks in parallel and aggregates results
 */
async function runHealthChecks() {
  const start = Date.now();
  
  try {
    // Run all checks in parallel
    const [database, schema, api, system, environment] = await Promise.all([
      checkDatabase(),
      checkDatabaseSchema(),
      checkAPI(),
      checkSystem(),
      checkEnvironment()
    ]);

    // Determine overall health
    const allChecks = [database, schema, api, system, environment];
    const unhealthyChecks = allChecks.filter(c => !c.healthy);
    const degradedChecks = allChecks.filter(c => c.status === 'degraded');
    
    let overallStatus = 'healthy';
    if (unhealthyChecks.length > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedChecks.length > 0) {
      overallStatus = 'degraded';
    }

    return {
      healthy: unhealthyChecks.length === 0,
      status: overallStatus,
      timestamp: new Date().toISOString(),
      duration: Date.now() - start,
      checks: {
        database,
        schema,
        api,
        system,
        environment
      }
    };
  } catch (error) {
    return {
      healthy: false,
      status: 'error',
      timestamp: new Date().toISOString(),
      duration: Date.now() - start,
      error: error.message,
      checks: {}
    };
  }
}

/**
 * Quick health check (database only)
 * Used for load balancer health checks
 */
async function quickHealthCheck() {
  try {
    const database = await checkDatabase();
    return {
      healthy: database.healthy,
      status: database.status,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      healthy: false,
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}

module.exports = {
  runHealthChecks,
  quickHealthCheck,
  checkDatabase,
  checkDatabaseSchema,
  checkAPI,
  checkSystem,
  checkEnvironment
};
