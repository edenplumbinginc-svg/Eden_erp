import { useState, useEffect } from 'react';

const subscribers = new Set();

function notifyAll() {
  subscribers.forEach(fn => fn());
}

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
    notifyAll();
  }

  useEffect(() => {
    const updateFn = () => forceUpdate(x => x + 1);
    subscribers.add(updateFn);
    
    const onPop = () => {
      forceUpdate(x => x + 1);
      notifyAll();
    };
    window.addEventListener('popstate', onPop);
    
    return () => {
      subscribers.delete(updateFn);
      window.removeEventListener('popstate', onPop);
    };
  }, []);

  return { getAll, set };
}
