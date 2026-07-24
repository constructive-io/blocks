import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

import {
	CONSOLE_KIT_CORE_ITEM_NAME,
	CONSOLE_KIT_ITEM_NAME,
	CONSOLE_MODULE_ITEM_NAME_PREFIX,
	CONSOLE_INSTALL_ROOT_DEPENDENCIES,
	CONSTRUCTIVE_THEME_DEPENDENCY,
	CONSTRUCTIVE_NAMESPACE,
	FEATURE_PACK_IDS,
	FEATURE_PACK_MANIFEST_TARGETS,
	assertCanonicalFeaturePackSidecar,
	assertExactInternalDependencyEdges,
	assertFeaturePackRegistryContract,
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
		portableTargetForUiFile('registry/constructive/blocks/stack/deferred-card-content.tsx'),
		'@ui/stack/deferred-card-content.tsx',
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
			name: 'app-shell-navigation',
			type: 'registry:block',
			files: [
				{
					path: 'registry/app-shell/navigation.tsx',
					target: '@ui/app-shell/navigation.tsx',
					type: 'registry:component',
				},
			],
		},
	]);

	assert.equal(ownership.get('components/ui/button'), 'button');
	assert.equal(ownership.get('components/ui/stack'), 'stack');
	assert.equal(ownership.get('components/ui/stack/index'), 'stack');
	assert.equal(ownership.get('components/ui/app-shell/navigation'), 'app-shell-navigation');
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
			name: 'app-shell-navigation',
			type: 'registry:block',
			files: [
				{
					path: 'registry/navigation.tsx',
					target: '@ui/app-shell/navigation.tsx',
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
		{
			name: 'console-feature-catalog',
			type: 'registry:lib',
			files: [
				{
					path: 'registry/feature-packs/index.ts',
					target: 'src/feature-packs/index.ts',
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
				"import { Navigation } from '@/components/ui/app-shell/navigation';",
				"import { helper } from '../shared/helper';",
				"import { catalog } from '@/feature-packs';",
				"import { local } from './local';",
			].join('\n'),
		],
		['registry/local.ts', 'export const local = true;'],
	]);

	assert.deepEqual(
		deriveOwnedRegistryDependencies(consumer, sourceByPath, ownership),
		['app-shell-navigation', 'button', 'console-feature-catalog', 'shared-helper', 'stack'],
	);
});

test('rejects unowned relative and canonical Blocks aliases', () => {
	const consumer: RegistryItem = {
		name: 'consumer',
		type: 'registry:block',
		files: [
			{ path: 'registry/consumer.tsx', target: 'src/blocks/example/consumer.tsx', type: 'registry:component' },
		],
	};
	const ownership = createRegistryModuleOwnership([consumer]);

	for (const specifier of [
		'../missing/helper',
		'@/blocks/missing/helper',
		'@/feature-packs/missing',
	]) {
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
	assert.throws(
		() => assertUniqueRegistryShape([
			{ name: 'one', type: 'registry:ui', files: [{ path: 'one.ts', type: 'registry:ui' }] },
		]),
		/missing an explicit install target/,
	);
});

function featurePackContractFixture(): RegistryItem[] {
	const items: RegistryItem[] = [
		{
			name: CONSOLE_KIT_CORE_ITEM_NAME,
			type: 'registry:block',
			registryDependencies: [],
			files: [
				{
					path: 'registry/feature-module.ts',
					target: 'src/blocks/console-kit/feature-module.ts',
					type: 'registry:lib',
				},
				{
					path: 'registry/console-kit-core.tsx',
					target: 'src/blocks/console-kit/console-kit-core.tsx',
					type: 'registry:component',
				},
				{
					path: 'registry/constructive-console-kit.tsx',
					target: 'src/blocks/console-kit/constructive/constructive-console-kit.tsx',
					type: 'registry:component',
				},
				{
					path: 'registry/constructive-meta-utils.ts',
					target: 'src/blocks/console-kit/constructive/constructive-meta-utils.ts',
					type: 'registry:lib',
				},
			],
		},
	];
	items.push(...[...FEATURE_PACK_MANIFEST_TARGETS].map(([itemName, target]) => ({
		name: itemName,
		type: 'registry:block',
		docs: itemName.startsWith('feature-pack-')
			? `import '@/blocks/feature-packs/${itemName.slice('feature-pack-'.length)}/${itemName.slice('feature-pack-'.length)}-feature-pack'; install console-module-${itemName.slice('feature-pack-'.length)} for Console Kit.`
			: undefined,
		registryDependencies: (CONSOLE_INSTALL_ROOT_DEPENDENCIES.get(itemName) ?? []).map(
			(dependency) => `${CONSTRUCTIVE_NAMESPACE}${dependency}`,
		),
		files: [
			{
				path: itemName.startsWith('feature-pack-')
					? `registry/${itemName}.tsx`
					: `registry/${itemName}-console-kit.tsx`,
				target: itemName.startsWith('feature-pack-')
					? `src/blocks/feature-packs/${itemName.slice('feature-pack-'.length)}/${itemName.slice('feature-pack-'.length)}-feature-pack.tsx`
					: `src/blocks/presets/${itemName.slice('preset-'.length)}-console-kit.tsx`,
					type: 'registry:component',
				},
				{
				path: `registry/${itemName}.json`,
				target,
				type: 'registry:file',
			},
		],
	})));
	items.push(...FEATURE_PACK_IDS.map((id) => {
		const itemName = `${CONSOLE_MODULE_ITEM_NAME_PREFIX}${id}`;
		return {
			name: itemName,
			type: 'registry:block',
			docs: `import '@/blocks/feature-packs/${id}/${id}-console-module';`,
			registryDependencies: (CONSOLE_INSTALL_ROOT_DEPENDENCIES.get(itemName) ?? []).map(
				(dependency) => `${CONSTRUCTIVE_NAMESPACE}${dependency}`,
			),
			files: [
				{
					path: `registry/${itemName}.tsx`,
					target: `src/blocks/feature-packs/${id}/${id}-console-module.tsx`,
					type: 'registry:component',
				},
				...(id === 'data'
					? []
					: [{
						path: `registry/${id}-adapter.ts`,
						target: `src/blocks/console-kit/constructive/${id}-adapter.ts`,
						type: 'registry:lib',
					}]),
				...(id === 'organizations'
					? [{
						path: 'registry/organizations-meta-contract.ts',
						target: 'src/blocks/feature-packs/organizations/organizations-meta-contract.ts',
						type: 'registry:lib',
					}]
					: id === 'storage'
						? [
							{
								path: 'registry/storage-meta-contract.ts',
								target: 'src/blocks/feature-packs/storage/storage-meta-contract.ts',
								type: 'registry:lib',
							},
							{
								path: 'registry/storage-console-slice.ts',
								target: 'src/blocks/feature-packs/storage/storage-console-slice.ts',
								type: 'registry:lib',
							},
						]
						: []),
			],
		};
	}));
	items.push({
		name: CONSOLE_KIT_ITEM_NAME,
		type: 'registry:block',
		registryDependencies: (CONSOLE_INSTALL_ROOT_DEPENDENCIES.get(CONSOLE_KIT_ITEM_NAME) ?? []).map(
			(dependency) => `${CONSTRUCTIVE_NAMESPACE}${dependency}`,
		),
		files: [
			{
				path: 'registry/constructive-index.ts',
				target: 'src/blocks/console-kit/constructive/index.ts',
				type: 'registry:lib',
			},
		],
	});
	return items;
}

test('accepts the exact standalone pack, console module, preset, and sidecar surface', () => {
	assert.doesNotThrow(() => assertFeaturePackRegistryContract(featurePackContractFixture()));
});

test('rejects nested drift in installed feature-pack and preset sidecars', () => {
	const canonicalPack = {
		schemaVersion: 1,
		id: 'data',
		endpoints: { required: ['data'], optional: [] },
		capabilities: { required: ['data.meta'], optional: ['data.search'] },
	};
	assert.doesNotThrow(() =>
		assertCanonicalFeaturePackSidecar('feature-pack-data', structuredClone(canonicalPack), canonicalPack),
	);

	const driftedPack = structuredClone(canonicalPack);
	driftedPack.capabilities.optional = ['data.realtime'];
	assert.throws(
		() => assertCanonicalFeaturePackSidecar('feature-pack-data', driftedPack, canonicalPack),
		/installed manifest drifted from the canonical feature-pack catalog/,
	);

	const canonicalPreset = {
		schemaVersion: 1,
		id: 'auth-hardened',
		featurePacks: ['data', 'auth', 'users'],
	};
	const driftedPreset = { ...canonicalPreset, featurePacks: ['data', 'auth'] };
	assert.throws(
		() => assertCanonicalFeaturePackSidecar('preset-auth-hardened', driftedPreset, canonicalPreset),
		/installed manifest drifted from the canonical feature-pack catalog/,
	);
});

test('rejects feature-pack surface drift and obsolete generated-SDK sidecars', () => {
	const missingPack = featurePackContractFixture().filter((item) => item.name !== 'feature-pack-storage');
	assert.throws(() => assertFeaturePackRegistryContract(missingPack), /Missing: feature-pack-storage/);

	const missingConsoleModule = featurePackContractFixture().filter(
		(item) => item.name !== 'console-module-storage',
	);
	assert.throws(
		() => assertFeaturePackRegistryContract(missingConsoleModule),
		/Missing: console-module-storage/,
	);

	const wrongTarget = featurePackContractFixture();
	wrongTarget
		.find((item) => item.name === 'preset-full')!
		.files!
		.find((file) => file.target === '~/.constructive/feature-packs/full.json')!.target =
			'~/.constructive/feature-packs/everything.json';
	assert.throws(() => assertFeaturePackRegistryContract(wrongTarget), /preset-full must install exactly/);

	const obsoleteSidecar = featurePackContractFixture();
	obsoleteSidecar.push({
		name: 'legacy-auth',
		type: 'registry:block',
		files: [
			{
				path: 'registry/legacy.requires.json',
				target: '~/.constructive/blocks/legacy.requires.json',
				type: 'registry:file',
			},
		],
	});
	assert.throws(() => assertFeaturePackRegistryContract(obsoleteSidecar), /obsolete generated-SDK/);

	const missingDocs = featurePackContractFixture();
	missingDocs.find((item) => item.name === 'feature-pack-auth')!.docs = '';
	assert.throws(
		() => assertFeaturePackRegistryContract(missingDocs),
		/feature-pack-auth must document its root import/,
	);
});

test('rejects feature-pack dependency profile drift and removed public items', () => {
	const missingDependency = featurePackContractFixture();
	missingDependency.find((item) => item.name === 'preset-auth-hardened')!.registryDependencies = [
		'@constructive/feature-pack-data',
	];
	assert.throws(
		() => assertFeaturePackRegistryContract(missingDependency),
		/Missing: console-kit-core, console-module-data, console-module-auth, console-module-users/,
	);

	const coupledLeaf = featurePackContractFixture();
	coupledLeaf.find((item) => item.name === 'feature-pack-auth')!.registryDependencies = [
		'@constructive/console-kit-core',
		'@constructive/feature-pack-data',
	];
	assert.throws(
		() => assertFeaturePackRegistryContract(coupledLeaf),
		/must remain provider-neutral; remove Console Kit dependencies console-kit-core/,
	);

	const misplacedIntegration = featurePackContractFixture();
	misplacedIntegration.find((item) => item.name === 'feature-pack-auth')!.files!.push({
		path: 'registry/auth-console-module.tsx',
		target: 'src/blocks/feature-packs/auth/auth-console-module.tsx',
		type: 'registry:component',
	});
	assert.throws(
		() => assertFeaturePackRegistryContract(misplacedIntegration),
		/must not install Console Kit integration file/,
	);

	const removedItem = featurePackContractFixture();
	removedItem.push({ name: 'schema-builder', type: 'registry:block' });
	assert.throws(() => assertFeaturePackRegistryContract(removedItem), /still public/);

	const removedPreset = featurePackContractFixture();
	removedPreset.push({ name: 'preset-blank', type: 'registry:block' });
	assert.throws(() => assertFeaturePackRegistryContract(removedPreset), /Unexpected: preset-blank/);
});

test('only UI and Blocks source manifests define the public registry contract', () => {
	const manifests = ['packages/ui/registry.json', 'apps/blocks/registry.json'].map(
		(relativePath) =>
			JSON.parse(fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8')) as Registry,
	);
	const items = manifests.flatMap((manifest) => manifest.items);
	assert.equal(new Set(items.map((item) => item.name)).size, items.length);
	for (const item of items) {
		assert.equal((item.dependencies ?? []).includes('@constructive-io/ui'), false, item.name);
	}
	assertFeaturePackRegistryContract(items);

	const itemByName = new Map(items.map((item) => [item.name, item]));
	assert.deepEqual(itemByName.get('billing-usage-overview')?.dependencies, ['lucide-react', 'motion']);
	assert.deepEqual(itemByName.get('billing-credits-card')?.dependencies, ['lucide-react', 'motion']);
	assert.deepEqual(itemByName.get('billing-settings-page')?.dependencies, ['lucide-react']);
	assert.deepEqual(itemByName.get('billing-activity-table')?.dependencies, []);
});
