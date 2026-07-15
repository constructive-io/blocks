import { constants } from 'node:fs';
import { access, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(packageRoot, 'registry.json');
const sourceRoot = join(packageRoot, 'src/schema');
const outputRoot = join(packageRoot, 'registry/constructive/blocks/schema');
const outputPrefix = 'registry/constructive/blocks/schema/';
const checkOnly = process.argv.includes('--check');

const registry = JSON.parse(await readFile(manifestPath, 'utf8'));
const expectedNames = [
  'schema-builder-core',
  'schema-builder-fields',
  'schema-builder-relationships',
  'schema-builder-indexes',
  'schema-builder-policies',
  'schema-builder-tables',
  'schema-builder'
];

const names = registry.items.map((item) => item.name);
if (JSON.stringify(names) !== JSON.stringify(expectedNames)) {
  throw new Error(`Schema registry items changed: ${names.join(', ')}`);
}

const files = registry.items.flatMap((item) => item.files);
if (files.length !== 164) throw new Error(`Expected 164 schema registry files, found ${files.length}`);

async function walk(root) {
  const result = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) result.push(...await walk(path));
    else result.push(path);
  }
  return result;
}

function resolvePair(file) {
  if (!file.path.startsWith(outputPrefix)) {
    throw new Error(`Unexpected schema registry path: ${file.path}`);
  }
  const suffix = file.path.slice(outputPrefix.length);
  return {
    source: join(sourceRoot, suffix),
    output: join(outputRoot, suffix)
  };
}

function transformSource(source) {
  return source;
}

for (const file of files) {
  const { source } = resolvePair(file);
  await access(source, constants.R_OK);
}

if (!checkOnly) {
  await rm(outputRoot, { recursive: true, force: true });
  for (const file of files) {
    const { source, output } = resolvePair(file);
    await mkdir(dirname(output), { recursive: true });
    const content = await readFile(source, 'utf8');
    await writeFile(output, transformSource(content));
  }
}

const expectedOutputs = new Set(files.map((file) => resolvePair(file).output));
const actualOutputs = new Set(await walk(outputRoot));
if (expectedOutputs.size !== actualOutputs.size) {
  throw new Error(`Registry output count mismatch: expected ${expectedOutputs.size}, found ${actualOutputs.size}`);
}

for (const output of actualOutputs) {
  if (!expectedOutputs.has(output)) {
    throw new Error(`Unexpected registry output: ${relative(packageRoot, output).split(sep).join('/')}`);
  }
  const suffix = relative(outputRoot, output);
  const manifestFile = files.find((file) => resolvePair(file).output === output);
  if (!manifestFile) throw new Error(`Missing manifest entry for ${suffix}`);
  const { source } = resolvePair(manifestFile);
  const [sourceContent, outputContent] = await Promise.all([
    readFile(source, 'utf8'),
    readFile(output, 'utf8')
  ]);
  if (transformSource(sourceContent) !== outputContent) {
    throw new Error(`Registry output drifted from canonical source: ${suffix.split(sep).join('/')}`);
  }
}

console.log(`${checkOnly ? 'Checked' : 'Built'} ${registry.items.length} schema items (${files.length} files)`);
