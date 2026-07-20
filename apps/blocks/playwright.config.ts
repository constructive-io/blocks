import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  outputDir: '/tmp/constructive-blocks-playwright',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  preserveOutput: 'never',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    colorScheme: 'dark',
    serviceWorkers: 'block',
    screenshot: 'off',
    trace: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'smoke-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
      testMatch: /docs\.smoke\.spec\.ts/,
    },
    {
      name: 'interaction-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
      testMatch: /docs\.interaction\.spec\.ts/,
    },
    {
      name: 'interaction-mobile-chromium',
      use: { ...devices['iPhone 13'] },
      testMatch: /mobile\.interaction\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'pnpm build:pages && tsx e2e/static-server.ts',
    url: 'http://127.0.0.1:4173/blocks/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
