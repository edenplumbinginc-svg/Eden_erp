const { defineConfig, devices } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Check if authenticated storage state exists
const storagePath = path.join(__dirname, 'coverage', 'storageState.json');
const useStorage = fs.existsSync(storagePath);

module.exports = defineConfig({
  testDir: 'tests',
  testMatch: '**/*.spec.cjs',  // Only match Playwright tests, not Jest
  testIgnore: ['**/__tests__/**', '**/*.test.js'],  // Ignore Jest tests
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'coverage/playwright-report', open: 'never' }],
  ],
  globalSetup: require.resolve('./tests/global-setup.cjs'),
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5000',
    headless: true,
    trace: 'retain-on-failure',
    video: 'off',
    screenshot: 'only-on-failure',
    storageState: useStorage ? storagePath : undefined,
    launchOptions: { 
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    },
  },
  projects: [
    { 
      name: 'chromium', 
      use: { ...devices['Desktop Chrome'] } 
    },
  ],
  webServer: process.env.PW_SKIP_WEBSERVER ? undefined : {
    command: 'npm run dev:web',
    url: 'http://localhost:5000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
