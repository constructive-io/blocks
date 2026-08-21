import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm', 'cjs'],
	dts: true,
	platform: 'browser',
	target: 'es2022',
	sourcemap: true,
	clean: true,
	splitting: false,
	external: ['react', 'react-dom', 'blocks-schema'],
});
