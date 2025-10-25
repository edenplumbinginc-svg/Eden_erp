const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'coverage/playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5000',
    headless: true,
    trace: 'retain-on-failure',
    video: 'off',
    screenshot: 'only-on-failure',
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
