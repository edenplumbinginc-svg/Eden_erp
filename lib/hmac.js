// lib/hmac.js
// HMAC signature verification middleware

const crypto = require('crypto');
const logger = require('./logger');

const OPS_HMAC_SECRET = process.env.OPS_HMAC_SECRET;

function verifyHmac(req, res, next) {
  const signature = req.headers['x-signature'];
  const userId = req.user?.id || 'unknown';
  const userEmail = req.user?.email || 'unknown';
  
  if (!OPS_HMAC_SECRET) {
    logger.security('hmac_secret_missing', 'critical', {
      user_id: userId,
      path: req.path,
      method: req.method,
      req_id: req.id,
    });
    
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'HMAC verification not configured'
      }
    });
  }
  
  if (!signature) {
    logger.security('hmac_signature_missing', 'warning', {
      user_id: userId,
      user_email: userEmail,
      path: req.path,
      method: req.method,
      req_id: req.id,
    });
    
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing X-Signature header'
      }
    });
  }
  
  const body = JSON.stringify(req.body || {});
  const computedSignature = crypto
    .createHmac('sha256', OPS_HMAC_SECRET)
    .update(body)
    .digest('hex');
  
  if (signature !== computedSignature) {
    logger.security('hmac_verification_failed', 'warning', {
      user_id: userId,
      user_email: userEmail,
      path: req.path,
      method: req.method,
      req_id: req.id,
      expected_signature: computedSignature.substring(0, 16) + '...',
      received_signature: signature.substring(0, 16) + '...',
    });
    
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid signature'
      }
    });
  }
  
  logger.info({
    event: 'hmac_verification_success',
    user_id: userId,
    user_email: userEmail,
    path: req.path,
    method: req.method,
    req_id: req.id,
  }, 'hmac_verified');
  
  next();
}

module.exports = {
  verifyHmac
};
