import { test } from '@playwright/test';

import { prepareVisualPage, snapshotRoute } from './visual-helpers';

const routes = [
  ['home', '/blocks/'],
  ['auth-sign-in', '/blocks/blocks/auth/sign-in-card'],
  ['schema-builder', '/blocks/blocks/schema/builder'],
] as const;

test.beforeEach(async ({ page }) => prepareVisualPage(page, 'light'));

for (const [name, route] of routes) {
  test(`${name} remains visually stable`, async ({ page }) => {
    await snapshotRoute(page, route, `${name}-mobile-light.png`);
  });
}
