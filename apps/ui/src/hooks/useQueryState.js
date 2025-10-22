import { useState, useEffect } from 'react';

export function useQueryState() {
  const [, forceUpdate] = useState(0);

  function getAll() {
    const sp = new URLSearchParams(window.location.search);
    const out = {};
    sp.forEach((v, k) => {
      out[k] = v;
    });
    return out;
  }

  function set(partial, options = {}) {
    const { replace = false } = options;
    const url = new URL(window.location.href);
    const sp = url.searchParams;
    
    Object.entries(partial).forEach(([k, v]) => {
      if (v === null || v === undefined || v === '') {
        sp.delete(k);
      } else {
        sp.set(k, String(v));
      }
    });
    
    const next = `${url.pathname}?${sp.toString()}${url.hash || ''}`;
    if (replace) {
      window.history.replaceState(null, '', next);
    } else {
      window.history.pushState(null, '', next);
    }
    forceUpdate(x => x + 1);
  }

  useEffect(() => {
    const onPop = () => forceUpdate(x => x + 1);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return { getAll, set };
}
