# CI Quality Gates Setup

**Date**: October 25, 2025  
**Status**: ✅ CONFIGURED

---

## Overview

Added automated quality enforcement via GitHub Actions that runs on every PR and push to main/master. Ensures code quality, UI completeness, and navigation functionality before merging.

---

## Workflow Configuration

**File**: `.github/workflows/quality-gates.yml`

### Trigger Events
- ✅ All pull requests
- ✅ Pushes to `main` or `master` branches

### Job: `gates` (ubuntu-latest)

#### Steps Overview

1. **Checkout** - Get latest code
2. **Setup Node** - Node.js 20 with npm cache
3. **Install dependencies** - `npm ci` for clean install
4. **Build** - Compile coordination_ui app
5. **UI coverage** - Verify 100% page coverage (`npm run check:ui`)
6. **Install Playwright** - Install browsers with dependencies
7. **Start preview server** - Launch Vite preview on port 4173
8. **Smoke navigation** - Contract-driven route tests (`npm run test:smoke`)
9. **Upload artifacts** - Playwright reports + UI gaps (if any)

---

## Quality Gates Enforced

### 1. Build Gate ✅
**Command**: `npm run build`  
**Ensures**: 
- All TypeScript/JavaScript compiles successfully
- No syntax errors
- Showcase routes auto-generated (24 routes)
- Production-ready bundle created

**Failure Scenarios**:
- Import errors
- TypeScript type errors
- Missing dependencies
- Build configuration issues

---

### 2. UI Coverage Gate ✅
**Command**: `npm run check:ui`  
**Ensures**: 
- 100% page coverage for all API resources
- All routes defined in `docs/ui-contract.yaml` exist
- No half-built features shipped

**What It Checks**:
- Required pages exist (24/24 routes)
- Handles singular/plural naming patterns
- Dynamic route parameter variations

**Failure Scenarios**:
- Missing required page components
- API resource without corresponding UI
- Incomplete feature implementation

---

### 3. Smoke Navigation Gate ✅
**Command**: `npm run test:smoke`  
**Ensures**: 
- All 24 routes render without errors
- No runtime crashes
- Auth redirects work correctly
- Loading/error/empty states handled

**What It Tests**:
- Page loads successfully
- No console errors
- UI elements visible
- State handling (loading, error, unauthorized, empty, not_found)

**Environment Variables**:
- `PW_EMAIL` / `PW_PASSWORD` (optional) - For authenticated route testing
- `BASE_URL` - Set to `http://localhost:4173` (preview server)
- `PW_SKIP_WEBSERVER=1` - Manual server management in CI

**Failure Scenarios**:
- Runtime errors (undefined variables, null references)
- Missing route components
- Broken imports
- Auth configuration issues
- Server startup failures

---

## Artifacts Generated

### 1. Playwright Report (HTML)
**Path**: `coverage/playwright-report`  
**Uploaded**: Always (even on failure)  
**Contains**:
- Test results for all 24 routes
- Screenshots on failure
- Detailed error traces
- Execution timeline

**Access**: Click on workflow run → Artifacts → `playwright-report`

---

### 2. UI Coverage Gaps
**Path**: `coverage/ui-gaps.*`  
**Uploaded**: If failures detected  
**Contains**:
- List of missing pages
- Expected vs actual routes
- Recommendations for fixes

**Access**: Click on workflow run → Artifacts → `ui-gaps`

---

## Integration with Existing Workflows

### Existing: `deploy-canary.yml`
- Runs on push to `main`
- Focuses on deployment with release guard
- Includes backend tests (escalation worker)
- Performs staged canary deployment

### New: `quality-gates.yml`
- Runs on **all PRs** + push to main/master
- Focuses on **code quality checks**
- Frontend-focused (build + UI + navigation)
- Blocks merging if quality gates fail

**No Conflicts**: Both workflows can coexist. Quality Gates provides an additional safety layer before deployment.

---

## Local Development Scripts

All CI checks can be run locally:

```bash
# Build check
npm run build

# UI coverage check
npm run check:ui

# Smoke tests (with dev server)
npm run test:smoke

# Smoke tests (headed mode, manual server)
npm run test:smoke:headed

# Smoke tests (UI mode for debugging)
npm run test:smoke:ui
```

---

## Success Criteria

A PR passes quality gates when:

✅ **Build succeeds** - No compilation errors  
✅ **UI coverage = 100%** - All 24 routes implemented  
✅ **Smoke tests pass** - All routes render correctly  

If any gate fails, the workflow shows ❌ and blocks merge (if branch protection enabled).

---

## Secret Configuration (Optional)

For **authenticated route testing**, add these GitHub secrets:

1. Go to repo → Settings → Secrets → Actions
2. Add secrets:
   - `PW_EMAIL` - Valid Supabase user email
   - `PW_PASSWORD` - User password

**Without these secrets**: Tests will verify auth redirects work correctly (unauthorized state).

**With secrets**: Tests can verify authenticated user flows.

---

## Artifact Retention

- **Playwright Reports**: 90 days (GitHub default)
- **UI Gaps**: 90 days
- Download before expiration if needed

---

## Troubleshooting

### Build Fails in CI but Works Locally
- Clear local cache: `rm -rf node_modules package-lock.json && npm i`
- Check for environment-specific code
- Verify all dependencies in `package.json`

### UI Coverage Fails
- Run locally: `npm run check:ui`
- Check `docs/ui-contract.yaml` for required pages
- Verify page components exist in `apps/coordination_ui/src/pages/`

### Smoke Tests Fail
- Check Playwright report artifact for screenshots
- Run locally with headed mode: `npm run test:smoke:headed`
- Verify preview server starts: `cd apps/coordination_ui && npm run preview`
- Check for runtime errors in browser console

### Preview Server Won't Start
- Ensure build completed successfully
- Check if port 4173 is available
- Verify `dist` folder exists in `apps/coordination_ui/`

---

## Next Steps

### Recommended Actions

1. **Enable Branch Protection** (repo settings):
   - Require status checks to pass before merging
   - Select "gates" job from quality-gates workflow
   - Prevents merging PRs with failing gates

2. **Add Status Badge** to README:
   ```markdown
   ![Quality Gates](https://github.com/YOUR_ORG/Eden_erp/actions/workflows/quality-gates.yml/badge.svg)
   ```

3. **Monitor First Runs**:
   - Watch first PR for successful execution
   - Verify artifacts are generated
   - Adjust timeout if needed (current: 30s per test)

### Optional Enhancements

- Add performance budgets (bundle size checks)
- Integrate visual regression testing
- Add accessibility (a11y) tests with Playwright
- Enable parallel test execution (shard tests)

---

## Conclusion

Your CI pipeline now automatically enforces:
- ✅ Clean builds
- ✅ 100% UI coverage
- ✅ All routes functional

**No manual quality checks needed** - GitHub Actions handles it on every PR! 🚀

---

## Quick Reference

| Check | Local Command | CI Step | Artifacts |
|-------|---------------|---------|-----------|
| Build | `npm run build` | Step 4 | None |
| UI Coverage | `npm run check:ui` | Step 5 | ui-gaps.* |
| Navigation | `npm run test:smoke` | Step 8 | playwright-report |

**All checks must pass** ✅ to merge PR.
