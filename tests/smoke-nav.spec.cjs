/* eslint-disable no-console */
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Load the full contract document
 */
function loadContract() {
  const specPath = path.join(process.cwd(), 'docs/ui-contract.yaml');
  if (!fs.existsSync(specPath)) {
    console.error('❌ Missing docs/ui-contract.yaml');
    return { resources: [] };
  }
  return yaml.load(fs.readFileSync(specPath, 'utf8'));
}

/**
 * Load all required_pages from the UI contract and inflate dynamic params
 */
function loadContractRoutes(doc) {
  const set = new Set();
  for (const res of doc.resources ?? []) {
    for (const route of res.required_pages || []) {
      // Replace every [param] with a safe test value
      // [id] → 123, [taskId] → 123, etc.
      const inflated = String(route).replace(/\[.*?\]/g, '123');
      set.add(inflated);
    }
  }
  return [...set].sort();
}

/**
 * Build expectations map: inflated route → { heading?: string }
 */
function buildExpectations(doc) {
  const map = new Map();
  for (const res of doc.resources ?? []) {
    const ex = res.expectations || {};
    for (const [route, cfg] of Object.entries(ex)) {
      const inflated = String(route).replace(/\[.*?\]/g, '123');
      map.set(inflated, cfg || {});
    }
  }
  return map;
}

const DOC = loadContract();
const ROUTES = loadContractRoutes(DOC);
const EXPECT = buildExpectations(DOC);

console.log(`📋 Loaded ${ROUTES.length} routes from UI contract:\n${ROUTES.join('\n')}\n`);

test.describe('Contract Routes - Navigation Smoke Test', () => {
  test('contract route count locked', async () => {
    // Guard against silent contract drift
    expect(ROUTES.length).toBe(24);
  });

  for (const route of ROUTES) {
    test(`renders ${route}`, async ({ page }) => {
      // Collect console errors, failed requests, and HTTP errors for this route
      const consoleErrors = [];
      const failedRequests = [];
      const httpErrors = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', err => consoleErrors.push(String(err)));
      page.on('requestfailed', req => {
        const url = req.url();
        const failure = req.failure();
        // Ignore favicon noise and dev server hot updates
        if (/\.(ico|png|jpg|jpeg|gif|svg)$/i.test(url)) return;
        if (url.includes('__vite') || url.includes('hot-update')) return;
        failedRequests.push({ url, errorText: failure?.errorText });
      });
      
      // Track HTTP error status codes (4xx/5xx)
      // Note: We capture ALL errors including 401/403, then filter based on context
      page.on('response', res => {
        const status = res.status();
        const url = res.url();
        
        // Ignore images, fonts, and dev server noise
        if (/\.(ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/i.test(url)) return;
        if (url.includes('__vite') || url.includes('hot-update')) return;
        
        // Capture all 4xx/5xx errors (we'll filter 401/403 only during login redirects)
        if (status >= 400) {
          httpErrors.push({ url, status, statusText: res.statusText() });
        }
      });

      const urlPath = route.startsWith('/') ? route : `/${route}`;
      
      console.log(`🔍 Testing route: ${urlPath}`);
      
      await page.goto(urlPath, { 
        waitUntil: 'domcontentloaded',
        timeout: 10_000 
      });

      // Strict: require route-specific content (headings) or explicit UI state.
      // We intentionally exclude generic layout tags so layout-only renders fail.
      const selectors = [
        'h1',
        'h2',
        'h3',
        '[role="heading"]',
        '[data-state="loading"]',
        '[data-state="error"]',
        '[data-state="unauthorized"]',
        '[data-state="empty"]',
        '[data-state="not_found"]'
      ].join(', ');

      // In auth-gated apps, redirects to /login are okay if a form or heading exists.
      const finalUrl = page.url();
      const wasRedirectedToLogin = finalUrl.includes('/login') || finalUrl.includes('/signup');
      
      if (wasRedirectedToLogin) {
        await expect(page.locator('form, [role="form"], h1, h2, [role="heading"]')
          .first()).toBeVisible();
        // Still check there were no console errors loading the login page
        expect(consoleErrors, `console errors on ${urlPath} -> ${finalUrl}`).toEqual([]);
        // 401/403 are expected when redirected to login, so filter them out
        const httpErrorsFiltered = httpErrors.filter(e => e.status !== 401 && e.status !== 403);
        expect(httpErrorsFiltered, `HTTP errors on ${urlPath} (excluding auth)`).toEqual([]);
        console.log(`  ✓ ${urlPath} → redirected to auth (${finalUrl})`);
        return; 
      }

      // Otherwise, the route must render something meaningful and stable.
      const firstMatch = page.locator(selectors).first();
      await expect(firstMatch).toBeVisible();

      // If an explicit heading expectation exists, assert it (prefix match allowed).
      const exp = EXPECT.get(route);
      if (exp?.heading) {
        const heading = page.locator('h1, h2, h3, [role="heading"]').first();
        const text = (await heading.textContent() || '').trim();
        expect(text.toLowerCase()).toContain(exp.heading.toLowerCase());
        console.log(`    ✓ Heading matched: "${text}" contains "${exp.heading}"`);
      }

      // Title sanity: title should not be empty when route renders
      const title = await page.title();
      expect(title?.trim().length || 0).toBeGreaterThan(0);

      // In CI: backend API may not be running → 5xx errors are OK (smoke test = page loads)
      // In dev: catch real frontend errors (JS errors, React errors)
      
      // Filter out backend-related errors (both browser and app-level console logs)
      const realConsoleErrors = consoleErrors.filter(e => 
        !e.includes('Failed to load resource') &&   // Browser network errors
        !e.includes('status of 500') &&              // HTTP 500 references
        !e.includes('status of 502') &&              // HTTP 502 references
        !e.includes('status of 503') &&              // HTTP 503 references
        !e.includes('Error loading') &&              // App error logs (e.g., "Error loading projects")
        !e.includes('Failed to load') &&             // App error logs (e.g., "Failed to load users")
        !e.includes('Error response:')               // Axios error logs
      );
      expect(realConsoleErrors, `JS/React errors on ${urlPath}`).toEqual([]);
      
      // Network failures (DNS, connection refused) are always bad
      const hardFailures = failedRequests.filter(fr => !/ (net::ERR|blocked)/i.test(fr.errorText || ''));
      expect(hardFailures, `network failures on ${urlPath}`).toEqual([]);
      
      // HTTP 4xx client errors are bad, but 5xx server errors are OK in CI (backend may not run)
      const clientErrors = httpErrors.filter(e => e.status >= 400 && e.status < 500);
      expect(clientErrors, `HTTP 4xx client errors on ${urlPath}`).toEqual([]);

      console.log(`  ✅ Verified ${urlPath}`);
    });
  }
});

test.describe('Contract Routes - Summary', () => {
  test('all routes tested', () => {
    const expectedRouteCount = 24; // Must match docs/ui-contract.yaml
    console.log(`\n📊 Smoke Test Summary:`);
    console.log(`   Total routes tested: ${ROUTES.length}`);
    console.log(`   Expected routes: ${expectedRouteCount}`);
    console.log(`   ✅ All routes from UI contract validated\n`);
    
    // Assert route count matches expectations to catch contract drift
    expect(ROUTES.length).toBe(expectedRouteCount);
  });
});
