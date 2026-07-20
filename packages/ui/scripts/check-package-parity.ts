import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

interface ConditionalTarget {
	types: string;
	default: string;
}

interface RuntimeExport {
	import: ConditionalTarget;
	require: ConditionalTarget;
}

interface PackageManifest {
	name: string;
	dependencies?: Record<string, string>;
	exports: Record<string, string | RuntimeExport>;
}

interface RegistryManifest {
	items: Array<{ name: string; type: string }>;
}

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const portalSpecifier = '@constructive-io/ui/portal';

async function sourceFiles(root: string): Promise<string[]> {
	const entries = await readdir(root, { withFileTypes: true });
	const files = await Promise.all(
		entries.map(async (entry) => {
			const target = path.join(root, entry.name);
			if (entry.isDirectory()) return sourceFiles(target);
			return /\.[cm]?[jt]sx?$/.test(entry.name) ? [target] : [];
		}),
	);
	return files.flat();
}

function normalizeComponentModule(modulePath: string): string {
	return modulePath
		.replace(/^\.\/components\//, '')
		.replace(/^@constructive-io\/ui\//, '')
		.replace(/^src\/components\//, '')
		.replace(/\.[cm]?[jt]sx?$/, '')
		.replace(/\/index$/, '');
}

for (const [input, expected] of [
	['./components/button', 'button'],
	['src/components/flow-zoom-panel.tsx', 'flow-zoom-panel'],
	['src/components/stack/index.ts', 'stack'],
] as const) {
	const actual = normalizeComponentModule(input);
	if (actual !== expected) throw new Error(`Component module normalization failed: ${input} became ${actual}`);
}

function sorted(values: Iterable<string>): string[] {
	return [...new Set(values)].sort();
}

function difference(left: readonly string[], right: readonly string[]): string[] {
	const rightSet = new Set(right);
	return left.filter((value) => !rightSet.has(value));
}

function collectRootComponentModules(source: string): string[] {
	const sourceFile = ts.createSourceFile('src/index.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
	const modules: string[] = [];
	for (const statement of sourceFile.statements) {
		if (!ts.isExportDeclaration(statement) || !statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) {
			continue;
		}
		if (
			statement.moduleSpecifier.text.startsWith('./components/') ||
			statement.moduleSpecifier.text.startsWith('@constructive-io/ui/')
		) {
			modules.push(normalizeComponentModule(statement.moduleSpecifier.text));
		}
	}
	return sorted(modules);
}

function collectTsupComponentModules(source: string): string[] {
	const sourceFile = ts.createSourceFile('tsup.config.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
	const modules: string[] = [];
	function visit(node: ts.Node): void {
		if (ts.isStringLiteral(node) && node.text.startsWith('src/components/')) {
			modules.push(normalizeComponentModule(node.text));
		}
		ts.forEachChild(node, visit);
	}
	visit(sourceFile);
	return sorted(modules);
}

function isRuntimeExport(target: string | RuntimeExport): target is RuntimeExport {
	return typeof target === 'object' && 'import' in target && 'require' in target;
}

function formatDifference(label: string, values: readonly string[]): string | undefined {
	return values.length > 0 ? `${label}: ${values.join(', ')}` : undefined;
}

const [manifestSource, registrySource, indexSource, tsupSource, globalsSource] = await Promise.all([
	readFile(path.join(packageRoot, 'package.json'), 'utf8'),
	readFile(path.join(packageRoot, 'registry.json'), 'utf8'),
	readFile(path.join(packageRoot, 'src', 'index.ts'), 'utf8'),
	readFile(path.join(packageRoot, 'tsup.config.ts'), 'utf8'),
	readFile(path.join(packageRoot, 'src', 'styles', 'globals.css'), 'utf8'),
]);

const manifest = JSON.parse(manifestSource) as PackageManifest;
const registry = JSON.parse(registrySource) as RegistryManifest;
const rootModules = collectRootComponentModules(indexSource);
const tsupModules = collectTsupComponentModules(tsupSource);
const packageModules = sorted(
	Object.keys(manifest.exports)
		.filter((subpath) => subpath.startsWith('./') && subpath !== './globals.css')
		.map((subpath) => subpath.slice(2)),
);
const registryModules = sorted(
	registry.items
		.filter((item) => item.type === 'registry:ui' || item.type === 'registry:block')
		.map((item) => item.name),
);

const failures = [
	formatDifference('Root exports missing package subpaths', difference(rootModules, packageModules)),
	formatDifference('Package subpaths missing root exports', difference(packageModules, rootModules)),
	formatDifference('Root exports missing tsup entries', difference(rootModules, tsupModules)),
	formatDifference('Tsup entries missing root exports', difference(tsupModules, rootModules)),
	formatDifference('Root exports missing registry items', difference(rootModules, registryModules)),
].filter((failure): failure is string => Boolean(failure));

if (manifest.dependencies?.['tw-animate-css']) failures.push('tw-animate-css must not be a UI runtime dependency');
if (globalsSource.includes('tw-animate-css')) failures.push('globals.css must not import tw-animate-css');

for (const sourcePath of await sourceFiles(path.join(packageRoot, 'src'))) {
	if (sourcePath.endsWith(`${path.sep}components${path.sep}portal.tsx`)) continue;
	const source = await readFile(sourcePath, 'utf8');
	if (/from\s+['"](?:\.\.?\/)+portal['"]/.test(source)) {
		failures.push(`${path.relative(packageRoot, sourcePath)} must import the shared ${portalSpecifier} runtime`);
	}
}

const portalConsumerOutputs = [
	'index',
	'components/alert-dialog',
	'components/autocomplete',
	'components/combobox',
	'components/command',
	'components/dialog',
	'components/drawer',
	'components/dropdown-menu',
	'components/popover',
	'components/select',
	'components/sheet',
	'components/stack/index',
	'components/tooltip',
] as const;

for (const output of portalConsumerOutputs) {
	for (const extension of ['js', 'cjs'] as const) {
		const outputPath = path.join(packageRoot, 'dist', `${output}.${extension}`);
		const builtSource = await readFile(outputPath, 'utf8');
		if (!builtSource.includes(portalSpecifier)) {
			failures.push(`${path.relative(packageRoot, outputPath)} embeds or omits the shared portal runtime`);
		}
	}
}

for (const moduleName of packageModules) {
	const target = manifest.exports[`./${moduleName}`];
	if (!target || !isRuntimeExport(target)) {
		failures.push(`./${moduleName} must define import and require targets`);
		continue;
	}
	for (const output of [target.import.types, target.import.default, target.require.types, target.require.default]) {
		try {
			await access(path.join(packageRoot, output.replace(/^\.\//, '')));
		} catch {
			failures.push(`Missing built output for ./${moduleName}: ${output}`);
		}
	}
}

if (failures.length > 0) {
	throw new Error(`UI package parity check failed:\n${failures.map((failure) => `- ${failure}`).join('\n')}`);
}

console.log(`UI package parity passed for ${packageModules.length} component subpaths.`);
