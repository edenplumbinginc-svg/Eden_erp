import { useNavigate, useLocation } from "react-router-dom";

export function usePostLoginRedirect() {
  const nav = useNavigate();
  const loc = useLocation();
  const from = (loc.state && loc.state.from && loc.state.from.pathname) || "/dashboard";
  return () => nav(from, { replace: true });
}
