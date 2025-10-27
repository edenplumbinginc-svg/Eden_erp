import { test, expect } from "@playwright/test";
import { ROUTES } from "../apps/coordination_ui/src/routes.manifest";

// Skip dynamic routes that require specific IDs
const STATIC_ROUTES = ROUTES.filter(r => !r.path.includes(":"));

test.describe("Visual Regression Tests", () => {
  for (const scheme of ["light", "dark"] as const) {
    test.describe(`Visual snapshots (${scheme} mode)`, () => {
      test.use({ colorScheme: scheme });

      for (const r of STATIC_ROUTES) {
        test(`${r.path} - ${r.title}`, async ({ page, context }) => {
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

          // Wait for animations to settle (150ms is enough with freeze CSS)
          await page.waitForTimeout(150);

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
