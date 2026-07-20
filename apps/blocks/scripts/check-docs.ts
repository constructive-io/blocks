import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { BASE_PRIMITIVES } from '../src/lib/base-primitives';

type PackageManifest = {
  devDependencies?: Record<string, string>;
  exports?: Record<string, unknown>;
};

type RegistryManifest = {
  items?: Array<{ name?: string }>;
};

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const appDirectory = path.resolve(scriptDirectory, '..');
const repositoryRoot = path.resolve(appDirectory, '..', '..');
const uiDirectory = path.join(repositoryRoot, 'packages', 'ui');

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

function collectFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '.next' || entry.name === 'node_modules' || entry.name === 'out') return [];
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(target) : [target];
  });
}

const names = BASE_PRIMITIVES.map(({ name }) => name);
const uniqueNames = new Set(names);
if (names.length !== 29 || uniqueNames.size !== names.length) {
  throw new Error(`The docs catalog must contain exactly 29 unique primitives; received ${names.length}.`);
}

const uiPackage = readJson<PackageManifest>(path.join(uiDirectory, 'package.json'));
const uiRegistry = readJson<RegistryManifest>(path.join(uiDirectory, 'registry.json'));
const registryNames = new Set((uiRegistry.items ?? []).flatMap((item) => (item.name ? [item.name] : [])));

const errors: string[] = [];
for (const primitive of BASE_PRIMITIVES) {
  if (!uiPackage.exports?.[`./${primitive.name}`]) {
    errors.push(`${primitive.name}: missing @constructive-io/ui package export`);
  }
  if (!registryNames.has(primitive.name)) {
    errors.push(`${primitive.name}: missing packages/ui registry item`);
  }

  const demoPath = path.join(appDirectory, 'src', 'components', 'docs', 'demos', `ui-${primitive.name}.demo.tsx`);
  if (!fs.existsSync(demoPath)) {
    errors.push(`${primitive.name}: missing package-backed preview`);
    continue;
  }
  const demoSource = fs.readFileSync(demoPath, 'utf8');
  if (!demoSource.includes(`@constructive-io/ui/${primitive.name}`)) {
    errors.push(`${primitive.name}: preview must import its npm package subpath`);
  }
}

const appPackage = readJson<PackageManifest>(path.join(appDirectory, 'package.json'));
if (appPackage.devDependencies?.shadcn !== '4.13.1') {
  errors.push('apps/blocks must pin shadcn to 4.13.1');
}

const firstPartyMjs = collectFiles(appDirectory).filter((file) => file.endsWith('.mjs'));
for (const file of firstPartyMjs) {
  errors.push(`${path.relative(repositoryRoot, file)}: first-party .mjs files are not allowed`);
}

if (errors.length > 0) {
  throw new Error(`Blocks docs contract failed:\n- ${errors.join('\n- ')}`);
}

console.log('Blocks docs expose exactly 29 package-backed base primitives.');
console.log('Every primitive resolves to an npm export and a shadcn registry item.');
