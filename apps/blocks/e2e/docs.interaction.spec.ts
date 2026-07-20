import { expect, test, type Locator, type Page } from '@playwright/test';

const primitiveRoute = (name: string) => `/blocks/blocks/ui/${name}/`;

async function visitPrimitive(page: Page, name: string) {
  const response = await page.goto(primitiveRoute(name), { waitUntil: 'networkidle' });
  expect(response?.status()).toBe(200);
  await expect(page.locator('main')).toBeVisible();
  await expect(page.getByRole('button', { name: /Switch to (light|dark) theme/ })).toBeEnabled();
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
