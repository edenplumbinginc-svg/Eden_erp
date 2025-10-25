// lib/rate-limit.js
// In-memory rate limiting middleware

const logger = require('./logger');

const RATE_LIMIT_WINDOW_MS = parseInt(process.env.OPS_RATE_LIMIT_WINDOW_MS || '60000', 10);
const RATE_LIMIT_MAX = parseInt(process.env.OPS_RATE_LIMIT_MAX || '10', 10);

const requestCounts = new Map();

function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, data] of requestCounts.entries()) {
    if (now - data.windowStart > RATE_LIMIT_WINDOW_MS) {
      requestCounts.delete(key);
    }
  }
}

setInterval(cleanupExpiredEntries, RATE_LIMIT_WINDOW_MS);

function makeRateLimiter(options = {}) {
  const windowMs = options.windowMs || RATE_LIMIT_WINDOW_MS;
  const max = options.max || RATE_LIMIT_MAX;
  
  return function rateLimiter(req, res, next) {
    const key = req.user?.id || req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    
    let data = requestCounts.get(key);
    
    if (!data || (now - data.windowStart) > windowMs) {
      data = {
        count: 0,
        windowStart: now
      };
      requestCounts.set(key, data);
    }
    
    data.count++;
    
    if (data.count > max) {
      const resetIn = Math.ceil((windowMs - (now - data.windowStart)) / 1000);
      
      logger.security('rate_limit_exceeded', 'warning', {
        key,
        user_id: req.user?.id || null,
        user_email: req.user?.email || null,
        ip: req.ip || req.socket?.remoteAddress,
        path: req.path,
        method: req.method,
        req_id: req.id,
        count: data.count,
        limit: max,
        window_ms: windowMs,
        reset_in_s: resetIn,
      });
      
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', String(Math.ceil((data.windowStart + windowMs) / 1000)));
      res.setHeader('Retry-After', String(resetIn));
      
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded. Try again in ${resetIn} seconds.`,
          retryAfter: resetIn
        }
      });
    }
    
    const remaining = Math.max(0, max - data.count);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil((data.windowStart + windowMs) / 1000)));
    
    logger.debug({
      event: 'rate_limit_check',
      key,
      user_id: req.user?.id || null,
      path: req.path,
      count: data.count,
      limit: max,
      remaining,
      req_id: req.id,
    }, 'rate_limit_ok');
    
    next();
  };
}

module.exports = {
  makeRateLimiter,
  requestCounts
};
