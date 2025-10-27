import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { me } from "../api/auth";

export default function RequireAuth({ children }) {
  const loc = useLocation();
  const [state, setState] = React.useState({ loading: true, user: null });

  const DEV_BYPASS = import.meta.env?.VITE_AUTH_DEV_BYPASS === 'true';
  
  React.useEffect(() => {
    if (DEV_BYPASS) {
      setState({ loading: false, user: { bypass: true } });
      return;
    }
    
    let alive = true;
    (async () => {
      const { ok, user } = await me();
      if (!alive) return;
      setState({ loading: false, user: ok ? user : null });
    })();
    return () => { alive = false; };
  }, [DEV_BYPASS]);

  if (state.loading) {
    return <div className="p-6">Loading…</div>;
  }
  
  if (!state.user) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }
  
  return <>{children}</>;
}
