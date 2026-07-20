import { expect, test, type FrameLocator, type Page } from '@playwright/test';

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

test('the base primitive catalog remains usable at a mobile viewport', async ({ page }) => {
  await page.goto('/blocks/blocks/', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1, name: 'Install the foundation your way' })).toBeVisible();
  await expect(page.locator('section[aria-labelledby="primitive-catalog"] a[href*="/ui/"]')).toHaveCount(29);

  await page.getByRole('link', { name: /Tooltip/ }).first().click();
  await expect(page).toHaveURL(/\/blocks\/blocks\/ui\/tooltip\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Tooltip' })).toBeVisible();
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
    test(`billing ${visualCase.name} ready surface renders in ${theme} on mobile`, async ({
      page,
    }) => {
      await page.goto(billingRoute(visualCase.route), {
        waitUntil: 'networkidle',
      });
      await page
        .locator('[data-slot="billing-showcase-preview"]')
        .getByRole('button', { name: 'Mobile preview, 390 pixels' })
        .click();
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
      expect(box!.width).toBeGreaterThan(280);
      expect(box!.width).toBeLessThanOrEqual(390);
      expect(box!.height).toBeGreaterThan(
        visualCase.name === 'settings' ? 4_000 : 700,
      );

      const screenshot = await surface.screenshot({
        animations: 'disabled',
        caret: 'hide',
      });
      expect(screenshot.byteLength).toBeGreaterThan(10_000);
      expect(
        Math.abs(screenshot.readUInt32BE(16) - box!.width),
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(screenshot.readUInt32BE(20) - box!.height),
      ).toBeLessThanOrEqual(2);
    });
  }
}
