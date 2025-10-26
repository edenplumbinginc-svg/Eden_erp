import { test, expect } from '@playwright/test';

test('navbar buttons navigate correctly', async ({ page }) => {
  await page.goto('/');

  const nav = [
    { name: /projects/i,    path: /\/projects/ },
    { name: /tasks/i,       path: /\/tasks/ },
    { name: /velocity/i,    path: /\/velocity/ },
    { name: /leaderboard/i, path: /\/leaderboard/ },
  ];

  for (const item of nav) {
    await page.getByRole('link', { name: item.name }).click();
    await expect(page).toHaveURL(item.path);
    await page.goBack();
  }
});
