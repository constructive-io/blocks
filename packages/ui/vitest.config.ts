import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@constructive-io/ui/portal': fileURLToPath(new URL('./src/components/portal.tsx', import.meta.url)),
		},
	},
	test: {
		environment: 'jsdom',
		include: ['test/**/*.{test,spec}.{ts,tsx}'],
		exclude: ['**/node_modules/**', '**/dist/**'],
	},
});
