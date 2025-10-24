// lib/logger.js
// Structured logging system with Pino (production-grade JSON logger)

const pino = require('pino');

const level = process.env.LOG_LEVEL?.toLowerCase() || 'info';

// Pino in JSON, safe for shipping to any log system later.
const logger = pino({
  level,
  messageKey: 'message',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'user.token',
      'password',
      'req.headers["x-dev-user-id"]',
      'req.headers["x-dev-user-email"]'
    ],
    censor: '[REDACTED]'
  },
  base: {
    service: 'eden-erp-backend',
    env: process.env.SENTRY_ENV || process.env.NODE_ENV || 'development',
  }
});

// Backward compatibility wrappers for existing code
logger.request = (req, duration) => {
  logger.info({
    req_id: req.id,
    method: req.method,
    path: req.path,
    statusCode: req.res?.statusCode,
    duration,
    ip: req.ip,
    userAgent: req.get('user-agent')
  }, 'HTTP Request');
};

logger.query = (sql, duration, error = null) => {
  if (error) {
    logger.error({
      sql: sql.substring(0, 200),
      duration,
      error: error.message,
      code: error.code
    }, 'Database Query Failed');
  } else {
    logger.debug({
      sql: sql.substring(0, 200),
      duration
    }, 'Database Query');
  }
};

logger.auth = (event, userId, success, metadata = {}) => {
  const logFn = success ? logger.info : logger.warn;
  logFn({
    event,
    userId,
    success,
    ...metadata
  }, `Auth: ${event}`);
};

logger.security = (event, severity, metadata = {}) => {
  const logFn = severity === 'critical' ? logger.error : logger.error;
  logFn({
    event,
    severity,
    ...metadata
  }, `Security: ${event}`);
};

logger.critical = (message, metadata = {}) => {
  logger.error(metadata, message);
};

module.exports = logger;
