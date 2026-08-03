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

interface ImportOnlyRuntimeExport {
	import: ConditionalTarget;
}

type PackageExport = string | RuntimeExport | ImportOnlyRuntimeExport;

interface PackageManifest {
	name: string;
	dependencies?: Record<string, string>;
	exports: Record<string, PackageExport>;
}

interface RegistryManifest {
	items: Array<{ name: string; type: string }>;
}

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const portalSpecifier = '@constructive-io/ui/portal';
const rootBarrelExclusions = new Set(['chart']);
const importOnlySubpaths = new Set(['chart']);

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

function isRuntimeExport(target: PackageExport): target is RuntimeExport {
	return typeof target === 'object' && 'import' in target && 'require' in target;
}

function isImportOnlyRuntimeExport(target: PackageExport): target is ImportOnlyRuntimeExport {
	return typeof target === 'object' && 'import' in target && !('require' in target);
}

function hasUseClientDirective(source: string): boolean {
	return /^(?:"use client"|'use client');/.test(source.trimStart());
}

function formatDifference(label: string, values: readonly string[]): string | undefined {
	return values.length > 0 ? `${label}: ${values.join(', ')}` : undefined;
}

const [manifestSource, registrySource, indexSource, globalsSource] = await Promise.all([
	readFile(path.join(packageRoot, 'package.json'), 'utf8'),
	readFile(path.join(packageRoot, 'registry.json'), 'utf8'),
	readFile(path.join(packageRoot, 'src', 'index.ts'), 'utf8'),
	readFile(path.join(packageRoot, 'src', 'styles', 'globals.css'), 'utf8'),
]);

const manifest = JSON.parse(manifestSource) as PackageManifest;
const registry = JSON.parse(registrySource) as RegistryManifest;
const rootModules = collectRootComponentModules(indexSource);
const packageModules = sorted(
	Object.keys(manifest.exports)
		.filter((subpath) => subpath.startsWith('./') && subpath !== './globals.css')
		.map((subpath) => subpath.slice(2)),
);
const packageRootModules = packageModules.filter((moduleName) => !rootBarrelExclusions.has(moduleName));
const registryModules = sorted(
	registry.items
		.filter((item) => item.type === 'registry:ui' || item.type === 'registry:block')
		.map((item) => item.name),
);

const failures = [
	formatDifference('Root exports missing package subpaths', difference(rootModules, packageModules)),
	formatDifference('Package subpaths missing root exports', difference(packageRootModules, rootModules)),
	formatDifference('Root exports missing registry items', difference(rootModules, registryModules)),
].filter((failure): failure is string => Boolean(failure));

if (rootModules.some((moduleName) => rootBarrelExclusions.has(moduleName))) {
	failures.push('Chart must remain an opt-in subpath so ordinary UI consumers do not load React-19-only peers');
}

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

async function outputReferencesPortal(outputPath: string, visited = new Set<string>()): Promise<boolean> {
	const normalizedPath = path.resolve(outputPath);
	if (visited.has(normalizedPath)) return false;
	visited.add(normalizedPath);

	const builtSource = await readFile(normalizedPath, 'utf8');
	if (builtSource.includes(portalSpecifier)) return true;

	const distributionRoot = path.join(packageRoot, 'dist');
	const relativeImport = /(?:from\s+|require\(\s*|import\(\s*|import\s+)['"](\.[^'"]+)['"]/g;
	for (const match of builtSource.matchAll(relativeImport)) {
		const referencedPath = path.resolve(path.dirname(normalizedPath), match[1]);
		if (!referencedPath.startsWith(`${distributionRoot}${path.sep}`)) continue;
		try {
			await access(referencedPath);
		} catch {
			continue;
		}
		if (await outputReferencesPortal(referencedPath, visited)) return true;
	}

	return false;
}

for (const output of portalConsumerOutputs) {
	for (const extension of ['js', 'cjs'] as const) {
		const outputPath = path.join(packageRoot, 'dist', `${output}.${extension}`);
		if (!(await outputReferencesPortal(outputPath))) {
			failures.push(`${path.relative(packageRoot, outputPath)} embeds or omits the shared portal runtime`);
		}
	}
}

for (const moduleName of packageModules) {
	const target = manifest.exports[`./${moduleName}`];
	if (!target) {
		failures.push(`./${moduleName} must define a package export`);
		continue;
	}
	const importOnly = importOnlySubpaths.has(moduleName);
	if (importOnly && !isImportOnlyRuntimeExport(target)) {
		failures.push(`./${moduleName} must remain import-only because its upstream runtime is ESM-only`);
		continue;
	}
	if (!importOnly && !isRuntimeExport(target)) {
		failures.push(`./${moduleName} must define import and require targets`);
		continue;
	}
	let outputs: string[];
	if (isRuntimeExport(target)) {
		outputs = [target.import.types, target.import.default, target.require.types, target.require.default];
	} else if (isImportOnlyRuntimeExport(target)) {
		outputs = [target.import.types, target.import.default];
	} else {
		continue;
	}
	for (const output of outputs) {
		try {
			await access(path.join(packageRoot, output.replace(/^\.\//, '')));
		} catch {
			failures.push(`Missing built output for ./${moduleName}: ${output}`);
		}
	}
}

for (const [subpath, target] of Object.entries(manifest.exports)) {
	if (!isRuntimeExport(target) && !isImportOnlyRuntimeExport(target)) continue;
	const outputs = isRuntimeExport(target)
		? [target.import.default, target.require.default]
		: [target.import.default];
	for (const output of outputs) {
		const outputPath = path.join(packageRoot, output.replace(/^\.\//, ''));
		const source = await readFile(outputPath, 'utf8');
		if (!hasUseClientDirective(source)) {
			failures.push(`${subpath} is missing the use client directive in ${path.relative(packageRoot, outputPath)}`);
		}
	}
}

if (failures.length > 0) {
	throw new Error(`UI package parity check failed:\n${failures.map((failure) => `- ${failure}`).join('\n')}`);
}

console.log(`UI package parity passed for ${packageModules.length} component subpaths.`);
