// Layer: RBAC → Frontend guard (kernel)
import rbac from "../config/rbac.json";

export type Role = keyof typeof rbac;
export type Resource =
  | "projects" | "tasks" | "comments" | "attachments"
  | "scheduling" | "archive" | "delete" | "roleManagement";
export type Action = string;

export function can(role: Role, resource: Resource, action: Action): boolean {
  const roleDef: any = (rbac as any)[role];
  if (!roleDef) return false;

  const resDef: any = roleDef[resource];
  if (!resDef) return false;

  // Direct boolean action (e.g., edit, delete, assign)
  if (typeof resDef[action] === "boolean") return !!resDef[action];

  // Level-based permissions (e.g., { level: "full" | "limited" | "none" })
  if (resDef.level) return resDef.level !== "none";

  // Scope-based defaults
  if (resDef.scope) {
    if (action === "read") return resDef.read === true;
    return resDef[action] === true;
  }

  return false;
}

export function scope(role: Role, resource: Resource): string | undefined {
  const resDef: any = (rbac as any)[role]?.[resource];
  return resDef?.scope || resDef?.level;
}
