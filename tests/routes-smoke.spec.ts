import { test, expect } from "@playwright/test";
import { ROUTES } from "../apps/coordination_ui/src/routes.manifest";

test.describe("Route Coverage Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Log in before testing routes
    await page.goto("http://localhost:5173/login");
    await page.fill('input[type="email"]', "test@eden.com");
    await page.fill('input[type="password"]', "password");
    await page.click('button[type="submit"]');
    
    // Wait for navigation to complete
    await page.waitForURL(/\/(dashboard|$)/, { timeout: 5000 });
  });

  for (const route of ROUTES) {
    // Skip dynamic routes for now (they need specific IDs)
    if (route.path.includes(":")) {
      test.skip(`${route.path} - skipped (dynamic route)`, () => {});
      continue;
    }

    test(`route mounts: ${route.path} - ${route.title}`, async ({ page }) => {
      // Navigate to the route
      await page.goto(`http://localhost:5173${route.path}`);

      // Wait for the page to load
      await page.waitForLoadState("networkidle");

      // Basic check: ensure the page doesn't crash and has content
      const body = await page.locator("body");
      await expect(body).toBeVisible();

      // Ensure there's actual content rendered (not just empty page)
      const content = await body.textContent();
      expect(content?.trim().length).toBeGreaterThan(0);

      // If route is critical, do stricter checks
      if (route.critical) {
        // Ensure no error messages are visible
        const errorTexts = [
          "error occurred",
          "something went wrong",
          "not found",
          "failed to load",
        ];
        
        for (const errorText of errorTexts) {
          const hasError = await page
            .getByText(new RegExp(errorText, "i"))
            .count();
          expect(hasError).toBe(0);
        }

        // Ensure the page has meaningful content (headings, cards, etc.)
        const hasHeadings = await page.locator("h1, h2, h3").count();
        expect(hasHeadings).toBeGreaterThan(0);
      }
    });
  }

  // Test the Route Map page specifically
  test("Route Map page displays all routes", async ({ page }) => {
    await page.goto("http://localhost:5173/routes");
    await page.waitForLoadState("networkidle");

    // Check that the Route Map heading is visible
    await expect(page.getByText("Route Coverage Map")).toBeVisible();

    // Check that the table exists
    const table = page.locator("table");
    await expect(table).toBeVisible();

    // Ensure all routes are listed (exclude dynamic routes from count)
    const staticRouteCount = ROUTES.filter((r) => !r.path.includes(":")).length;
    const rows = await page.locator("tbody tr").count();
    expect(rows).toBe(ROUTES.length);
  });
});
