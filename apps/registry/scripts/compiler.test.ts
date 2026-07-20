import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

import {
	CONSTRUCTIVE_THEME_DEPENDENCY,
	assertExactInternalDependencyEdges,
	assertUniqueRegistryShape,
	compileRegistryDependencies,
	createRegistryModuleOwnership,
	deriveAliasDependencies,
	deriveOwnedRegistryDependencies,
	portableTargetForUiFile,
	rewriteConstructiveUiImports,
	type Registry,
	type RegistryItem,
} from './compiler';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

test('rewrites exact package subpath module specifiers and derives the complete dependency set', () => {
	const input = [
		"import { Button } from '@constructive-io/ui/button';",
		"export type { ButtonProps } from '@constructive-io/ui/button';",
		"type CardModule = import('@constructive-io/ui/card');",
		"const dialog = import('@constructive-io/ui/dialog');",
	].join('\n');
	const result = rewriteConstructiveUiImports(
		input,
		'fixture.tsx',
		new Set(['button', 'card', 'dialog']),
	);

	assert.equal(result.source.includes('@constructive-io/ui'), false);
	assert.match(result.source, /from '@\/components\/ui\/button'/);
	assert.match(result.source, /import\('@\/components\/ui\/card'\)/);
	assert.deepEqual(result.registryDependencies, ['button', 'card', 'dialog']);
});

test('rejects package-root, nested, and unknown package imports', () => {
	assert.throws(
		() => rewriteConstructiveUiImports("import UI from '@constructive-io/ui'", 'root.ts', new Set()),
		/package root/,
	);
	assert.throws(
		() => rewriteConstructiveUiImports("import x from '@constructive-io/ui/button/private'", 'nested.ts', new Set(['button'])),
		/unknown.*subpath/,
	);
	assert.throws(
		() => rewriteConstructiveUiImports("import x from '@constructive-io/ui/missing'", 'unknown.ts', new Set(['button'])),
		/unknown.*subpath/,
	);
});

test('derives registry items from supported consumer aliases and rejects unresolved aliases', () => {
	const dependencies = deriveAliasDependencies(
		[
			"import { cn } from '@/lib/utils';",
			"import { Button } from '@/components/ui/button';",
			"import { CardStack } from '@/components/ui/stack';",
		].join('\n'),
		'aliases.tsx',
		new Set(['button', 'stack']),
	);
	assert.deepEqual(dependencies, ['button', 'cn', 'stack']);
	assert.throws(
		() => deriveAliasDependencies("import value from '@/components/ui/unknown'", 'unknown.ts', new Set()),
		/unresolved UI alias/,
	);
	assert.throws(
		() => deriveAliasDependencies("import value from '@/hooks/unknown'", 'unknown.ts', new Set()),
		/unresolved registry alias/,
	);
});

test('derives portable v4 targets including coherent multi-file component folders', () => {
	assert.equal(portableTargetForUiFile('registry/constructive/ui/button.tsx'), '@ui/button.tsx');
	assert.equal(portableTargetForUiFile('registry/constructive/lib/utils.ts'), '@lib/utils.ts');
	assert.equal(portableTargetForUiFile('registry/constructive/hooks/use-mobile.ts'), '@hooks/use-mobile.ts');
	assert.equal(
		portableTargetForUiFile('registry/constructive/blocks/stack/stack-card.tsx'),
		'@ui/stack/stack-card.tsx',
	);
	assert.equal(
		portableTargetForUiFile('registry/constructive/blocks/storage/storage-browser.tsx'),
		'@ui/storage/storage-browser.tsx',
	);
});

test('maps consumer module targets to their exact registry item owners', () => {
	const ownership = createRegistryModuleOwnership([
		{
			name: 'button',
			type: 'registry:ui',
			files: [{ path: 'registry/button.tsx', target: '@ui/button.tsx', type: 'registry:ui' }],
		},
		{
			name: 'stack',
			type: 'registry:ui',
			files: [
				{ path: 'registry/stack/index.ts', target: '@ui/stack/index.ts', type: 'registry:ui' },
				{ path: 'registry/stack/card.tsx', target: '@ui/stack/card.tsx', type: 'registry:ui' },
			],
		},
		{
			name: 'storage-bucket-rail',
			type: 'registry:block',
			files: [
				{
					path: 'registry/storage/bucket-rail.tsx',
					target: '@ui/storage/bucket-rail.tsx',
					type: 'registry:component',
				},
			],
		},
	]);

	assert.equal(ownership.get('components/ui/button'), 'button');
	assert.equal(ownership.get('components/ui/stack'), 'stack');
	assert.equal(ownership.get('components/ui/stack/index'), 'stack');
	assert.equal(ownership.get('components/ui/storage/bucket-rail'), 'storage-bucket-rail');
});

test('derives exact cross-item edges from aliases and relative imports', () => {
	const consumer: RegistryItem = {
		name: 'consumer',
		type: 'registry:block',
		files: [
			{ path: 'registry/consumer.tsx', target: 'src/blocks/example/consumer.tsx', type: 'registry:component' },
			{ path: 'registry/local.ts', target: 'src/blocks/example/local.ts', type: 'registry:file' },
		],
	};
	const ownership = createRegistryModuleOwnership([
		consumer,
		{
			name: 'button',
			type: 'registry:ui',
			files: [{ path: 'registry/button.tsx', target: '@ui/button.tsx', type: 'registry:ui' }],
		},
		{
			name: 'stack',
			type: 'registry:ui',
			files: [{ path: 'registry/stack.ts', target: '@ui/stack/index.ts', type: 'registry:ui' }],
		},
		{
			name: 'storage-bucket-rail',
			type: 'registry:block',
			files: [
				{
					path: 'registry/bucket-rail.tsx',
					target: '@ui/storage/bucket-rail.tsx',
					type: 'registry:component',
				},
			],
		},
		{
			name: 'shared-helper',
			type: 'registry:lib',
			files: [
				{
					path: 'registry/shared-helper.ts',
					target: 'src/blocks/shared/helper.ts',
					type: 'registry:lib',
				},
			],
		},
	]);
	const sourceByPath = new Map([
		[
			'registry/consumer.tsx',
			[
				"import { Button } from '@/components/ui/button';",
				"import type { CardStack } from '@/components/ui/stack';",
				"import { BucketRail } from '@/components/ui/storage/bucket-rail';",
				"import { helper } from '../shared/helper';",
				"import { local } from './local';",
			].join('\n'),
		],
		['registry/local.ts', 'export const local = true;'],
	]);

	assert.deepEqual(
		deriveOwnedRegistryDependencies(consumer, sourceByPath, ownership),
		['button', 'shared-helper', 'stack', 'storage-bucket-rail'],
	);
});

test('rejects unowned relative and blocks-alias modules', () => {
	const consumer: RegistryItem = {
		name: 'consumer',
		type: 'registry:block',
		files: [
			{ path: 'registry/consumer.tsx', target: 'src/blocks/example/consumer.tsx', type: 'registry:component' },
		],
	};
	const ownership = createRegistryModuleOwnership([consumer]);

	for (const specifier of ['../missing/helper', '@/blocks/missing/helper']) {
		assert.throws(
			() =>
				deriveOwnedRegistryDependencies(
					consumer,
					new Map([['registry/consumer.tsx', `import '${specifier}';`]]),
					ownership,
				),
			/unowned registry module/,
		);
	}
});

test('rejects missing and stale internal edges while allowing reviewed dependency-only edges', () => {
	const ownItemNames = new Set([
		'consumer',
		'button',
		'card',
		'constructive-theme',
	]);
	const withFiles = {
		name: 'consumer',
		type: 'registry:block',
		files: [{ path: 'registry/consumer.tsx', target: '@ui/consumer.tsx', type: 'registry:component' }],
	};

	assert.throws(
		() =>
			assertExactInternalDependencyEdges(
				{ ...withFiles, registryDependencies: ['@constructive/card'] },
				new Set(['button', 'card']),
				ownItemNames,
				new Set(),
			),
		/Missing: button/,
	);
	assert.throws(
		() =>
			assertExactInternalDependencyEdges(
				{ ...withFiles, registryDependencies: ['@constructive/button', '@constructive/card'] },
				new Set(['button']),
				ownItemNames,
				new Set(),
			),
		/Stale: card/,
	);
	assert.doesNotThrow(() =>
		assertExactInternalDependencyEdges(
			{ ...withFiles, registryDependencies: ['@constructive/button', '@constructive/card'] },
			new Set(['button']),
			ownItemNames,
			new Set(['card']),
		),
	);
	assert.doesNotThrow(() =>
		assertExactInternalDependencyEdges(
			{ name: 'consumer', type: 'registry:block', registryDependencies: ['@constructive/card'] },
			new Set(),
			ownItemNames,
			new Set(),
		),
	);
});

test('namespaces local dependencies, removes duplicates and injects the theme', () => {
	const item: RegistryItem = {
		name: 'button',
		type: 'registry:ui',
		registryDependencies: ['cn', '@constructive/cn'],
	};
	assert.deepEqual(
		compileRegistryDependencies(item, ['slot', 'button'], new Set(['button', 'cn', 'slot', 'constructive-theme'])),
		['@constructive/cn', '@constructive/slot', CONSTRUCTIVE_THEME_DEPENDENCY],
	);
	assert.deepEqual(
		compileRegistryDependencies({ name: 'cn', type: 'registry:lib' }, [], new Set(['cn'])),
		[],
	);
});

test('rejects duplicate item names and install targets', () => {
	assert.throws(
		() => assertUniqueRegistryShape([
			{ name: 'one', type: 'registry:ui' },
			{ name: 'one', type: 'registry:block' },
		]),
		/Duplicate registry item/,
	);
	assert.throws(
		() => assertUniqueRegistryShape([
			{ name: 'one', type: 'registry:ui', files: [{ path: 'one.ts', target: '@ui/shared.ts', type: 'registry:ui' }] },
			{ name: 'two', type: 'registry:ui', files: [{ path: 'two.ts', target: '@ui/shared.ts', type: 'registry:ui' }] },
		]),
		/Duplicate registry target/,
	);
});

test('source manifests preserve 167 items, 54 root sidecars, and no UI package dependency', () => {
	const manifests = [
		'packages/ui/registry.json',
		'packages/schema-builder/registry.json',
		'apps/blocks/registry.json',
	].map((relativePath) => JSON.parse(fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8')) as Registry);
	const items = manifests.flatMap((manifest) => manifest.items);
	assert.equal(items.length, 167);
	assert.equal(new Set(items.map((item) => item.name)).size, 167);
	for (const item of items) {
		assert.equal((item.dependencies ?? []).includes('@constructive-io/ui'), false, item.name);
	}

	const sidecarTargets = items
		.flatMap((item) => item.files ?? [])
		.map((file) => file.target)
		.filter((target): target is string => target?.endsWith('.requires.json') ?? false);
	assert.equal(sidecarTargets.length, 54);
	assert.equal(new Set(sidecarTargets).size, 54);
	for (const target of sidecarTargets) {
		assert.match(target, /^~\/\.constructive\/blocks\/[a-z0-9-]+\.requires\.json$/);
	}

	const itemByName = new Map(items.map((item) => [item.name, item]));
	assert.deepEqual(itemByName.get('billing-usage-overview')?.dependencies, ['lucide-react', 'motion']);
	assert.deepEqual(itemByName.get('billing-credits-card')?.dependencies, ['lucide-react', 'motion']);
	assert.deepEqual(itemByName.get('billing-settings-page')?.dependencies, ['lucide-react']);
	assert.deepEqual(itemByName.get('billing-activity-table')?.dependencies, []);
});
