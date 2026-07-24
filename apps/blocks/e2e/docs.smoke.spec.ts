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

const featurePacks = [
  { id: 'data', previewHeading: 'Data', title: 'Data', variant: 'tables' },
  { id: 'auth', previewHeading: 'Account', title: 'Authentication', variant: 'account' },
  { id: 'users', previewHeading: 'Users', title: 'Users', variant: 'directory' },
  {
    id: 'organizations',
    previewHeading: 'Organizations',
    title: 'Organizations',
    variant: 'memberships',
  },
  { id: 'storage', previewHeading: 'Storage', title: 'Storage', variant: 'browser' },
  { id: 'billing', previewHeading: 'Billing', title: 'Billing', variant: 'organization' },
  {
    id: 'notifications',
    previewHeading: 'Notifications',
    title: 'Notifications',
    variant: 'inbox',
  },
] as const;

const billingRoute = (name: string) => `/blocks/blocks/billing/${name}/`;
const featurePackRoute = (id: string) => `/blocks/blocks/features/${id}/`;

for (const [route, heading] of routes) {
  test(`${route} renders its documentation surface`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: 'networkidle' });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });
}

test('the primitive catalogs remain complete and legacy block routes stay removed', async ({ page }) => {
  await page.goto('/blocks/', { waitUntil: 'networkidle' });
  await expect(page.locator('section[aria-labelledby="component-showcase"] a[href*="/ui/"]')).toHaveCount(29);

  await page.goto('/blocks/blocks/', { waitUntil: 'networkidle' });
  await expect(page.locator('section[aria-labelledby="primitive-catalog"] a[href*="/ui/"]')).toHaveCount(29);

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

  const previewLinks = page.locator('section[aria-labelledby="billing-catalog-heading"]').getByRole('link');
  await expect(previewLinks).toHaveCount(8);

  const discoveredPaths = await previewLinks.evaluateAll((links) =>
    links.map((link) => new URL((link as HTMLAnchorElement).href).pathname.replace(/\/?$/, '/')).sort(),
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

test('the feature-pack catalog discovers all seven live pages', async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  const catalogResponse = await page.goto('/blocks/blocks/features/', {
    waitUntil: 'networkidle',
  });
  expect(catalogResponse?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: 'Feature packs' })).toBeVisible();

  const previewLinks = page.locator('section[aria-labelledby="feature-pack-catalog-heading"]').getByRole('link');
  await expect(previewLinks).toHaveCount(7);

  const discoveredPaths = await previewLinks.evaluateAll((links) =>
    links.map((link) => new URL((link as HTMLAnchorElement).href).pathname.replace(/\/?$/, '/')).sort(),
  );
  expect(discoveredPaths).toEqual(featurePacks.map(({ id }) => featurePackRoute(id)).sort());

  for (const { id, previewHeading, title, variant } of featurePacks) {
    await test.step(id, async () => {
      const response = await page.goto(featurePackRoute(id), {
        waitUntil: 'networkidle',
      });
      expect(response?.status()).toBe(200);
      const preview = page.locator('[data-slot="feature-pack-showcase-preview"]');
      await expect(preview).toBeVisible();

      const frameTitle = `${title} feature pack inline live preview`;
      const iframe = preview.getByTitle(frameTitle);
      await expect(iframe).toHaveAttribute(
        'src',
        `/blocks/blocks/features/${id}/preview/?variant=${variant}&state=ready`,
      );
      await expect(
        page.frameLocator(`iframe[title="${frameTitle}"]`).getByRole('heading', {
          exact: true,
          level: 1,
          name: previewHeading,
        }),
      ).toBeVisible();
    });
  }

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('unknown feature-pack detail and preview routes return 404', async ({ page }) => {
  for (const route of [
    '/blocks/blocks/features/not-a-pack/',
    '/blocks/blocks/features/not-a-pack/preview/',
  ]) {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(404);
  }
});
