import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

import {
  expect,
  test,
  type FrameLocator,
  type Locator,
  type Page,
  type TestInfo,
} from '@playwright/test';

const primitiveRoute = (name: string) => `/blocks/blocks/ui/${name}/`;
const billingRoute = (name: 'account' | 'console') => `/blocks/blocks/billing/${name}/`;

function billingPreviewFrame(page: Page): FrameLocator {
  return page.frameLocator(
    '[data-slot="application-block-showcase-preview"] iframe[title$="inline live preview"]',
  );
}

async function visitPrimitive(page: Page, name: string) {
  const response = await page.goto(primitiveRoute(name), { waitUntil: 'networkidle' });
  expect(response?.status()).toBe(200);
  await expect(page.locator('main')).toBeVisible();
  await expect(page.getByRole('button', { name: /Switch to (light|dark) theme/ })).toBeEnabled();
}

async function visitBilling(page: Page, name: 'account' | 'console') {
  const response = await page.goto(billingRoute(name), { waitUntil: 'networkidle' });
  expect(response?.status()).toBe(200);
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('[data-slot="application-block-showcase-preview"]')).toBeVisible();
  await expect(billingPreviewFrame(page).getByRole('radiogroup', {
    name: name === 'account' ? 'Scenario' : 'Scope',
  })).toBeVisible();
}

async function recordBillingJourney(page: Page, errors: string[], testInfo: TestInfo) {
  const artifactRoot = process.env.BLOCKS_E2E_ARTIFACT_DIR
    ?? join(tmpdir(), 'constructive-blocks-billing-e2e');
  const artifactErrors: string[] = [];
  let artifactDirectory: string | undefined;
  try {
    await mkdir(artifactRoot, { recursive: true });
    artifactDirectory = await mkdtemp(join(artifactRoot, `${basename(testInfo.outputDir)}-`));
    const screenshot = join(artifactDirectory, 'journey.png');
    await page.screenshot({ path: screenshot, fullPage: true, timeout: 5_000 });
    testInfo.annotations.push({ type: 'artifact', description: screenshot });
    await testInfo.attach('billing-journey', { path: screenshot, contentType: 'image/png' });
  } catch (error) {
    artifactErrors.push(String(error));
  }

  try {
    if (artifactDirectory) {
      const path = join(artifactDirectory, 'diagnostics.json');
      await writeFile(path, JSON.stringify({ pageErrors: errors, artifactErrors }, null, 2));
      testInfo.annotations.push({ type: 'artifact', description: path });
    }
  } catch (error) {
    artifactErrors.push(String(error));
  }
  try {
    await testInfo.attach('billing-diagnostics', {
      body: JSON.stringify({ pageErrors: errors, artifactErrors }, null, 2),
      contentType: 'application/json',
    });
  } catch (error) {
    artifactErrors.push(String(error));
  }
  // Record both failures without replacing the journey's original assertion or timeout.
  expect.soft(errors, 'Unhandled billing page errors').toEqual([]);
  expect.soft(artifactErrors, 'Billing journey artifacts must be saved').toEqual([]);
}

const billingTest = test.extend<{ billingArtifacts: void }>({
  billingArtifacts: [async ({ page }, use, testInfo) => {
    const errors: string[] = [];
    const captureError = (error: Error) => errors.push(error.message);
    page.on('pageerror', captureError);
    try {
      await use();
    } finally {
      try {
        await recordBillingJourney(page, errors, testInfo);
      } finally {
        page.off('pageerror', captureError);
      }
    }
  }, { auto: true, timeout: 10_000 }],
});

async function setBillingViewport(page: Page, name: 'Mobile' | 'Tablet' | 'Desktop') {
  const width = { Mobile: 390, Tablet: 768, Desktop: 1280 }[name];
  const preview = page.locator('[data-slot="application-block-showcase-preview"]');
  await preview.getByRole('button', { name: `${name} preview, ${width} pixels` }).click();
  await expect.poll(() => preview.locator('iframe').evaluate(
    (frame) => (frame as HTMLIFrameElement).contentWindow?.innerWidth,
  )).toBe(width);
  // Pointer actionability also waits for the resized frame's visible bounds to settle.
  await preview.locator('iframe').hover();
}

async function chooseBillingScenario(frame: FrameLocator, name: string) {
  const choice = frame.getByRole('radiogroup', { name: 'Scenario' })
    .getByRole('radio', { name, exact: true });
  await choice.click();
  await expect(choice).toHaveAttribute('aria-checked', 'true');
}

async function navigateBilling(frame: FrameLocator, name: string, consoleView = false) {
  let navigation = frame.getByRole('navigation', {
    name: consoleView ? 'Console views' : 'Billing views',
  });
  if (!await navigation.isVisible()) {
    await frame.getByRole('button', { name: 'Open navigation', exact: true }).click();
    const drawer = frame.getByRole('dialog', { name: 'Navigation', exact: true });
    await expect(drawer).toBeVisible();
    navigation = drawer.getByRole('navigation', {
      name: consoleView ? 'Console views' : 'Billing views',
    });
  }
  await navigation.getByRole('button', { name: new RegExp(`^${name}\\b`) }).click();
  await expect(frame.getByRole('region', { name, exact: true }).first()).toBeVisible();
  await expect(frame.getByRole('dialog', { name: 'Navigation', exact: true })).toBeHidden();
}

async function planHeadingBounds(frame: FrameLocator) {
  const plans = frame.getByRole('region', { name: 'Plans', exact: true });
  const free = plans.getByRole('heading', { name: 'Free', exact: true });
  const pro = plans.getByRole('heading', { name: 'Pro', exact: true });
  await expect(free).toHaveCount(1);
  await expect(pro).toHaveCount(1);
  return { free: (await free.boundingBox())!, pro: (await pro.boundingBox())! };
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
    ['dropdown-menu', 'Actions', 'dropdown-menu-content', '[role="presentation"][data-base-ui-inert]', 'trigger'],
    ['popover', 'Connection limits', 'popover-content', 'main h1', 'main'],
    ['dialog', 'Rename database', 'dialog-popup', '[data-slot="dialog-viewport"]', 'trigger'],
    ['drawer', 'Open quick actions', 'drawer-content', '[data-slot="drawer-overlay"]', 'trigger'],
    ['sheet', 'Edit organization', 'sheet-content', '[data-slot="sheet-overlay"]', 'trigger'],
  ] as const;

  for (const [slug, triggerName, contentSlot, outsideSelector, focusTarget] of cases) {
    await test.step(slug, async () => {
      await visitPrimitive(page, slug);
      const trigger = page.getByRole('button', { name: triggerName });
      await trigger.click();
      const content = page.locator(`[data-slot="${contentSlot}"]`);
      await expect(content).toBeVisible();
      await page.locator(outsideSelector).click({ position: { x: 2, y: 2 } });
      await expect(content).toBeHidden();
      if (focusTarget === 'trigger') {
        await expect(trigger).toBeFocused();
      } else {
        // Non-modal popovers preserve intentional pointer focus outside the popup.
        await expect(page.locator(focusTarget)).toBeFocused();
      }
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
  await expect(install).toContainText('pnpm dlx shadcn@latest add @constructive/select');
  await expect(install).toContainText("from '@/components/ui/select'");
  await expect(install).toContainText('The npm package is not required.');

  await page.locator('#overview').getByRole('tab', { name: 'source' }).click();
  const sourcePanel = page.locator('#overview [role="tabpanel"]');
  await expect(sourcePanel).toContainText(/from ["']@\/components\/ui\/select["']/);
  await expect(sourcePanel).not.toContainText("from '@constructive-io/ui/select'");
  expect(pageErrors).toEqual([]);
});

billingTest('billing preview scenarios expose account kinds, lifecycle failures, and host actions', async ({ page }) => {
  test.setTimeout(60_000);
  await visitBilling(page, 'account');
  await setBillingViewport(page, 'Desktop');
  const frame = billingPreviewFrame(page);
  const scenarios = frame.getByRole('radiogroup', { name: 'Scenario' });
  await expect(scenarios.getByRole('radio')).toHaveCount(9);
  await expect(frame.getByRole('button', { name: 'Billing account: Northwind Labs' })).toBeVisible();
  await expect(frame.getByRole('region', { name: 'Northwind Labs billing overview', exact: true })).toContainText('For teams running several apps with shared seats.');

  await chooseBillingScenario(frame, 'Free, no subscription');
  await expect(frame.getByRole('button', { name: 'Billing account: Mira Sato' })).toBeVisible();
  await expect(frame.getByRole('status').filter({ hasText: 'No plan yet' })).toContainText('Pick a plan');
  await navigateBilling(frame, 'Invoices');
  await expect(frame.getByRole('heading', { name: 'Invoices', exact: true, level: 2 })).toBeVisible();
  await expect(frame.getByText('No invoices yet', { exact: true })).toBeVisible();
  await expect(frame.getByText('Invoices appear after the first renewal or purchase.', { exact: true })).toBeVisible();
  await expect(frame.getByRole('table')).toHaveCount(0);

  await chooseBillingScenario(frame, 'Payment overdue');
  const overdue = frame.getByRole('status').filter({ hasText: 'Payment failed' });
  await expect(overdue).toContainText('Service continues until');
  await overdue.getByRole('button', { name: 'Update payment method' }).click();
  await expect(frame.getByRole('status').filter({ hasText: 'The host would open' })).toContainText('customer portal');

  await chooseBillingScenario(frame, 'Suspended');
  const suspended = frame.getByRole('alert').filter({ hasText: 'Billing suspended' });
  await expect(suspended).toContainText('Billing suspended');
  await expect(suspended).toContainText('storefront-prod, auth-prod stopped serving requests');
  await suspended.getByRole('button', { name: 'Pay open invoice' }).click();
  await expect(frame.getByRole('status').filter({ hasText: 'The host would open invoice' })).toContainText('inv-open');

  await chooseBillingScenario(frame, 'Checkout pending');
  await expect(frame.getByRole('status').filter({ hasText: 'Confirming your payment' })).toContainText('as soon as it confirms');
  await chooseBillingScenario(frame, 'Scheduled downgrade');
  await expect(frame.getByRole('region', { name: 'Northwind Labs billing overview', exact: true })
    .getByRole('status').filter({ hasText: 'Moving to Pro' })).toContainText('Oct 1, 2026');
  await chooseBillingScenario(frame, 'Needs review');
  const review = frame.getByRole('status').filter({ hasText: 'A billing change needs review' });
  await expect(review).toContainText('Nothing was charged twice');
  await review.getByRole('button', { name: 'Contact support' }).click();
  await expect(frame.getByRole('status').filter({ hasText: 'The host received' })).toContainText('contact-support');

  await chooseBillingScenario(frame, 'Member view');
  await expect(frame.getByRole('button', { name: 'Billing account: Acme Research' })).toBeVisible();
  await expect(frame.getByRole('button', { name: 'Redeem code', exact: true })).toHaveCount(0);
  await expect(frame.getByRole('button', { name: 'Change plan', exact: true })).toHaveCount(0);
  await navigateBilling(frame, 'Plans');
  await expect(frame.getByRole('region', { name: 'Plans', exact: true }).getByRole('button', { name: /Switch to/ })).toHaveCount(0);

  await chooseBillingScenario(frame, 'Tenant app');
  await expect(frame.getByRole('button', { name: 'Billing account: Harbor Coaching' })).toBeVisible();
  await expect(frame.getByRole('region', { name: 'Harbor Coaching billing overview', exact: true })).toContainText('Coaching sessions');
  await expect(frame.getByRole('region', { name: 'Harbor Coaching billing overview', exact: true })).not.toContainText('storefront-prod');

  await chooseBillingScenario(frame, 'Active');
  await frame.getByRole('button', { name: 'Billing account: Northwind Labs' }).click();
  await frame.getByRole('menuitem', { name: /Mira Sato/ }).click();
  await expect(frame.getByRole('status').filter({ hasText: 'The host would load billing' })).toContainText('acct-personal');
  // Account data is controlled by the host: a request cannot invent new account rows.
  await expect(frame.getByRole('button', { name: 'Billing account: Northwind Labs' })).toBeVisible();

  await visitBilling(page, 'console');
  const consoleFrame = billingPreviewFrame(page);
  await setBillingViewport(page, 'Desktop');
  await consoleFrame.getByRole('radiogroup', { name: 'Scope' }).getByRole('radio', { name: 'Tenant app', exact: true }).click();
  await navigateBilling(consoleFrame, 'Provider', true);
  const provider = consoleFrame.getByRole('region', { name: 'Provider', exact: true });
  await expect(provider).toContainText('Not ready yet');
  const billingSwitch = provider.getByRole('switch', { name: 'Billing is off' });
  await expect(billingSwitch).toBeDisabled();
  await expect(billingSwitch).toHaveAccessibleDescription('Locked until readiness passes.');
  const readiness = provider.getByRole('list').filter({ hasText: 'Webhook signing secret' });
  await expect(readiness.getByRole('listitem').filter({ hasText: 'Webhook signing secret' })).toContainText('fail');
  await provider.getByRole('button', { name: 'Check now' }).click();
  await expect(readiness).toHaveAttribute('aria-busy', 'true');
  await expect(provider).toContainText('Checking readiness');
  await expect(billingSwitch).toBeDisabled();
  await expect(provider).toContainText('Ready to bill');
  await expect(readiness).not.toHaveAttribute('aria-busy', 'true');
  await expect(billingSwitch).toBeEnabled();
  await billingSwitch.click();
  await expect(provider.getByRole('switch', { name: 'Billing is on' })).toBeChecked();
  await expect(consoleFrame.getByRole('status').filter({ hasText: 'The host would set' })).toContainText('enable_billing to true');
});

billingTest('billing breakpoint shortcuts resize the real iframe and full screen restores focus', async ({ page }) => {
  await visitBilling(page, 'account');
  const preview = page.locator('[data-slot="application-block-showcase-preview"]');
  const inlineFrame = preview.locator('iframe[title="Billing Account inline live preview"]');
  await expect(inlineFrame).toHaveAttribute('src', /\/blocks\/blocks\/billing\/account\/preview\/$/);
  await expect.poll(() => inlineFrame.evaluate((frame) => (frame as HTMLIFrameElement).contentWindow?.innerWidth)).toBe(1280);
  await setBillingViewport(page, 'Mobile');
  expect(await inlineFrame.evaluate((frame) => frame.getBoundingClientRect().height)).toBeLessThanOrEqual(960);
  await navigateBilling(billingPreviewFrame(page), 'Plans');
  await expect.poll(async () => {
    const { free, pro } = await planHeadingBounds(billingPreviewFrame(page));
    return pro.y >= free.y + free.height - 1;
  }).toBe(true);
  await setBillingViewport(page, 'Desktop');
  await expect.poll(async () => {
    const { free, pro } = await planHeadingBounds(billingPreviewFrame(page));
    return pro.x >= free.x + free.width - 1;
  }).toBe(true);
  await setBillingViewport(page, 'Mobile');

  const fullscreenTrigger = preview.getByRole('button', { name: 'Open full-screen preview' });
  await fullscreenTrigger.click();
  const dialog = page.getByRole('dialog', { name: 'Billing Account preview' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Mobile preview, 390 pixels' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Tablet preview, 768 pixels' }).click();
  await expect.poll(() => dialog.locator('iframe').evaluate((frame) => (frame as HTMLIFrameElement).contentWindow?.innerWidth)).toBe(768);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(fullscreenTrigger).toBeFocused();
  await expect.poll(() => inlineFrame.evaluate((frame) => (frame as HTMLIFrameElement).contentWindow?.innerWidth)).toBe(768);
});

billingTest('billing narrow plan content reflows inside a desktop sidebar and survives rail collapse', async ({ page }) => {
  await visitBilling(page, 'account');
  await setBillingViewport(page, 'Tablet');
  // At 784px the shell still has a desktop rail, leaving narrow space for the view.
  await page.getByRole('separator', { name: 'Resize preview width' }).press('ArrowRight');
  await expect.poll(() => page.locator('[data-slot="application-block-showcase-preview"] iframe').evaluate(
    (element) => (element as HTMLIFrameElement).contentWindow?.innerWidth,
  )).toBe(784);
  const frame = billingPreviewFrame(page);
  const sidebar = frame.getByRole('complementary', { name: 'Billing', exact: true });
  await expect(sidebar).toBeVisible();
  await navigateBilling(frame, 'Plans');
  const plans = frame.getByRole('region', { name: 'Plans', exact: true });
  const narrowWidth = await plans.evaluate((element) => element.getBoundingClientRect().width);
  expect(narrowWidth).toBeLessThan(640);
  const { free, pro } = await planHeadingBounds(frame);
  expect(pro.y).toBeGreaterThanOrEqual(free.y + free.height - 1);
  expect(await frame.locator('html').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await sidebar.getByRole('button', { name: 'Collapse sidebar' }).click();
  await expect.poll(() => plans.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(narrowWidth + 100);
  await expect(plans.getByRole('button', { name: 'Switch to Pro' })).toBeEnabled();
  await sidebar.getByRole('button', { name: 'Expand sidebar' }).click();
  await expect.poll(() => plans.evaluate((element) => element.getBoundingClientRect().width)).toBe(narrowWidth);
});

billingTest('billing catalog supports keyboard choices and a refused code leaves other credits usable', async ({ page }) => {
  await visitBilling(page, 'console');
  await setBillingViewport(page, 'Desktop');
  const frame = billingPreviewFrame(page);
  await navigateBilling(frame, 'Catalog', true);
  const group = frame.getByRole('radiogroup', { name: 'Catalog section' });
  const plans = group.getByRole('radio', { name: /Plans & prices/ });
  const entitlements = group.getByRole('radio', { name: 'Entitlements', exact: true });
  const codes = group.getByRole('radio', { name: /Gift codes/ });
  await expect(plans).toHaveAttribute('aria-checked', 'true');
  await plans.focus();
  await plans.press('ArrowRight');
  await expect(entitlements).toBeFocused();
  await expect(entitlements).toHaveAttribute('aria-checked', 'true');
  await expect(frame.getByRole('heading', { name: 'Entitlements', exact: true })).toBeVisible();
  await entitlements.press('End');
  await expect(codes).toBeFocused();
  await expect(codes).toHaveAttribute('aria-checked', 'true');
  await expect(frame.getByRole('button', { name: 'New code', exact: true })).toBeVisible();
  await codes.press('Home');
  await expect(plans).toBeFocused();
  await expect(plans).toHaveAttribute('aria-checked', 'true');
  await plans.press('ArrowLeft');
  await expect(codes).toBeFocused();
  await codes.press('ArrowRight');
  await expect(plans).toBeFocused();

  await visitBilling(page, 'account');
  await setBillingViewport(page, 'Desktop');
  const account = billingPreviewFrame(page);
  await navigateBilling(account, 'Credits');
  const credits = account.getByRole('region', { name: 'Credits', exact: true });
  const field = credits.getByRole('textbox', { name: 'Have a code?' });
  await field.fill('UNKNOWN-CODE');
  await credits.getByRole('button', { name: 'Redeem', exact: true }).click();
  await expect(credits.getByRole('button', { name: 'Checking…' })).toBeDisabled();
  await expect(credits.getByRole('button', { name: 'Checking…' })).toHaveAttribute('aria-busy', 'true');
  await expect(credits.getByRole('alert')).toContainText('That code doesn’t exist.');
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await expect(field).toHaveAccessibleDescription(/That code doesn’t exist/);
  await expect(field).toHaveValue('UNKNOWN-CODE');
  await expect(credits).toContainText('57,350');
  await expect(credits.getByRole('heading', { name: 'Credit packs', exact: true })).toBeVisible();
  await expect(credits.getByRole('button', { name: /Buy/ }).first()).toBeEnabled();
  await field.fill(' hackweek-2026 ');
  await credits.getByRole('button', { name: 'Redeem', exact: true }).click();
  await expect(credits.getByRole('status')).toContainText('HACKWEEK-2026 added 25,000 Compute, 2,000,000 Model input tokens.');
  await expect(credits.getByRole('alert')).toHaveCount(0);
  await expect(field).not.toHaveAttribute('aria-invalid', 'true');
  await expect(account.getByRole('status').filter({ hasText: 'The host redeemed' })).toContainText('HACKWEEK-2026 for this account');
  await expect(credits.getByText('HACKWEEK-2026', { exact: true }).last()).toBeVisible();
});

billingTest('billing tables have accessible captions, scoped headers, and actionable invoice details', async ({ page }) => {
  await visitBilling(page, 'account');
  await setBillingViewport(page, 'Desktop');
  const account = billingPreviewFrame(page);
  await navigateBilling(account, 'Invoices');
  const invoices = account.getByRole('table', { name: 'Billing invoices for this account.' });
  await expect(invoices).toBeVisible();
  for (const name of ['Invoice', 'Period', 'Status', 'Amount', 'Links']) {
    await expect(invoices.getByRole('columnheader', { name, exact: true })).toHaveAttribute('scope', 'col');
  }
  const renewal = invoices.getByRole('button', { name: /NW-2026-0009/ });
  await renewal.click();
  await expect(renewal).toHaveAttribute('aria-expanded', 'true');
  await expect(invoices).toContainText('Team plan');
  await invoices.getByRole('link', { name: 'View invoice NW-2026-0009', exact: true }).click();
  await expect(account.getByRole('status').filter({ hasText: 'The host would open invoice' })).toContainText('inv-0924');

  await visitBilling(page, 'console');
  await setBillingViewport(page, 'Desktop');
  const consoleFrame = billingPreviewFrame(page);
  await navigateBilling(consoleFrame, 'Catalog', true);
  const prices = consoleFrame.getByRole('table', { name: 'Billing plans and provider prices.' });
  await expect(prices).toBeVisible();
  for (const name of ['Plan / price', 'Billing', 'Amount', 'Provider', 'Active']) {
    await expect(prices.getByRole('columnheader', { name, exact: true })).toHaveAttribute('scope', 'col');
  }
  await expect(prices).toContainText('$25.00');
  await expect(prices).toContainText('Synced');
});

billingTest('billing meter details have a name and description, restore focus, and propagate reduced-motion preference', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await visitBilling(page, 'account');
  await setBillingViewport(page, 'Desktop');
  const frame = billingPreviewFrame(page);
  await navigateBilling(frame, 'Usage');
  expect(await frame.locator('html').evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  const trigger = frame.getByRole('region', { name: 'Usage', exact: true }).getByRole('button', { name: /^SMS/ });
  for (let cycle = 0; cycle < 2; cycle += 1) {
    await trigger.click();
    const sheet = frame.getByRole('dialog', { name: 'SMS', exact: true });
    await expect(sheet).toBeVisible();
    await expect(sheet).toHaveAccessibleDescription('Measured in messages, summed each month.');
    await expect(sheet).toContainText('2,000 / 2,000 messages');
    await expect(sheet).toContainText('Plan allowance');
    await expect(sheet).toContainText('Credits applied');
    await expect(sheet).toContainText('500 requests');
    await expect(sheet).toContainText('100 requests');
    await expect(sheet).toContainText('5 credits from Messaging, then from Universal credits');
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
});

billingTest('billing account reflows and stays usable at an equivalent 200 percent zoom viewport', async ({ page }) => {
  // A 1440px desktop viewport exposes 720 CSS pixels at 200% browser zoom.
  await page.setViewportSize({ width: 720, height: 500 });
  await visitBilling(page, 'account');
  await setBillingViewport(page, 'Mobile');
  await page.locator('[data-slot="application-block-showcase-preview"] iframe').scrollIntoViewIfNeeded();
  const frame = billingPreviewFrame(page);
  const openNavigation = frame.getByRole('button', { name: 'Open navigation', exact: true });
  await openNavigation.click();
  const drawer = frame.getByRole('dialog', { name: 'Navigation', exact: true });
  await expect(drawer).toBeVisible();
  await drawer.getByRole('button', { name: 'Plans', exact: true }).click();
  await expect(drawer).toBeHidden();
  await expect(frame.getByRole('region', { name: 'Plans', exact: true }).getByRole('button', { name: 'Switch to Pro' })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(await frame.locator('html').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await navigateBilling(frame, 'Credits');
  const credits = frame.getByRole('region', { name: 'Credits', exact: true });
  await credits.getByRole('textbox', { name: 'Have a code?' }).fill('HACKWEEK-2026');
  await credits.getByRole('button', { name: 'Redeem', exact: true }).click();
  await expect(credits.getByRole('status')).toContainText('HACKWEEK-2026 added');
  expect(await frame.locator('html').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
});
