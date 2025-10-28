// Layer: RBAC → role source adapter
import type { Role } from "./can";

// Pull from DevAuthSwitcher, window, or localStorage; default Admin for development.
export function getCurrentRole(): Role {
  // Prefer a global the dev switcher might set:
  const winRole = typeof window !== "undefined" ? ((window as any).__DEV_ROLE as string) : "";
  // Fallback to a localStorage key your switcher may use:
  const lsRole = typeof localStorage !== "undefined" ? (localStorage.getItem("dev.role") || "") : "";
  // Default to Admin in development for convenience
  const role = (winRole || lsRole || "Admin") as Role;
  return role;
}
