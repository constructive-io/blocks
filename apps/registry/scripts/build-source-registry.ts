import {
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import path from 'node:path';

import { collectModuleSpecifiers, type Registry, type RegistryFile, type RegistryItem } from './compiler';

const sourceFilePattern = /\.[cm]?[jt]sx?$/;
const excludedFilePattern = /(?:^|\.)(?:test|spec|stories)\.[cm]?[jt]sx?$/;
const excludedDirectoryNames = new Set(['__golden__', '__tests__', 'stories', 'testing', 'type-tests']);

export type SourceRegistryOptions = {
	packageRoot: string;
	item: Omit<RegistryItem, 'files'>;
	registrySubdirectory: string;
	targetPrefix: string;
	dependencies: readonly string[];
	rewriteSource?: (source: string, relativePath: string) => string;
};

function walkSourceFiles(directory: string, sourceRoot: string): string[] {
	const files: string[] = [];
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (entry.isDirectory() && excludedDirectoryNames.has(entry.name)) continue;
		const entryPath = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			files.push(...walkSourceFiles(entryPath, sourceRoot));
			continue;
		}
		if (!sourceFilePattern.test(entry.name) || excludedFilePattern.test(entry.name)) continue;
		const relativePath = path.relative(sourceRoot, entryPath).split(path.sep).join('/');
		if (relativePath === 'testing.ts') continue;
		files.push(relativePath);
	}
	return files.sort();
}

function registryFileType(relativePath: string): RegistryFile['type'] {
	return relativePath.endsWith('x') ? 'registry:component' : 'registry:lib';
}

function externalPackageName(specifier: string): string | undefined {
	if (specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('@/')) return undefined;
	if (specifier.startsWith('node:')) return undefined;
	const segments = specifier.split('/');
	return specifier.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0];
}

function registryDependencyPackageName(dependency: string): string {
	if (!dependency.startsWith('@')) return dependency.split('@')[0];
	const scopeSeparator = dependency.indexOf('/');
	if (scopeSeparator === -1) return dependency;
	const versionSeparator = dependency.indexOf('@', scopeSeparator);
	return versionSeparator === -1 ? dependency : dependency.slice(0, versionSeparator);
}

function assertDeclaredDependencies(
	itemName: string,
	sources: ReadonlyMap<string, string>,
	dependencies: ReadonlySet<string>,
): void {
	const importedPackages = new Set<string>();
	for (const [relativePath, source] of sources) {
		for (const moduleSpecifier of collectModuleSpecifiers(source, relativePath)) {
			const packageName = externalPackageName(moduleSpecifier.value);
			if (packageName) importedPackages.add(packageName);
		}
	}

	for (const packageName of [
		'@constructive-io/ui',
		'react',
		'react-dom',
		'react/jsx-runtime',
	]) {
		importedPackages.delete(packageName);
	}
	const dependencyPackageNames = new Set(
		[...dependencies].map(registryDependencyPackageName),
	);
	const undeclared = [...importedPackages]
		.filter((packageName) => !dependencyPackageNames.has(packageName))
		.sort();
	if (undeclared.length > 0) {
		throw new Error(`${itemName} imports undeclared registry dependencies: ${undeclared.join(', ')}`);
	}
}

function expectedManifest(options: SourceRegistryOptions, relativePaths: readonly string[]): Registry {
	const files = relativePaths.map<RegistryFile>((relativePath) => ({
		path: `registry/constructive/${options.registrySubdirectory}/${relativePath}`,
		target: `${options.targetPrefix}/${relativePath}`,
		type: registryFileType(relativePath),
	}));
	const item: RegistryItem = {
		name: options.item.name,
		type: options.item.type,
		title: options.item.title,
		description: options.item.description,
		docs: options.item.docs,
		categories: options.item.categories,
		dependencies: [...options.dependencies].sort(),
		registryDependencies: options.item.registryDependencies ?? [],
		files,
	};

	return {
		$schema: 'https://ui.shadcn.com/schema/registry.json',
		name: `constructive-${options.item.name}`,
		homepage: 'https://constructive-io.github.io/blocks',
		items: [item],
	};
}

function assertEqualFile(filePath: string, expected: string, label: string): void {
	if (!existsSync(filePath) || readFileSync(filePath, 'utf8') !== expected) {
		throw new Error(`${label} is stale; run its build:registry script.`);
	}
}

export function buildSourceRegistry(options: SourceRegistryOptions): void {
	const sourceRoot = path.join(options.packageRoot, 'src');
	const registryRoot = path.join(options.packageRoot, 'registry', 'constructive');
	const outputRoot = path.join(registryRoot, options.registrySubdirectory);
	const manifestPath = path.join(options.packageRoot, 'registry.json');
	const checkOnly = process.argv.includes('--check');
	const relativePaths = walkSourceFiles(sourceRoot, sourceRoot);
	const sources = new Map<string, string>();

	for (const relativePath of relativePaths) {
		const canonicalSource = readFileSync(path.join(sourceRoot, relativePath), 'utf8');
		const source = options.rewriteSource
			? options.rewriteSource(canonicalSource, relativePath)
			: canonicalSource;
		sources.set(relativePath, source);
	}
	assertDeclaredDependencies(options.item.name, sources, new Set(options.dependencies));

	const manifest = expectedManifest(options, relativePaths);
	const manifestSource = `${JSON.stringify(manifest, null, 2)}\n`;
	if (checkOnly) {
		assertEqualFile(manifestPath, manifestSource, `${options.item.name} registry manifest`);
		for (const [relativePath, source] of sources) {
			assertEqualFile(path.join(outputRoot, relativePath), source, `${options.item.name}/${relativePath}`);
		}
		console.log(`Checked ${options.item.name} registry source (${relativePaths.length} files).`);
		return;
	}

	rmSync(registryRoot, { recursive: true, force: true });
	for (const [relativePath, source] of sources) {
		const outputPath = path.join(outputRoot, relativePath);
		mkdirSync(path.dirname(outputPath), { recursive: true });
		writeFileSync(outputPath, source, 'utf8');
	}
	writeFileSync(manifestPath, manifestSource, 'utf8');
	console.log(`Built ${options.item.name} registry source (${relativePaths.length} files).`);
}
