const { createRemoteJWKSet, jwtVerify } = require('jose');

const jwksUrl = new URL(`${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`);
const jwks = createRemoteJWKSet(jwksUrl);

async function verifySupabaseJwt(token) {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: process.env.SUPABASE_URL,
    audience: process.env.JWT_AUD || 'authenticated',
  });
  return payload;
}

module.exports = { verifySupabaseJwt };
