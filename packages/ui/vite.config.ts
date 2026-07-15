import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// This config is primarily for shadcn CLI detection
// The actual build is handled by tsup
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@constructive-io/ui': resolve(__dirname, './src'),
    },
  },
});
