# UI Coverage Gate System

## Overview

The UI Coverage Gate is a **CI-ready quality gate** that prevents shipping half-built features by enforcing complete page coverage for all API resources.

## How It Works

1. **Contract Definition** (`docs/ui-contract.yaml`)
   - Defines all API resources and their required pages
   - Maps routes to expected page components
   - Specifies required states (loading, error, empty, etc.)

2. **Automated Checker** (`scripts/check-ui-coverage.js`)
   - Scans both `pages/` and `components/` directories
   - Handles multiple naming conventions (Page, View, Form, Queue, Viewer, etc.)
   - Provides detailed missing page reports
   - Exits with error code if coverage is incomplete

3. **npm Script** (`npm run check:ui`)
   - One command to validate full UI coverage
   - Designed for local dev and CI/CD pipelines

## Current Status

```
📊 Coverage Summary:
   ✅ Found:   22 pages
   ❌ Missing: 2 pages
```

### ✅ Complete Coverage (22 pages)

- **Core Features**
  - ✅ Dashboard (`/dashboard`)
  - ✅ Velocity Metrics (`/velocity`)
  - ✅ User Profile (`/profile`)
  
- **Projects**
  - ✅ Projects Delta View (`/projects-delta`)
  - ✅ Project Detail (`/project/[id]`)
  
- **Tasks**
  - ✅ All Tasks View (`/alltasks`)
  - ✅ Tasks Delta View (`/tasks-delta`)
  - ✅ Create Task (`/tasks/new`)
  - ✅ Task Detail (`/task/[id]`)
  
- **Reports & Analytics**
  - ✅ Reports Dashboard (`/reports`)
  - ✅ Performance Leaderboard (`/leaderboard`)
  
- **Admin**
  - ✅ RBAC Management (`/admin/rbac`)
  - ✅ Auto-Decisions (`/admin/decisions`)
  - ✅ Court Flow Analytics (`/admin/court-flow`)
  
- **Operational**
  - ✅ Audit Log (`/audit-log`)
  - ✅ Team Overview (`/team`)
  - ✅ Archive View (`/archive`)
  - ✅ Intake Queue (`/intake`)
  
- **Auth & Access**
  - ✅ Login (`/login`)
  - ✅ Signup (`/signup`)
  - ✅ Guest View (`/guest`)
  - ✅ Project Request Form (`/request-project`)

### ❌ Missing Pages (2 pages)

1. **Incidents Dashboard** (`/incidents`)
   - Expected: `IncidentsPage.jsx`
   - Purpose: Incident list and management view
   
2. **Incident Detail** (`/incidents/[id]`)
   - Expected: `IncidentDetail.jsx`
   - Purpose: Individual incident detail view

## Usage

### Local Development

```bash
# Check UI coverage
npm run check:ui

# Output on success
✅ UI coverage check PASSED
   All required pages exist!

# Output on failure
❌ UI coverage check FAILED
Missing pages:
  Resource: incidents
  Route:    /incidents
  Expected: IncidentsPage.jsx (or similar)
```

### CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: UI Coverage Gate
  run: npm run check:ui
```

The check will **fail the build** if any required pages are missing.

## Supported Naming Patterns

The checker recognizes these file naming conventions:

- `XxxPage.jsx/tsx` - Standard page pattern
- `XxxView.jsx/tsx` - View components
- `XxxForm.jsx/tsx` - Form pages
- `XxxViewer.jsx/tsx` - Viewer pages
- `XxxQueue.jsx/tsx` - Queue pages
- `XxxOverview.jsx/tsx` - Overview pages
- `SimpleXxxPage.jsx` - Simple/delta views
- `PerformanceXxxPage.jsx` - Performance pages
- `AdminXxxPage.jsx` - Admin pages
- `CreateXxxPage.jsx` - Creation forms
- Compound words (e.g., `ProjectRequestForm.jsx`)
- Dynamic routes (e.g., `TaskDetail.jsx` for `/task/[id]`)

## Benefits

1. **Prevents Incomplete Shipments** - CI fails if pages are missing
2. **Documentation** - Contract serves as single source of truth
3. **Onboarding** - New devs see exactly what pages need to exist
4. **Refactoring Safety** - Catch broken routes during reorganization
5. **Quality Gate** - No guesswork about what's complete

## Next Steps

To achieve 100% coverage:

1. Create `IncidentsPage.jsx` - Incident management dashboard
2. Create `IncidentDetail.jsx` - Individual incident view
3. Run `npm run check:ui` to verify

Once complete, the coverage gate will **block all CI builds** until fixed, ensuring production quality.
