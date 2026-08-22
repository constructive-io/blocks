import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    // Testing Library only registers its auto-cleanup when the test hooks are
    // global, and without it each render leaks into the next test's DOM.
    globals: true
  }
});
