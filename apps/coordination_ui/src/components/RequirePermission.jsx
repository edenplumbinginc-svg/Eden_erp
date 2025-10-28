// Layer: RBAC → component guard
import { can } from '../lib/can';
import { getCurrentRole } from '../lib/authRole';

export default function RequirePermission({ resource, action, children, fallback = null }) {
  const role = getCurrentRole();
  return can(role, resource, action) ? <>{children}</> : <>{fallback}</>;
}
