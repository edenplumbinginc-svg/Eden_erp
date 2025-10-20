// lib/db-wrapper.js
// Database client wrapper with metrics and logging instrumentation

const { metrics } = require('./metrics');
const logger = require('./logger');

/**
 * Wrap a pg Pool to add metrics collection and logging
 */
function instrumentPool(pool) {
  const originalQuery = pool.query.bind(pool);
  
  pool.query = async function(...args) {
    const start = Date.now();
    const sql = typeof args[0] === 'string' ? args[0] : args[0]?.text || 'unknown';
    
    try {
      const result = await originalQuery(...args);
      const duration = Date.now() - start;
      
      // Record successful query
      metrics.recordDatabaseQuery(duration);
      logger.query(sql, duration);
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      
      // Record failed query
      metrics.recordDatabaseQuery(duration, error);
      logger.query(sql, duration, error);
      
      throw error;
    }
  };
  
  return pool;
}

module.exports = { instrumentPool };
