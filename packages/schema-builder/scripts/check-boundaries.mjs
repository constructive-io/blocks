import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const distRoot = join(packageRoot, 'dist');
const forbiddenSpecifier = /(?:from\s*|require\(|import\()\s*['"](?:@\/|next-themes(?:\/|['"])|[^'"]*\/generated\/)/;

async function walk(root) {
  const result = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) result.push(...await walk(path));
    else result.push(path);
  }
  return result;
}

const distributableFiles = (await walk(distRoot)).filter((path) =>
  ['.js', '.cjs', '.ts', '.cts', '.map'].includes(extname(path))
);

for (const path of distributableFiles) {
  const source = await readFile(path, 'utf8');
  if (forbiddenSpecifier.test(source)) {
    throw new Error(`Forbidden app/generated specifier in ${relative(packageRoot, path)}`);
  }
}

for (const entry of ['index', 'core', 'fields', 'relationships', 'indexes', 'policies', 'tables', 'testing']) {
  for (const extension of ['js', 'cjs']) {
    const path = join(distRoot, `${entry}.${extension}`);
    const source = await readFile(path, 'utf8');
    if (!source.startsWith("'use client';")) {
      throw new Error(`Missing use client boundary in ${relative(packageRoot, path)}`);
    }
  }
}

console.log(`Checked ${distributableFiles.length} npm artifact files`);
