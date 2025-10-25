const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

module.exports = async (config) => {
  const email = process.env.PW_EMAIL;
  const password = process.env.PW_PASSWORD;
  const baseURL = process.env.BASE_URL || 'http://localhost:5000';

  // If no creds, skip — tests will still pass by accepting /login as valid.
  if (!email || !password) {
    console.log('[auth-setup] No PW_EMAIL/PW_PASSWORD set; tests will run unauthenticated.');
    console.log('[auth-setup] Protected routes will redirect to /login (expected behavior).');
    return;
  }

  console.log(`[auth-setup] Attempting login for ${email}...`);

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  try {
    // Navigate to login page
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    
    // Fill in login form
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for successful login (navigation to dashboard or any authenticated page)
    await page.waitForURL((url) => !url.pathname.includes('/login'), { 
      timeout: 10_000 
    });
    
    // Verify we have the auth token in localStorage
    const token = await page.evaluate(() => localStorage.getItem('edenAuthToken'));
    
    if (!token) {
      throw new Error('Login appeared to succeed but no auth token found in localStorage');
    }
    
    // Save authenticated state
    const storagePath = path.join(__dirname, '..', 'coverage', 'storageState.json');
    await context.storageState({ path: storagePath });
    
    console.log('[auth-setup] ✅ Login successful! storageState.json saved.');
    console.log('[auth-setup] Protected routes will now render without redirects.');
    
  } catch (error) {
    console.error(`[auth-setup] ❌ Login failed: ${error.message}`);
    console.error('[auth-setup] Tests will run unauthenticated and accept /login redirects.');
    
    // Clean up any partial storage state file
    const storagePath = path.join(__dirname, '..', 'coverage', 'storageState.json');
    if (fs.existsSync(storagePath)) {
      fs.unlinkSync(storagePath);
    }
  } finally {
    await browser.close();
  }
};
