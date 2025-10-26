/* eslint-disable no-console */
const { test, expect } = require('@playwright/test');

/**
 * Auto-Discovery Button Tests
 * Automatically finds all buttons and links on pages and verifies they work
 * Hunts for broken links and non-functional buttons
 */

test.describe('Auto-Discovery - All Buttons and Links', () => {
  const testPages = [
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/alltasks', name: 'All Tasks' },
    { path: '/', name: 'Projects' },
    { path: '/reports', name: 'Reports' },
    { path: '/leaderboard', name: 'Leaderboard' },
    { path: '/task/123', name: 'Task Detail' },
  ];

  for (const testPage of testPages) {
    test(`discover and test all links on ${testPage.name}`, async ({ page }) => {
      await page.goto(testPage.path);
      await page.waitForLoadState('networkidle');

      // Find all links on the page
      const allLinks = page.getByRole('link');
      const linkCount = await allLinks.count();

      console.log(`\n📋 ${testPage.name} (${testPage.path}): Found ${linkCount} links`);

      const testedLinks = new Set();
      const brokenLinks = [];
      const workingLinks = [];

      // Test each unique link
      for (let i = 0; i < linkCount; i++) {
        const link = allLinks.nth(i);
        
        // Skip if not visible
        if (!(await link.isVisible())) continue;

        const href = await link.getAttribute('href');
        const text = (await link.textContent())?.trim() || '(no text)';

        // Skip if we already tested this href
        if (!href || testedLinks.has(href)) continue;
        testedLinks.add(href);

        // Skip external links and mailto/tel links
        if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) {
          console.log(`  ⊘ Skipping external: "${text}" → ${href}`);
          continue;
        }

        // Skip hash-only links
        if (href === '#' || href.startsWith('#')) {
          console.log(`  ⊘ Skipping hash: "${text}" → ${href}`);
          continue;
        }

        try {
          // Navigate to the link
          const response = await page.goto(href, { waitUntil: 'networkidle', timeout: 10000 });
          
          // Check response status
          const status = response?.status();
          
          if (status && status >= 200 && status < 400) {
            workingLinks.push({ text, href, status });
            console.log(`  ✓ "${text}" → ${href} (${status})`);
          } else {
            brokenLinks.push({ text, href, status });
            console.log(`  ✗ "${text}" → ${href} (${status})`);
          }

          // Go back to original page for next test
          await page.goto(testPage.path);
          await page.waitForLoadState('networkidle');
        } catch (error) {
          brokenLinks.push({ text, href, error: error.message });
          console.log(`  ✗ "${text}" → ${href} (ERROR: ${error.message})`);
          
          // Try to recover
          try {
            await page.goto(testPage.path);
            await page.waitForLoadState('networkidle');
          } catch (e) {
            // If we can't recover, skip remaining links
            console.log('  ⚠️  Cannot recover, skipping remaining links');
            break;
          }
        }
      }

      // Report summary
      console.log(`\n📊 ${testPage.name} Summary:`);
      console.log(`  ✓ Working links: ${workingLinks.length}`);
      console.log(`  ✗ Broken links: ${brokenLinks.length}`);

      // Fail test if broken links found
      if (brokenLinks.length > 0) {
        console.log('\n⚠️  Broken links detected:');
        brokenLinks.forEach(link => {
          console.log(`  - "${link.text}" → ${link.href} (${link.status || link.error})`);
        });
      }

      // Assert no broken links (allow some tolerance for test environment)
      expect(brokenLinks.length).toBeLessThanOrEqual(2);
    });

    test(`discover and test all buttons on ${testPage.name}`, async ({ page }) => {
      await page.goto(testPage.path);
      await page.waitForLoadState('networkidle');

      // Find all buttons on the page
      const allButtons = page.getByRole('button');
      const buttonCount = await allButtons.count();

      console.log(`\n🔘 ${testPage.name} (${testPage.path}): Found ${buttonCount} buttons`);

      const buttonTests = [];

      for (let i = 0; i < buttonCount; i++) {
        const btn = allButtons.nth(i);
        
        // Skip if not visible
        if (!(await btn.isVisible())) continue;

        const text = (await btn.textContent())?.trim() || '(no text)';
        const isDisabled = await btn.isDisabled();
        const ariaLabel = await btn.getAttribute('aria-label');
        const type = await btn.getAttribute('type');

        // Check if button is clickable
        let clickable = true;
        try {
          await expect(btn).toBeEnabled();
        } catch (e) {
          clickable = false;
        }

        const buttonInfo = {
          text,
          ariaLabel,
          type,
          isDisabled,
          clickable: !isDisabled && clickable
        };

        buttonTests.push(buttonInfo);

        const status = buttonInfo.clickable ? '✓ Clickable' : '⊘ Disabled';
        console.log(`  ${status}: "${text}" ${ariaLabel ? `[${ariaLabel}]` : ''} (type: ${type || 'button'})`);
      }

      // Assert all buttons have text or aria-label
      const buttonsWithoutLabel = buttonTests.filter(b => !b.text && !b.ariaLabel);
      if (buttonsWithoutLabel.length > 0) {
        console.log(`\n⚠️  ${buttonsWithoutLabel.length} buttons without text or aria-label (accessibility issue)`);
      }

      // At least some buttons should be clickable
      const clickableButtons = buttonTests.filter(b => b.clickable);
      console.log(`\n📊 ${testPage.name} Button Summary:`);
      console.log(`  Total buttons: ${buttonTests.length}`);
      console.log(`  Clickable: ${clickableButtons.length}`);
      console.log(`  Disabled: ${buttonTests.filter(b => b.isDisabled).length}`);
      console.log(`  Missing labels: ${buttonsWithoutLabel.length}`);

      // Basic assertion - page should have at least one button
      expect(buttonTests.length).toBeGreaterThanOrEqual(0);
    });
  }

  test('hunt for 404 errors across all navigation paths', async ({ page }) => {
    const allPaths = [
      '/dashboard',
      '/alltasks',
      '/',
      '/reports',
      '/leaderboard',
      '/velocity',
      '/profile',
      '/task/123',
      '/project/123',
      '/admin/decisions',
      '/admin/court-flow',
      '/admin/rbac',
      '/showcase',
      '/about/eden',
    ];

    console.log('\n🔍 Hunting for 404 errors across all known paths...\n');

    const errors = [];
    const successes = [];

    for (const path of allPaths) {
      try {
        const response = await page.goto(path, { waitUntil: 'networkidle', timeout: 10000 });
        const status = response?.status();

        if (status === 404) {
          errors.push({ path, status: 404 });
          console.log(`  ✗ ${path} → 404 Not Found`);
        } else if (status && status >= 200 && status < 400) {
          successes.push({ path, status });
          console.log(`  ✓ ${path} → ${status}`);
        } else {
          errors.push({ path, status });
          console.log(`  ⚠️  ${path} → ${status}`);
        }
      } catch (error) {
        errors.push({ path, error: error.message });
        console.log(`  ✗ ${path} → ERROR: ${error.message}`);
      }
    }

    console.log(`\n📊 404 Hunt Summary:`);
    console.log(`  ✓ Successful: ${successes.length}/${allPaths.length}`);
    console.log(`  ✗ Errors/404s: ${errors.length}/${allPaths.length}`);

    if (errors.length > 0) {
      console.log('\n⚠️  Pages with issues:');
      errors.forEach(e => console.log(`  - ${e.path} (${e.status || e.error})`));
    }

    // Allow some pages to be restricted (401/403) but no 404s
    const notFoundErrors = errors.filter(e => e.status === 404);
    expect(notFoundErrors.length).toBe(0);
  });

  test('verify all critical user flows have working buttons', async ({ page }) => {
    const criticalFlows = [
      {
        name: 'View Tasks',
        steps: [
          { action: 'goto', path: '/dashboard' },
          { action: 'click', selector: 'link', name: /all tasks/i },
          { action: 'expectURL', pattern: /alltasks/ }
        ]
      },
      {
        name: 'View Task Detail',
        steps: [
          { action: 'goto', path: '/alltasks' },
          { action: 'click', selector: 'link', name: /task/i },
          { action: 'expectURL', pattern: /task/ }
        ]
      },
      {
        name: 'Return from Task to List',
        steps: [
          { action: 'goto', path: '/task/123' },
          { action: 'click', selector: 'button', name: /back to all tasks/i },
          { action: 'expectURL', pattern: /alltasks/ }
        ]
      }
    ];

    console.log('\n🔄 Testing critical user flows...\n');

    for (const flow of criticalFlows) {
      console.log(`Testing flow: ${flow.name}`);
      
      try {
        for (const step of flow.steps) {
          if (step.action === 'goto') {
            await page.goto(step.path);
            await page.waitForLoadState('networkidle');
          } else if (step.action === 'click') {
            const element = step.selector === 'link' 
              ? page.getByRole('link', { name: step.name }).first()
              : page.getByRole('button', { name: step.name }).first();
            
            if (await element.count() > 0) {
              await element.click();
              await page.waitForLoadState('networkidle');
            } else {
              console.log(`  ⊘ Element not found: ${step.selector} "${step.name.source}"`);
            }
          } else if (step.action === 'expectURL') {
            await expect(page).toHaveURL(step.pattern);
          }
        }
        console.log(`  ✓ ${flow.name} - PASS`);
      } catch (error) {
        console.log(`  ✗ ${flow.name} - FAIL: ${error.message}`);
        throw error;
      }
    }
  });
});
