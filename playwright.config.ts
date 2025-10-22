import { defineConfig } from '@playwright/test';
export default defineConfig({
  timeout: 30_000,
  use: {
    baseURL: process.env.UI_BASE_URL || 'http://localhost:5000',
    trace: 'on-first-retry',
    headless: true,
  },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
});
