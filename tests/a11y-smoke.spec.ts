import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { ROUTES } from "../apps/coordination_ui/src/routes.manifest";

// Skip dynamic (":id") style routes to avoid needing fixtures
const STATIC_ROUTES = ROUTES.filter(r => !r.path.includes(":"));

test.describe("Accessibility Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Log in before testing routes
    await page.goto("http://localhost:5173/login");
    await page.fill('input[type="email"]', "test@eden.com");
    await page.fill('input[type="password"]', "password");
    await page.click('button[type="submit"]');
    
    // Wait for navigation to complete
    await page.waitForURL(/\/(dashboard|$)/, { timeout: 5000 });
  });

  for (const r of STATIC_ROUTES) {
    test(`a11y: ${r.path} - ${r.title}`, async ({ page }) => {
      // Navigate to the route
      await page.goto(`http://localhost:5173${r.path}`);
      await page.waitForLoadState("networkidle");

      // Run axe accessibility checks
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();

      // Assert no violations found
      expect(accessibilityScanResults.violations).toEqual([]);

      // Minimal content sanity for critical routes
      if (r.critical) {
        const mainContent = page.locator("main, [role=main], body");
        await expect(mainContent).toBeVisible();
        
        // Ensure critical routes have meaningful content
        const textContent = await mainContent.textContent();
        expect(textContent?.trim().length).toBeGreaterThan(0);
      }
    });
  }
});
