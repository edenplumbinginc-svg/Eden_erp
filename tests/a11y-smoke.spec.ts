import { test } from "@playwright/test";
import { injectAxe, checkA11y } from "@axe-core/playwright";

const BASE = process.env.BASE_URL || "http://localhost:5001";

test.describe("a11y: /login", () => {
  test("no wcag2a/aa violations", async ({ page }) => {
    await page.goto(`${BASE}/login?e2e=1`);
    await injectAxe(page);
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: { html: true },
      axeOptions: { runOnly: ["wcag2a", "wcag2aa"] },
    });
  });
});
