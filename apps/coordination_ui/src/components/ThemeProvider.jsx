import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

const ThemeCtx = createContext({ theme: 'auto', setTheme: () => {} });

function getInitialTheme() {
  const saved = localStorage.getItem('eden.theme');
  return saved || 'auto';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => getInitialTheme());
  const mediaRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('eden.theme', theme);
    const root = document.documentElement;
    root.removeAttribute('data-theme');
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia) return;
    if (theme !== 'auto') return;
    
    mediaRef.current = window.matchMedia('(prefers-color-scheme: dark)');
    const applyOSTheme = (e) => {
      const root = document.documentElement;
      if (e.matches) {
        root.setAttribute('data-theme', 'dark');
      } else {
        root.removeAttribute('data-theme');
      }
    };
    
    applyOSTheme(mediaRef.current);
    mediaRef.current.addEventListener?.('change', applyOSTheme);
    return () => mediaRef.current?.removeEventListener?.('change', applyOSTheme);
  }, [theme]);

  useEffect(() => {
    const handler = (e) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod || (e.key?.toLowerCase() !== 'j')) return;
      e.preventDefault();
      setTheme((prev) => {
        if (prev === 'light') return 'dark';
        if (prev === 'dark') return 'auto';
        return 'light';
      });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  return useContext(ThemeCtx);
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <select
      value={theme}
      onChange={(e) => setTheme(e.target.value)}
      aria-label="Theme selection"
      style={{
        padding: '4px 8px',
        borderRadius: '4px',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--surface)',
        color: 'var(--text)',
        fontSize: '0.85rem'
      }}
    >
      <option value="auto">Auto</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}
