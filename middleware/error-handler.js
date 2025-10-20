// middleware/error-handler.js
// Global error handling middleware

const logger = require('../lib/logger');
const { metrics } = require('../lib/metrics');

/**
 * Global error handler middleware
 * Must be added AFTER all routes
 */
function errorHandler(err, req, res, next) {
  // Record error in metrics
  metrics.recordError(err.name || 'Error', err.message, err.stack);
  
  // Log error with context
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    statusCode: err.statusCode || 500,
    type: err.name
  });
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(err.statusCode || 500).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: isDevelopment ? err.message : 'An internal error occurred',
      ...(isDevelopment && err.stack ? { stack: err.stack.split('\n').slice(0, 5) } : {})
    }
  });
}

/**
 * 404 handler
 * Should be added before the error handler
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route not found: ${req.method} ${req.path}`
    }
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
