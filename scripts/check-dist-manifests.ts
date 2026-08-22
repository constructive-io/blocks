// Guards the makage publish-from-`dist` packages against the two ways a manual
// `lerna publish` can ship the wrong thing:
//
//   1. a stale `dist/package.json` (built before `lerna version` bumped the
//      source manifest), which republishes the previous version's number with
//      the new version's code;
//   2. a `workspace:` range copied verbatim into `dist/package.json`, which
//      `pnpm publish` resolves but `npm publish` — what `lerna publish` calls —
//      does not, so consumers get an uninstallable dependency.
//
// Run after `pnpm build:packages`, so every dist manifest is the one that would
// be published right now.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const;

interface Manifest {
  name: string;
  version: string;
  publishConfig?: { directory?: string };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

const packageDirectories = [
  'json-renderer',
  'blocks-schema',
  'blocks-renderer',
  'json-schema-to-blocks',
  'meta-to-blocks',
  'flow-to-blocks'
];

async function readManifest(manifestPath: string): Promise<Manifest> {
  return JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest;
}

const failures: string[] = [];

for (const directory of packageDirectories) {
  const packageRoot = path.join(root, 'packages', directory);
  const source = await readManifest(path.join(packageRoot, 'package.json'));
  const distDirectory = source.publishConfig?.directory;
  if (distDirectory !== 'dist') {
    failures.push(`${source.name}: expected publishConfig.directory "dist", found ${JSON.stringify(distDirectory)}`);
    continue;
  }

  let dist: Manifest;
  try {
    dist = await readManifest(path.join(packageRoot, 'dist', 'package.json'));
  } catch (error) {
    const reason = (error as NodeJS.ErrnoException).code === 'ENOENT'
      ? 'dist/package.json is missing — run the package build'
      : String(error);
    failures.push(`${source.name}: ${reason}`);
    continue;
  }

  if (dist.version !== source.version) {
    failures.push(
      `${source.name}: dist/package.json is version ${dist.version} but the source manifest is ${source.version}`
      + ' — the dist tree predates the version bump and would publish the wrong version'
    );
  }

  for (const field of DEP_FIELDS) {
    for (const [name, spec] of Object.entries(dist[field] ?? {})) {
      if (spec.startsWith('workspace:')) {
        failures.push(`${source.name}: dist/package.json ${field}."${name}" is "${spec}" — npm publish cannot resolve the workspace protocol`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error(`[check-dist-manifests] ${failures.length} problem(s) found:\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  console.error('\nRebuild the affected packages (pnpm build:packages) and make sure their build ends with'
    + '\n"node ../../scripts/resolve-dist-workspace-deps.mjs && makage check-publish".');
  process.exit(1);
}

console.log(`[check-dist-manifests] ${packageDirectories.length} dist manifests are publishable`);
