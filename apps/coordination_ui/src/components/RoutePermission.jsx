import React from "react";
import { can } from "../lib/can";
import { getCurrentRole } from "../lib/authRole";

export default function RoutePermission({ resource, action = "read", children, fallback = null }) {
  const role = getCurrentRole();
  const allowed = can(role, resource, action);
  return allowed ? <>{children}</> : (fallback ?? <Forbidden />);
}

function Forbidden() {
  return (
    <div style={{ padding: 24 }}>
      <h2>403 — Not allowed</h2>
      <p>You don't have permission to view this page.</p>
    </div>
  );
}
