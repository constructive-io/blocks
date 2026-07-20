import { readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const distributionRoot = fileURLToPath(new URL('../dist/', import.meta.url));

async function visit(directory: string): Promise<void> {
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const filePath = join(directory, entry.name);
		if (entry.isDirectory()) {
			await visit(filePath);
			continue;
		}
		if (!['.js', '.cjs'].includes(extname(entry.name))) continue;

		const source = await readFile(filePath, 'utf8');
		if (source.startsWith("'use client';") || source.startsWith('"use client";')) continue;
		await writeFile(filePath, `'use client';\n${source}`);
	}
}

await visit(distributionRoot);
