import { readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(path);
      continue;
    }
    if (!['.js', '.cjs'].includes(extname(entry.name))) continue;

    const source = await readFile(path, 'utf8');
    if (source.startsWith("'use client';") || source.startsWith('"use client";')) continue;
    await writeFile(path, `'use client';\n${source}`);
  }
}

await visit(dist);
