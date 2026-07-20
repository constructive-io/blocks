import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

type PackageManifest = {
  packageManager?: string;
  engines?: Record<string, string>;
  scripts?: Record<string, string>;
};

const expectedNodeMajor = '24';
const expectedNodeEngine = '>=24.0.0';
const expectedPnpmVersion = '10.28.0';
const expectedUiNodeEngine = '>=18.0.0';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const execFileAsync = promisify(execFile);
const failures: string[] = [];

async function readText(relativePath: string): Promise<string> {
  return readFile(path.join(root, relativePath), 'utf8');
}

async function readManifest(relativePath: string): Promise<PackageManifest> {
  return JSON.parse(await readText(relativePath)) as PackageManifest;
}

function expectEqual(label: string, actual: string | undefined, expected: string): void {
  if (actual !== expected) {
    failures.push(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function expectIncludes(label: string, contents: string, expected: string): void {
  if (!contents.includes(expected)) failures.push(`${label}: missing ${JSON.stringify(expected)}`);
}

const [
  nodeVersion,
  rootManifest,
  schemaBuilderManifest,
  uiManifest,
  ciWorkflow,
  pagesWorkflow,
  readme,
  agentsInstructions,
  claudeInstructions,
  pnpmResult
] = await Promise.all([
  readText('.node-version'),
  readManifest('package.json'),
  readManifest('packages/schema-builder/package.json'),
  readManifest('packages/ui/package.json'),
  readText('.github/workflows/ci.yml'),
  readText('.github/workflows/pages.yml'),
  readText('README.md'),
  readText('AGENTS.md'),
  readText('CLAUDE.md'),
  execFileAsync('pnpm', ['--version'])
]);

expectEqual('.node-version', nodeVersion.trim(), expectedNodeMajor);
expectEqual('active Node.js major', process.versions.node.split('.')[0], expectedNodeMajor);
expectEqual('active pnpm version', pnpmResult.stdout.trim(), expectedPnpmVersion);
expectEqual('package.json#packageManager', rootManifest.packageManager, `pnpm@${expectedPnpmVersion}`);
expectEqual('package.json#engines.node', rootManifest.engines?.node, expectedNodeEngine);
expectEqual('packages/schema-builder/package.json#engines.node', schemaBuilderManifest.engines?.node, expectedNodeEngine);
expectEqual('packages/ui/package.json#engines.node', uiManifest.engines?.node, expectedUiNodeEngine);
expectEqual(
  'package.json#scripts.check:runtime',
  rootManifest.scripts?.['check:runtime'],
  'tsx scripts/check-runtime-contract.ts'
);
if (!rootManifest.scripts?.check?.startsWith('pnpm check:runtime && ')) {
  failures.push('package.json#scripts.check: runtime contract check must run first');
}

for (const [relativePath, contents] of [
  ['.github/workflows/ci.yml', ciWorkflow],
  ['.github/workflows/pages.yml', pagesWorkflow]
] as const) {
  const pins = [...contents.matchAll(/node-version:\s*['"]?([^'"\s#]+)['"]?/g)].map((match) => match[1]);
  expectEqual(`${relativePath} Node.js pins`, JSON.stringify(pins), JSON.stringify([expectedNodeMajor]));
}

const runtimeInstruction = `Node ${expectedNodeMajor} LTS and pnpm ${expectedPnpmVersion}`;
for (const [relativePath, contents] of [
  ['README.md', readme],
  ['AGENTS.md', agentsInstructions],
  ['CLAUDE.md', claudeInstructions]
] as const) {
  expectIncludes(relativePath, contents, runtimeInstruction);
  if (contents.includes('Node 22')) failures.push(`${relativePath}: contains stale Node 22 instruction`);
}

if (failures.length > 0) {
  console.error(`Runtime contract check failed:\n${failures.map((failure) => `- ${failure}`).join('\n')}`);
  process.exit(1);
}

console.log(`Runtime contract matches Node ${expectedNodeMajor} LTS and pnpm ${expectedPnpmVersion}.`);
