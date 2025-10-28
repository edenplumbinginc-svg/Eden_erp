# RBAC Testing Guide

## Quick Test

1. **Open the app** - DevAuthSwitcher shows all 14 roles at the top
2. **Navigate to any task with comments** (e.g., `/task/0ace1d0f-5599-42bd-969d-d86d1720bef1`)
3. **Hover over a comment** - As **Admin**, you should see a 🗑️ delete button appear
4. **Switch to Viewer role** - Click "VIEWER - Viewer" in the dev banner
5. **Refresh the page** - The delete button should now be HIDDEN
6. **Switch back to Admin** - Button reappears

## How It Works

### Frontend (Instant UX)
- `rbac.json` - 14 roles with granular permissions
- `can(role, resource, action)` - Permission check helper
- `<RequirePermission>` - Wrapper component that hides UI elements
- `DevAuthSwitcher` - Exposes `window.__DEV_ROLE` for permission checks

### Backend (Security Layer)
- Database stores roles and permissions (seeded via `scripts/seed-rbac.mjs`)
- Backend middleware enforces permissions on API routes
- Dev mode uses `X-Dev-User-Email`, `X-Dev-User-Id`, `X-Dev-Role` headers

## Hybrid Architecture Benefits

✅ **Defense in Depth**: Backend DB cannot be bypassed (security)
✅ **Instant Feedback**: Frontend JSON provides immediate UI updates (UX)
✅ **Single Source of Truth**: Database is authoritative, frontend mirrors it
✅ **Dev Experience**: Easy role switching without authentication friction

## Proof of Concept

Comment delete button in TaskDetail.jsx is guarded by:
1. Backend permission check: `useHasPermission('task.delete')`  
2. Frontend RBAC wrapper: `<RequirePermission resource="tasks" action="delete">`

Both layers work together to ensure security and smooth UX.

## Next Steps

To guard more UI elements:
```jsx
import RequirePermission from '../components/RequirePermission';

<RequirePermission resource="projects" action="delete">
  <button>Delete Project</button>
</RequirePermission>
```

To check permissions in code:
```javascript
import { can } from '../lib/can';
import { getCurrentRole } from '../lib/authRole';

const role = getCurrentRole();
if (can(role, 'tasks', 'create')) {
  // Show create task button
}
```
