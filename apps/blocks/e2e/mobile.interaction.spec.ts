import {
  expect,
  test,
  type FrameLocator,
  type Locator,
  type Page,
} from '@playwright/test';

const billingRoute = (name: string) => `/blocks/blocks/billing/${name}/`;
const applicationRoute = (name: string) => `/blocks/blocks/${name}/`;

function billingPreviewFrame(page: Page): FrameLocator {
  return page.frameLocator(
    '[data-slot="billing-showcase-preview"] iframe[title$="live preview"]',
  );
}

function applicationPreviewFrame(page: Page): FrameLocator {
  return page.frameLocator(
    '[data-slot="application-block-showcase-preview"] iframe[title$="live preview"]',
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
  const navigationMenu = page.getByRole('button', { name: 'Navigation menu', exact: true });
  await expect(navigationMenu).toBeHidden();

  await page.setViewportSize({ width: 860, height: 900 });
  await expect(navigationMenu).toBeVisible();
  await expect(navigationMenu).toHaveAttribute('aria-expanded', 'false');
  await navigationMenu.click();
  await expect(navigationMenu).toHaveAttribute('aria-expanded', 'true');
  const closeNavigation = page.getByRole('button', { name: 'Close navigation', exact: true });
  await expect(closeNavigation).toBeVisible();
  await expect(closeNavigation).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Dismiss navigation', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Tooltip' }).click();
  await expect(page).toHaveURL(/\/blocks\/blocks\/ui\/tooltip\/$/);
  await expect(closeNavigation).toHaveCount(0);
  await expect(navigationMenu).toHaveAttribute('aria-expanded', 'false');
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

test('mobile application blocks keep their primary workflows inside the viewport', async ({
  page,
}) => {
  await test.step('Org Chart fits every node and action target', async () => {
    await page.goto(applicationRoute('org-chart'), { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    const frame = applicationPreviewFrame(page);
    const nodes = frame.locator('.react-flow__node');
    await expect(nodes).toHaveCount(5);

    await expect
      .poll(() =>
        nodes.evaluateAll((elements) =>
          elements.every((element) => {
            const bounds = element.getBoundingClientRect();
            return bounds.left >= 0 && bounds.right <= window.innerWidth;
          }),
        ),
      )
      .toBe(true);

    const actions = frame.getByRole('button', { name: /^Actions for / });
    await expect(actions).toHaveCount(5);
    expect(
      await actions.evaluateAll((elements) =>
        elements.every((element) => {
          const bounds = element.getBoundingClientRect();
          return bounds.left >= 0 && bounds.right <= window.innerWidth;
        }),
      ),
    ).toBe(true);

    for (const person of ['Maya Chen', 'Theo Brooks']) {
      await frame
        .getByRole('button', { name: new RegExp(`^Actions for ${person}`) })
        .click();
      const menu = frame.getByRole('menu');
      await expect(menu).toBeVisible();
      expect(
        await menu.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          return bounds.left >= 0 && bounds.right <= window.innerWidth;
        }),
      ).toBe(true);
      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden();
    }

    const preview = page.locator(
      '[data-slot="application-block-showcase-preview"]',
    );
    await preview
      .getByRole('button', { name: 'Desktop preview, 1280 pixels' })
      .click();
    const fullscreenTrigger = preview.getByRole('button', {
      name: 'Open full-screen preview',
    });
    await fullscreenTrigger.click();
    const dialog = page.getByRole('dialog', { name: 'Org Chart preview' });
    const frameContainer = dialog.locator(
      '[data-slot="application-block-preview-frame"]',
    );
    const fullscreenFrame = dialog.locator('iframe');
    await expect
      .poll(async () => Number(await frameContainer.getAttribute('data-preview-scale')))
      .toBeLessThan(1);
    expect(
      await fullscreenFrame.evaluate((element) => {
        const frameBounds = element.getBoundingClientRect();
        const containerBounds = element.parentElement!.getBoundingClientRect();
        return frameBounds.width <= containerBounds.width + 1;
      }),
    ).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(fullscreenTrigger).toBeFocused();
  });

  await test.step('Storage opens object details from the keyboard', async () => {
    await page.goto(applicationRoute('storage-browser'), {
      waitUntil: 'networkidle',
    });
    const frame = applicationPreviewFrame(page);
    const objectLink = frame.getByRole('button', {
      name: 'Open details for launch-cover.png',
    });
    await objectLink.focus();
    await objectLink.press('Enter');
    await expect(frame.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(frame.getByRole('dialog')).toBeHidden();
    await expect(objectLink).toBeFocused();
  });

  await test.step('Schema Builder create cards do not overflow', async () => {
    await page.goto(applicationRoute('schema-builder'), {
      waitUntil: 'networkidle',
    });
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    const frame = applicationPreviewFrame(page);
    await frame.getByRole('button', { name: 'Create table' }).first().click();
    await expect(frame.getByTestId('table-name-input')).not.toBeFocused();
    const cards = frame.locator('[data-testid^="policy-card-"]');
    await expect(cards.first()).toBeVisible();
    expect(
      await cards.evaluateAll((elements) =>
        elements.every((element) => {
          const bounds = element.getBoundingClientRect();
          return bounds.left >= 0 && bounds.right <= window.innerWidth;
        }),
      ),
    ).toBe(true);
    expect(
      await frame.locator('html').evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
  });
});
