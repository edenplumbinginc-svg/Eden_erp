import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

async function authedGet(path, jwt) {
  const r = await fetch(path, { 
    headers: { 
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    } 
  });
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return r.json();
}

export function useWarmBoot() {
  useEffect(() => {
    let abort = false;
    
    (async () => {
      const { data } = await supabase.auth.getSession();
      const jwt = data?.session?.access_token;
      if (!jwt) return;

      // Fire-and-forget: small, cache-friendly lists
      // These run in parallel after auth resolves
      Promise.allSettled([
        authedGet('/api/tasks?limit=20&sort=updated_at&order=desc', jwt),
        authedGet('/api/projects', jwt),
      ]).then(([tasksResult, projectsResult]) => {
        if (abort) return;
        
        try {
          // Expose to window for instant access
          window.__eden = window.__eden || {};
          
          if (tasksResult.status === 'fulfilled') {
            window.__eden.tasksWarm = tasksResult.value.tasks || tasksResult.value;
            console.log('[WarmBoot] Tasks preloaded:', window.__eden.tasksWarm?.length || 0);
          }
          
          if (projectsResult.status === 'fulfilled') {
            window.__eden.projectsWarm = projectsResult.value;
            console.log('[WarmBoot] Projects preloaded:', window.__eden.projectsWarm?.length || 0);
          }
        } catch (err) {
          console.warn('[WarmBoot] Failed to cache preloaded data:', err);
        }
      });
    })();
    
    return () => { 
      abort = true; 
    };
  }, []);
}
