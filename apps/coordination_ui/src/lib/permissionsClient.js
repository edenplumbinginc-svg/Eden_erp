// apps/coordination_ui/src/lib/permissionsClient.js
import { api } from '../services/api';
import { logCacheMiss } from './telemetry';

let inflight = null;

export async function fetchPermissions(jwt) {
  if (!jwt) throw new Error("Missing JWT");
  
  if (!inflight) {
    const t0 = performance.now();
    
    inflight = api.get('/me/permissions', {
      headers: { Authorization: `Bearer ${jwt}` }
    })
      .then((response) => {
        const dt = Math.round(performance.now() - t0);
        logCacheMiss(dt);
        
        return {
          roles: response.data.roles || [],
          permissions: response.data.permissions || []
        };
      })
      .finally(() => {
        inflight = null;
      });
  }
  
  return inflight;
}
