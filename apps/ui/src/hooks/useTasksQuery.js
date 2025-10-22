import { useState, useEffect } from 'react';
import { api } from '../lib/api';

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
        const response = await api.get(url);
        const json = await response.json();
        
        if (alive) {
          setData({
            items: json.items || [],
            total: json.total || 0,
            page: json.page || 1,
            limit: json.limit || 20,
            totalPages: json.totalPages || 1
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
