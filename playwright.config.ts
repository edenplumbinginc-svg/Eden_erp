// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Directory where your .spec.ts/.spec.js tests live
  testDir: 'tests', // change this if your tests are under a different folder (e.g. apps/coordination_ui/tests)

  // Default test timeout
  timeout: 30_000,

  // Retry once in CI to reduce random flakes
  retries: process.env.CI ? 1 : 0,

  // Reporters: list in console + HTML report in coverage folder
  reporter: [
    ['list'],
    ['html', { outputFolder: 'coverage/playwright-report', open: 'never' }],
  ],

  // Global test options (shared across projects)
  use: {
    // Base URL — auto-detects your preview server or defaults to localhost:4173
    baseURL: process.env.BASE_URL || process.env.UI_BASE_URL || 'http://localhost:4173',
    trace: 'on-first-retry',
    headless: true,
  },

  // Define browser projects so Playwright knows what to run
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment these if you want cross-browser testing later:
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Optional: increase global timeout for CI environments
  globalTimeout: process.env.CI ? 120_000 : undefined,
});
