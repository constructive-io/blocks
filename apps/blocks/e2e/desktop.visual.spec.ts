import { expect, test } from '@playwright/test';

const routes = [
  ['/blocks/', 'A clean foundation for Constructive interfaces.'],
  ['/blocks/blocks/', 'Install the foundation your way'],
  ['/blocks/blocks/ui/button/', 'Button'],
  ['/blocks/blocks/ui/dialog/', 'Dialog'],
] as const;

for (const [route, heading] of routes) {
  test(`${route} renders the clean documentation surface`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: 'networkidle' });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });
}

test('setup links every base primitive and legacy block routes stay removed', async ({ page }) => {
  await page.goto('/blocks/blocks/', { waitUntil: 'networkidle' });
  await expect(page.locator('#primitive-catalog + p + ul a[href^="/blocks/blocks/ui/"]')).toHaveCount(29);

  const legacyResponse = await page.goto('/blocks/blocks/auth/sign-in-card/', { waitUntil: 'networkidle' });
  expect(legacyResponse?.status()).toBe(404);
});
