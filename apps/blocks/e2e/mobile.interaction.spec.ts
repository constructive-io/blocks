import {
  expect,
  test,
  type FrameLocator,
  type Locator,
  type Page,
} from '@playwright/test';

const billingRoute = (name: string) => `/blocks/blocks/billing/${name}/`;

function billingPreviewFrame(page: Page): FrameLocator {
  return page.frameLocator(
    '[data-slot="billing-showcase-preview"] iframe[title$="live preview"]',
  );
}

async function expectTouchTargets(targets: Locator) {
  const targetCount = await targets.count();
  expect(targetCount).toBeGreaterThan(0);

  for (let index = 0; index < targetCount; index += 1) {
    const target = targets.nth(index);
    const targetName =
      (await target.getAttribute('aria-label')) ??
      (await target.textContent()) ??
      `target ${index + 1}`;
    const hitArea = await target.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const coarsePointerTarget = getComputedStyle(element, '::after');
      const pseudoMinWidth = Number.parseFloat(coarsePointerTarget.minWidth) || 0;
      const pseudoMinHeight = Number.parseFloat(coarsePointerTarget.minHeight) || 0;
      return {
        width: Math.max(box.width, pseudoMinWidth),
        height: Math.max(box.height, pseudoMinHeight),
      };
    });
    expect(hitArea.width, `${targetName} width`).toBeGreaterThanOrEqual(44);
    expect(hitArea.height, `${targetName} height`).toBeGreaterThanOrEqual(44);
  }
}

async function chooseShowcaseOption(
  page: Page,
  label: 'Account' | 'Resource state',
  option: string,
) {
  const preview = page.locator('[data-slot="billing-showcase-preview"]');
  const trigger = preview.getByRole('combobox', { name: label });
  await trigger.click();
  await page.getByRole('option', { name: option, exact: true }).click();
  await expect(trigger).toContainText(option);
}

test('navigation changes at the shared 860px breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 861, height: 900 });
  await page.goto('/blocks/blocks/ui/button/', { waitUntil: 'networkidle' });
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeHidden();

  await page.setViewportSize({ width: 860, height: 900 });
  const openNavigation = page.getByRole('button', { name: 'Open navigation' });
  await expect(openNavigation).toBeVisible();
  await openNavigation.click();
  await expect(page.getByRole('button', { name: 'Close navigation' })).toBeVisible();
  await page.getByRole('link', { name: 'Tooltip' }).click();
  await expect(page).toHaveURL(/\/blocks\/blocks\/ui\/tooltip\/$/);
  await expect(page.getByRole('button', { name: 'Close navigation' })).toHaveCount(0);
});

test('mobile modal examples open, dismiss, and restore focus without hydration errors', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/blocks/blocks/ui/sheet/', { waitUntil: 'networkidle' });
  await expect(page.getByRole('button', { name: /Switch to (light|dark) theme/ })).toBeEnabled();

  const trigger = page.getByRole('button', { name: 'Edit organization' });
  await trigger.click();
  const sheet = page.getByRole('dialog', { name: 'Organization settings' });
  await expect(sheet).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(pageErrors).toEqual([]);
});

test('mobile billing tables keep horizontal overflow inside their containers', async ({
  page,
}) => {
  const response = await page.goto(billingRoute('billing-settings-page'), {
    waitUntil: 'networkidle',
  });
  expect(response?.status()).toBe(200);

  const preview = page.locator('[data-slot="billing-showcase-preview"]');
  await preview
    .getByRole('button', { name: 'Mobile preview, 390 pixels' })
    .click();
  const frame = billingPreviewFrame(page);
  const settings = frame.locator('[data-slot="billing-settings-page"]');
  await settings.getByRole('tab', { name: 'Usage' }).click();
  const tables = settings.getByRole('table');
  await expect(tables).toHaveCount(2);

  let overflowingContainers = 0;
  for (let index = 0; index < 2; index += 1) {
    const table = tables.nth(index);
    const container = table.locator('xpath=..');
    await expect(container).toHaveAttribute('data-slot', 'table-container');
    expect(
      await container.evaluate((element) => getComputedStyle(element).overflowX),
    ).toBe('auto');

    expect(
      await container.evaluate(
        (element) => element.getBoundingClientRect().width <= window.innerWidth,
      ),
    ).toBe(true);

    if (
      await container.evaluate(
        (element) => element.scrollWidth > element.clientWidth,
      )
    ) {
      overflowingContainers += 1;
    }
  }

  expect(overflowingContainers).toBeGreaterThan(0);
  expect(
    await frame.locator('html').evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test('mobile billing controls expose 44px touch targets and switch account context', async ({
  page,
}) => {
  await page.goto(billingRoute('billing-settings-page'), {
    waitUntil: 'networkidle',
  });
  const preview = page.locator('[data-slot="billing-showcase-preview"]');
  await preview
    .getByRole('button', { name: 'Mobile preview, 390 pixels' })
    .click();
  await chooseShowcaseOption(page, 'Account', 'Personal account');

  const frame = billingPreviewFrame(page);
  const settings = frame.locator('[data-slot="billing-settings-page"]');
  await expect(settings.getByText('Avery Chen', { exact: true }).first()).toBeVisible();
  await expect(settings.getByText('Personal account', { exact: true }).first()).toBeVisible();

  await expectTouchTargets(
    preview.locator(
      '[data-slot="select-trigger"]:visible, [data-slot="button"]:visible',
    ),
  );
  await expectTouchTargets(
    frame.locator(
      '[data-slot="tabs-trigger"]:visible, [data-slot="billing-settings-page"] [data-slot="button"]:visible',
    ),
  );
});
