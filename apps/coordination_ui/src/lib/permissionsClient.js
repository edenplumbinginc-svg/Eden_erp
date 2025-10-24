// apps/coordination_ui/src/lib/permissionsClient.js
import { loadCachedPerms, saveCachedPerms } from './permissionsCache';
import { logCacheMiss } from './telemetry';

let inflight = null;

export async function fetchPermissions(jwt) {
  if (!jwt) throw new Error("Missing JWT");
  
  if (!inflight) {
    const t0 = performance.now();
    const cached = loadCachedPerms();
    
    const headers = { 
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    };
    
    if (cached?.etag) {
      headers['If-None-Match'] = cached.etag;
    }
    
    inflight = fetch('/api/me/permissions', { headers })
      .then(async (r) => {
        const dt = Math.round(performance.now() - t0);
        
        if (r.status === 304 && cached) {
          return cached;
        }
        
        if (!r.ok) {
          throw new Error(`Permission fetch failed: ${r.status}`);
        }
        
        logCacheMiss(dt);
        
        const etag = r.headers.get('ETag') || undefined;
        const body = await r.json();
        const result = {
          roles: body.roles || [],
          permissions: body.permissions || [],
          etag
        };
        
        saveCachedPerms(result);
        return result;
      })
      .finally(() => {
        inflight = null;
      });
  }
  
  return inflight;
}
