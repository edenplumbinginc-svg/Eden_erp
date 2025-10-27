import { test, expect } from "@playwright/test";
import { ROUTES } from "../apps/coordination_ui/src/routes.manifest";

// Skip dynamic routes that require specific IDs
const STATIC_ROUTES = ROUTES.filter(r => !r.path.includes(":"));

test.describe("Visual Regression Tests", () => {
  for (const scheme of ["light", "dark"] as const) {
    test.describe(`Visual snapshots (${scheme} mode)`, () => {
      test.use({ colorScheme: scheme });

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
        test(`${r.path} - ${r.title}`, async ({ page }) => {
          // Navigate to the route
          await page.goto(`http://localhost:5173${r.path}`);
          await page.waitForLoadState("networkidle");

          // Wait for animations to settle (adjust based on your motion tokens)
          // Your --dur-md is 280ms, so 300ms should be safe
          await page.waitForTimeout(300);

          // Take full-page screenshot
          const screenshotName = `${scheme}${r.path.replace(/\W+/g, "_")}.png`;
          await expect(page).toHaveScreenshot(screenshotName, {
            fullPage: true,
            // Adjust thresholds if fonts/antialiasing cause legitimate tiny diffs
            maxDiffPixelRatio: 0.01,
            // Optional: mask dynamic content like timestamps
            // mask: [page.locator('.timestamp')],
          });
        });
      }
    });
  }
});
