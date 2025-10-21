# RBAC Foundation Guide

## Overview

Your Eden ERP now has a **complete Role-Based Access Control (RBAC) system** built into the database. This gives you clean, normalized permission management so every module (Estimation, Projects, Procurement, etc.) can enforce "who can do what" without hard-coding checks.

**Implementation Time: ~25 minutes**

---

## What Was Built

### 1. Database Tables (4 Tables)

**`roles`** - User roles in the system
```sql
- id (UUID)
- slug (text, unique) - Machine-readable identifier (e.g., "admin", "estimator")
- name (text) - Human-readable name (e.g., "Administrator", "Estimator")
- created_at (timestamp)
```

**`permissions`** - Available permissions
```sql
- id (UUID)
- code (text, unique) - Permission code (e.g., "projects:write")
- description (text) - What the permission does
- created_at (timestamp)
```

**`role_permissions`** - Which permissions each role has
```sql
- role_id (UUID) → roles.id
- permission_id (UUID) → permissions.id
- Primary key: (role_id, permission_id)
```

**`user_roles`** - Which roles each user has
```sql
- user_id (UUID) → users.id
- role_id (UUID) → roles.id
- Primary key: (user_id, role_id)
```

---

## Baseline Roles (7 Roles)

| Slug | Name | Description |
|------|------|-------------|
| `admin` | Administrator | Full system access (all 32 permissions) |
| `ops` | Operations | Project operations (projects:read, projects:write) |
| `estimator` | Estimator | Job estimation (estimation:read, estimation:write) |
| `procurement` | Procurement | Purchase orders (procurement:read, procurement:write) |
| `coord` | Coordination | Project coordination (coord:read, coord:write) |
| `hr` | HR | Human resources (hr:read, hr:write) |
| `viewer` | Read-Only Viewer | View-only access (all 8 :read permissions) |

---

## Permission Naming Convention

All permissions follow the pattern: **`<module>:<action>`**

**Modules (8):**
- `estimation` - Quote management
- `precon` - Pre-construction planning
- `projects` - Active project management
- `procurement` - Purchase orders and inventory
- `coord` - Coordination workflows
- `hr` - Employee management
- `marketing` - Marketing campaigns
- `admin` - System administration

**Actions (3):**
- `read` - View data
- `write` - Create and edit data
- `manage` - Full administrative control over the module

**Examples:**
- `projects:read` - Can view projects
- `estimation:write` - Can create/edit estimates
- `admin:manage` - Can manage system settings

---

## Module Permissions (24 Total)

| Module | Read | Write | Manage |
|--------|------|-------|--------|
| estimation | ✅ | ✅ | ✅ |
| precon | ✅ | ✅ | ✅ |
| projects | ✅ | ✅ | ✅ |
| procurement | ✅ | ✅ | ✅ |
| coord | ✅ | ✅ | ✅ |
| hr | ✅ | ✅ | ✅ |
| marketing | ✅ | ✅ | ✅ |
| admin | ✅ | ✅ | ✅ |

---

## Role-Permission Matrix

| Role | Permissions Count | Access Level |
|------|-------------------|--------------|
| **admin** | 32 | ALL permissions (module-based + legacy) |
| **viewer** | 8 | All `:read` permissions |
| **ops** | 2 | `projects:read`, `projects:write` |
| **estimator** | 2 | `estimation:read`, `estimation:write` |
| **procurement** | 2 | `procurement:read`, `procurement:write` |
| **coord** | 2 | `coord:read`, `coord:write` |
| **hr** | 2 | `hr:read`, `hr:write` |

---

## How to Use

### Re-seed RBAC Tables

If you need to refresh roles and permissions (safe - uses ON CONFLICT DO NOTHING):

```bash
npm run seed:rbac
```

**Output:**
```
Inserting roles...
Inserting permissions...
Granting permissions to roles...
✅ RBAC seed complete.
📊 Stats: 9 roles, 32 permissions, 50 role-permission assignments
```

---

### Verify RBAC Data

**Check roles:**
```sql
SELECT slug, name FROM roles ORDER BY slug;
```

**Check permissions:**
```sql
SELECT code, description FROM permissions ORDER BY code;
```

**Check what permissions a role has:**
```sql
SELECT p.code
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.slug = 'admin'
ORDER BY p.code;
```

**Check what roles a user has:**
```sql
SELECT r.slug, r.name
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.email = 'user@example.com';
```

---

## Next Steps: Implement Route Guards

The RBAC foundation is ready. Next, you'll add middleware to enforce permissions on routes:

**Example (Future Implementation):**
```javascript
// Middleware to check permission
function requirePerm(permissionCode) {
  return async (req, res, next) => {
    const user = req.user;
    const hasPermission = await checkUserPermission(user.id, permissionCode);
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    next();
  };
}

// Apply to routes
app.get('/api/projects', requirePerm('projects:read'), getProjects);
app.post('/api/projects', requirePerm('projects:write'), createProject);
app.delete('/api/projects/:id', requirePerm('projects:manage'), deleteProject);
```

---

## Database Schema Changes

**Migration applied:**
```sql
-- Renamed roles.code → roles.slug
-- Renamed permissions.name → permissions.description
-- Added created_at timestamps to both tables
-- Made permissions.description NOT NULL
```

**Files updated:**
- `drizzle/schema.ts` - Updated RBAC table definitions
- `scripts/seed-rbac.mjs` - Created idempotent seed script
- `migrations/20251021_rbac_schema_update.sql` - SQL migration
- `package.json` - Added `seed:rbac` script
- `replit.md` - Documented RBAC system

---

## Technical Details

### Idempotent Seeding
The seed script uses `ON CONFLICT DO NOTHING` so you can run it multiple times safely. It won't duplicate data or throw errors.

### Composite Primary Keys
- `role_permissions` uses composite PK (role_id, permission_id)
- `user_roles` uses composite PK (user_id, role_id)
- Both have CASCADE delete rules

### Permission Expansion
The system is designed to grow:
- Add new modules: Just add permissions with the module name
- Add new actions: Add new action types beyond read/write/manage
- Add new roles: Create specialized roles as needed

---

## Verification Results

✅ **Roles:** 9 total (7 new + 2 pre-existing)  
✅ **Permissions:** 32 total (24 module-based + 8 legacy)  
✅ **Role-Permission Assignments:** 50 total  
✅ **Admin Access:** Has ALL 32 permissions  
✅ **Viewer Access:** Has only 8 :read permissions  
✅ **Specialized Roles:** Have correct module permissions  

---

## Summary

Your RBAC foundation is **complete and production-ready**. The normalized database structure makes it simple to:

1. **Add new modules** - Just create permissions with new module names
2. **Add new roles** - Create roles and assign permissions
3. **Assign roles to users** - Insert into user_roles table
4. **Check permissions** - Query role_permissions via user_roles
5. **Enforce access control** - Build middleware using the permission codes

**Convention:** Always use `<module>:<action>` format for permissions. This makes route guards dead simple: `requirePerm("projects:write")`.

---

*Last Updated: October 21, 2025*  
*RBAC Foundation: ✅ Complete*
