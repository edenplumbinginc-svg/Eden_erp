import { createContext, useContext, useState, useCallback } from "react";

const ToastCtx = createContext(null);

export function ToasterProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((type, msg) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, type, msg }]);
    if (type === "success" || type === "info") setTimeout(() => dismiss(id), 2500);
  }, []);
  const dismiss = useCallback((id) => setToasts(t => t.filter(x => x.id !== id)), []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: 'var(--space-2)',
        right: 'var(--space-2)',
        zIndex: 1000
      }}>
        <div className="space-y-2">
          {toasts.map(t => {
            const className = t.type === "error" 
              ? "error"
              : t.type === "info"
              ? "status-badge status-info"
              : "status-badge status-active";
            return (
              <div key={t.id} className={`card ${className}`} style={{
                padding: 'var(--space-2)',
                boxShadow: 'var(--md-shadow-3)'
              }}>
                <div className="flex items-center gap-3">
                  <span>{t.msg}</span>
                  <button className="text-caption text-link hover:underline" onClick={() => dismiss(t.id)}>Close</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ToastCtx.Provider>
  );
}

export function useToaster(){ 
  const ctx = useContext(ToastCtx); 
  if(!ctx) throw new Error("Wrap app in <ToasterProvider>"); 
  return ctx; 
}
