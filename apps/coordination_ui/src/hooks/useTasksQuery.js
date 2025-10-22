import { useState, useEffect } from 'react';
import axios from 'axios';

// Get current dev user from localStorage or use default
function getDevHeaders() {
  try {
    const stored = localStorage.getItem('devUser');
    if (stored) {
      const user = JSON.parse(stored);
      return {
        'X-Dev-User-Email': user.email,
        'X-Dev-User-Id': user.id
      };
    }
  } catch (e) {
    // Fall through to defaults
  }
  return {
    'X-Dev-User-Email': 'test@edenplumbing.com',
    'X-Dev-User-Id': '855546bf-f53d-4538-b8d5-cd30f5c157a2'
  };
}

function toQuery(params) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v && v.length) {
      sp.set(k, v);
    }
  });
  return sp.toString();
}

export function useTasksQuery(params) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    
    const q = toQuery(params);
    const url = q ? `/api/tasks?${q}` : '/api/tasks';

    const handle = setTimeout(async () => {
      try {
        const response = await axios.get(url, {
          headers: getDevHeaders()
        });
        
        if (alive) {
          setData({
            items: response.data.items || [],
            total: response.data.total || 0,
            page: response.data.page || 1,
            limit: response.data.limit || 20,
            totalPages: response.data.totalPages || 1
          });
        }
      } catch (e) {
        if (alive) {
          setError(e?.message || 'fetch error');
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      alive = false;
      clearTimeout(handle);
    };
  }, [JSON.stringify(params)]);

  return { data, loading, error };
}
