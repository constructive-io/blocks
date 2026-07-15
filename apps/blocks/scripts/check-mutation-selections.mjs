#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const blocksDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'blocks');
const emptySelection = /selection\s*:\s*\{\s*fields\s*:\s*\{\s*\}\s*\}/g;
const violations = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (/\.[cm]?[jt]sx?$/.test(entry.name)) {
      const source = fs.readFileSync(absolute, 'utf8');
      if (emptySelection.test(source)) violations.push(path.relative(blocksDir, absolute));
      emptySelection.lastIndex = 0;
    }
  }
}

walk(blocksDir);
if (violations.length) {
  console.error(`Empty GraphQL mutation selections found:\n${violations.map((file) => `  - ${file}`).join('\n')}`);
  process.exit(1);
}
console.log('No empty GraphQL mutation selections found.');
