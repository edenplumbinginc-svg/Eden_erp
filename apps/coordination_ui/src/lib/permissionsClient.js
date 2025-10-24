// apps/coordination_ui/src/lib/permissionsClient.js
import { api } from '../services/api';

let inflight = null;

export async function fetchPermissions(jwt) {
  if (!jwt) throw new Error("Missing JWT");
  
  if (!inflight) {
    inflight = api.get('/me/permissions', {
      headers: { Authorization: `Bearer ${jwt}` }
    })
      .then((response) => {
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
