import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type RegistryFile = { path: string; target?: string; type: string };
type RegistryItem = {
	name: string;
	type: string;
	docs?: string;
	dependencies?: string[];
	registryDependencies?: string[];
	files?: RegistryFile[];
};
type Registry = { items: RegistryItem[] };

const expectedItemCount = 157;
// Reviewed catalog snapshot: item names and item types are the stable public
// surface. Generated dependency closure and target invariants are checked below
// instead of being hidden inside an opaque full-manifest hash.
const expectedCatalogHash = 'a0f715f217ff1d1fa0853e48334fe319c912df095c9625eae4a0e8aff5a7acb7';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registryPath = path.join(root, 'apps', 'registry', 'registry.json');
const registry = JSON.parse(await readFile(registryPath, 'utf8')) as Registry;
const catalog = registry.items
	.map(({ name, type }) => ({ name, type }))
	.sort((left, right) => left.name.localeCompare(right.name));

if (catalog.length !== expectedItemCount) {
	throw new Error(`Expected ${expectedItemCount} registry items, received ${catalog.length}.`);
}
if (new Set(catalog.map((item) => item.name)).size !== expectedItemCount) {
	throw new Error('Registry contains duplicate item names.');
}
const catalogHash = createHash('sha256').update(JSON.stringify(catalog)).digest('hex');
if (catalogHash !== expectedCatalogHash) {
	throw new Error(`Registry catalog drifted (${catalogHash}); review item names and types before updating the snapshot.`);
}

const ownNames = new Set(catalog.map((item) => item.name));
const targetOwners = new Map<string, string>();
const requirementsTargets: string[] = [];

for (const item of registry.items) {
	for (const dependency of [...(item.dependencies ?? []), ...(item.registryDependencies ?? [])]) {
		if (dependency.includes('@constructive-io/ui')) {
			throw new Error(`${item.name} retains @constructive-io/ui in the registry contract.`);
		}
		if (dependency === 'tw-animate-css') throw new Error(`${item.name} retains tw-animate-css.`);
	}
	if (item.type === 'registry:ui' || item.type === 'registry:block') {
		if (!(item.registryDependencies ?? []).includes('@constructive/constructive-theme')) {
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
		const owner = targetOwners.get(file.target);
		if (owner) throw new Error(`Duplicate registry target ${file.target} from ${owner} and ${item.name}.`);
		targetOwners.set(file.target, item.name);
		if (file.target.endsWith('.requires.json')) requirementsTargets.push(file.target);
	}
}

if (requirementsTargets.length !== 54 || new Set(requirementsTargets).size !== 54) {
	throw new Error(`Expected 54 unique requirements sidecars, received ${requirementsTargets.length}.`);
}
for (const target of requirementsTargets) {
	if (!/^~\/\.constructive\/blocks\/[a-z0-9-]+\.requires\.json$/.test(target)) {
		throw new Error(`Requirements sidecar target is not root-stable: ${target}`);
	}
}

for (const itemName of ['stack', 'toast', 'org-chart', 'storage']) {
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

console.log(`Registry contract matches the reviewed ${expectedItemCount}-item catalog and distribution invariants.`);
