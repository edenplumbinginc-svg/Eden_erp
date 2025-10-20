// lib/logger.js
// Structured logging system with severity levels and contextual metadata

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  CRITICAL: 4
};

const LOG_LEVEL_NAMES = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'];

// Get current log level from environment
const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

/**
 * Format log entry as JSON
 */
function formatLogEntry(level, message, metadata = {}) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level: LOG_LEVEL_NAMES[level],
    message,
    ...metadata,
    pid: process.pid,
    env: process.env.NODE_ENV || 'development'
  });
}

/**
 * Log message if level meets threshold
 */
function log(level, message, metadata = {}) {
  if (level >= currentLogLevel) {
    const entry = formatLogEntry(level, message, metadata);
    
    if (level >= LOG_LEVELS.ERROR) {
      console.error(entry);
    } else if (level >= LOG_LEVELS.WARN) {
      console.warn(entry);
    } else {
      console.log(entry);
    }
  }
}

/**
 * Convenience logging functions
 */
const logger = {
  debug: (message, metadata) => log(LOG_LEVELS.DEBUG, message, metadata),
  info: (message, metadata) => log(LOG_LEVELS.INFO, message, metadata),
  warn: (message, metadata) => log(LOG_LEVELS.WARN, message, metadata),
  error: (message, metadata) => log(LOG_LEVELS.ERROR, message, metadata),
  critical: (message, metadata) => log(LOG_LEVELS.CRITICAL, message, metadata),
  
  /**
   * Log HTTP request
   */
  request: (req, duration) => {
    log(LOG_LEVELS.INFO, 'HTTP Request', {
      method: req.method,
      path: req.path,
      statusCode: req.res?.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  },
  
  /**
   * Log database query
   */
  query: (sql, duration, error = null) => {
    if (error) {
      log(LOG_LEVELS.ERROR, 'Database Query Failed', {
        sql: sql.substring(0, 200),
        duration,
        error: error.message,
        code: error.code
      });
    } else {
      log(LOG_LEVELS.DEBUG, 'Database Query', {
        sql: sql.substring(0, 200),
        duration
      });
    }
  },
  
  /**
   * Log authentication event
   */
  auth: (event, userId, success, metadata = {}) => {
    log(success ? LOG_LEVELS.INFO : LOG_LEVELS.WARN, `Auth: ${event}`, {
      event,
      userId,
      success,
      ...metadata
    });
  },
  
  /**
   * Log security event
   */
  security: (event, severity, metadata = {}) => {
    const level = severity === 'critical' ? LOG_LEVELS.CRITICAL : LOG_LEVELS.ERROR;
    log(level, `Security: ${event}`, {
      event,
      severity,
      ...metadata
    });
  }
};

module.exports = logger;
