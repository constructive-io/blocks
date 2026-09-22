import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

// Blocks are frontend-only and tested in jsdom. tsconfigPaths() keeps the
// registry source imports aligned with the same `@/*` resolution used by tsc.
export default defineConfig({
  plugins: [react(), tsconfigPaths({ ignoreConfigErrors: true })],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './test/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
    // The demo-source generator and feature-pack interaction tests compile real
    // TypeScript and render full blocks; under the 14-project parallel Lerna run
    // they routinely cross vitest's 5s default without being slow on their own.
    testTimeout: 15_000

  }
});
