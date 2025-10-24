import { useEffect, useRef } from 'react';

/**
 * Change Beacon Hook - Realtime-lite Refresh Detection
 * 
 * Polls /api/health every N seconds to detect module changes.
 * When a module's last_change timestamp changes, triggers a refresh callback.
 * 
 * This provides pseudo-realtime updates without WebSockets or complex infrastructure.
 * Perfect for low-traffic internal tools where 20-30s latency is acceptable.
 * 
 * @param {Function} nudge - Callback function (module: 'tasks' | 'projects') => void
 * @param {number} intervalMs - Polling interval in milliseconds (default: 20000 = 20s)
 * 
 * @example
 * // In a Tasks page
 * const { forceRefresh } = useDeltaSync('/api/tasks', { key: 'tasks' });
 * useChangeBeacon((module) => {
 *   if (module === 'tasks') forceRefresh();
 * }, 20000);
 */
export function useChangeBeacon(nudge, intervalMs = 20000) {
  const prevRef = useRef({ tasks: null, projects: null });
  const timerRef = useRef(null);
  const stopRef = useRef(false);

  useEffect(() => {
    stopRef.current = false;

    const tick = async () => {
      if (stopRef.current) return;

      try {
        const response = await fetch('/api/health');
        if (!response.ok) throw new Error('Health check failed');
        
        const data = await response.json();
        
        const tasksChange = data.modules?.tasks?.last_change ?? null;
        const projectsChange = data.modules?.projects?.last_change ?? null;

        // Only trigger on actual changes (not initial load)
        if (prevRef.current.tasks && tasksChange && tasksChange !== prevRef.current.tasks) {
          console.log('[ChangeBeacon] Tasks changed, triggering refresh');
          nudge('tasks');
        }

        if (prevRef.current.projects && projectsChange && projectsChange !== prevRef.current.projects) {
          console.log('[ChangeBeacon] Projects changed, triggering refresh');
          nudge('projects');
        }

        // Update stored timestamps
        prevRef.current = {
          tasks: tasksChange,
          projects: projectsChange
        };
      } catch (error) {
        console.error('[ChangeBeacon] Health check failed:', error.message);
      }

      // Schedule next tick
      if (!stopRef.current) {
        timerRef.current = setTimeout(tick, intervalMs);
      }
    };

    // Start polling
    tick();

    // Cleanup
    return () => {
      stopRef.current = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [nudge, intervalMs]);
}
