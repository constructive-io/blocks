import { defineConfig, devices } from '@playwright/test';

function requiredRouteUrl(): string {
  const value = process.env.CONSOLE_KIT_BASE_URL;
  if (!value) throw new Error('CONSOLE_KIT_BASE_URL is required for the live Console Kit suite.');

  const url = new URL(value);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('CONSOLE_KIT_BASE_URL must use HTTP or HTTPS.');
  }
  return url.toString();
}

const proofUrl = requiredRouteUrl();

export default defineConfig({
  testDir: './e2e-live',
  testMatch: /console-kit\.live\.spec\.ts/,
  outputDir: '/tmp/constructive-blocks-playwright-live',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: 'list',
  preserveOutput: 'failures-only',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: new URL(proofUrl).origin,
    colorScheme: 'dark',
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off'
  },
  projects: [
    {
      name: 'console-kit-live-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1000 }
      }
    }
  ],
  webServer: {
    command: 'pnpm dev',
    url: proofUrl,
    reuseExistingServer: true,
    timeout: 180_000
  }
});
