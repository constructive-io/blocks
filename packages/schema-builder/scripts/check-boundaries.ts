import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const distributionRoot = join(packageRoot, 'dist');
const forbiddenSpecifier = /(?:from\s*|require\(|import\()\s*['"](?:@\/|next-themes(?:\/|['"])|[^'"]*\/generated\/)/;

async function walk(root: string): Promise<string[]> {
	const result: string[] = [];
	for (const entry of await readdir(root, { withFileTypes: true })) {
		const entryPath = join(root, entry.name);
		if (entry.isDirectory()) result.push(...await walk(entryPath));
		else result.push(entryPath);
	}
	return result;
}

const distributableFiles = (await walk(distributionRoot)).filter((filePath) =>
	['.js', '.cjs', '.ts', '.cts', '.map'].includes(extname(filePath)),
);

for (const filePath of distributableFiles) {
	const source = await readFile(filePath, 'utf8');
	if (forbiddenSpecifier.test(source)) {
		throw new Error(`Forbidden app/generated specifier in ${relative(packageRoot, filePath)}`);
	}
}

for (const entry of ['index', 'core', 'fields', 'relationships', 'indexes', 'policies', 'tables', 'testing']) {
	for (const extension of ['js', 'cjs']) {
		const filePath = join(distributionRoot, `${entry}.${extension}`);
		const source = await readFile(filePath, 'utf8');
		if (!source.startsWith("'use client';")) {
			throw new Error(`Missing use client boundary in ${relative(packageRoot, filePath)}`);
		}
	}
}

console.log(`Checked ${distributableFiles.length} npm artifact files.`);
