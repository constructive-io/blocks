import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    colorScheme: 'dark',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
      testMatch: /desktop\.visual\.spec\.ts/,
    },
    {
      name: 'mobile-chromium',
      use: { viewport: { width: 390, height: 844 } },
      testMatch: /mobile\.visual\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'pnpm build:pages && tsx e2e/static-server.ts',
    url: 'http://127.0.0.1:4173/blocks/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
