#!/usr/bin/env -S tsx

import { spawnSync } from 'node:child_process';
import {
	cpSync,
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registrySchema } from 'shadcn/schema';

import {
	CONSTRUCTIVE_UI_PACKAGE,
	FEATURE_PACK_MANIFEST_TARGETS,
	FEATURE_PACK_ROOT_DEPENDENCIES,
	assertExactInternalDependencyEdges,
	assertFeaturePackRegistryContract,
	assertNoForbiddenDistributionReferences,
	assertUniqueRegistryShape,
	compileRegistryDependencies,
	createRegistryModuleOwnership,
	deriveAliasDependencies,
	deriveOwnedRegistryDependencies,
	portableTargetForUiFile,
	rewriteConstructiveUiImports,
	type Registry,
	type RegistryItem,
} from './compiler';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const registryApp = path.resolve(scriptDirectory, '..');
const repositoryRoot = path.resolve(registryApp, '..', '..');
const stagingRoot = path.join(registryApp, 'registry');
const publicRegistryRoot = path.join(registryApp, 'public', 'r');
const namespace = 'constructive';
const testFilePattern = /\.(test|spec|stories)\.[cm]?[jt]sx?$/;
const sourceFilePattern = /\.[cm]?[jt]sx?$/;

type RegistrySource = {
	name: string;
	manifestPath: string;
	registryDirectory: string;
	filter?: string;
	local?: boolean;
	destinationSubdirectory?: string;
	excludeTests?: boolean;
	uiPackage?: boolean;
	additionalRegistryDirectories?: Array<{
		sourceDirectory: string;
		destinationSubdirectory: string;
		excludeTests?: boolean;
	}>;
};

const sources: RegistrySource[] = [
	{
		name: '@constructive-io/ui',
		filter: '@constructive-io/ui',
		manifestPath: path.join(repositoryRoot, 'packages/ui/registry.json'),
		registryDirectory: path.join(repositoryRoot, 'packages/ui/registry/constructive'),
		uiPackage: true,
	},
	{
		name: 'blocks',
		local: true,
		manifestPath: path.join(repositoryRoot, 'apps/blocks/registry.json'),
		registryDirectory: path.join(repositoryRoot, 'apps/blocks/src/blocks'),
		destinationSubdirectory: 'blocks',
		excludeTests: true,
		additionalRegistryDirectories: [
			{
				sourceDirectory: path.join(repositoryRoot, 'apps/blocks/src/feature-packs'),
				destinationSubdirectory: 'feature-packs',
				excludeTests: true,
			},
		],
	},
];

function run(command: string, arguments_: string[], cwd = repositoryRoot): void {
	const result = spawnSync(command, arguments_, { cwd, stdio: 'inherit' });
	if (result.error) throw result.error;
	if (result.status !== 0) {
		throw new Error(`${command} ${arguments_.join(' ')} exited with status ${result.status ?? 'unknown'}.`);
	}
}

function parseJson<T>(filePath: string): T {
	return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

function validateRegistry(label: string, registry: Registry): void {
	const result = registrySchema.safeParse(registry);
	if (!result.success) {
		throw new Error(`${label} does not match shadcn/schema:\n${result.error.toString()}`);
	}
}

function sameSet(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
	return left.size === right.size && [...left].every((value) => right.has(value));
}

console.log('=== Step 1: build canonical source registries ===\n');
for (const source of sources) {
	if (source.local) {
		console.log(`Skipping ${source.name}; its canonical source ships directly.\n`);
		continue;
	}
	console.log(`Building ${source.name}...`);
	run('pnpm', ['--filter', source.filter!, 'build:registry']);
	console.log();
}

console.log('=== Step 2: create clean aggregate staging ===\n');
rmSync(stagingRoot, { recursive: true, force: true });
rmSync(publicRegistryRoot, { recursive: true, force: true });
mkdirSync(path.join(stagingRoot, namespace), { recursive: true });

for (const source of sources) {
	if (!existsSync(source.registryDirectory)) {
		throw new Error(`${source.registryDirectory} does not exist after source registry build.`);
	}
	const destination = path.join(
		stagingRoot,
		namespace,
		...(source.destinationSubdirectory ? [source.destinationSubdirectory] : []),
	);
	cpSync(source.registryDirectory, destination, {
		recursive: true,
		filter: source.excludeTests
			? (sourcePath) => !testFilePattern.test(path.basename(sourcePath))
			: undefined,
	});
	for (const additionalDirectory of source.additionalRegistryDirectories ?? []) {
		if (!existsSync(additionalDirectory.sourceDirectory)) {
			throw new Error(`${additionalDirectory.sourceDirectory} does not exist.`);
		}
		cpSync(
			additionalDirectory.sourceDirectory,
			path.join(stagingRoot, namespace, additionalDirectory.destinationSubdirectory),
			{
				recursive: true,
				filter: additionalDirectory.excludeTests
					? (sourcePath) => !testFilePattern.test(path.basename(sourcePath))
					: undefined,
			},
		);
	}
	console.log(`Copied ${source.name}.`);
}

console.log('\n=== Step 3: compile registry dependency closure ===\n');
const loadedSources = sources.map((source) => {
	const manifest = parseJson<Registry>(source.manifestPath);
	validateRegistry(source.name, manifest);
	return { source, manifest };
});
const sourceItems = loadedSources.flatMap(({ manifest }) => manifest.items);

const ownItemNames = new Set(sourceItems.map((item) => item.name));
const uiManifest = loadedSources.find(({ source }) => source.uiPackage)?.manifest;
if (!uiManifest) throw new Error('Unable to find the @constructive-io/ui registry manifest.');
const uiItemNames = new Set(uiManifest.items.map((item) => item.name));
const uiPackageJson = parseJson<{ exports?: Record<string, unknown> }>(
	path.join(repositoryRoot, 'packages/ui/package.json'),
);
const uiExportSubpaths = new Set(
	Object.keys(uiPackageJson.exports ?? {})
		.filter((subpath) => subpath.startsWith('./') && subpath !== './globals.css')
		.map((subpath) => subpath.slice(2)),
);
const availableUiSubpaths = new Set(
	[...uiExportSubpaths].filter((subpath) => uiItemNames.has(subpath)),
);

// Dependencies listed here are deliberately installed for setup, composition,
// or side effects even though the owning item's source does not import them.
// Keeping this reviewed and item-scoped makes every other internal edge
// mechanically exact.
const intentionalDependencyOnlyEdges = new Map<string, ReadonlySet<string>>([
	// CheckboxGroup coordinates consumer-provided Checkbox children.
	['checkbox-group', new Set(['checkbox'])],
	// Feature-pack and preset roots encode capability dependencies even when the
	// source composition does not import every dependency directly.
	...[...FEATURE_PACK_ROOT_DEPENDENCIES].map(
		([itemName, dependencies]) => [itemName, new Set(dependencies)] as const,
	),
]);

const compiledItems: RegistryItem[] = [];
const preparedItems: Array<{ source: RegistrySource; item: RegistryItem }> = [];

for (const { source, manifest } of loadedSources) {
	for (const originalItem of manifest.items) {
		const item = structuredClone(originalItem);
		item.dependencies = (item.dependencies ?? []).filter(
			(dependency) => dependency !== CONSTRUCTIVE_UI_PACKAGE,
		);
		if (item.dependencies.length === 0) delete item.dependencies;

		for (const file of item.files ?? []) {
			if (!file.path) throw new Error(`${source.name}/${item.name} contains a file without a path.`);
			if (source.uiPackage) file.target = portableTargetForUiFile(file.path);

			const stagedPath = path.join(registryApp, file.path);
			if (!existsSync(stagedPath)) {
				throw new Error(`${source.name}/${item.name} references missing staged source ${file.path}.`);
			}
		}
		preparedItems.push({ source, item });
	}
}

const moduleOwnership = createRegistryModuleOwnership(preparedItems.map(({ item }) => item));

for (const [itemName, expectedTarget] of FEATURE_PACK_MANIFEST_TARGETS) {
	const item = preparedItems.find(({ item: candidate }) => candidate.name === itemName)?.item;
	const manifestFile = item?.files?.find((file) => file.target === expectedTarget);
	if (!manifestFile) continue;
	const manifest = parseJson<{ schemaVersion?: unknown; id?: unknown }>(
		path.join(registryApp, manifestFile.path),
	);
	const expectedId = itemName.replace(/^(?:feature-pack|preset)-/, '');
	if (manifest.schemaVersion !== 1 || manifest.id !== expectedId) {
		throw new Error(
			`${itemName} manifest must declare schemaVersion 1 and id '${expectedId}'.`,
		);
	}
}

for (const { source, item } of preparedItems) {
	const compiledSource = new Map<string, string>();

	for (const file of item.files ?? []) {
		if (!sourceFilePattern.test(file.path)) continue;

		const stagedPath = path.join(registryApp, file.path);
		const canonicalSource = readFileSync(stagedPath, 'utf8');
		const rewritten = rewriteConstructiveUiImports(
			canonicalSource,
			`${source.name}/${item.name}/${file.path}`,
			availableUiSubpaths,
		);
		// This call also rejects unresolved registry aliases. Target ownership,
		// below, is the source of truth for the exact owning item.
		deriveAliasDependencies(
			rewritten.source,
			`${source.name}/${item.name}/${file.path}`,
			uiItemNames,
		);
		writeFileSync(stagedPath, rewritten.source, 'utf8');
		compiledSource.set(file.path, rewritten.source);
	}

	const derivedDependencies = new Set(
		deriveOwnedRegistryDependencies(item, compiledSource, moduleOwnership),
	);
	item.registryDependencies = compileRegistryDependencies(
		item,
		derivedDependencies,
		ownItemNames,
	);
	if (item.registryDependencies.length === 0) delete item.registryDependencies;
	assertExactInternalDependencyEdges(
		item,
		derivedDependencies,
		ownItemNames,
		new Set([
			...(intentionalDependencyOnlyEdges.get(item.name) ?? []),
		]),
	);
	assertNoForbiddenDistributionReferences(item, compiledSource);
	compiledItems.push(item);
}

for (const item of compiledItems) {
	for (const dependency of item.registryDependencies ?? []) {
		if (dependency.startsWith('@constructive/')) {
			const dependencyName = dependency.slice('@constructive/'.length);
			if (!ownItemNames.has(dependencyName)) {
				throw new Error(`${item.name} references unknown registry dependency ${dependency}.`);
			}
		}
	}
}
assertUniqueRegistryShape(compiledItems);
assertFeaturePackRegistryContract(compiledItems);

const combined: Registry = {
	$schema: 'https://ui.shadcn.com/schema/registry.json',
	name: namespace,
	homepage: 'https://constructive-io.github.io/blocks',
	items: compiledItems,
};
validateRegistry('combined @constructive registry', combined);
const combinedPath = path.join(registryApp, 'registry.json');
writeFileSync(combinedPath, `${JSON.stringify(combined, null, 2)}\n`, 'utf8');
console.log(`Compiled ${compiledItems.length} items with the complete feature-pack contract.`);

console.log('\n=== Step 4: build and verify shadcn output ===\n');
mkdirSync(publicRegistryRoot, { recursive: true });
run('pnpm', ['exec', 'shadcn', 'build', './registry.json', '--output', './public/r'], registryApp);

const actualOutputFiles = new Set(readdirSync(publicRegistryRoot));
const expectedOutputFiles = new Set([
	'registry.json',
	...compiledItems.map((item) => `${item.name}.json`),
]);
if (!sameSet(actualOutputFiles, expectedOutputFiles)) {
	const missing = [...expectedOutputFiles].filter((file) => !actualOutputFiles.has(file));
	const unexpected = [...actualOutputFiles].filter((file) => !expectedOutputFiles.has(file));
	throw new Error(
		`Registry output set drifted. Missing: ${missing.join(', ') || 'none'}. Unexpected: ${unexpected.join(', ') || 'none'}.`,
	);
}

for (const fileName of actualOutputFiles) {
	const output = readFileSync(path.join(publicRegistryRoot, fileName), 'utf8');
	if (output.includes(CONSTRUCTIVE_UI_PACKAGE)) {
		throw new Error(`${fileName} retains ${CONSTRUCTIVE_UI_PACKAGE}.`);
	}
	if (output.includes('tw-animate-css')) throw new Error(`${fileName} retains tw-animate-css.`);
}

console.log(`Registry build complete: ${actualOutputFiles.size} exact JSON outputs.`);
