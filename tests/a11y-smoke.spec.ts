import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { ROUTES } from "../apps/coordination_ui/src/routes.manifest";

// Skip dynamic (":id") style routes to avoid needing fixtures
const STATIC_ROUTES = ROUTES.filter(r => !r.path.includes(":"));

test.describe("Accessibility Smoke Tests", () => {
  for (const r of STATIC_ROUTES) {
    test(`a11y: ${r.path} - ${r.title}`, async ({ page, context }) => {
      // Set e2e cookie for auth bypass
      await context.addCookies([
        { name: "e2e", value: "1", url: "http://localhost:5173" }
      ]);

      // Add motion-freeze CSS to reduce animation flake
      await page.addStyleTag({ 
        path: "apps/coordination_ui/public/test-freeze.css" 
      }).catch(() => {
        // Silently continue if file doesn't exist
      });

      // Navigate to route with e2e bypass enabled
      await page.goto(`http://localhost:5173${r.path}?e2e=1`);
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
