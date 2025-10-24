// lib/db-wrapper.js
// Database client wrapper with logging instrumentation

const logger = require('./logger');

/**
 * Wrap a pg Pool to add logging
 * Note: Metrics are collected at the HTTP request level via requestTimingMiddleware
 */
function instrumentPool(pool) {
  const originalQuery = pool.query.bind(pool);
  
  pool.query = async function(...args) {
    const start = Date.now();
    const sql = typeof args[0] === 'string' ? args[0] : args[0]?.text || 'unknown';
    
    try {
      const result = await originalQuery(...args);
      const duration = Date.now() - start;
      
      // Log successful query
      logger.query(sql, duration);
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      
      // Log failed query
      logger.query(sql, duration, error);
      
      throw error;
    }
  };
  
  return pool;
}

module.exports = { instrumentPool };
