#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'constructive-blocks-gen-'));
const targets = [
  'src/blocks-manifest.json',
  'src/flows/flows.json',
  'src/lib/docs/registry-data.ts'
];

function run(script) {
  const result = spawnSync(process.execPath, [path.join(appDir, 'scripts', script)], {
    cwd: appDir,
    env: { ...process.env, BLOCKS_GEN_OUT: tempDir },
    stdio: 'inherit'
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function collect(root, relative = '') {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return new Map();
  const stat = fs.statSync(absolute);
  if (stat.isFile()) return new Map([[relative, fs.readFileSync(absolute)]]);

  const files = new Map();
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) {
      for (const [name, bytes] of collect(root, child)) files.set(name, bytes);
    } else {
      files.set(child, fs.readFileSync(path.join(root, child)));
    }
  }
  return files;
}

try {
  run('generate-manifest.mjs');
  run('generate-flows.mjs');

  const mismatches = [];
  for (const target of targets) {
    const expected = collect(tempDir, target);
    const actual = collect(appDir, target);
    const names = new Set([...expected.keys(), ...actual.keys()]);
    for (const name of names) {
      if (!expected.has(name)) mismatches.push(`${name}: unexpected committed file`);
      else if (!actual.has(name)) mismatches.push(`${name}: missing committed file`);
      else if (!expected.get(name).equals(actual.get(name))) mismatches.push(`${name}: generated content differs`);
    }
  }

  if (mismatches.length) {
    console.error('Generated Blocks artifacts are stale:');
    for (const mismatch of mismatches) console.error(`  - ${mismatch}`);
    console.error('\nRun: pnpm --filter blocks gen');
    process.exit(1);
  }
  console.log('Generated Blocks artifacts are current.');
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
