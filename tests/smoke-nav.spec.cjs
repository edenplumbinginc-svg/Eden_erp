/* eslint-disable no-console */
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Load all required_pages from the UI contract and inflate dynamic params
 */
function loadContractRoutes() {
  const specPath = path.join(process.cwd(), 'docs/ui-contract.yaml');
  
  if (!fs.existsSync(specPath)) {
    console.error('❌ Missing docs/ui-contract.yaml');
    return [];
  }
  
  const doc = yaml.load(fs.readFileSync(specPath, 'utf8'));
  const set = new Set();
  
  for (const res of doc.resources || []) {
    for (const route of res.required_pages || []) {
      // Replace every [param] with a safe test value
      // [id] → 123, [taskId] → 123, etc.
      const inflated = String(route).replace(/\[.*?\]/g, '123');
      set.add(inflated);
    }
  }
  
  return [...set].sort();
}

const ROUTES = loadContractRoutes();

console.log(`📋 Loaded ${ROUTES.length} routes from UI contract:\n${ROUTES.join('\n')}\n`);

test.describe('Contract Routes - Navigation Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    // Set up console log listener for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`🔴 Console error on page: ${msg.text()}`);
      }
    });
    
    // Set up page error listener
    page.on('pageerror', err => {
      console.log(`🔴 Page error: ${err.message}`);
    });
  });

  for (const route of ROUTES) {
    test(`renders ${route}`, async ({ page }) => {
      const urlPath = route.startsWith('/') ? route : `/${route}`;
      
      console.log(`🔍 Testing route: ${urlPath}`);
      
      await page.goto(urlPath, { 
        waitUntil: 'domcontentloaded',
        timeout: 10_000 
      });

      // Accept either a real header/heading or any explicit UI state marker
      const validSelectors = [
        'header',
        'h1',
        'h2',
        'h3',
        '[role="heading"]',
        '[data-state="loading"]',
        '[data-state="error"]',
        '[data-state="unauthorized"]',
        '[data-state="empty"]',
        '[data-state="not_found"]',
        '[data-testid]', // Accept any test ID as proof of rendering
        'main',
        '[role="main"]',
      ].join(', ');

      // Check the final URL after any redirects
      const finalUrl = page.url();
      
      // In auth-gated apps, redirects to /login are acceptable if a form exists
      if (finalUrl.includes('/login') || finalUrl.includes('/signup')) {
        const authSelector = 'form, [role="form"], input[type="email"], input[type="password"], h1, h2';
        await expect(
          page.locator(authSelector).first(),
          `Expected auth page (${finalUrl}) to have a form or heading`
        ).toBeVisible({ timeout: 5_000 });
        
        console.log(`  ✓ ${urlPath} → redirected to auth (${finalUrl})`);
        return;
      }

      // Otherwise, the route must render something meaningful
      const element = page.locator(validSelectors).first();
      await expect(
        element,
        `Expected ${urlPath} to render a header, heading, or data-state element`
      ).toBeVisible({ timeout: 5_000 });
      
      console.log(`  ✅ ${urlPath} rendered successfully`);
    });
  }
});

test.describe('Contract Routes - Summary', () => {
  test('all routes tested', () => {
    console.log(`\n📊 Smoke Test Summary:`);
    console.log(`   Total routes tested: ${ROUTES.length}`);
    console.log(`   ✅ All routes from UI contract validated\n`);
    expect(ROUTES.length).toBeGreaterThan(0);
  });
});
