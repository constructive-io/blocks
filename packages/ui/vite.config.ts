import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// This config is primarily for shadcn CLI detection
// The actual build is handled by tsup
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^@constructive-io\/ui\/portal$/,
        replacement: resolve(__dirname, './src/components/portal.tsx'),
      },
      {
        find: '@constructive-io/ui',
        replacement: resolve(__dirname, './src'),
      },
    ],
  },
});
