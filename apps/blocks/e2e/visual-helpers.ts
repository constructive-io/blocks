import { expect, type Page } from '@playwright/test';

export type VisualTheme = 'light' | 'dark';

export const LANDING_SHOWCASE_READY_SELECTOR = '[data-slot="sign-up-card"]';

type SnapshotRouteOptions = {
  readySelector?: string;
};

export async function prepareVisualPage(page: Page, theme: VisualTheme) {
  await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
  await page.addInitScript((selectedTheme) => {
    localStorage.clear();
    localStorage.setItem('theme', selectedTheme);
  }, theme);
  await page.route('**/api/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

export async function snapshotRoute(
  page: Page,
  route: string,
  snapshot: string,
  { readySelector }: SnapshotRouteOptions = {}
) {
  const response = await page.goto(route, { waitUntil: 'networkidle' });
  expect(response, `${route} should return an HTML document`).not.toBeNull();
  expect(response?.status(), `${route} should not snapshot an error page`).toBe(200);
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        caret-color: transparent !important;
        scroll-behavior: auto !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
      }
      canvas { visibility: hidden !important; }
    `,
  });
  await expect(page.locator('main')).toBeVisible();
  if (readySelector) await expect(page.locator(readySelector).first()).toBeAttached();
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo(0, 0);
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  });
  await expect(page).toHaveScreenshot(snapshot, { fullPage: false });
}
