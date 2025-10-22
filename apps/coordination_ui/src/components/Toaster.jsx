import { createContext, useContext, useState, useCallback } from "react";

const ToastCtx = createContext(null);

export function ToasterProvider({ children }) {
  const [toasts, setToasts] = useState([]); // { id, type, msg }
  const push = useCallback((type, msg) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, type, msg }]);
    if (type === "success" || type === "info") setTimeout(() => dismiss(id), 2500);
  }, []);
  const dismiss = useCallback((id) => setToasts(t => t.filter(x => x.id !== id)), []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map(t => {
          const styles = t.type === "error" 
            ? "bg-red-50 border-red-300 text-red-800"
            : t.type === "info"
            ? "bg-blue-50 border-blue-300 text-blue-800"
            : "bg-green-50 border-green-300 text-green-800";
          return (
            <div key={t.id} className={`px-3 py-2 rounded shadow border text-sm ${styles}`}>
              <div className="flex items-center gap-3">
                <span>{t.msg}</span>
                <button className="text-xs underline" onClick={() => dismiss(t.id)}>Close</button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToaster(){ 
  const ctx = useContext(ToastCtx); 
  if(!ctx) throw new Error("Wrap app in <ToasterProvider>"); 
  return ctx; 
}
