import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'tsdown';

interface RuntimeExport {
	import: { default: string };
	require: { default: string };
}

interface PackageManifest {
	exports: Record<string, string | RuntimeExport>;
}

const packageRoot = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8')) as PackageManifest;
const useClientDirective = /^(?:\uFEFF)?(["'])use client\1;?/;

function isRuntimeExport(target: string | RuntimeExport): target is RuntimeExport {
	return typeof target === 'object' && 'import' in target && 'require' in target;
}

function resolveSourceEntry(output: string): string {
	const entryName = output.replace(/^\.\/dist\//, '').replace(/\.js$/, '');
	const candidates = entryName === 'index'
		? ['src/index.ts']
		: [
			`src/${entryName}.tsx`,
			`src/${entryName}.ts`,
			`src/${entryName}/index.tsx`,
			`src/${entryName}/index.ts`,
		];
	const source = candidates.find((candidate) => existsSync(resolve(packageRoot, candidate)));
	if (!source) throw new Error(`Unable to resolve tsdown source entry for ${output}`);
	return source;
}

const entries = Object.fromEntries(
	Object.values(manifest.exports)
		.filter(isRuntimeExport)
		.map((target) => {
			const output = target.import.default;
			const entryName = output.replace(/^\.\/dist\//, '').replace(/\.js$/, '');
			return [entryName, resolveSourceEntry(output)];
		}),
);

export default defineConfig({
	entry: entries,
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
