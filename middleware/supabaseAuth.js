const { createRemoteJWKSet, jwtVerify, decodeProtectedHeader } = require('jose');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;
const JWT_AUD = process.env.JWT_AUD || 'authenticated';

let jwks; // Lazy init for RS/ES tokens

function getJWKS() {
  if (!jwks && SUPABASE_URL) {
    const jwksUrl = new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`);
    jwks = createRemoteJWKSet(jwksUrl);
  }
  return jwks;
}

async function verifySupabaseJwt(token) {
  try {
    // Decode the JWT header to determine the algorithm
    const { alg } = decodeProtectedHeader(token);
    
    let verified;
    
    if (alg && alg.startsWith('HS')) {
      // Symmetric algorithm (HS256, HS384, HS512) - use shared secret
      if (!SUPABASE_JWT_SECRET) {
        throw new Error('SUPABASE_JWT_SECRET not configured for HS* token verification');
      }
      
      verified = await jwtVerify(token, new TextEncoder().encode(SUPABASE_JWT_SECRET), {
        algorithms: ['HS256', 'HS384', 'HS512'],
        issuer: SUPABASE_URL,
        audience: JWT_AUD,
      });
    } else if (alg && (alg.startsWith('RS') || alg.startsWith('ES') || alg.startsWith('PS'))) {
      // Asymmetric algorithm (RS256, ES256, etc.) - use JWKS
      if (!SUPABASE_URL) {
        throw new Error('SUPABASE_URL not configured for JWKS verification');
      }
      
      const keySet = getJWKS();
      verified = await jwtVerify(token, keySet, {
        algorithms: ['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'PS256', 'PS384', 'PS512'],
        issuer: SUPABASE_URL,
        audience: JWT_AUD,
      });
    } else {
      throw new Error(`Unsupported JWT algorithm: ${alg || 'unknown'}`);
    }
    
    return verified.payload;
  } catch (error) {
    // Re-throw with more context
    throw new Error(`JWT verification failed: ${error.message}`);
  }
}

module.exports = { verifySupabaseJwt };
