import { expect, test } from '@playwright/test';

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
