// @ts-nocheck -- This maintenance-only importer traverses heterogeneous external SDK output.
import fs from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

import {
  appDir,
  collectRequirements,
  collectGeneratedImports,
  fixtureManifestPath,
  fixtureRoot,
  namespaces,
  operationExport,
  readKnownMissing,
  serialiseImports,
  serialiseRequirements,
} from './sdk-fixture-utils';

const sourceRoot = path.resolve(
  process.env.BLOCKS_SDK_SOURCE_ROOT ??
    process.argv.find((argument) => argument.startsWith('--source='))?.slice('--source='.length) ??
    '',
);

if (!process.env.BLOCKS_SDK_SOURCE_ROOT && !process.argv.some((argument) => argument.startsWith('--source='))) {
  throw new Error(
    'Set BLOCKS_SDK_SOURCE_ROOT (or --source=...) to a directory containing auth-sdk/api, admin-sdk/api, schema-builder-sdk/api, and modules-sdk/api.',
  );
}

const imports = collectGeneratedImports();
const requirements = collectRequirements();
const knownMissing = readKnownMissing();
const discoveredMissing = new Set();

function listTypeScriptFiles(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...listTypeScriptFiles(target));
    else if (/\.[cm]?[jt]sx?$/.test(entry.name)) files.push(target);
  }
  return files;
}

function resolveRelative(fromFile, specifier) {
  const unresolved = path.resolve(path.dirname(fromFile), specifier);
  return [
    unresolved,
    `${unresolved}.ts`,
    `${unresolved}.tsx`,
    path.join(unresolved, 'index.ts'),
    path.join(unresolved, 'index.tsx'),
  ].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
}

function dependencyClosure(seedFiles, sourceApi) {
  const pending = [...seedFiles];
  const files = new Set();
  while (pending.length) {
    const file = pending.pop();
    if (!file || files.has(file)) continue;
    if (!file.startsWith(`${sourceApi}${path.sep}`)) throw new Error(`SDK dependency escaped ${sourceApi}: ${file}`);
    files.add(file);
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const specifiers = source.statements.flatMap((statement) => {
      if (
        (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
        statement.moduleSpecifier &&
        ts.isStringLiteral(statement.moduleSpecifier) &&
        statement.moduleSpecifier.text.startsWith('.')
      ) {
        return [statement.moduleSpecifier.text];
      }
      return [];
    });
    for (const specifier of specifiers) {
      const dependency = resolveRelative(file, specifier);
      if (!dependency) throw new Error(`Cannot resolve ${specifier} from ${file}`);
      pending.push(dependency);
    }
  }
  return files;
}

function findSymbolFile(sourceApi, name) {
  if (name === 'configure' || name === 'getClient') return path.join(sourceApi, 'hooks', 'client.ts');
  const byBasename = listTypeScriptFiles(sourceApi).filter((file) => path.basename(file, path.extname(file)) === name);
  if (byBasename.length === 1) return byBasename[0];
  if (byBasename.length > 1) throw new Error(`Ambiguous generated export '${name}': ${byBasename.join(', ')}`);

  const declaration = new RegExp(
    `export\\s+(?:declare\\s+)?(?:async\\s+)?(?:type|interface|class|const|function|enum)\\s+${name}\\b`,
  );
  const exportList = new RegExp(`export\\s+(?:type\\s+)?\\{[^}]*\\b${name}\\b[^}]*\\}`);
  const matches = listTypeScriptFiles(sourceApi).filter((file) => {
    const source = fs.readFileSync(file, 'utf8');
    return declaration.test(source) || exportList.test(source);
  });
  if (matches.length === 0) throw new Error(`Unable to locate generated export '${name}' under ${sourceApi}`);
  return matches.sort((a, b) => {
    const aHooks = a.includes(`${path.sep}hooks${path.sep}`) ? 0 : 1;
    const bHooks = b.includes(`${path.sep}hooks${path.sep}`) ? 0 : 1;
    return aHooks - bHooks || a.length - b.length || a.localeCompare(b);
  })[0];
}

function subpathFile(sourceApi, subpath) {
  const relative = subpath.replace(/^\//, '');
  return resolveRelative(path.join(sourceApi, 'index.ts'), `./${relative}`);
}

const manifest = {
  generatedBy: 'apps/blocks/scripts/refresh-sdk-fixtures.ts',
  generatedAt: null,
  imports: serialiseImports(imports),
  requirements: serialiseRequirements(requirements),
  knownMissing: [...knownMissing.keys()].sort(),
  namespaces: {},
};

fs.mkdirSync(fixtureRoot, { recursive: true });
const stagingRoot = fs.mkdtempSync(path.join(fixtureRoot, '.staging-'));
process.once('exit', () => fs.rmSync(stagingRoot, { recursive: true, force: true }));

for (const namespace of namespaces) {
  const sourceApi = path.join(sourceRoot, `${namespace}-sdk`, 'api');
  if (!fs.existsSync(sourceApi)) throw new Error(`Missing generated SDK source: ${sourceApi}`);

  const seeds = new Set();
  const modelExports = new Map();
  for (const [subpath, names] of imports[namespace]) {
    if (subpath) {
      const file = subpathFile(sourceApi, subpath);
      if (!file) throw new Error(`Cannot resolve @/generated/${namespace}${subpath} in ${sourceApi}`);
      seeds.add(file);
    }
    for (const name of names) {
      if (name === 'default' || name === '*') {
        throw new Error(`Fixture pruning requires named imports; found '${name}' for @/generated/${namespace}${subpath}`);
      }
      seeds.add(findSymbolFile(sourceApi, name));
    }
  }

  const namespaceRequirements = requirements[namespace] ?? {
    queries: new Set(),
    mutations: new Set(),
    models: new Set(),
  };
  for (const kind of ['queries', 'mutations']) {
    for (const name of namespaceRequirements[kind]) {
      const symbol = operationExport(kind, name);
      try {
        seeds.add(findSymbolFile(sourceApi, symbol));
      } catch {
        discoveredMissing.add(`${namespace}:${kind}:${name}`);
      }
    }
  }
  for (const model of namespaceRequirements.models) {
    try {
      const file = findSymbolFile(sourceApi, model);
      seeds.add(file);
      modelExports.set(model, file);
    } catch {
      discoveredMissing.add(`${namespace}:models:${model}`);
    }
  }

  const files = dependencyClosure(seeds, sourceApi);
  const destination = path.join(stagingRoot, namespace);
  for (const file of [...files].sort()) {
    const relative = path.relative(sourceApi, file);
    const target = path.join(destination, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(file, target);
  }

  const hookSeeds = [...seeds]
    .filter((file) => file.includes(`${path.sep}hooks${path.sep}`) && path.basename(file) !== 'client.ts')
    .map((file) => `./${path.relative(path.join(sourceApi, 'hooks'), file).replace(/\\/g, '/').replace(/\.[^.]+$/, '')}`)
    .sort();
  fs.mkdirSync(path.join(destination, 'hooks'), { recursive: true });
  fs.writeFileSync(
    path.join(destination, 'hooks', 'index.ts'),
    [`export * from './client';`, ...hookSeeds.map((specifier) => `export * from '${specifier}';`), ''].join('\n'),
  );
  const rootExports = [`export * from './hooks';`];
  for (const [model, file] of [...modelExports.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const specifier = `./${path.relative(sourceApi, file).replace(/\\/g, '/').replace(/\.[^.]+$/, '')}`;
    rootExports.push(`export type { ${model} } from '${specifier}';`);
  }
  fs.writeFileSync(path.join(destination, 'index.ts'), `${rootExports.join('\n')}\n`);

  manifest.namespaces[namespace] = {
    files: [...files]
      .map((file) => path.relative(sourceApi, file).replace(/\\/g, '/'))
      .concat(['hooks/index.ts', 'index.ts'])
      .filter((file, index, all) => all.indexOf(file) === index)
      .sort(),
  };
}

for (const [namespace, entry] of Object.entries(requirements)) {
  if (namespaces.includes(namespace)) continue;
  for (const kind of ['queries', 'mutations', 'models']) {
    for (const name of entry[kind]) discoveredMissing.add(`${namespace}:${kind}:${name}`);
  }
}

const newGaps = [...discoveredMissing].filter((key) => !knownMissing.has(key)).sort();
const staleGaps = [...knownMissing.keys()].filter((key) => !discoveredMissing.has(key)).sort();
if (newGaps.length || staleGaps.length) {
  throw new Error(
    [
      newGaps.length ? `Undocumented SDK gaps: ${newGaps.join(', ')}` : '',
      staleGaps.length ? `Stale known-missing SDK entries: ${staleGaps.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  );
}

for (const namespace of namespaces) {
  const destination = path.join(fixtureRoot, namespace);
  fs.rmSync(destination, { recursive: true, force: true });
  fs.renameSync(path.join(stagingRoot, namespace), destination);
}
fs.writeFileSync(fixtureManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
fs.rmSync(stagingRoot, { recursive: true, force: true });
console.log(`Refreshed pruned SDK fixtures in ${path.relative(appDir, fixtureRoot)}.`);
