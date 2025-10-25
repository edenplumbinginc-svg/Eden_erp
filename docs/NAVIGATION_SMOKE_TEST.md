# Navigation Smoke Test

## Overview

The **Navigation Smoke Test** is a contract-driven Playwright test suite that validates all 24 required pages from `docs/ui-contract.yaml` actually render in the browser. This creates an executable contract that catches broken routes, redirects, and rendering failures before they reach production.

## Why This Matters

Even with 100% UI coverage (file existence), routes can still fail due to:
- Broken React Router configuration
- Missing imports or circular dependencies
- Runtime JavaScript errors
- Incorrect component props
- Auth redirect loops
- API endpoint failures

The smoke test **validates the entire user journey** by actually loading each page in a headless browser.

## How It Works

1. **Load Contract** - Reads all `required_pages` from `docs/ui-contract.yaml`
2. **Inflate Dynamic Routes** - Replaces `[id]` with test value `123`
3. **Visit Each Route** - Navigates to every route in headless Chrome
4. **Verify Rendering** - Asserts visible header, heading, or `data-state` element
5. **Handle Auth Redirects** - Accepts `/login` redirects with valid form
6. **Generate Report** - Creates HTML report at `coverage/playwright-report`

## Test Configuration

### Playwright Config (`playwright.config.cjs`)

```javascript
{
  testDir: 'tests',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  globalSetup: require.resolve('./tests/global-setup.cjs'), // Auth setup
  use: {
    baseURL: 'http://localhost:5000',  // Eden ERP frontend
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    storageState: 'coverage/storageState.json' // If auth successful
  },
  webServer: {
    command: 'npm run dev:web',  // Auto-starts Vite server
    url: 'http://localhost:5000',
    timeout: 120_000
  }
}
```

### Global Setup (`tests/global-setup.cjs`)

Authenticates before running tests if `PW_EMAIL` and `PW_PASSWORD` are provided:

```javascript
// Logs in via Supabase authentication
// Saves browser storage state with JWT token
// Tests reuse this authenticated state
```

**With credentials:**
- ✅ Tests run authenticated
- ✅ Protected routes render actual content
- ✅ Full validation of all features

**Without credentials:**
- ✅ Tests run unauthenticated  
- ✅ Protected routes redirect to `/login`
- ✅ Tests verify login form renders

### Smoke Test Spec (`tests/smoke-nav.spec.cjs`)

**Strict Selector Criteria:**

The test requires **route-specific content**, NOT shared layout elements:

```javascript
// ✅ VALID: Route-specific content
'h1'                              // Page heading
'h2', 'h3'                        // Section headings
'[role="heading"]'                // ARIA heading
'[data-state="loading"]'          // Loading state
'[data-state="error"]'            // Error state
'[data-state="unauthorized"]'     // Access denied
'[data-state="empty"]'            // No data
'[data-state="not_found"]'        // 404

// ❌ INVALID: Generic layout elements (removed)
'header'   // Shared EdenHeader component
'main'     // Shared layout wrapper
'[data-testid]'  // Too permissive
```

**Why This Is Strict Enough:**

1. **EdenHeader contains NO h1/h2/h3 tags** (only nav links and spans)
2. **All page components use h1 for their title**
3. **If a route component fails to render** (React error, missing import) → NO headings → TEST FAILS
4. **State markers are route-specific** (loading skeletons, error states, etc.)

**Regression Detection:**

- Route shows only layout wrapper → FAIL (no headings)
- Route has runtime error → FAIL (no headings)
- Route renders properly → PASS (h1/h2/h3 present)

The test suite:
- ✅ Loads 24 routes from UI contract
- ✅ Tests each route individually
- ✅ Validates visible UI elements or state markers
- ✅ Handles auth redirects gracefully
- ✅ Captures console errors and page errors
- ✅ Generates detailed HTML reports

## Valid UI Indicators (STRICT)

Routes pass if they render ANY of these **route-specific** elements:

**Page Headings (Route-Specific):**
- `<h1>` - Page title heading
- `<h2>` - Section heading
- `<h3>` - Subsection heading
- `[role="heading"]` - ARIA heading

**State Markers (Route-Specific):**
- `[data-state="loading"]` - Loading skeleton
- `[data-state="error"]` - Error state
- `[data-state="unauthorized"]` - Permission denied
- `[data-state="empty"]` - No data state
- `[data-state="not_found"]` - 404 state

**Auth Redirects:**
- Redirects to `/login` or `/signup` with visible form

**NOTE:** Generic layout elements (`<header>`, `<main>`) are NOT accepted because they're part of the shared shell and don't prove route-specific content rendered.

## Usage

### Local Testing (Development Server)

```bash
# Run without authentication (accept /login redirects)
npm run test:smoke:headed

# Run with authentication (test protected routes)
PW_EMAIL=test@edenplumbing.com PW_PASSWORD=yourpassword npm run test:smoke:headed
```

This runs tests against your running dev server without building.

**Authenticated Testing:**
```bash
# Set credentials and run
export PW_EMAIL="test@edenplumbing.com"
export PW_PASSWORD="EdenPlumbing2025!"
npm run test:smoke
```

**Unauthenticated Testing:**
```bash
# Just run without credentials
npm run test:smoke
```

### CI/CD Testing (Production Build)

```bash
# Install Playwright browsers (CI only)
npx playwright install --with-deps

# Run headless tests (builds and previews app)
npm run test:smoke
```

This builds the app, starts a preview server, and runs tests.

### Interactive UI Mode

```bash
# Debug tests interactively
npm run test:smoke:ui
```

Opens Playwright's interactive UI for debugging.

## CI/CD Integration

### GitHub Actions Workflow

See `docs/github-actions-smoke-test.yml` for the complete workflow.

**Key features:**
- ✅ Automatically installs Playwright browsers
- ✅ Optionally authenticates if `PW_EMAIL`/`PW_PASSWORD` secrets exist
- ✅ Uploads HTML reports on failure
- ✅ Fails build if any route breaks

**Setup Repository Secrets:**

1. Go to: **Repository Settings → Secrets → Actions**
2. Add secret: `PW_EMAIL` = `test@edenplumbing.com`
3. Add secret: `PW_PASSWORD` = `<your test user password>`

**Without secrets:** Tests verify auth redirects work  
**With secrets:** Tests verify protected content renders

### Quality Gates

The smoke test **blocks merges** if:
- ❌ Any route fails to render
- ❌ JavaScript errors occur on load
- ❌ Components throw React errors
- ❌ Routes redirect to unexpected locations
- ❌ Timeouts occur (>30s per route)

## Test Results

### Success Output

```
📋 Loaded 24 routes from UI contract:
/alltasks
/archive
/audit-log
...

✅ Running 24 tests using 1 worker

  ✓  renders /alltasks
  ✓  renders /archive
  ✓  renders /incidents
  ✓  renders /incidents/123
  ...

📊 Smoke Test Summary:
   Total routes tested: 24
   ✅ All routes from UI contract validated

24 passed (1.2m)
```

### Failure Output

```
❌ renders /incidents

Error: Expected /incidents to render a header, heading, or data-state element
    
Received:
  locator('header, h1, h2, ...') (visible)
  
Timeout of 5000ms exceeded waiting for element to be visible.
```

Failed tests generate:
- Screenshots (saved to `test-results/`)
- Traces (view with `npx playwright show-trace`)
- HTML report (view with `npx playwright show-report`)

## Debugging

### View HTML Report

```bash
npx playwright show-report coverage/playwright-report
```

Opens interactive report with:
- Test results and timings
- Screenshots of failures
- Console logs and errors
- Network requests
- Trace timeline

### Run Single Route

```bash
# Test specific route
npx playwright test --grep "renders /incidents"
```

### Debug Mode

```bash
# Run with browser visible and debugger
npx playwright test --debug
```

## Coverage by Route Type

**✅ Core Pages (3):** Dashboard, Velocity, Profile  
**✅ Projects (2):** Delta view, Detail view  
**✅ Tasks (4):** All tasks, Delta, Create, Detail  
**✅ Reports (2):** Dashboard, Leaderboard  
**✅ Admin (3):** RBAC, Decisions, Court Flow  
**✅ Operations (4):** Audit, Team, Archive, Intake  
**✅ Auth (3):** Login, Signup, Guest  
**✅ Requests (1):** Project Request Form  
**✅ Incidents (2):** Dashboard, Detail  

**Total: 24 routes validated** 🎉

## Benefits

1. **Catch Broken Routes** - Before users see 404s
2. **Validate Redirects** - Ensure auth flows work correctly
3. **Detect JS Errors** - Runtime errors that tests might miss
4. **Verify State Handling** - Loading, error, empty states
5. **Document User Flows** - Contract serves as living documentation
6. **Fast Feedback** - ~60-90 seconds for full test suite
7. **CI/CD Integration** - Automated quality gate

## Maintenance

### Adding New Routes

1. Add route to `docs/ui-contract.yaml`
2. Run `npm run check:ui` (validates page file exists)
3. Run `npm run test:smoke:headed` (validates route renders)
4. Fix any failures before committing

### Updating Tests

The smoke test is **contract-driven** - it automatically picks up new routes from the UI contract. No test code changes needed when adding pages!

## Troubleshooting

### "Executable doesn't exist" Error

Browsers not installed. Run:
```bash
npx playwright install --with-deps
```

### All Tests Redirect to /login

App requires authentication. This is expected behavior - tests verify login form renders.

### Timeout Errors

Increase timeout in `playwright.config.cjs`:
```javascript
timeout: 60_000  // 60 seconds
```

### WebServer Won't Start

Check if port 5000 is already in use:
```bash
lsof -i :5000
```

## Next Steps

With both **UI Coverage Gate** and **Navigation Smoke Test**, your CI/CD pipeline now enforces:

1. ✅ **File Coverage** - All required page files exist (`npm run check:ui`)
2. ✅ **Runtime Validation** - All routes render properly (`npm run test:smoke`)
3. ✅ **Quality Gates** - Both must pass before merge

This creates a **production-ready quality assurance system** that prevents broken features from shipping.
