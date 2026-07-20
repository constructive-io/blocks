import { expect, test } from '@playwright/test';

const routes = [
  ['/blocks/', 'Build the product on Constructive.'],
  ['/blocks/blocks/', 'Install the foundation your way'],
  ['/blocks/blocks/ui/button/', 'Button'],
  ['/blocks/blocks/ui/dialog/', 'Dialog'],
] as const;

const billingBlocks = [
  'billing-pricing-table',
  'billing-subscription-card',
  'billing-entitlements-list',
  'billing-usage-overview',
  'billing-credits-card',
  'billing-usage-history',
  'billing-activity-table',
  'billing-settings-page',
] as const;

const billingRoute = (name: string) => `/blocks/blocks/billing/${name}/`;

for (const [route, heading] of routes) {
  test(`${route} renders its documentation surface`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: 'networkidle' });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });
}

test('the primitive catalogs remain complete and legacy block routes stay removed', async ({
  page,
}) => {
  await page.goto('/blocks/', { waitUntil: 'networkidle' });
  await expect(
    page.locator('section[aria-labelledby="component-showcase"] a[href*="/ui/"]'),
  ).toHaveCount(29);

  await page.goto('/blocks/blocks/', { waitUntil: 'networkidle' });
  await expect(
    page.locator('section[aria-labelledby="primitive-catalog"] a[href*="/ui/"]'),
  ).toHaveCount(29);

  const legacyResponse = await page.goto('/blocks/blocks/auth/sign-in-card/', {
    waitUntil: 'networkidle',
  });
  expect(legacyResponse?.status()).toBe(404);
});

test('the billing catalog discovers all eight live pages', async ({ page }) => {
  const catalogResponse = await page.goto('/blocks/blocks/billing/', {
    waitUntil: 'networkidle',
  });
  expect(catalogResponse?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: 'Billing' })).toBeVisible();

  const previewLinks = page
    .locator('section[aria-labelledby="billing-catalog-heading"]')
    .getByRole('link');
  await expect(previewLinks).toHaveCount(8);

  const discoveredPaths = await previewLinks.evaluateAll((links) =>
    links
      .map((link) =>
        new URL((link as HTMLAnchorElement).href).pathname.replace(/\/?$/, '/'),
      )
      .sort(),
  );
  expect(discoveredPaths).toEqual(billingBlocks.map(billingRoute).sort());

  for (const name of billingBlocks) {
    await test.step(name, async () => {
      const response = await page.goto(billingRoute(name), {
        waitUntil: 'networkidle',
      });
      expect(response?.status()).toBe(200);
      await expect(page.locator('[data-slot="billing-showcase-preview"]')).toBeVisible();
    });
  }
});
