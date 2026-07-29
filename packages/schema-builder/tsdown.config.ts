import { existsSync, readFileSync } from 'node:fs';
import { defineConfig } from 'tsdown';

const useClientDirective = /^(?:\uFEFF)?(["'])use client\1;?/;

export default defineConfig({
	entry: {
		index: 'src/index.ts',
		core: 'src/core/index.ts',
		fields: 'src/fields/index.ts',
		relationships: 'src/relationships/index.ts',
		indexes: 'src/indexes/index.ts',
		policies: 'src/policies/index.ts',
		tables: 'src/tables/index.ts',
		testing: 'src/testing.ts',
	},
	format: ['esm', 'cjs'],
	platform: 'neutral',
	target: 'es2022',
	outDir: 'dist',
	clean: true,
	minify: false,
	sourcemap: true,
	dts: {
		resolver: 'tsc',
		sourcemap: false,
	},
	deps: {
		neverBundle: true,
	},
	inputOptions: {
		checks: {
			pluginTimings: false,
		},
	},
	outputOptions: {
		sourcemapExcludeSources: true,
		banner(chunk) {
			const sourceEntry = chunk.facadeModuleId;
			if (sourceEntry && /\.d\.[cm]?ts$/.test(sourceEntry)) return '';
			if (
				sourceEntry &&
				existsSync(sourceEntry) &&
				useClientDirective.test(readFileSync(sourceEntry, 'utf8'))
			) {
				return '';
			}
			return "'use client';";
		},
	},
});
