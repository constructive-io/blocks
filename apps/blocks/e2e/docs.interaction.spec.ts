import {
  expect,
  test,
  type FrameLocator,
  type Locator,
  type Page,
} from '@playwright/test';

const primitiveRoute = (name: string) => `/blocks/blocks/ui/${name}/`;
const billingRoute = (name: string) => `/blocks/blocks/billing/${name}/`;

function billingPreviewFrame(page: Page): FrameLocator {
  return page.frameLocator(
    '[data-slot="billing-showcase-preview"] iframe[title$="live preview"]',
  );
}

async function visitPrimitive(page: Page, name: string) {
  const response = await page.goto(primitiveRoute(name), { waitUntil: 'networkidle' });
  expect(response?.status()).toBe(200);
  await expect(page.locator('main')).toBeVisible();
  await expect(page.getByRole('button', { name: /Switch to (light|dark) theme/ })).toBeEnabled();
}

async function visitBilling(page: Page, name: string) {
  const response = await page.goto(billingRoute(name), {
    waitUntil: 'networkidle',
  });
  expect(response?.status()).toBe(200);
  await expect(page.locator('main')).toBeVisible();
  await expect(
    page.locator('[data-slot="billing-showcase-preview"]'),
  ).toBeVisible();
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

async function openFromKeyboard(trigger: Locator) {
  await trigger.focus();
  await trigger.press('Enter');
}

const overlayCases = [
  {
    slug: 'alert-dialog',
    triggerSlot: 'alert-dialog-trigger',
    triggerName: 'Delete database',
    contentSlot: 'alert-dialog-content',
    role: 'alertdialog',
    accessibleName: 'Delete production-db?',
  },
  {
    slug: 'dialog',
    triggerSlot: 'dialog-trigger',
    triggerName: 'Rename database',
    contentSlot: 'dialog-popup',
    role: 'dialog',
    accessibleName: 'Rename database',
  },
  {
    slug: 'drawer',
    triggerSlot: 'drawer-trigger',
    triggerName: 'Open quick actions',
    contentSlot: 'drawer-content',
    role: 'dialog',
    accessibleName: 'Quick actions',
  },
  {
    slug: 'dropdown-menu',
    triggerSlot: 'dropdown-menu-trigger',
    triggerName: 'Actions',
    contentSlot: 'dropdown-menu-content',
    role: 'menu',
  },
  {
    slug: 'popover',
    triggerSlot: 'popover-trigger',
    triggerName: 'Connection limits',
    contentSlot: 'popover-content',
    role: 'dialog',
    accessibleName: 'Connection limits',
  },
  {
    slug: 'select',
    triggerSlot: 'select-trigger',
    triggerName: 'Environment',
    contentSlot: 'select-list',
    role: 'listbox',
  },
  {
    slug: 'sheet',
    triggerSlot: 'sheet-trigger',
    triggerName: 'Edit organization',
    contentSlot: 'sheet-content',
    role: 'dialog',
    accessibleName: 'Organization settings',
  },
  {
    slug: 'tooltip',
    triggerSlot: 'tooltip-trigger',
    triggerName: 'Create database',
    contentSlot: 'tooltip-content',
    role: 'tooltip',
  },
] as const;

for (const overlay of overlayCases) {
  test(`${overlay.slug} opens from the keyboard, exposes semantics, and returns focus`, async ({ page }) => {
    await visitPrimitive(page, overlay.slug);

    const trigger = page.locator(`#overview [data-slot="${overlay.triggerSlot}"]`);
    await expect(trigger).toHaveAccessibleName(overlay.triggerName);
    await openFromKeyboard(trigger);

    const content = page.locator(`[data-slot="${overlay.contentSlot}"]`);
    await expect(content).toBeVisible();
    await expect(content).toHaveAttribute('role', overlay.role);
    if ('accessibleName' in overlay && overlay.accessibleName) {
      await expect(content).toHaveAccessibleName(overlay.accessibleName);
    }

    await page.keyboard.press('Escape');
    await expect(content).toBeHidden();
    await expect(trigger).toBeFocused();
  });
}

const controlledCases = [
  ['alert-dialog', 'Reset database', 'Confirmation is open.', 'Confirmation is closed.'],
  ['dialog', 'Move database', /Dialog is open;/, /Dialog is closed;/],
  ['drawer', 'Review deployment', 'Drawer is open.', 'Drawer is closed.'],
  ['dropdown-menu', 'Choose an action', 'Menu is open.', 'Menu is closed.'],
  ['popover', 'Deployment details', 'Popover is open.', 'Popover is closed.'],
  ['sheet', 'Invite member', 'Sheet is open.', 'Sheet is closed.'],
] as const;

test('controlled overlay examples reflect one open and one close request', async ({ page }) => {
  for (const [slug, triggerName, openStatus, closedStatus] of controlledCases) {
    await test.step(slug, async () => {
      await visitPrimitive(page, slug);
      const trigger = page.locator('#state').getByRole('button', { name: triggerName });
      await trigger.click();
      await expect(page.getByText(openStatus)).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByText(closedStatus)).toBeVisible();
      await expect(trigger).toBeFocused();
    });
  }
});

test('supported pointer dismissal closes floating and modal surfaces', async ({ page }) => {
  const cases = [
    ['dropdown-menu', 'Actions', 'dropdown-menu-content', '[role="presentation"][data-base-ui-inert]'],
    ['popover', 'Connection limits', 'popover-content', 'main h1'],
    ['dialog', 'Rename database', 'dialog-popup', '[data-slot="dialog-viewport"]'],
    ['drawer', 'Open quick actions', 'drawer-content', '[data-slot="drawer-overlay"]'],
    ['sheet', 'Edit organization', 'sheet-content', '[data-slot="sheet-overlay"]'],
  ] as const;

  for (const [slug, triggerName, contentSlot, outsideSelector] of cases) {
    await test.step(slug, async () => {
      await visitPrimitive(page, slug);
      const trigger = page.getByRole('button', { name: triggerName });
      await trigger.click();
      const content = page.locator(`[data-slot="${contentSlot}"]`);
      await expect(content).toBeVisible();
      await page.locator(outsideSelector).click({ position: { x: 2, y: 2 } });
      await expect(content).toBeHidden();
      await expect(trigger).toBeFocused();
    });
  }
});

const nestedCases = [
  {
    slug: 'dialog',
    parentTrigger: 'Create connection',
    parentSlot: 'dialog-popup',
    childTrigger: 'Configure',
    childName: 'Connection pool',
    childClose: 'Apply',
  },
  {
    slug: 'drawer',
    parentTrigger: 'Configure backup',
    parentSlot: 'drawer-content',
    childTrigger: 'Change',
    childName: 'Backup window',
    childClose: '02:00',
  },
  {
    slug: 'sheet',
    parentTrigger: 'Edit environment',
    parentSlot: 'sheet-content',
    childTrigger: 'Change',
    childName: 'Deployment region',
    childClose: 'us-east-1',
  },
] as const;

for (const nested of nestedCases) {
  test(`${nested.slug} keeps a nested popover interactive inside the modal portal chain`, async ({ page }) => {
    await visitPrimitive(page, nested.slug);
    await page.getByRole('button', { name: nested.parentTrigger }).click();

    const parent = page.locator(`[data-slot="${nested.parentSlot}"]`);
    await expect(parent).toBeVisible();
    await parent.getByRole('button', { name: nested.childTrigger }).click();

    const child = page.getByRole('dialog', { name: nested.childName });
    await expect(child).toBeVisible();
    await child.getByRole('button', { name: nested.childClose }).click();
    await expect(child).toBeHidden();
    await expect(parent).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(parent).toBeHidden();
  });
}

test('dialog survives rapid cycles, unmounts after exit, and honors reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await visitPrimitive(page, 'dialog');

  const trigger = page.getByRole('button', { name: 'Rename database' });
  const popup = page.locator('[data-slot="dialog-popup"]');
  for (let cycle = 0; cycle < 3; cycle += 1) {
    await trigger.click();
    await expect(popup).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(popup).toHaveCount(0);
  }
});

test('documentation order, anchors, and shared install/source mode remain synchronized', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await visitPrimitive(page, 'select');

  const sections = page.locator('article > section');
  await expect(sections).toHaveCount(8);
  expect(await sections.evaluateAll((elements) => elements.map((element) => element.id))).toEqual([
    'overview',
    'installation',
    'when-to-use',
    'usage',
    'state',
    'examples',
    'accessibility',
    'api-reference',
  ]);

  const install = page.locator('#installation');
  await install.getByRole('tab', { name: 'registry' }).click();
  await expect(install).toContainText('pnpm dlx shadcn@4.13.1 add @constructive/select');
  await expect(install).toContainText("from '@/components/ui/select'");
  await expect(install).toContainText('The npm package is not required.');

  await page.locator('#overview').getByRole('tab', { name: 'source' }).click();
  const sourcePanel = page.locator('#overview [role="tabpanel"]');
  await expect(sourcePanel).toContainText(/from ["']@\/components\/ui\/select["']/);
  await expect(sourcePanel).not.toContainText("from '@constructive-io/ui/select'");
  expect(pageErrors).toEqual([]);
});

test('billing preview controls expose both account kinds and every resource state with visible semantics', async ({
  page,
}) => {
  await visitBilling(page, 'billing-activity-table');
  const frame = billingPreviewFrame(page);
  const activity = frame.locator('[data-slot="billing-activity-table"]');

  await expect(activity.getByText('Northstar Field Operations')).toBeVisible();
  await expect(activity.getByText('Organization', { exact: true })).toBeVisible();

  await chooseShowcaseOption(page, 'Account', 'Personal account');
  await expect(activity.getByText('Avery Chen')).toBeVisible();
  await expect(activity.getByText('Personal account', { exact: true })).toBeVisible();

  await chooseShowcaseOption(page, 'Resource state', 'Loading');
  await expect(activity).toHaveAttribute('aria-busy', 'true');
  await expect(activity.getByRole('status')).toContainText(
    'Loading billing activity',
  );

  await chooseShowcaseOption(page, 'Resource state', 'Empty');
  await expect(
    activity.getByRole('heading', { name: 'No billing activity' }),
  ).toBeVisible();

  await chooseShowcaseOption(page, 'Resource state', 'Error');
  await expect(
    activity.getByRole('heading', {
      name: 'Billing activity could not be loaded',
    }),
  ).toBeVisible();
  await expect(activity).toContainText('Billing activity is temporarily unavailable.');
  await expect(activity.getByRole('button', { name: 'Try again' })).toBeEnabled();

  await chooseShowcaseOption(page, 'Resource state', 'Stale');
  await expect(activity.getByText('Stale', { exact: true })).toBeVisible();
  await expect(activity.getByLabel('Data quality: Stale')).toBeVisible();

  await chooseShowcaseOption(page, 'Resource state', 'Estimated');
  await expect(activity.getByText('Estimated', { exact: true })).toBeVisible();
  await expect(activity.getByLabel('Data quality: Estimated')).toBeVisible();

  await chooseShowcaseOption(page, 'Resource state', 'Ready');
  for (const semanticLabel of [
    'Usage recorded',
    'Credits granted',
    'Credits rolled over',
    'Credits expired',
    'Provider pending review',
  ]) {
    await expect(activity.getByText(semanticLabel, { exact: true })).toBeVisible();
  }

  await activity.getByRole('button', { name: 'Next' }).click();
  const callbackStatus = frame.getByRole('status');
  await expect(callbackStatus).toContainText('Action received.');
  await expect(callbackStatus).toContainText('onPageChange(2)');
  await expect(callbackStatus).toContainText(
    'Its example data remains unchanged.',
  );
  await expect(activity).toContainText('Page 1');
});

test('billing breakpoint shortcuts use a real iframe viewport and full screen restores focus', async ({
  page,
}) => {
  await visitBilling(page, 'billing-pricing-table');
  const preview = page.locator('[data-slot="billing-showcase-preview"]');
  const inlineFrame = preview.locator(
    'iframe[title="Pricing table inline live preview"]',
  );

  await expect(inlineFrame).toHaveAttribute(
    'src',
    /\/blocks\/blocks\/billing\/billing-pricing-table\/preview\/\?account=organization&state=ready$/,
  );
  await expect
    .poll(() =>
      inlineFrame.evaluate(
        (frame) => (frame as HTMLIFrameElement).contentWindow?.innerWidth,
      ),
    )
    .toBe(1280);
  expect(
    await inlineFrame.evaluate((frame) => frame.getBoundingClientRect().height),
  ).toBeLessThanOrEqual(960);

  await preview
    .getByRole('button', { name: 'Mobile preview, 390 pixels' })
    .click();
  await expect
    .poll(() =>
      inlineFrame.evaluate(
        (frame) => (frame as HTMLIFrameElement).contentWindow?.innerWidth,
      ),
    )
    .toBe(390);
  expect(
    await billingPreviewFrame(page)
      .locator('[data-slot="billing-pricing-table"] > .grid')
      .evaluate(
        (grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length,
      ),
  ).toBe(1);

  const fullscreenTrigger = preview.getByRole('button', {
    name: 'Open full-screen preview',
  });
  await fullscreenTrigger.click();
  const dialog = page.getByRole('dialog', { name: 'Live source preview' });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Mobile preview, 390 pixels' }),
  ).toBeFocused();
  await dialog
    .getByRole('button', { name: 'Tablet preview, 768 pixels' })
    .click();
  const fullscreenFrame = dialog.locator('iframe');
  await expect
    .poll(() =>
      fullscreenFrame.evaluate(
        (frame) => (frame as HTMLIFrameElement).contentWindow?.innerWidth,
      ),
    )
    .toBe(768);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(fullscreenTrigger).toBeFocused();
  await expect
    .poll(() =>
      inlineFrame.evaluate(
        (frame) => (frame as HTMLIFrameElement).contentWindow?.innerWidth,
      ),
    )
    .toBe(768);
});

test('billing settings keeps narrow leaf layout inside its desktop rail', async ({
  page,
}) => {
  await visitBilling(page, 'billing-settings-page');
  const inlineFrame = page.locator(
    '[data-slot="billing-showcase-preview"] iframe',
  );
  await expect
    .poll(() =>
      inlineFrame.evaluate(
        (frame) => (frame as HTMLIFrameElement).contentWindow?.innerWidth,
      ),
    )
    .toBe(1280);
  await expect
    .poll(() =>
      inlineFrame.evaluate((frame) => frame.getBoundingClientRect().height),
    )
    .toBe(960);

  const frame = billingPreviewFrame(page);
  const primary = frame.locator('[data-slot="billing-settings-usage-primary"]');
  const overviewGrid = primary.locator('xpath=..');
  expect(
    await overviewGrid.evaluate(
      (grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length,
    ),
  ).toBe(12);

  const rail = frame.locator('[data-slot="billing-settings-overview-rail"]');
  expect(
    await rail.evaluate((element) => element.getBoundingClientRect().width),
  ).toBeLessThan(640);
  const subscriptionHeader = rail.locator(
    '[data-slot="billing-subscription-card"] [data-slot="card-header"]',
  );
  expect(
    await subscriptionHeader.evaluate(
      (header) =>
        getComputedStyle(header).gridTemplateColumns.split(' ').length,
    ),
  ).toBe(1);
});

test('billing settings tabs follow keyboard conventions and partial failures remain local', async ({
  page,
}) => {
  await visitBilling(page, 'billing-settings-page');
  const settings = billingPreviewFrame(page).locator(
    '[data-slot="billing-settings-page"]',
  );
  const tabList = settings.getByRole('tablist', { name: 'Billing sections' });
  const overview = tabList.getByRole('tab', { name: 'Overview' });
  const usage = tabList.getByRole('tab', { name: 'Usage' });
  const plans = tabList.getByRole('tab', { name: 'Plans' });

  await expect(overview).toHaveAttribute('aria-selected', 'true');
  await overview.focus();
  await overview.press('ArrowRight');
  await expect(usage).toBeFocused();
  await expect(usage).toHaveAttribute('aria-selected', 'false');
  await usage.press('Enter');
  await expect(usage).toHaveAttribute('aria-selected', 'true');
  await expect(
    settings.locator('[data-slot="billing-usage-history"]'),
  ).toBeVisible();
  await expect(
    settings.locator('[data-slot="billing-activity-table"]'),
  ).toBeVisible();

  await usage.press('End');
  await expect(plans).toBeFocused();
  await plans.press('Enter');
  await expect(plans).toHaveAttribute('aria-selected', 'true');
  await expect(
    settings.locator('[data-slot="billing-pricing-table"]'),
  ).toBeVisible();

  await plans.press('Home');
  await expect(overview).toBeFocused();
  await overview.press('Enter');
  await expect(overview).toHaveAttribute('aria-selected', 'true');

  await chooseShowcaseOption(page, 'Resource state', 'Partial failure');
  const usageOverview = settings.locator(
    '[data-slot="billing-usage-overview"]',
  );
  await expect(
    usageOverview.getByRole('heading', { name: 'Usage could not be loaded' }),
  ).toBeVisible();
  await expect(usageOverview.getByRole('button', { name: 'Try again' })).toBeEnabled();

  const credits = settings.locator('[data-slot="billing-credits-card"]');
  await expect(credits.getByText('Stale', { exact: true })).toBeVisible();
  await expect(settings.getByText('Scale', { exact: true })).toBeVisible();

  await usage.click();
  const history = settings.locator('[data-slot="billing-usage-history"]');
  await expect(history.getByLabel('Data quality: Estimated')).toBeVisible();
  const loadingActivity = settings.locator(
    '[data-slot="billing-activity-table"]',
  );
  await expect(loadingActivity).toHaveAttribute('aria-busy', 'true');
  await expect(loadingActivity.getByRole('status')).toContainText(
    'Loading billing activity',
  );
});

test('billing tables expose captions and scoped column headers', async ({ page }) => {
  await visitBilling(page, 'billing-settings-page');
  const settings = billingPreviewFrame(page).locator(
    '[data-slot="billing-settings-page"]',
  );
  await settings.getByRole('tab', { name: 'Usage' }).click();

  const historyTable = settings.getByRole('table', {
    name: 'Billing usage summaries by period and meter.',
  });
  await expect(historyTable).toBeVisible();
  for (const header of [
    'Period',
    'Meter',
    'Used',
    'Allowance',
    'Credits',
    'Overage',
    'Quality',
  ]) {
    await expect(
      historyTable.getByRole('columnheader', { name: header }),
    ).toHaveAttribute('scope', 'col');
  }

  const activityTable = settings.getByRole('table', {
    name: 'Billing ledger activity for the selected account and filters.',
  });
  await expect(activityTable).toBeVisible();
  for (const header of [
    'Date',
    'Activity',
    'Meter',
    'Change',
    'Balance after',
    'Details',
  ]) {
    await expect(
      activityTable.getByRole('columnheader', { name: header }),
    ).toHaveAttribute('scope', 'col');
  }
});

test('billing activity metadata sheet has a name and description, restores focus, and honors reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await visitBilling(page, 'billing-activity-table');
  expect(
    await page.evaluate(() =>
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    ),
  ).toBe(true);

  const frame = billingPreviewFrame(page);
  const trigger = frame.getByRole('button', {
    name: 'View metadata: Provider pending review',
  });
  await trigger.click();

  const sheet = frame.getByRole('dialog', { name: 'Activity details' });
  await expect(sheet).toBeVisible();
  await expect(sheet).toHaveAccessibleDescription(
    'Review the ledger fields and metadata recorded with this activity.',
  );
  await expect(sheet.getByRole('heading', { name: 'Metadata' })).toBeVisible();
  await expect(sheet).toContainText('"source": "showcase"');

  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('billing settings reflow at an equivalent 200 percent zoom viewport', async ({
  page,
}) => {
  // A 1440px desktop viewport exposes 720 CSS pixels at 200% browser zoom.
  await page.setViewportSize({ width: 720, height: 500 });
  await visitBilling(page, 'billing-settings-page');
  await page
    .locator('[data-slot="billing-showcase-preview"]')
    .getByRole('button', { name: 'Mobile preview, 390 pixels' })
    .click();

  await expect(
    billingPreviewFrame(page).locator('[data-slot="billing-settings-page"]'),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});
