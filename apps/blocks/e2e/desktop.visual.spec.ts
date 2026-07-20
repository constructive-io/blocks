import { expect, test, type FrameLocator, type Page } from '@playwright/test';

const routes = [
  ['/blocks/', 'Build the product on Constructive.'],
  ['/blocks/blocks/', 'Install the foundation your way'],
  ['/blocks/blocks/ui/button/', 'Button'],
  ['/blocks/blocks/ui/dialog/', 'Dialog'],
] as const;

const billingBlocks = [
  ['billing-pricing-table', 'Pricing table'],
  ['billing-subscription-card', 'Subscription card'],
  ['billing-entitlements-list', 'Entitlements list'],
  ['billing-usage-overview', 'Usage overview'],
  ['billing-credits-card', 'Credits card'],
  ['billing-usage-history', 'Usage history'],
  ['billing-activity-table', 'Activity table'],
  ['billing-settings-page', 'Billing'],
] as const;

const billingRoute = (name: string) => `/blocks/blocks/billing/${name}/`;

function billingPreviewFrame(page: Page): FrameLocator {
  return page.frameLocator(
    '[data-slot="billing-showcase-preview"] iframe[title$="live preview"]',
  );
}

async function useTheme(page: Page, theme: 'light' | 'dark') {
  const html = page.locator('html');
  const themeToggle = page.getByRole('button', {
    name: /Switch to (light|dark) theme/,
  });
  await expect(themeToggle).toBeEnabled();

  if (!(await html.evaluate((element, value) => element.classList.contains(value), theme))) {
    await page.getByRole('button', { name: `Switch to ${theme} theme` }).click();
  }

  await expect(html).toHaveClass(new RegExp(`(^|\\s)${theme}(\\s|$)`));
  const billingFrame = page.locator(
    '[data-slot="billing-showcase-preview"] iframe',
  );
  if ((await billingFrame.count()) > 0) {
    await expect(billingPreviewFrame(page).locator('html')).toHaveClass(
      new RegExp(`(^|\\s)${theme}(\\s|$)`),
    );
  }
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

for (const [route, heading] of routes) {
  test(`${route} renders the registry documentation surface`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: 'networkidle' });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });
}

test('home catalogs every base primitive and legacy block routes stay removed', async ({ page }) => {
  await page.goto('/blocks/', { waitUntil: 'networkidle' });
  await expect(page.locator('section[aria-labelledby="component-showcase"] a[href*="/ui/"]')).toHaveCount(29);

  await page.goto('/blocks/blocks/', { waitUntil: 'networkidle' });
  await expect(page.locator('section[aria-labelledby="primitive-catalog"] a[href*="/ui/"]')).toHaveCount(29);

  const legacyResponse = await page.goto('/blocks/blocks/auth/sign-in-card/', { waitUntil: 'networkidle' });
  expect(legacyResponse?.status()).toBe(404);
});

test('billing catalog discovers all eight live pages and every route returns 200', async ({ page }) => {
  const catalogResponse = await page.goto('/blocks/blocks/billing/', {
    waitUntil: 'networkidle',
  });
  expect(catalogResponse?.status()).toBe(200);
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Billing',
    }),
  ).toBeVisible();

  const catalog = page.locator('section[aria-labelledby="billing-catalog-heading"]');
  const previewLinks = catalog.getByRole('link');
  await expect(previewLinks).toHaveCount(8);

  const discoveredPaths = await previewLinks.evaluateAll((links) =>
    links
      .map((link) =>
        new URL((link as HTMLAnchorElement).href).pathname.replace(/\/?$/, '/'),
      )
      .sort(),
  );
  expect(discoveredPaths).toEqual(
    billingBlocks.map(([name]) => billingRoute(name)).sort(),
  );

  for (const [name] of billingBlocks) {
    await test.step(name, async () => {
      const response = await page.goto(billingRoute(name), {
        waitUntil: 'networkidle',
      });
      expect(response?.status()).toBe(200);
      await expect(page.locator('main')).toBeVisible();
      await expect(
        page.locator('[data-slot="billing-showcase-preview"]'),
      ).toBeVisible();
    });
  }
});

const billingVisualCases = [
  {
    name: 'settings',
    route: 'billing-settings-page',
    slot: 'billing-settings-page',
  },
  {
    name: 'activity',
    route: 'billing-activity-table',
    slot: 'billing-activity-table',
  },
] as const;

for (const visualCase of billingVisualCases) {
  for (const theme of ['light', 'dark'] as const) {
    test(`billing ${visualCase.name} ready surface renders in ${theme} on desktop`, async ({
      page,
    }) => {
      await page.goto(billingRoute(visualCase.route), {
        waitUntil: 'networkidle',
      });
      await useTheme(page, theme);

      const surface = billingPreviewFrame(page).locator(
        `[data-slot="${visualCase.slot}"]`,
      );
      await expect(surface).toBeVisible();
      if (visualCase.name === 'settings') {
        await expect(
          surface.getByRole('heading', { name: 'Usage and limits' }),
        ).toBeVisible();
      } else {
        await expect(
          surface.getByRole('table', {
            name: 'Billing ledger activity for the selected account and filters.',
          }),
        ).toBeVisible();
      }

      const box = await surface.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(900);
      expect(box!.height).toBeGreaterThan(
        visualCase.name === 'settings' ? 2_000 : 600,
      );

      const screenshot = await surface.screenshot({
        animations: 'disabled',
        caret: 'hide',
      });
      expect(screenshot.byteLength).toBeGreaterThan(20_000);
      expect(
        Math.abs(screenshot.readUInt32BE(16) - box!.width),
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(screenshot.readUInt32BE(20) - box!.height),
      ).toBeLessThanOrEqual(2);
    });
  }
}
