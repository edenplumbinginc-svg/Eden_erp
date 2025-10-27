import { test, expect } from "@playwright/test";
const BASE = process.env.BASE_URL || "http://localhost:5001";

for (const scheme of ["light", "dark"] as const) {
  test.describe(`visual (${scheme})`, () => {
    test.use({ colorScheme: scheme });
    test("login page snapshot", async ({ page }) => {
      await page.goto(`${BASE}/login?e2e=1`);
      await page.waitForTimeout(150);
      await expect(page).toHaveScreenshot(`${scheme}_login.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });
  });
}
