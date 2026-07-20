// @ts-nocheck -- The committed fixture manifest intentionally has a generated, namespace-shaped schema.
import fs from 'node:fs';
import path from 'node:path';

import {
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

if (!fs.existsSync(fixtureManifestPath)) throw new Error(`Missing ${fixtureManifestPath}; run pnpm fixtures:refresh.`);

const manifest = JSON.parse(fs.readFileSync(fixtureManifestPath, 'utf8'));
const expectedImports = serialiseImports(collectGeneratedImports());
if (JSON.stringify(manifest.imports) !== JSON.stringify(expectedImports)) {
  throw new Error('Generated SDK imports changed; refresh the pruned fixtures and review the newly reachable API surface.');
}

const expectedRequirements = serialiseRequirements(collectRequirements());
if (JSON.stringify(manifest.requirements) !== JSON.stringify(expectedRequirements)) {
  throw new Error('Registry requirements changed; refresh fixtures so every operation and model is audited.');
}

const knownMissing = readKnownMissing();
if (JSON.stringify(manifest.knownMissing) !== JSON.stringify([...knownMissing.keys()].sort())) {
  throw new Error('The known-missing SDK ledger changed; refresh fixtures and verify every exception against generated output.');
}

const coverageErrors = [];
const currentRequirementKeys = new Set();
for (const [namespace, entry] of Object.entries(expectedRequirements)) {
  const hooksIndex = path.join(fixtureRoot, namespace, 'hooks', 'index.ts');
  const hooksSource = fs.existsSync(hooksIndex) ? fs.readFileSync(hooksIndex, 'utf8') : '';
  const rootIndex = path.join(fixtureRoot, namespace, 'index.ts');
  const rootSource = fs.existsSync(rootIndex) ? fs.readFileSync(rootIndex, 'utf8') : '';

  for (const kind of ['queries', 'mutations']) {
    for (const name of entry[kind]) {
      const key = `${namespace}:${kind}:${name}`;
      currentRequirementKeys.add(key);
      const symbol = operationExport(kind, name);
      const exported = hooksSource.includes(`/${symbol}'`) || hooksSource.includes(`/${symbol}"`);
      if (knownMissing.has(key)) {
        if (exported) coverageErrors.push(`${key}: ledger entry is stale because ${symbol} is now exported`);
      } else if (!exported) {
        coverageErrors.push(`${key}: missing generated export ${symbol}`);
      }
    }
  }

  for (const model of entry.models) {
    const key = `${namespace}:models:${model}`;
    currentRequirementKeys.add(key);
    const exported = rootSource.includes(`{ ${model} }`);
    if (knownMissing.has(key)) {
      if (exported) coverageErrors.push(`${key}: ledger entry is stale because the model is now exported`);
    } else if (!exported) {
      coverageErrors.push(`${key}: missing normalized model export ${model}`);
    }
  }
}

for (const key of knownMissing.keys()) {
  if (!currentRequirementKeys.has(key)) coverageErrors.push(`${key}: known-missing entry no longer has a sidecar declaration`);
}
if (coverageErrors.length) {
  throw new Error(`SDK requirement coverage failed:\n- ${coverageErrors.join('\n- ')}`);
}

for (const namespace of namespaces) {
  const expected = new Set(manifest.namespaces?.[namespace]?.files ?? []);
  for (const relative of expected) {
    if (!fs.existsSync(path.join(fixtureRoot, namespace, relative))) {
      throw new Error(`Fixture manifest references missing ${namespace}/${relative}.`);
    }
  }
  if (!expected.has('index.ts') || !expected.has('hooks/index.ts')) {
    throw new Error(`${namespace} fixture is missing its pruned public barrels.`);
  }
}

console.log('Pruned generated SDK fixtures match every Blocks import.');
console.log('Every sidecar operation/model is exported or documented in the known-missing ledger.');
