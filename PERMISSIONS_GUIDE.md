# Permission Middleware Guide

## Overview

Your Eden ERP now has **permission-based route protection** using the RBAC foundation. Routes can enforce specific permissions like `projects:read`, `estimation:write`, etc.

**Implementation Time: ~20 minutes**

---

## How It Works

### 1. Permission Middleware (`middleware/permissions.js`)

The middleware provides three functions:

**`getUserPermissions(userId)`**
- Fetches all permission codes for a user
- Queries: `user_roles` → `role_permissions` → `permissions`
- Returns array like `["projects:read", "projects:write"]`
- **Throws errors** (doesn't suppress them) for proper error handling

**`requirePerm(permissionCode)`**
- Express middleware factory
- Checks if authenticated user has the required permission
- Admin fast-path: users with `admin:manage` bypass all checks
- Returns proper HTTP status codes:
  - `401` if not authenticated
  - `403` if missing permission
  - `500` if database error occurs

**`hasPerm(userId, permissionCode)`**
- Helper function for programmatic checks
- Use in route logic when you need conditional behavior

---

## Usage Examples

### Protect a Route

```javascript
const { requirePerm } = require('../middleware/permissions');

// GET /api/projects - requires projects:read permission
router.get('/', authenticate, requirePerm('projects:read'), async (req, res) => {
  // Only users with projects:read (or admin:manage) can access
  const projects = await getProjects();
  res.json(projects);
});

// POST /api/projects - requires projects:write permission
router.post('/', authenticate, requirePerm('projects:write'), async (req, res) => {
  // Only users with projects:write can create projects
  const project = await createProject(req.body);
  res.json(project);
});

// DELETE /api/projects/:id - requires projects:manage permission
router.delete('/:id', authenticate, requirePerm('projects:manage'), async (req, res) => {
  // Only users with projects:manage can delete
  await deleteProject(req.params.id);
  res.json({ deleted: true });
});
```

### Programmatic Permission Check

```javascript
const { hasPerm } = require('../middleware/permissions');

router.get('/api/dashboard', authenticate, async (req, res) => {
  const userId = req.user.id;
  
  // Conditionally show different data based on permissions
  const canViewProjects = await hasPerm(userId, 'projects:read');
  const canViewEstimation = await hasPerm(userId, 'estimation:read');
  
  const dashboard = {
    projects: canViewProjects ? await getProjects() : null,
    estimates: canViewEstimation ? await getEstimates() : null
  };
  
  res.json(dashboard);
});
```

---

## Error Responses

### 401 Unauthorized (Not Authenticated)
```json
{
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Sign in required"
  }
}
```

**Cause:** User not authenticated (no auth headers/token)

---

### 403 Forbidden (Missing Permission)
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions",
    "required": "projects:read"
  }
}
```

**Cause:** User is authenticated but lacks the required permission  
**Note:** The `required` field shows which permission is needed

---

### 500 Internal Error (Database Failure)
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Permission check failed"
  }
}
```

**Cause:** Database query failed (connection lost, table missing, etc.)  
**Important:** This is a **real 500**, not a masked 403 — proper error semantics

---

## Testing Permissions

### Test in Development Mode

Use dev headers to simulate different users:

**No permission (403):**
```bash
curl -X GET http://localhost:3000/api/projects \
  -H "X-Dev-User-Email: nouser@example.com" \
  -H "X-Dev-User-Id: nouser"
```

**With permission (200):**
```bash
curl -X GET http://localhost:3000/api/projects \
  -H "X-Dev-User-Email: test@edenplumbing.com" \
  -H "X-Dev-User-Id: 855546bf-f53d-4538-b8d5-cd30f5c157a2"
```

---

### Assign Permissions to Test Users

**Create user:**
```sql
INSERT INTO users (email, name)
VALUES ('john@edenplumbing.com', 'John Doe')
RETURNING id;
```

**Assign role:**
```sql
-- Give user the 'ops' role (projects:read, projects:write)
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE u.email = 'john@edenplumbing.com'
  AND r.slug = 'ops';
```

**Verify permissions:**
```sql
SELECT u.email, r.slug as role, p.code as permission
FROM users u
JOIN user_roles ur ON ur.user_id = u.id
JOIN roles r ON r.id = ur.role_id
JOIN role_permissions rp ON rp.role_id = r.id
JOIN permissions p ON p.id = rp.permission_id
WHERE u.email = 'john@edenplumbing.com'
ORDER BY p.code;
```

---

## Admin Fast-Path

Users with the `admin:manage` permission **automatically pass all permission checks**, regardless of the specific permission required.

**Example:**
- Route requires `projects:read`
- User has `admin:manage` (but not `projects:read`)
- User still gets access ✓

This provides a secure "master key" for administrators.

---

## Permission Naming Convention

All permissions follow: **`<module>:<action>`**

**Available Modules:**
- `estimation` - Quote management
- `precon` - Pre-construction
- `projects` - Project operations
- `procurement` - Purchase orders
- `coord` - Coordination
- `hr` - Human resources
- `marketing` - Marketing campaigns
- `admin` - System administration

**Available Actions:**
- `read` - View data
- `write` - Create/edit data
- `manage` - Full administrative control

**Examples:**
- `projects:read` - Can view projects
- `estimation:write` - Can create/edit estimates
- `admin:manage` - Full system access

---

## Integration with Existing Auth

The permission middleware works **alongside** your existing authentication:

```javascript
// Middleware chain:
router.get('/', 
  authenticate,                    // Step 1: Verify user is logged in (existing)
  requirePerm('projects:read'),    // Step 2: Check permission (new)
  async (req, res) => {            // Step 3: Handle request
    // req.user is available from authenticate
    const projects = await getProjects();
    res.json(projects);
  }
);
```

**Important:** Always use `authenticate` **before** `requirePerm()` — the permission check needs `req.user.id`.

---

## Currently Protected Routes

| Route | Method | Permission | Description |
|-------|--------|------------|-------------|
| `/api/projects` | GET | `projects:read` | List all projects |

**Next steps:** Protect more routes as you build features:
- POST /api/projects → `projects:write`
- DELETE /api/projects/:id → `projects:manage`
- GET /api/estimates → `estimation:read`
- etc.

---

## Error Handling Semantics

**Critical improvement from architect review:**

The middleware now properly distinguishes between:

1. **Authorization failures (403)** - User lacks permission
2. **Database failures (500)** - System error during permission check

**Before fix:** DB errors were masked as 403  
**After fix:** DB errors correctly return 500

This ensures:
- ✅ Accurate error reporting
- ✅ Proper monitoring/alerting
- ✅ Better debugging experience

---

## Best Practices

### 1. Always Chain with Authentication
```javascript
// ✅ GOOD
router.get('/', authenticate, requirePerm('projects:read'), handler);

// ❌ BAD - permission check needs req.user
router.get('/', requirePerm('projects:read'), handler);
```

### 2. Use Specific Permissions
```javascript
// ✅ GOOD - specific permission
router.post('/api/projects', authenticate, requirePerm('projects:write'), handler);

// ❌ BAD - too broad
router.post('/api/projects', authenticate, requirePerm('admin:manage'), handler);
```

### 3. Match Permission to Action
```javascript
// ✅ GOOD - read for GET, write for POST
router.get('/api/data', requirePerm('module:read'), handler);
router.post('/api/data', requirePerm('module:write'), handler);

// ❌ BAD - write permission for GET
router.get('/api/data', requirePerm('module:write'), handler);
```

### 4. Least Privilege Principle
Assign users the **minimum permissions** needed for their role:
- Don't give everyone `admin:manage`
- Use specialized roles (ops, estimator, procurement, etc.)
- Grant additional permissions only when needed

---

## Troubleshooting

### "403 Forbidden" for valid user

**Check:**
1. Does user have a role assigned? `SELECT * FROM user_roles WHERE user_id = '...'`
2. Does that role have the required permission? `SELECT * FROM role_permissions WHERE role_id = '...'`
3. Is the permission code correct in the middleware? (e.g., `projects:read` not `project:read`)

**Fix:**
```sql
-- Assign missing role
INSERT INTO user_roles (user_id, role_id)
SELECT 'user-uuid', id FROM roles WHERE slug = 'ops';
```

---

### "500 Internal Error" during permission check

**Check:**
1. Is database connected? `curl http://localhost:3000/healthz`
2. Do RBAC tables exist? `\dt roles permissions role_permissions user_roles`
3. Check Backend logs for actual error

**Fix:**
- Database connection issue → restart Backend
- Missing tables → run `npm run seed:rbac`

---

### Permission middleware not working

**Check:**
1. Did you import it? `const { requirePerm } = require('../middleware/permissions');`
2. Is it in the right order? `authenticate` must come **before** `requirePerm`
3. Did you restart the Backend after adding middleware?

---

## Files Created/Modified

| File | Purpose |
|------|---------|
| `middleware/permissions.js` | Permission enforcement middleware |
| `routes/projects.js` | Updated with `requirePerm()` |
| `PERMISSIONS_GUIDE.md` | This documentation |
| `RBAC_GUIDE.md` | Underlying RBAC system docs |

---

## Next Steps

### 1. Protect More Routes

Add permission checks to other routes:

```javascript
// routes/tasks.js
router.get('/', authenticate, requirePerm('projects:read'), getTasks);
router.post('/', authenticate, requirePerm('projects:write'), createTask);

// routes/estimates.js
router.get('/', authenticate, requirePerm('estimation:read'), getEstimates);
router.post('/', authenticate, requirePerm('estimation:write'), createEstimate);
```

### 2. Add Permission-Based UI

Show/hide UI elements based on permissions:

```javascript
// Frontend example
const canEditProjects = await fetch('/api/user/permissions').then(r => r.json());
if (canEditProjects.includes('projects:write')) {
  showEditButton();
}
```

### 3. Monitor Permission Denials

Track 403 responses in logs to identify:
- Users needing additional permissions
- Misconfigured routes
- Potential security issues

---

*Last Updated: October 21, 2025*  
*RBAC Permission Middleware: ✅ Production-Ready*
