#!/usr/bin/env node
// Rewrites `workspace:` ranges in a dist/package.json into real semver ranges.
//
// makage packages publish from `dist`, which is a verbatim copy of the source
// manifest. `pnpm publish` resolves the workspace protocol on the fly, but
// `npm publish` (what `lerna publish` shells out to) does not, so a manifest
// copied as-is ships `"blocks-schema": "workspace:^"` to consumers. Running
// this after `makage assets` makes the dist manifest publishable by any client.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

async function findWorkspaceRoot(from) {
	let current = path.resolve(from);
	while (true) {
		try {
			await readFile(path.join(current, 'pnpm-workspace.yaml'), 'utf8');
			return current;
		} catch {
			const parent = path.dirname(current);
			if (parent === current) throw new Error('no pnpm-workspace.yaml found above ' + from);
			current = parent;
		}
	}
}

async function workspaceVersions(root) {
	const versions = new Map();
	for (const group of ['packages', 'apps']) {
		let entries;
		try {
			entries = await readdir(path.join(root, group), { withFileTypes: true });
		} catch {
			continue;
		}
		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			try {
				const manifest = JSON.parse(
					await readFile(path.join(root, group, entry.name, 'package.json'), 'utf8'),
				);
				versions.set(manifest.name, manifest.version);
			} catch {
				// not a package directory
			}
		}
	}
	return versions;
}

// pnpm semantics: `workspace:*` pins the exact version, `workspace:^`/`workspace:~`
// take that prefix, and `workspace:<range>` keeps the explicit range.
function resolveRange(spec, version) {
	const range = spec.slice('workspace:'.length);
	if (range === '*') return version;
	if (range === '^' || range === '~') return `${range}${version}`;
	return range;
}

const target = path.resolve(process.argv[2] ?? path.join('dist', 'package.json'));
const root = await findWorkspaceRoot(path.dirname(target));
const versions = await workspaceVersions(root);
const manifest = JSON.parse(await readFile(target, 'utf8'));

const rewritten = [];
for (const field of DEP_FIELDS) {
	const deps = manifest[field];
	if (!deps || typeof deps !== 'object') continue;
	for (const [name, spec] of Object.entries(deps)) {
		if (typeof spec !== 'string' || !spec.startsWith('workspace:')) continue;
		const version = versions.get(name);
		if (!version) {
			throw new Error(`${manifest.name}: ${field}."${name}" is "${spec}" but ${name} is not a workspace package`);
		}
		deps[name] = resolveRange(spec, version);
		rewritten.push(`${field} -> "${name}": "${spec}" -> "${deps[name]}"`);
	}
}

if (rewritten.length === 0) {
	console.log(`[resolve-dist-workspace-deps] ${path.relative(root, target)}: nothing to rewrite`);
} else {
	await writeFile(target, `${JSON.stringify(manifest, null, 2)}\n`);
	console.log(`[resolve-dist-workspace-deps] ${path.relative(root, target)}`);
	for (const line of rewritten) console.log(`  ${line}`);
}
