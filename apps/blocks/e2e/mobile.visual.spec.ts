import { expect, test } from '@playwright/test';

test('the base primitive catalog remains usable at a mobile viewport', async ({ page }) => {
  await page.goto('/blocks/blocks/', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1, name: 'Install the foundation your way' })).toBeVisible();
  await expect(page.locator('section[aria-labelledby="primitive-catalog"] a[href*="/ui/"]')).toHaveCount(29);

  await page.getByRole('link', { name: /Tooltip/ }).first().click();
  await expect(page).toHaveURL(/\/blocks\/blocks\/ui\/tooltip\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Tooltip' })).toBeVisible();
});
