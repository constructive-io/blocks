import { defineConfig } from 'tsup';

const external = [
	'react',
	'react-dom',
	'@tanstack/react-query',
	'@tanstack/react-form',
	'@constructive-io/data',
	'@constructive-io/ui',
	'lucide-react',
	'@remixicon/react',
	'@internationalized/date',
	'react-aria-components',
	'react-leaflet',
	'leaflet',
];

const banner = { js: '"use client";' };

// Splitting requires the ESM format (esbuild is ESM-only for code-splitting),
// so each format gets its own config. tsup runs array configs CONCURRENTLY, so
// neither config may `clean` (a per-config wipe races the other's writes and can
// intermittently delete an entrypoint); the `build` script does `rm -rf dist`
// once before tsup instead.
export default defineConfig([
	{
		entry: {
			index: 'src/index.ts',
			advanced: 'src/advanced.ts',
			auth: 'src/auth/index.ts',
			testing: 'src/testing/index.ts',
		},
		format: ['esm'],
		dts: true,
		platform: 'browser',
		target: 'es2022',
		sourcemap: true,
		clean: false,
		splitting: true,
		external,
		banner,
	},
	{
		entry: {
			index: 'src/index.ts',
			advanced: 'src/advanced.ts',
			auth: 'src/auth/index.ts',
			testing: 'src/testing/index.ts',
		},
		format: ['cjs'],
		dts: true,
		platform: 'browser',
		target: 'es2022',
		sourcemap: true,
		clean: false,
		splitting: false,
		external,
		banner,
	},
]);
