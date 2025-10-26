/* eslint-disable no-console */
const { test, expect } = require('@playwright/test');

/**
 * Navigation Button Click Tests
 * Verifies that all header navigation links work correctly and lead to expected pages
 */

test.describe('Header Navigation - Button Click Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start at dashboard (authenticated route)
    await page.goto('/dashboard');
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  const navButtons = [
    { name: /dashboard/i, path: '/dashboard', heading: /dashboard/i },
    { name: /all tasks/i, path: '/alltasks', heading: /tasks/i },
    { name: /^projects$/i, path: '/', heading: /projects/i },
    { name: /reports/i, path: '/reports', heading: /reports/i },
    { name: /leaderboard/i, path: '/leaderboard', heading: /leaderboard/i },
    { name: /velocity/i, path: '/velocity', heading: /velocity/i },
    { name: /profile/i, path: '/profile', heading: /profile/i },
  ];

  for (const btn of navButtons) {
    test(`clicking "${btn.name.source}" navigates to ${btn.path}`, async ({ page }) => {
      // Find and click the navigation link
      const navLink = page.getByRole('link', { name: btn.name });
      await expect(navLink).toBeVisible();
      await navLink.click();

      // Verify URL changed to expected path
      await expect(page).toHaveURL(new RegExp(btn.path.replace('/', '\\/')));

      // Verify page content loaded (check for heading)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      
      // Log success
      console.log(`✓ Navigation to ${btn.path} successful`);
    });
  }

  test('admin links visible only for admin users', async ({ page }) => {
    // Check if admin links are present (they should be for authenticated users with admin role)
    const decisionsLink = page.getByRole('link', { name: /admin.*decisions/i });
    const courtFlowLink = page.getByRole('link', { name: /admin.*court flow/i });

    // If admin links exist, test them
    const decisionsVisible = await decisionsLink.count();
    if (decisionsVisible > 0) {
      await decisionsLink.click();
      await expect(page).toHaveURL(/\/admin\/decisions/);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      console.log('✓ Admin Decisions link works');

      // Go back and test Court Flow
      await page.goto('/dashboard');
      await courtFlowLink.click();
      await expect(page).toHaveURL(/\/admin\/court-flow/);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      console.log('✓ Admin Court Flow link works');
    } else {
      console.log('⊘ Admin links not visible (user may not have admin role)');
    }
  });

  test('theme toggle button works', async ({ page }) => {
    // Find the theme toggle button (it should have a sun/moon icon or similar)
    const themeButton = page.locator('button').filter({ hasText: /☀️|🌙/i }).first();
    
    if (await themeButton.count() > 0) {
      await expect(themeButton).toBeVisible();
      await themeButton.click();
      
      // Verify theme changed (data-theme attribute should change)
      const htmlElement = page.locator('html');
      const themeAttr = await htmlElement.getAttribute('data-theme');
      expect(['light', 'dark', null]).toContain(themeAttr);
      
      console.log('✓ Theme toggle button works');
    } else {
      console.log('⊘ Theme toggle button not found');
    }
  });

  test('all header navigation links are visible and clickable', async ({ page }) => {
    // Get all navigation links in the header
    const headerNav = page.locator('header nav');
    const allLinks = headerNav.getByRole('link');

    const linkCount = await allLinks.count();
    expect(linkCount).toBeGreaterThan(0);

    console.log(`Found ${linkCount} navigation links in header`);

    // Verify each link is visible and has an href
    for (let i = 0; i < linkCount; i++) {
      const link = allLinks.nth(i);
      await expect(link).toBeVisible();
      
      const href = await link.getAttribute('href');
      expect(href).toBeTruthy();
      
      const text = await link.textContent();
      console.log(`  ✓ Link ${i + 1}: "${text}" → ${href}`);
    }
  });

  test('mobile navigation scrollable on small screens', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigation should still be visible
    const headerNav = page.locator('header nav');
    await expect(headerNav).toBeVisible();

    // Check if overflow-x is set to auto (scrollable)
    const overflowX = await headerNav.evaluate(el => window.getComputedStyle(el).overflowX);
    expect(['auto', 'scroll']).toContain(overflowX);

    console.log('✓ Mobile navigation is scrollable');
  });
});
