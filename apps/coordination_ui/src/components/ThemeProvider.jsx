import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeCtx = createContext({ theme: 'auto', setTheme: () => {} });

function getInitialTheme() {
  const saved = localStorage.getItem('eden.theme');
  return saved || 'auto';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => getInitialTheme());

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

  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  return useContext(ThemeCtx);
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      <label className="muted" style={{ fontSize: '0.85rem' }}>Theme</label>
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
    </div>
  );
}
