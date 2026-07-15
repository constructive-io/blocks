import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EXPECTED_ITEM_COUNT = 157;
const EXPECTED_CONTRACT_HASH = '1327ff2c2a58db127b40b7df63dcd54c21072aa5fb5c1696194ee312ec7d9f13';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registryPath = path.join(root, 'apps', 'registry', 'registry.json');

function sortValue(value) {
  if (Array.isArray(value)) {
    return value
      .map(sortValue)
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortValue(child)])
    );
  }
  return value;
}

const registry = JSON.parse(await readFile(registryPath, 'utf8'));
const items = registry.items
  .map((item) =>
    sortValue({
      name: item.name,
      type: item.type,
      title: item.title,
      description: item.description,
      categories: item.categories ?? [],
      dependencies: item.dependencies ?? [],
      devDependencies: item.devDependencies ?? [],
      registryDependencies: item.registryDependencies ?? [],
      cssVars: item.cssVars ?? {},
      files: (item.files ?? []).map((file) => ({ target: file.target, type: file.type }))
    })
  )
  .sort((left, right) => left.name.localeCompare(right.name));

const duplicateNames = items
  .map((item) => item.name)
  .filter((name, index, names) => names.indexOf(name) !== index);
if (duplicateNames.length > 0) {
  throw new Error(`Duplicate registry items: ${[...new Set(duplicateNames)].join(', ')}`);
}
if (items.length !== EXPECTED_ITEM_COUNT) {
  throw new Error(`Expected ${EXPECTED_ITEM_COUNT} registry items, received ${items.length}`);
}

const hash = createHash('sha256').update(JSON.stringify(items)).digest('hex');
if (hash !== EXPECTED_CONTRACT_HASH) {
  throw new Error(
    `Registry public contract drifted (${hash}). Compare names, dependencies, and file targets with the migration baseline.`
  );
}

console.log(`Registry contract matches the ${EXPECTED_ITEM_COUNT}-item migration baseline.`);
