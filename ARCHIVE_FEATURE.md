# Archive Project Feature

## Overview
Soft-delete functionality for projects using the hybrid RBAC system. Archive projects without losing data, making them reversible and reducing blast radius compared to hard deletes.

## Implementation

### Database
- Added `archived` column to `projects` table (BOOLEAN, default FALSE)
- Column returns in GET /projects/:id API response
- Column accepted in PATCH /projects/:id API request

### Backend Changes
**File: `routes/projects.js`**
- Updated GET /:id to include `archived` in SELECT statement
- Updated PATCH /:id to accept `archived` parameter
- Added `archived: z.boolean().optional()` to `UpdateProjectSchema` validation

### Frontend Changes

**File: `apps/coordination_ui/src/services/api.js`**
- Added `archiveProject(id)` method that sends PATCH with `{ archived: true }`

**File: `apps/coordination_ui/src/pages/ProjectDetail.jsx`**
- Added "📦 Archive" button guarded by `<RequirePermission resource="archive" action="batch">`
- Button hidden when project is already archived
- Displays "Archived" badge when project.archived is true
- Uses ConfirmDialog for user confirmation before archiving
- Optimistic UI updates with cache invalidation

## RBAC Permissions

Archive permissions are level-based:
- **Admin**: `archive.level: "batch"` → Can archive any project ✅
- **Ops Lead**: `archive.level: "batch"` → Can archive any project ✅
- **Project Manager**: `archive.level: "own"` → Can archive own projects only
- **Viewer**: `archive.level: "none"` → Cannot archive ❌

## Testing

1. **As Admin** - Navigate to any project → Archive button visible
2. **As Viewer** - Navigate to any project → Archive button hidden
3. Click Archive → Confirmation dialog appears
4. Confirm → Project marked as archived, badge appears
5. Button disappears after archiving

## User Experience

- **Reversible**: Soft-delete doesn't lose data
- **Clear feedback**: "Archived" badge shows status
- **Confirmation**: Dialog prevents accidental archiving
- **Role-based**: Only authorized roles see the button

## Next Steps

1. Add "Unarchive" button for restoring archived projects
2. Filter archived projects in project list views
3. Add "Include archived" toggle in project filters
4. Consider hard-delete behind separate permission with two-step confirm

## Security

- ✅ Backend enforces permissions via middleware
- ✅ Frontend hides button for unauthorized roles
- ✅ Validation schema ensures boolean type safety
- ✅ Confirmation dialog prevents accidental clicks
