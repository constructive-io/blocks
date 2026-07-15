import { expect, test } from '@playwright/test';

import {
  LANDING_SHOWCASE_READY_SELECTOR,
  prepareVisualPage,
  snapshotRoute,
  type VisualTheme,
} from './visual-helpers';

const routes = [
  ['home', '/blocks/'],
  ['catalog', '/blocks/blocks'],
  ['ui-button', '/blocks/blocks/ui/button'],
  ['auth-sign-in', '/blocks/blocks/auth/sign-in-card'],
  ['chat', '/blocks/blocks/chat'],
  ['schema-builder', '/blocks/blocks/schema/builder'],
] as const;

for (const theme of ['light', 'dark'] satisfies VisualTheme[]) {
  test.describe(theme, () => {
    test.beforeEach(async ({ page }) => prepareVisualPage(page, theme));
    for (const [name, route] of routes) {
      test(`${name} remains visually stable`, async ({ page }) => {
        await snapshotRoute(page, route, `${name}-${theme}.png`, {
          readySelector: name === 'home' ? LANDING_SHOWCASE_READY_SELECTOR : undefined,
        });
      });
    }
  });
}

test('docs routes hydrate cleanly with SSR theme bootstrap and link pagers', async ({ browser }) => {
  // The Pages build mounts the app at /blocks, so the app's logical `/blocks`
  // routes are served one level deeper by this static-export harness.
  const routes = ['/blocks/blocks/', '/blocks/blocks/getting-started/'] as const;

  for (const route of routes) {
    const context = await browser.newContext({ colorScheme: 'dark' });
    await context.addInitScript(() => localStorage.setItem('theme', 'dark'));
    const page = await context.newPage();
    const failures: string[] = [];

    page.on('console', (message) => {
      const text = message.text();
      if (text.includes('Encountered a script tag') || text.includes('Hydration failed')) failures.push(text);
    });
    page.on('pageerror', (error) => failures.push(error.message));

    const response = await page.goto(route, { waitUntil: 'networkidle' });
    expect(response?.status()).toBe(200);
    expect(await response?.text()).toContain('localStorage.getItem');
    await expect(page.locator('html')).toHaveClass(/dark/);

    const nextPager = page.locator('nav[aria-label="Pagination"] > a[aria-label^="Next:"]');
    await expect(nextPager).toHaveCount(1);
    if (route === '/blocks/blocks/') {
      await expect(nextPager).toHaveAttribute('href', '/blocks/blocks/getting-started/');
    }

    await page.getByRole('button', { name: 'Light' }).first().click();
    await expect(page.locator('html')).toHaveClass(/light/);
    await page.getByRole('button', { name: 'Dark' }).first().click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(nextPager).toHaveCount(1);
    expect(failures).toEqual([]);

    await context.close();
  }
});
