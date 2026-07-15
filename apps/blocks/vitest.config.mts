import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

// Blocks are frontend-only and tested in jsdom. tsconfigPaths() picks up the
// `@/*` and `@/generated/*` aliases from tsconfig.json so test imports resolve
// the same way `tsc` does. Block tests `vi.mock('@/generated/<ns>')`, so the
// generated-SDK alias is only a type/resolution fallback — never hit live.
export default defineConfig({
  // ignoreConfigErrors: the root tsconfig has a dangling project ref to apps/test-sdk
  // (pre-existing, unrelated to blocks); skip it instead of failing path resolution.
  plugins: [react(), tsconfigPaths({ ignoreConfigErrors: true })],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './test/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**']
  }
});
