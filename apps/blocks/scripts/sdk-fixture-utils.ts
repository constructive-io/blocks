// @ts-nocheck -- This compatibility utility models heterogeneous generated SDK graphs at runtime.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

export const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const appDir = path.resolve(scriptDir, '..');
export const repoRoot = path.resolve(appDir, '..', '..');
export const fixtureRoot = path.join(appDir, 'src', 'generated');
export const fixtureManifestPath = path.join(fixtureRoot, 'fixture-manifest.json');
export const knownMissingPath = path.join(scriptDir, 'sdk-fixture-known-missing.json');
export const namespaces = ['auth', 'admin', 'schema-builder', 'modules'];

function sourceFiles(root) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'generated') continue;
      files.push(...sourceFiles(target));
    } else if (/\.[cm]?[jt]sx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      files.push(target);
    }
  }
  return files;
}

export function collectGeneratedImports() {
  const collected = Object.fromEntries(namespaces.map((namespace) => [namespace, new Map()]));
  const canonicalSourceRoots = [
    path.join(appDir, 'src'),
    path.join(repoRoot, 'packages', 'schema-builder', 'src', 'schema'),
    path.join(repoRoot, 'packages', 'schema-builder', 'registry-support'),
  ];
  for (const file of canonicalSourceRoots.flatMap(sourceFiles).sort()) {
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const match = statement.moduleSpecifier.text.match(/^@\/generated\/(auth|admin|schema-builder|modules)(\/.*)?$/);
      if (!match) continue;
      const [, namespace, subpath = ''] = match;
      const clause = statement.importClause;
      if (!clause) continue;
      const names = collected[namespace].get(subpath) ?? new Set();
      if (clause.name) names.add('default');
      if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        for (const element of clause.namedBindings.elements) names.add(element.propertyName?.text ?? element.name.text);
      } else if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
        names.add('*');
      }
      collected[namespace].set(subpath, names);
    }
  }
  return collected;
}

export function serialiseImports(collected) {
  return Object.fromEntries(
    namespaces.map((namespace) => [
      namespace,
      Object.fromEntries(
        [...collected[namespace].entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([subpath, names]) => [subpath || '.', [...names].sort()]),
      ),
    ]),
  );
}

function requirementFiles(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) return requirementFiles(target);
    return entry.name.endsWith('.requires.json') ? [target] : [];
  });
}

export function normaliseModelName(name) {
  if (/^[A-Z]/.test(name)) return name;
  let singular = name;
  if (singular.endsWith('ies')) singular = `${singular.slice(0, -3)}y`;
  else if (singular.endsWith('s')) singular = singular.slice(0, -1);
  return singular
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join('');
}

export function operationExport(kind, name) {
  const operation = `${name[0].toUpperCase()}${name.slice(1)}`;
  return kind === 'queries' ? `use${operation}Query` : `use${operation}Mutation`;
}

export function collectRequirements() {
  const roots = [path.join(appDir, 'src', 'blocks'), path.join(repoRoot, 'packages', 'schema-builder')];
  const requirements = {};
  for (const file of roots.flatMap(requirementFiles).sort()) {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const requirement of value.requires ?? [value]) {
      const namespace = requirement.namespace;
      if (!namespace) throw new Error(`${file} contains a requirement without a namespace.`);
      const entry = requirements[namespace] ?? { queries: new Set(), mutations: new Set(), models: new Set() };
      for (const query of requirement.queries ?? []) entry.queries.add(query);
      for (const mutation of requirement.mutations ?? []) entry.mutations.add(mutation);
      for (const model of requirement.models ?? []) entry.models.add(normaliseModelName(model));
      requirements[namespace] = entry;
    }
  }
  return requirements;
}

export function serialiseRequirements(requirements) {
  return Object.fromEntries(
    Object.entries(requirements)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([namespace, entry]) => [
        namespace,
        {
          queries: [...entry.queries].sort(),
          mutations: [...entry.mutations].sort(),
          models: [...entry.models].sort(),
        },
      ]),
  );
}

export function readKnownMissing() {
  const groups = JSON.parse(fs.readFileSync(knownMissingPath, 'utf8'));
  const entries = new Map();
  for (const group of groups) {
    if (!group.reason?.trim()) throw new Error('Every known SDK gap needs a reason.');
    for (const name of group.names ?? []) {
      const key = `${group.namespace}:${group.kind}:${name}`;
      if (entries.has(key)) throw new Error(`Duplicate known SDK gap: ${key}`);
      entries.set(key, group.reason);
    }
  }
  return entries;
}
