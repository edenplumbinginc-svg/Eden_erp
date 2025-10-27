import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { me } from "../api/auth";

export default function RequireAuth({ children }) {
  const loc = useLocation();
  const [state, setState] = React.useState({ loading: true, user: null });

  React.useEffect(() => {
    let alive = true;
    (async () => {
      const { ok, user } = await me();
      if (!alive) return;
      setState({ loading: false, user: ok ? user : null });
    })();
    return () => { alive = false; };
  }, []);

  if (state.loading) return <div className="p-6">Loading…</div>;
  if (!state.user) return <Navigate to="/login" replace state={{ from: loc }} />;
  return <>{children}</>;
}
