/**
 * Dev-only JWT minter for local API tests
 * Requires: JWT_SECRET in env
 * Usage: node scripts/dev-mint-token.js
 */
const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET || 'dev-local-secret';

// Minimal claims your API is likely to check.
// Adjust scopes/roles to match your RBAC names.
const payload = {
  sub: '00000000-0000-0000-0000-000000000001',
  email: 'dev-admin@local.test',
  name: 'Dev Admin',
  roles: ['ADMIN'],
  scopes: ['tasks:read','tasks:write','projects:read','projects:write'],
  iat: Math.floor(Date.now()/1000),
  iss: 'eden-dev',
  aud: 'eden-api'
};

const token = jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: '8h' });
process.stdout.write(token);
