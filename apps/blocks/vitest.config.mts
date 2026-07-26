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
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**']
  }
});
