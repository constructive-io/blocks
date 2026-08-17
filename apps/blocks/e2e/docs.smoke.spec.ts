import { expect, test } from '@playwright/test';

test('removed and unknown documentation routes return 404', async ({ page }) => {
  for (const route of [
    '/blocks/blocks/auth/sign-in-card/',
    '/blocks/blocks/features/not-a-pack/',
    '/blocks/blocks/features/not-a-pack/preview/',
  ]) {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.status(), route).toBe(404);
  }
});
