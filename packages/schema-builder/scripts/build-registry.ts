import { constants } from 'node:fs';
import { access, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Registry, RegistryFile } from '../../../apps/registry/scripts/compiler';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(packageRoot, 'registry.json');
const sourceRoot = path.join(packageRoot, 'src/schema');
const outputRoot = path.join(packageRoot, 'registry/constructive/blocks/schema');
const outputPrefix = 'registry/constructive/blocks/schema/';
const checkOnly = process.argv.includes('--check');
const registry = JSON.parse(await readFile(manifestPath, 'utf8')) as Registry;
const expectedNames = [
	'schema-builder-core',
	'schema-builder-fields',
	'schema-builder-relationships',
	'schema-builder-indexes',
	'schema-builder-policies',
	'schema-builder-tables',
	'schema-builder',
];

const names = registry.items.map((item) => item.name);
if (JSON.stringify(names) !== JSON.stringify(expectedNames)) {
	throw new Error(`Schema registry items changed: ${names.join(', ')}`);
}

const files = registry.items.flatMap((item) => item.files ?? []);
if (files.length !== 164) throw new Error(`Expected 164 schema registry files, found ${files.length}.`);

async function walk(root: string): Promise<string[]> {
	const result: string[] = [];
	for (const entry of await readdir(root, { withFileTypes: true })) {
		const entryPath = path.join(root, entry.name);
		if (entry.isDirectory()) result.push(...await walk(entryPath));
		else result.push(entryPath);
	}
	return result;
}

function resolvePair(file: RegistryFile): { source: string; output: string } {
	if (!file.path.startsWith(outputPrefix)) throw new Error(`Unexpected schema registry path: ${file.path}`);
	const suffix = file.path.slice(outputPrefix.length);
	return {
		source: path.join(sourceRoot, suffix),
		output: path.join(outputRoot, suffix),
	};
}

for (const file of files) await access(resolvePair(file).source, constants.R_OK);

if (!checkOnly) {
	await rm(outputRoot, { recursive: true, force: true });
	for (const file of files) {
		const { source, output } = resolvePair(file);
		await mkdir(path.dirname(output), { recursive: true });
		await writeFile(output, await readFile(source, 'utf8'));
	}
}

const expectedOutputs = new Set(files.map((file) => resolvePair(file).output));
const actualOutputs = new Set(await walk(outputRoot));
if (expectedOutputs.size !== actualOutputs.size) {
	throw new Error(`Registry output count mismatch: expected ${expectedOutputs.size}, found ${actualOutputs.size}.`);
}

for (const output of actualOutputs) {
	if (!expectedOutputs.has(output)) {
		throw new Error(`Unexpected registry output: ${path.relative(packageRoot, output).split(path.sep).join('/')}`);
	}
	const manifestFile = files.find((file) => resolvePair(file).output === output);
	if (!manifestFile) throw new Error(`Missing manifest entry for ${path.relative(outputRoot, output)}.`);
	const source = resolvePair(manifestFile).source;
	const [sourceContent, outputContent] = await Promise.all([
		readFile(source, 'utf8'),
		readFile(output, 'utf8'),
	]);
	if (sourceContent !== outputContent) {
		throw new Error(`Registry output drifted from canonical source: ${path.relative(outputRoot, output)}.`);
	}
}

console.log(`${checkOnly ? 'Checked' : 'Built'} ${registry.items.length} schema items (${files.length} files).`);
