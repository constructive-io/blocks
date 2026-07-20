import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const distDir = path.resolve(process.cwd(), 'dist');

function hasUseClientBanner(content: string): boolean {
	const trimmed = content.trimStart();
	return trimmed.startsWith('"use client"') || trimmed.startsWith("'use client'");
}

async function addBannerToFile(filePath: string): Promise<void> {
	const content = await readFile(filePath, 'utf8');
	if (!content || hasUseClientBanner(content)) return;
	await writeFile(filePath, `"use client";\n${content}`, 'utf8');
}

async function walk(directory: string): Promise<void> {
	const entries = await readdir(directory, { withFileTypes: true });
	await Promise.all(
		entries.map(async (entry) => {
			const fullPath = path.join(directory, entry.name);
			if (entry.isDirectory()) {
				await walk(fullPath);
				return;
			}
			if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.cjs'))) {
				await addBannerToFile(fullPath);
			}
		}),
	);
}

await walk(distDir);
