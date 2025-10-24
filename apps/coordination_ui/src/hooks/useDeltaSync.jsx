import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function storageKey(suffix) {
  return `eden.delta.${suffix}.lastSync`;
}

async function authedGet(url) {
  const { data } = await supabase.auth.getSession();
  const jwt = data?.session?.access_token;
  if (!jwt) throw new Error("Missing session");
  
  const r = await fetch(url, { 
    headers: { 
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    } 
  });
  
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}

function mergeDelta(base, delta) {
  const map = new Map(base.map(t => [t.id, t]));
  for (const d of delta) {
    map.set(d.id, { ...(map.get(d.id) || {}), ...d });
  }
  
  // Stable, recent-first view by updated_at
  return Array.from(map.values()).sort((a, b) => {
    const ta = a.updated_at ? Date.parse(a.updated_at) : 0;
    const tb = b.updated_at ? Date.parse(b.updated_at) : 0;
    return tb - ta;
  });
}

export function useDeltaSync(fetchPathBase, opts = {}) {
  const suffix = opts.key || "tasks";
  const key = storageKey(suffix);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  async function prime() {
    setLoading(true);
    const limit = opts.initialLimit || 20;
    const data = await authedGet(`${fetchPathBase}?limit=${limit}`);
    const itemsList = data.items || data || [];
    setItems(itemsList);
    
    if (data?.meta?.next_updated_after) {
      localStorage.setItem(key, data.meta.next_updated_after);
    }
    setLoading(false);
  }

  async function refreshDelta() {
    const since = localStorage.getItem(key);
    const url = since 
      ? `${fetchPathBase}?updated_after=${encodeURIComponent(since)}` 
      : `${fetchPathBase}?limit=${opts.initialLimit || 20}`;
    
    const data = await authedGet(url);
    
    if (since) {
      // Delta update
      if ((data.meta?.count || 0) > 0) {
        setItems(prev => mergeDelta(prev, data.items));
      }
    } else {
      // Full load
      setItems(data.items || data || []);
    }
    
    if (data?.meta?.next_updated_after) {
      localStorage.setItem(key, data.meta.next_updated_after);
    }
  }

  useEffect(() => {
    let stopped = false;
    
    (async () => {
      try {
        const since = localStorage.getItem(key);
        if (!since) {
          await prime(); // First load
        } else {
          await refreshDelta(); // Delta on subsequent loads
        }
      } catch (e) {
        console.warn(`[DeltaSync:${suffix}]`, e);
      }
      
      if (stopped) return;
      
      // Background refresh loop
      const tick = async () => {
        try {
          await refreshDelta();
        } catch (e) {
          console.warn(`[DeltaSync:${suffix}] Background refresh failed`, e);
        }
        if (!stopped) {
          timerRef.current = window.setTimeout(tick, opts.intervalMs || 30000);
        }
      };
      
      timerRef.current = window.setTimeout(tick, opts.intervalMs || 30000);
    })();
    
    return () => {
      stopped = true;
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [fetchPathBase, key, suffix]);

  return { items, setItems, loading, forceRefresh: refreshDelta };
}
