# Route Permission Guards ✅

## Overview
Route-level permission guards prevent unauthorized users from accessing entire pages via deep links. This complements component-level guards (which hide buttons) by providing a "deny early" chokepoint at the router layer.

## Implementation

### Architecture
**Two-layer security:**
1. **Component-level guards** (`<RequirePermission>`) - Hide/show UI elements
2. **Route-level guards** (`<RoutePermission>`) - Block entire pages

### Files Created/Modified

#### 1. Route Guard Component: `apps/coordination_ui/src/components/RoutePermission.jsx`

```jsx
import React from "react";
import { can } from "../lib/can";
import { getCurrentRole } from "../lib/authRole";

export default function RoutePermission({ 
  resource, 
  action = "read", 
  children, 
  fallback = null 
}) {
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
```

**Features:**
- ✅ Checks role-based permissions before rendering
- ✅ Shows 403 Forbidden page when access denied
- ✅ Customizable fallback component
- ✅ Uses same `can()` helper as component guards

#### 2. Router Protection: `apps/coordination_ui/src/App.jsx`

**Protected Routes:**

```jsx
// Root path "/" - Project List
<Route
  path="/"
  element={
    <RequireAuth>
      <RoutePermission resource="projects" action="read">
        <ProjectList {...props} />
      </RoutePermission>
    </RequireAuth>
  }
/>

// Project Detail "/project/:id"
<Route 
  path="/project/:projectId" 
  element={
    <RequireAuth>
      <RoutePermission resource="projects" action="read">
        <ProjectDetail />
      </RoutePermission>
    </RequireAuth>
  } 
/>
```

**Security layers:**
1. `<RequireAuth>` - Ensures user is logged in
2. `<RoutePermission>` - Checks resource-level permissions
3. Backend API - Enforces permissions on every request

## Testing the Route Guards

### Test 1: Access Granted (Admin Role)

**Setup:**
- Current role: Admin
- Permission: `projects.read: true` (from rbac.json)

**Steps:**
1. Navigate to root `/` → ✅ Project list loads
2. Navigate to `/project/13c78ff2-d3e9-4873-8b0c-14609ccd86bf` → ✅ Project detail loads
3. All project routes accessible

**Expected Result:** Full access to Projects routes

### Test 2: Access Denied (Inventory Manager Role)

**Setup:**
- Current role: Inventory Manager
- Permission: `projects.read: false` (from rbac.json line 93)

**Steps:**
1. Click **"INVENTORY_MANAGER - Inventory Manager"** in dev banner
2. Navigate to root `/` → ❌ 403 Forbidden page
3. Navigate to `/project/:id` → ❌ 403 Forbidden page
4. Try deep-linking to project URL → ❌ 403 Forbidden page

**Expected Result:**
```
403 — Not allowed
You don't have permission to view this page.
```

### Test 3: Partial Access (Project Manager Role)

**Setup:**
- Current role: Project Manager
- Permission: `projects.read: true`, scope: "own"

**Steps:**
1. Navigate to `/` → ✅ Project list loads (filtered to own projects)
2. Navigate to own project → ✅ Detail loads
3. Navigate to someone else's project → Backend API blocks (not route guard)

**Expected Result:** Route accessible, but backend enforces scope

## Permission Matrix

| Role | projects.read | Root `/` Access | Detail `/project/:id` Access |
|------|--------------|----------------|------------------------------|
| **Admin** | ✅ true | ✅ Granted | ✅ Granted |
| **Ops Lead** | ✅ true | ✅ Granted | ✅ Granted |
| **Scheduler** | ✅ true | ✅ Granted | ✅ Granted |
| **Field Ops** | ✅ true (assigned) | ✅ Granted | ✅ Granted |
| **Project Manager** | ✅ true (own) | ✅ Granted | ✅ Granted |
| **Client Guest** | ✅ true (shared) | ✅ Granted | ✅ Granted |
| **Contributor** | ✅ true (assigned) | ✅ Granted | ✅ Granted |
| **Accounting** | ✅ true | ✅ Granted | ✅ Granted |
| **Viewer** | ✅ true | ✅ Granted | ✅ Granted |
| **Inventory Manager** | ❌ **false** | ❌ **403 Forbidden** | ❌ **403 Forbidden** |
| **Trainer** | ✅ true | ✅ Granted | ✅ Granted |
| **Office Admin** | ✅ true | ✅ Granted | ✅ Granted |
| **Estimator** | ✅ true | ✅ Granted | ✅ Granted |
| **Subcontractor** | ✅ true | ✅ Granted | ✅ Granted |

## Benefits

✅ **Prevent deep-link leaks** - Users can't bypass UI by typing URLs  
✅ **Single chokepoint** - One place to enforce route-level access  
✅ **Consistent with component guards** - Uses same `can()` helper  
✅ **Backend still authoritative** - API remains the security source of truth  
✅ **Better UX** - Shows clear 403 message instead of empty pages  
✅ **Reduces refactors** - Add protection once at router level  

## Design Decisions

### Why wrap with RequireAuth AND RoutePermission?
- **RequireAuth** checks authentication (logged in?)
- **RoutePermission** checks authorization (allowed to view?)
- Both are needed for complete security

### Why show 403 instead of redirect?
- **Clear feedback** - User knows they lack permission
- **No infinite loops** - Avoid redirect cycles
- **Debug-friendly** - Easy to spot permission issues

### Why use same `can()` helper?
- **Single source of truth** - RBAC logic in one place
- **Consistent behavior** - Routes and components use same rules
- **Type-safe** - TypeScript benefits for both

## Adding Protection to New Routes

### Step 1: Identify the route
```jsx
<Route path="/my-new-route" element={<MyNewComponent />} />
```

### Step 2: Wrap with guards
```jsx
<Route 
  path="/my-new-route" 
  element={
    <RequireAuth>
      <RoutePermission resource="myResource" action="read">
        <MyNewComponent />
      </RoutePermission>
    </RequireAuth>
  } 
/>
```

### Step 3: Test both scenarios
1. With allowed role → Component renders
2. With denied role → 403 Forbidden shows

## Custom Forbidden Page (Optional)

Create a dedicated 403 page:

```jsx
// apps/coordination_ui/src/pages/Forbidden.jsx
export default function Forbidden() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">403 — Forbidden</h1>
      <p className="mt-2 text-sm text-gray-600">
        You don't have permission to access this page.
      </p>
      <p className="mt-4">
        <a href="/" className="text-primary underline">
          Return to Dashboard
        </a>
      </p>
    </div>
  );
}
```

Then use it as fallback:

```jsx
import Forbidden from './pages/Forbidden';

<RoutePermission 
  resource="projects" 
  action="read"
  fallback={<Forbidden />}
>
  <ProjectDetail />
</RoutePermission>
```

## Security Layers

**Frontend (UX Layer):**
1. Component guards hide buttons → Prevent accidental clicks
2. Route guards block pages → Prevent deep-link access
3. Uses `rbac.json` for instant decisions

**Backend (Security Layer):**
1. Middleware enforces on every API call
2. Database stores authoritative permissions
3. Cannot be bypassed by frontend manipulation

## Current Protected Routes

| Path | Resource | Action | Protected Component |
|------|----------|--------|-------------------|
| `/` | projects | read | ProjectList |
| `/project/:projectId` | projects | read | ProjectDetail |

## Next Steps (Optional)

1. **Protect more routes** - Add guards to sensitive pages
2. **Custom 403 pages** - Create branded forbidden pages per section
3. **Analytics** - Track 403 events to identify permission issues
4. **Audit logging** - Log blocked access attempts for security
5. **Graceful degradation** - Show limited content instead of full 403

## Troubleshooting

### Issue: 403 shows for authorized user

**Cause:** RBAC config mismatch or localStorage corruption

**Fix:**
1. Check `apps/coordination_ui/src/config/rbac.json`
2. Verify role has `projects.read: true`
3. Clear localStorage and re-login
4. Check `getCurrentRole()` returns correct role

### Issue: Unauthorized user sees page

**Cause:** Missing route guard wrapper

**Fix:**
1. Verify `<RoutePermission>` wraps the route element
2. Check import statement for `RoutePermission`
3. Restart frontend workflow

### Issue: Backend still allows access

**Cause:** Backend permissions not enforced

**Fix:**
- Backend middleware must check permissions independently
- Frontend guards are UX only, not security

## Success Metrics

✅ **Implemented** - Route guards on Projects routes  
✅ **Tested** - Admin sees pages, Inventory Manager sees 403  
✅ **Documented** - Clear testing instructions  
✅ **Production-ready** - Complements component-level guards  

---

**Status:** ✅ **COMPLETE** - Route-level permission guards fully functional!

**Mini lesson:** Page guards (route-level) and widget guards (component-level) form a pinch point. The route guard gives you a single "deny early" chokepoint; the component guards handle finer-grained controls inside the page. Backend middleware remains the authoritative security layer.
