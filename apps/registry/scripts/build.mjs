#!/usr/bin/env node
/**
 * build.mjs
 *
 * Orchestrates the shadcn registry build:
 * 1. Triggers packages/ui build:registry (import-rewritten sources)
 * 2. Copies generated registry sources from the public packages
 * 3. Merges registry.json from all source packages
 * 4. Runs shadcn build to produce public/r/*.json
 *
 * apps/blocks, packages/ui, and packages/schema-builder are the only canonical
 * sources. Keeping this list explicit makes the public registry hermetic.
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, cpSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGISTRY_APP = join(__dirname, '..');
const REPO_ROOT = join(REGISTRY_APP, '..', '..');

// ---------------------------------------------------------------------------
// Source packages that contribute registry items.
// Each entry: { name, registryJsonPath, registryDir, local?, filter?,
//               destSubdir?, excludeTests? }
//   - local:        skip the `pnpm build:registry` step (source ships verbatim)
//   - destSubdir:   copy under registry/constructive/<destSubdir> (avoid name
//                   collisions when several sources merge into one dir)
//   - excludeTests: skip *.test/*.spec/*.stories files when copying
// ---------------------------------------------------------------------------
const SOURCES = [
  {
    name: '@constructive-io/ui',
    filter: '@constructive-io/ui',
    registryJsonPath: join(REPO_ROOT, 'packages/ui/registry.json'),
    registryDir: join(REPO_ROOT, 'packages/ui/registry/constructive'),
  },
  {
    name: '@constructive-io/schema-builder',
    filter: '@constructive-io/schema-builder',
    registryJsonPath: join(REPO_ROOT, 'packages/schema-builder/registry.json'),
    registryDir: join(REPO_ROOT, 'packages/schema-builder/registry/constructive'),
  },
  {
    // Constructive Blocks — authored in apps/blocks and shipped VERBATIM (no
    // import-rewrite): the source's `@/blocks/*`, `@/generated/*`,
    // `@constructive-io/ui/*` specifiers are already consumer-final, so the
    // registry preserves them as-is. Tests are excluded from the shipped copy.
    name: 'blocks',
    local: true,
    registryJsonPath: join(REPO_ROOT, 'apps/blocks/registry.json'),
    registryDir: join(REPO_ROOT, 'apps/blocks/src/blocks'),
    destSubdir: 'blocks',
    excludeTests: true,
  },
];

const TEST_FILE_RE = /\.(test|spec|stories)\.[cm]?[jt]sx?$/;

// ---------------------------------------------------------------------------
// 1. Build registry sources in each package
// ---------------------------------------------------------------------------
console.log('=== Step 1: Build source registries ===\n');
for (const src of SOURCES) {
  if (src.local) {
    console.log(`Skipping build for ${src.name} (local source)\n`);
    continue;
  }
  console.log(`Building ${src.name}...`);
  execSync(`pnpm --filter ${src.filter} build:registry`, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });
  console.log();
}

// ---------------------------------------------------------------------------
// 2. Copy registry directories into apps/registry/registry/
// ---------------------------------------------------------------------------
console.log('=== Step 2: Copy registry sources ===\n');
const localRegistryDir = join(REGISTRY_APP, 'registry', 'constructive');

if (existsSync(join(REGISTRY_APP, 'registry'))) {
  rmSync(join(REGISTRY_APP, 'registry'), { recursive: true });
}

for (const src of SOURCES) {
  if (!existsSync(src.registryDir)) {
    console.error(`ERROR: ${src.registryDir} does not exist. Did build:registry run?`);
    process.exit(1);
  }
  // destSubdir keeps merged sources from colliding; excludeTests strips
  // *.test/*.spec/*.stories so they never reach a shipped registry item.
  const dest = src.destSubdir ? join(localRegistryDir, src.destSubdir) : localRegistryDir;
  const filter = src.excludeTests ? (s) => !TEST_FILE_RE.test(s) : undefined;
  console.log(`Copying ${src.name} → registry/constructive/${src.destSubdir ?? ''}`);
  cpSync(src.registryDir, dest, { recursive: true, filter });
}
console.log();

// ---------------------------------------------------------------------------
// 3. Merge registry.json from all sources
// ---------------------------------------------------------------------------
console.log('=== Step 3: Merge registry.json ===\n');
const allItems = [];
const itemOwners = new Map();
const targetOwners = new Map();

for (const src of SOURCES) {
  const raw = readFileSync(src.registryJsonPath, 'utf-8');
  const registry = JSON.parse(raw);
  const items = registry.items || [];
  console.log(`  ${src.name}: ${items.length} items`);
  for (const item of items) {
    if (!item?.name) throw new Error(`${src.name} contains a registry item without a name.`);
    const existingOwner = itemOwners.get(item.name);
    if (existingOwner) {
      throw new Error(`Duplicate registry item '${item.name}' from ${existingOwner} and ${src.name}.`);
    }
    itemOwners.set(item.name, src.name);

    for (const file of item.files ?? []) {
      if (!file.path) throw new Error(`${src.name}/${item.name} contains a file without a path.`);
      const sourcePath = join(REGISTRY_APP, file.path);
      if (!existsSync(sourcePath)) {
        throw new Error(`${src.name}/${item.name} references missing source file ${file.path}.`);
      }
      if (file.target) {
        const existingTarget = targetOwners.get(file.target);
        if (existingTarget) {
          throw new Error(`Duplicate registry target '${file.target}' from ${existingTarget} and ${src.name}/${item.name}.`);
        }
        targetOwners.set(file.target, `${src.name}/${item.name}`);
      }
    }

    allItems.push(item);
  }
}

// ---------------------------------------------------------------------------
// 3b. Namespace registryDependencies
//
// shadcn resolves bare names (e.g. "cn") from the default registry.
// Items that live inside *this* registry must be prefixed so consumers
// resolve them from their @constructive registry entry instead.
// ---------------------------------------------------------------------------
const NAMESPACE = 'constructive';
const EXPECTED_ITEM_COUNT = 157;
const ownNames = new Set(allItems.map((item) => item.name));

for (const item of allItems) {
  if (!Array.isArray(item.registryDependencies)) continue;
  item.registryDependencies = item.registryDependencies.map((dep) => {
    // Already namespaced or a URL → leave as-is
    if (dep.startsWith('@') || dep.startsWith('http')) return dep;
    // References an item in this registry → namespace it
    if (ownNames.has(dep)) return `@${NAMESPACE}/${dep}`;
    return dep;
  });
}

const combined = {
  $schema: 'https://ui.shadcn.com/schema/registry.json',
  name: 'constructive',
  homepage: 'https://constructive-io.github.io/blocks',
  items: allItems,
};

if (allItems.length !== EXPECTED_ITEM_COUNT) {
  throw new Error(`Combined registry contains ${allItems.length} items; expected ${EXPECTED_ITEM_COUNT}.`);
}

const combinedPath = join(REGISTRY_APP, 'registry.json');
writeFileSync(combinedPath, JSON.stringify(combined, null, 2) + '\n', 'utf-8');
console.log(`\nCombined registry: ${allItems.length} items → registry.json\n`);

// ---------------------------------------------------------------------------
// 4. Run shadcn build
// ---------------------------------------------------------------------------
console.log('=== Step 4: shadcn build ===\n');
mkdirSync(join(REGISTRY_APP, 'public', 'r'), { recursive: true });
execSync('pnpm exec shadcn build ./registry.json --output ./public/r', {
  cwd: REGISTRY_APP,
  stdio: 'inherit',
});

const outputNames = new Set(
  readdirSync(join(REGISTRY_APP, 'public', 'r'))
    .filter((name) => name.endsWith('.json') && name !== 'registry.json')
    .map((name) => name.slice(0, -'.json'.length))
);
for (const item of allItems) {
  if (!outputNames.has(item.name)) throw new Error(`shadcn build did not emit public/r/${item.name}.json.`);
}

console.log('\nRegistry build complete!');
console.log(`   Output: apps/registry/public/r/`);
