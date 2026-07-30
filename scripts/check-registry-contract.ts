import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	CONSTRUCTIVE_COMMAND_PALETTE_DEPENDENCY,
	CONSTRUCTIVE_DATA_DEPENDENCY,
	CONSTRUCTIVE_THEME_DEPENDENCY,
	CONSTRUCTIVE_SHEETS_PACKAGE,
	CONSTRUCTIVE_UI_PACKAGE,
	assertFeaturePackRegistryContract,
	assertUniqueRegistryShape,
	type Registry,
} from '../apps/registry/scripts/compiler';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registryPath = path.join(root, 'apps', 'registry', 'registry.json');
const registry = JSON.parse(await readFile(registryPath, 'utf8')) as Registry;
const ownNames = new Set(registry.items.map((item) => item.name));
const requiredPackageRanges = new Map([
	['@constructive-io/data', CONSTRUCTIVE_DATA_DEPENDENCY],
	['@constructive-io/command-palette', CONSTRUCTIVE_COMMAND_PALETTE_DEPENDENCY],
]);

assertUniqueRegistryShape(registry.items);
assertFeaturePackRegistryContract(registry.items);

for (const item of registry.items) {
	for (const dependency of [...(item.dependencies ?? []), ...(item.registryDependencies ?? [])]) {
		for (const [packageName, requiredRange] of requiredPackageRanges) {
			if (
				(dependency === packageName || dependency.startsWith(`${packageName}@`)) &&
				dependency !== requiredRange
			) {
				throw new Error(`${item.name} must depend on ${requiredRange}, received ${dependency}.`);
			}
		}
		if (
			dependency === CONSTRUCTIVE_UI_PACKAGE ||
			dependency.startsWith(`${CONSTRUCTIVE_UI_PACKAGE}/`) ||
			dependency === CONSTRUCTIVE_SHEETS_PACKAGE ||
			dependency.startsWith(`${CONSTRUCTIVE_SHEETS_PACKAGE}/`)
		) {
			throw new Error(`${item.name} retains source-owned UI package ${dependency} in the registry contract.`);
		}
		if (dependency === 'tw-animate-css') throw new Error(`${item.name} retains tw-animate-css.`);
	}
	if (item.type === 'registry:ui' || item.type === 'registry:block') {
		if (!(item.registryDependencies ?? []).includes(CONSTRUCTIVE_THEME_DEPENDENCY)) {
			throw new Error(`${item.name} is missing the Constructive theme dependency.`);
		}
	}
	for (const dependency of item.registryDependencies ?? []) {
		const dependencyName = dependency.startsWith('@constructive/')
			? dependency.slice('@constructive/'.length)
			: undefined;
		if (dependencyName && !ownNames.has(dependencyName)) {
			throw new Error(`${item.name} references unknown dependency ${dependency}.`);
		}
	}

	for (const file of item.files ?? []) {
		if (!file.target) throw new Error(`${item.name}/${file.path} is missing an explicit install target.`);
	}
}

for (const itemName of ['stack', 'toast']) {
	const item = registry.items.find((candidate) => candidate.name === itemName);
	if (!item) throw new Error(`Missing multi-file registry item ${itemName}.`);
	if (!item.docs?.includes(`@/components/ui/${itemName}`)) {
		throw new Error(`${itemName} documents an import that does not match its @ui/${itemName} install target.`);
	}
	for (const file of item.files ?? []) {
		if (!file.target?.startsWith(`@ui/${itemName}/`)) {
			throw new Error(`${itemName} has incoherent install target ${file.target ?? '(missing)'}.`);
		}
	}
}

const stack = registry.items.find((item) => item.name === 'stack');
if (!stack?.files?.some((file) => file.target === '@ui/stack/deferred-card-content.tsx')) {
	throw new Error('Stack registry closure is missing deferred-card-content.tsx.');
}

console.log('Registry contract matches the reviewed feature-pack and distribution invariants.');
