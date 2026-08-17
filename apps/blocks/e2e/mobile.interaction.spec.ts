import { expect, test } from '@playwright/test';

test('mobile navigation opens, follows a link, and closes', async ({ page }) => {
  await page.setViewportSize({ width: 860, height: 900 });
  await page.goto('/blocks/blocks/ui/button/', { waitUntil: 'networkidle' });

  const navigationMenu = page.getByRole('button', { name: 'Navigation menu', exact: true });
  await expect(navigationMenu).toHaveAttribute('aria-expanded', 'false');
  await navigationMenu.click();
  await expect(navigationMenu).toHaveAttribute('aria-expanded', 'true');

  await page.getByRole('link', { name: 'Tooltip' }).click();
  await expect(page).toHaveURL(/\/blocks\/blocks\/ui\/tooltip\/$/);
  await expect(navigationMenu).toHaveAttribute('aria-expanded', 'false');
});

test('mobile modal examples dismiss with Escape and restore focus', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/blocks/blocks/ui/sheet/', { waitUntil: 'networkidle' });

  const trigger = page.getByRole('button', { name: 'Edit organization' });
  await trigger.click();
  const sheet = page.getByRole('dialog', { name: 'Organization settings' });
  await expect(sheet).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(pageErrors).toEqual([]);
});
