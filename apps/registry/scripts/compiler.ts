import { isDeepStrictEqual } from 'node:util';
import ts from 'typescript';

export const CONSTRUCTIVE_UI_PACKAGE = '@constructive-io/ui';
export const CONSTRUCTIVE_NAMESPACE = '@constructive/';
export const CONSTRUCTIVE_THEME_DEPENDENCY = '@constructive/constructive-theme';

export const FEATURE_PACK_IDS = [
	'data',
	'auth',
	'users',
	'organizations',
	'storage',
	'billing',
	'notifications',
] as const;

export const PRESET_PROFILE_IDS = [
	'auth-hardened',
	'b2b-storage',
	'full',
] as const;

export const CONSOLE_KIT_CORE_ITEM_NAME = 'console-kit-core';
export const CONSOLE_KIT_ITEM_NAME = 'console-kit-nextjs';
export const CONSOLE_MODULE_ITEM_NAME_PREFIX = 'console-module-';
export const FEATURE_PACK_MANIFEST_TARGET_PREFIX = '~/.constructive/feature-packs/';

export const FEATURE_PACK_MANIFEST_TARGETS = new Map<string, string>([
	...FEATURE_PACK_IDS.map(
		(id) => [`feature-pack-${id}`, `${FEATURE_PACK_MANIFEST_TARGET_PREFIX}${id}.json`] as const,
	),
	...PRESET_PROFILE_IDS.map(
		(id) => [`preset-${id}`, `${FEATURE_PACK_MANIFEST_TARGET_PREFIX}${id}.json`] as const,
	),
]);

export const CONSOLE_INSTALL_ROOT_DEPENDENCIES = new Map<string, readonly string[]>([
	[CONSOLE_KIT_CORE_ITEM_NAME, []],
	...FEATURE_PACK_IDS.map(
		(id) => [`feature-pack-${id}`, []] as const,
	),
	...FEATURE_PACK_IDS.map(
		(id) => [
			`${CONSOLE_MODULE_ITEM_NAME_PREFIX}${id}`,
			[CONSOLE_KIT_CORE_ITEM_NAME, `feature-pack-${id}`],
		] as const,
	),
	[
		'preset-auth-hardened',
		[
			CONSOLE_KIT_CORE_ITEM_NAME,
			'console-module-data',
			'console-module-auth',
			'console-module-users',
		],
	],
	[
		'preset-b2b-storage',
		[
			CONSOLE_KIT_CORE_ITEM_NAME,
			'console-module-data',
			'console-module-auth',
			'console-module-users',
			'console-module-organizations',
			'console-module-storage',
		],
	],
	[
		'preset-full',
		[
			CONSOLE_KIT_CORE_ITEM_NAME,
			'console-module-data',
			'console-module-auth',
			'console-module-users',
			'console-module-organizations',
			'console-module-storage',
			'console-module-billing',
			'console-module-notifications',
		],
	],
	[CONSOLE_KIT_ITEM_NAME, ['preset-full']],
]);

export const REMOVED_REGISTRY_ITEM_NAMES = new Set([
	'blocks-runtime',
	'org-chart',
	'storage',
	'storage-bucket-config-sheet',
	'storage-bucket-rail',
	'storage-browser',
	'storage-empty-state',
	'storage-object-detail-sheet',
	'storage-object-table',
	'storage-upload-dropzone',
	'schema-builder',
	'schema-builder-core',
	'schema-builder-fields',
	'schema-builder-indexes',
	'schema-builder-policies',
	'schema-builder-relationships',
	'schema-builder-tables',
	'preset-blank',
]);

export type RegistryFile = {
	path: string;
	target?: string;
	type: string;
};

export type RegistryItem = {
	name: string;
	type: string;
	title?: string;
	description?: string;
	docs?: string;
	dependencies?: string[];
	devDependencies?: string[];
	registryDependencies?: string[];
	files?: RegistryFile[];
	[key: string]: unknown;
};

export type Registry = {
	$schema: string;
	name: string;
	homepage?: string;
	items: RegistryItem[];
};

/**
 * Keeps the JSON sidecar installed for a feature pack or preset identical to
 * the typed catalog used by Console Kit and the Blocks documentation.
 */
export function assertCanonicalFeaturePackSidecar(
	itemName: string,
	actual: unknown,
	expected: unknown,
): void {
	if (expected === undefined) {
		throw new Error(`${itemName} does not have a canonical feature-pack manifest.`);
	}
	if (!isDeepStrictEqual(actual, expected)) {
		throw new Error(`${itemName} installed manifest drifted from the canonical feature-pack catalog.`);
	}
}

/**
 * Checks the intentionally small public product surface that sits above the
 * primitive and billing catalogs. Counts for the whole registry are avoided:
 * adding a primitive should not require updating an unrelated snapshot.
 */
export function assertFeaturePackRegistryContract(items: readonly RegistryItem[]): void {
	const itemByName = new Map(items.map((item) => [item.name, item]));
	const expectedFeaturePackNames = new Set(FEATURE_PACK_IDS.map((id) => `feature-pack-${id}`));
	const expectedConsoleModuleNames = new Set(
		FEATURE_PACK_IDS.map((id) => `${CONSOLE_MODULE_ITEM_NAME_PREFIX}${id}`),
	);
	const expectedPresetNames = new Set(PRESET_PROFILE_IDS.map((id) => `preset-${id}`));
	const compositionItemNames = new Set([
		CONSOLE_KIT_CORE_ITEM_NAME,
		...expectedFeaturePackNames,
		...expectedConsoleModuleNames,
		...expectedPresetNames,
	]);
	const actualFeaturePackNames = new Set(
		items.filter((item) => item.name.startsWith('feature-pack-')).map((item) => item.name),
	);
	const actualPresetNames = new Set(
		items.filter((item) => item.name.startsWith('preset-')).map((item) => item.name),
	);
	const actualConsoleModuleNames = new Set(
		items
			.filter((item) => item.name.startsWith(CONSOLE_MODULE_ITEM_NAME_PREFIX))
			.map((item) => item.name),
	);

	const assertExactNames = (
		label: string,
		actual: ReadonlySet<string>,
		expected: ReadonlySet<string>,
	): void => {
		const missing = [...expected].filter((name) => !actual.has(name));
		const unexpected = [...actual].filter((name) => !expected.has(name));
		if (missing.length > 0 || unexpected.length > 0) {
			throw new Error(
				`${label} registry roots drifted. Missing: ${missing.join(', ') || 'none'}. Unexpected: ${unexpected.join(', ') || 'none'}.`,
			);
		}
	};

	assertExactNames('Feature-pack', actualFeaturePackNames, expectedFeaturePackNames);
	assertExactNames('Console-module', actualConsoleModuleNames, expectedConsoleModuleNames);
	assertExactNames('Preset', actualPresetNames, expectedPresetNames);
	if (!itemByName.has(CONSOLE_KIT_CORE_ITEM_NAME)) {
		throw new Error(`Missing registry root ${CONSOLE_KIT_CORE_ITEM_NAME}.`);
	}
	if (!itemByName.has(CONSOLE_KIT_ITEM_NAME)) {
		throw new Error(`Missing registry root ${CONSOLE_KIT_ITEM_NAME}.`);
	}

	const hasTarget = (item: RegistryItem | undefined, target: string): boolean =>
		item?.files?.some((file) => file.target === target) ?? false;
	const core = itemByName.get(CONSOLE_KIT_CORE_ITEM_NAME);
	for (const target of [
		'src/blocks/console-kit/feature-module.ts',
		'src/blocks/console-kit/console-kit-core.tsx',
		'src/blocks/console-kit/constructive/constructive-console-kit.tsx',
		'src/blocks/console-kit/constructive/constructive-meta-utils.ts',
	]) {
		if (!hasTarget(core, target)) {
			throw new Error(`${CONSOLE_KIT_CORE_ITEM_NAME} must install ${target}.`);
		}
	}
	for (const file of core?.files ?? []) {
		const ownsLeafFile = FEATURE_PACK_IDS.some((id) =>
			file.target?.startsWith(`src/blocks/feature-packs/${id}/`) ||
			file.target === `src/blocks/console-kit/constructive/${id}-adapter.ts`
		);
		if (ownsLeafFile) {
			throw new Error(`${CONSOLE_KIT_CORE_ITEM_NAME} must not own leaf feature-pack file ${file.target}.`);
		}
	}
	const providerNeutralForbiddenDependencies = new Set([
		CONSOLE_KIT_CORE_ITEM_NAME,
		'console-runtime',
		'console-feature-catalog',
		...expectedConsoleModuleNames,
	]);

	for (const id of FEATURE_PACK_IDS) {
		const itemName = `feature-pack-${id}`;
		const item = itemByName.get(itemName);
		if (!item) continue;
		const directDependencyNames = (item.registryDependencies ?? []).map((dependency) =>
			dependency.startsWith(CONSTRUCTIVE_NAMESPACE)
				? dependency.slice(CONSTRUCTIVE_NAMESPACE.length)
				: dependency,
		);
		const coupledDependencies = directDependencyNames.filter((dependency) =>
			providerNeutralForbiddenDependencies.has(dependency),
		);
		if (coupledDependencies.length > 0) {
			throw new Error(
				`${itemName} must remain provider-neutral; remove Console Kit dependencies ${coupledDependencies.join(', ')}.`,
			);
		}
		const docs = item.docs?.trim() ?? '';
		const rootImport = `@/blocks/feature-packs/${id}/${id}-feature-pack`;
		if (!docs || !docs.includes(rootImport)) {
			throw new Error(`${itemName} must document its root import ${rootImport}.`);
		}
		const consoleModuleItemName = `${CONSOLE_MODULE_ITEM_NAME_PREFIX}${id}`;
		if (!docs.includes(consoleModuleItemName)) {
			throw new Error(`${itemName} must document optional Console Kit integration through ${consoleModuleItemName}.`);
		}

		const moduleTarget = `src/blocks/feature-packs/${id}/${id}-console-module.tsx`;
		const leafMetaTarget = id === 'organizations'
			? 'src/blocks/feature-packs/organizations/organizations-meta-contract.ts'
			: id === 'storage'
				? 'src/blocks/feature-packs/storage/storage-meta-contract.ts'
				: undefined;
		const adapterTarget = id === 'data'
			? undefined
			: `src/blocks/console-kit/constructive/${id}-adapter.ts`;
		const sliceTarget = id === 'storage'
			? 'src/blocks/feature-packs/storage/storage-console-slice.ts'
			: undefined;
		const integrationTargets = [moduleTarget, adapterTarget, leafMetaTarget, sliceTarget]
			.filter((target): target is string => Boolean(target));

		for (const target of integrationTargets) {
			if (hasTarget(item, target)) {
				throw new Error(`${itemName} must not install Console Kit integration file ${target}.`);
			}
		}

		const consoleModule = itemByName.get(consoleModuleItemName);
		const moduleDocs = consoleModule?.docs?.trim() ?? '';
		const moduleImport = `@/blocks/feature-packs/${id}/${id}-console-module`;
		if (!moduleDocs || !moduleDocs.includes(moduleImport)) {
			throw new Error(`${consoleModuleItemName} must document its module import ${moduleImport}.`);
		}
		for (const target of integrationTargets) {
			if (!hasTarget(consoleModule, target)) {
				throw new Error(`${consoleModuleItemName} must install its Console Kit integration file ${target}.`);
			}
		}
	}

	for (const id of PRESET_PROFILE_IDS) {
		const itemName = `preset-${id}`;
		const moduleTarget = `src/blocks/presets/${id}-console-kit.tsx`;
		if (!hasTarget(itemByName.get(itemName), moduleTarget)) {
			throw new Error(`${itemName} must install its Console Kit composition ${moduleTarget}.`);
		}
	}

	if (!hasTarget(
		itemByName.get(CONSOLE_KIT_ITEM_NAME),
		'src/blocks/console-kit/constructive/index.ts',
	)) {
		throw new Error(`${CONSOLE_KIT_ITEM_NAME} must install the full Constructive Console Kit export.`);
	}

	const actualManifestTargets = new Set<string>();
	for (const item of items) {
		for (const file of item.files ?? []) {
			if (file.target?.startsWith(FEATURE_PACK_MANIFEST_TARGET_PREFIX)) {
				actualManifestTargets.add(file.target);
			}
			if (file.target?.endsWith('.requires.json')) {
				throw new Error(`${item.name} retains obsolete generated-SDK requirements sidecar ${file.target}.`);
			}
		}
	}

	for (const [itemName, expectedTarget] of FEATURE_PACK_MANIFEST_TARGETS) {
		const item = itemByName.get(itemName);
		if (!item) continue;
		const manifestFiles = (item.files ?? []).filter(
			(file) => file.target?.startsWith(FEATURE_PACK_MANIFEST_TARGET_PREFIX) ?? false,
		);
		const itemManifestTargets = manifestFiles
			.map((file) => file.target)
			.filter((target): target is string => target !== undefined);
		if (itemManifestTargets.length !== 1 || itemManifestTargets[0] !== expectedTarget) {
			throw new Error(
				`${itemName} must install exactly ${expectedTarget}; received ${itemManifestTargets.join(', ') || 'none'}.`,
			);
		}
		const [manifestFile] = manifestFiles;
		if (!manifestFile?.path.endsWith('.json') || manifestFile.type !== 'registry:file') {
			throw new Error(`${itemName} must ship its feature-pack manifest as a registry:file JSON document.`);
		}
	}

	const expectedManifestTargets = new Set(FEATURE_PACK_MANIFEST_TARGETS.values());
	assertExactNames('Feature-pack manifest target', actualManifestTargets, expectedManifestTargets);

	for (const [itemName, expectedDependencies] of CONSOLE_INSTALL_ROOT_DEPENDENCIES) {
		const item = itemByName.get(itemName);
		if (!item) continue;
		const actualDependencies = new Set(
			(item.registryDependencies ?? [])
				.map((dependency) =>
					dependency.startsWith(CONSTRUCTIVE_NAMESPACE)
						? dependency.slice(CONSTRUCTIVE_NAMESPACE.length)
						: dependency,
				)
				.filter((dependency) => compositionItemNames.has(dependency)),
		);
		assertExactNames(
			`${itemName} Console Kit composition dependency`,
			actualDependencies,
			new Set(expectedDependencies),
		);
	}

	for (const removedName of REMOVED_REGISTRY_ITEM_NAMES) {
		if (itemByName.has(removedName)) {
			throw new Error(`Removed registry item ${removedName} is still public.`);
		}
	}
}

type ModuleSpecifier = {
	literal: ts.StringLiteralLike;
	value: string;
};

function scriptKind(filePath: string): ts.ScriptKind {
	if (filePath.endsWith('.tsx')) return ts.ScriptKind.TSX;
	if (filePath.endsWith('.jsx')) return ts.ScriptKind.JSX;
	if (filePath.endsWith('.js')) return ts.ScriptKind.JS;
	return ts.ScriptKind.TS;
}

function moduleSpecifierFromNode(node: ts.Node): ts.StringLiteralLike | undefined {
	if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
		return ts.isStringLiteralLike(node.moduleSpecifier) ? node.moduleSpecifier : undefined;
	}

	if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
		const expression = node.moduleReference.expression;
		return expression && ts.isStringLiteralLike(expression) ? expression : undefined;
	}

	if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
		return ts.isStringLiteralLike(node.argument.literal) ? node.argument.literal : undefined;
	}

	if (ts.isCallExpression(node) && node.arguments.length === 1) {
		const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
		const isRequire = ts.isIdentifier(node.expression) && node.expression.text === 'require';
		const argument = node.arguments[0];
		if ((isDynamicImport || isRequire) && argument && ts.isStringLiteralLike(argument)) return argument;
	}

	return undefined;
}

export function collectModuleSpecifiers(source: string, filePath: string): ModuleSpecifier[] {
	const sourceFile = ts.createSourceFile(
		filePath,
		source,
		ts.ScriptTarget.Latest,
		true,
		scriptKind(filePath),
	);
	const specifiers: ModuleSpecifier[] = [];

	function visit(node: ts.Node): void {
		const literal = moduleSpecifierFromNode(node);
		if (literal) specifiers.push({ literal, value: literal.text });
		ts.forEachChild(node, visit);
	}

	visit(sourceFile);
	return specifiers;
}

export type RewriteResult = {
	source: string;
	registryDependencies: string[];
};

/**
 * Rewrites only TypeScript module specifiers. The source is otherwise left
 * byte-for-byte intact, which keeps registry staging deterministic and avoids
 * a formatter becoming part of the public source contract.
 */
export function rewriteConstructiveUiImports(
	source: string,
	filePath: string,
	availableSubpaths: ReadonlySet<string>,
): RewriteResult {
	const edits: Array<{ start: number; end: number; replacement: string }> = [];
	const dependencies = new Set<string>();

	for (const { literal, value } of collectModuleSpecifiers(source, filePath)) {
		if (value === CONSTRUCTIVE_UI_PACKAGE) {
			throw new Error(
				`${filePath} imports the ${CONSTRUCTIVE_UI_PACKAGE} package root; registry sources must use an exact exported subpath.`,
			);
		}
		if (!value.startsWith(`${CONSTRUCTIVE_UI_PACKAGE}/`)) continue;

		const subpath = value.slice(CONSTRUCTIVE_UI_PACKAGE.length + 1);
		if (!subpath || subpath.includes('/') || !availableSubpaths.has(subpath)) {
			throw new Error(`${filePath} imports unknown ${CONSTRUCTIVE_UI_PACKAGE} subpath '${subpath}'.`);
		}

		edits.push({
			start: literal.getStart() + 1,
			end: literal.getEnd() - 1,
			replacement: `@/components/ui/${subpath}`,
		});
		dependencies.add(subpath);
	}

	let rewritten = source;
	for (const edit of edits.sort((left, right) => right.start - left.start)) {
		rewritten = `${rewritten.slice(0, edit.start)}${edit.replacement}${rewritten.slice(edit.end)}`;
	}

	for (const { value } of collectModuleSpecifiers(rewritten, filePath)) {
		if (value === CONSTRUCTIVE_UI_PACKAGE || value.startsWith(`${CONSTRUCTIVE_UI_PACKAGE}/`)) {
			throw new Error(`${filePath} retains a ${CONSTRUCTIVE_UI_PACKAGE} module specifier after compilation.`);
		}
	}

	return { source: rewritten, registryDependencies: [...dependencies].sort() };
}

const ALIAS_DEPENDENCIES = new Map<string, string>([
	['@/lib/utils', 'cn'],
	['@/lib/slot', 'slot'],
	['@/lib/motion/motion-config', 'motion-config'],
	['@/hooks/use-controllable-state', 'use-controllable-state'],
	['@/hooks/use-debounce', 'use-debounce'],
	['@/hooks/use-mobile', 'use-mobile'],
]);

export function deriveAliasDependencies(
	source: string,
	filePath: string,
	uiItemNames: ReadonlySet<string>,
): string[] {
	const dependencies = new Set<string>();

	for (const { value } of collectModuleSpecifiers(source, filePath)) {
		const knownAlias = ALIAS_DEPENDENCIES.get(value);
		if (knownAlias) {
			dependencies.add(knownAlias);
			continue;
		}

		const uiPrefix = '@/components/ui/';
		if (value.startsWith(uiPrefix)) {
			const itemName = value.slice(uiPrefix.length).split('/')[0];
			if (!itemName || !uiItemNames.has(itemName)) {
				throw new Error(`${filePath} contains unresolved UI alias '${value}'.`);
			}
			dependencies.add(itemName);
			continue;
		}

		if (value.startsWith('@/hooks/') || value.startsWith('@/lib/')) {
			throw new Error(`${filePath} contains unresolved registry alias '${value}'.`);
		}
	}

	return [...dependencies].sort();
}

export function portableTargetForUiFile(filePath: string): string {
	const prefix = 'registry/constructive/';
	if (!filePath.startsWith(prefix)) throw new Error(`Unexpected UI registry file path: ${filePath}`);
	const relativePath = filePath.slice(prefix.length);

	if (relativePath.startsWith('ui/')) return `@ui/${relativePath.slice('ui/'.length)}`;
	if (relativePath.startsWith('lib/')) return `@lib/${relativePath.slice('lib/'.length)}`;
	if (relativePath.startsWith('hooks/')) return `@hooks/${relativePath.slice('hooks/'.length)}`;
	if (relativePath.startsWith('blocks/')) return `@ui/${relativePath.slice('blocks/'.length)}`;

	throw new Error(`Cannot derive a portable target for UI registry file: ${filePath}`);
}

function stripModuleExtension(modulePath: string): string {
	return modulePath.replace(/\.[cm]?[jt]sx?$/, '');
}

function normalizeTargetModule(target: string): string | undefined {
	if (target.startsWith('~/')) return undefined;
	let normalized = target.replaceAll('\\', '/');
	if (normalized.startsWith('@ui/')) normalized = `components/ui/${normalized.slice('@ui/'.length)}`;
	else if (normalized.startsWith('@lib/')) normalized = `lib/${normalized.slice('@lib/'.length)}`;
	else if (normalized.startsWith('@hooks/')) normalized = `hooks/${normalized.slice('@hooks/'.length)}`;
	else if (normalized.startsWith('@components/')) normalized = `components/${normalized.slice('@components/'.length)}`;
	else if (normalized.startsWith('src/')) normalized = normalized.slice('src/'.length);
	else if (normalized.startsWith('@/')) normalized = normalized.slice('@/'.length);
	else if (normalized.startsWith('@')) return undefined;

	normalized = stripModuleExtension(normalized).replace(/^\.\//, '');
	return normalized;
}

function moduleKeysForTarget(target: string): string[] {
	const normalized = normalizeTargetModule(target);
	if (!normalized) return [];
	return normalized.endsWith('/index')
		? [normalized, normalized.slice(0, -'/index'.length)]
		: [normalized];
}

export type RegistryModuleOwnership = ReadonlyMap<string, string>;

/**
 * Maps the consumer-visible module paths installed by the registry to the item
 * that owns each module. Targets are normalized across explicit src/* paths and
 * shadcn v4's @ui/@lib/@hooks aliases, so nested kits resolve to the leaf item
 * that actually installs the imported file.
 */
export function createRegistryModuleOwnership(items: readonly RegistryItem[]): RegistryModuleOwnership {
	const ownership = new Map<string, string>();
	for (const item of items) {
		for (const file of item.files ?? []) {
			if (!file.target) continue;
			for (const moduleKey of moduleKeysForTarget(file.target)) {
				const owner = ownership.get(moduleKey);
				if (owner && owner !== item.name) {
					throw new Error(`Registry module '${moduleKey}' is owned by both ${owner} and ${item.name}.`);
				}
				ownership.set(moduleKey, item.name);
			}
		}
	}
	return ownership;
}

function normalizeImportedModule(specifier: string, containingTarget: string): string | undefined {
	let normalized: string;
	if (specifier.startsWith('@/')) normalized = specifier.slice('@/'.length);
	else if (specifier.startsWith('./') || specifier.startsWith('../')) {
		const containingModule = normalizeTargetModule(containingTarget);
		if (!containingModule) return undefined;
		const containingDirectory = containingModule.split('/').slice(0, -1).join('/');
		normalized = ts.sys.resolvePath(`${containingDirectory}/${specifier}`).replaceAll('\\', '/');
		// ts.sys.resolvePath makes relative values absolute to cwd. Keep only the
		// normalized consumer module portion we supplied above.
		const cwd = ts.sys.resolvePath('.').replaceAll('\\', '/').replace(/\/$/, '');
		if (normalized.startsWith(`${cwd}/`)) normalized = normalized.slice(cwd.length + 1);
	} else {
		return undefined;
	}

	return stripModuleExtension(normalized).replace(/\/index$/, '');
}

export function deriveOwnedRegistryDependencies(
	item: RegistryItem,
	sourceByPath: ReadonlyMap<string, string>,
	ownership: RegistryModuleOwnership,
): string[] {
	const dependencies = new Set<string>();
	const filesByPath = new Map((item.files ?? []).map((file) => [file.path, file]));

	for (const [filePath, source] of sourceByPath) {
		const file = filesByPath.get(filePath);
		if (!file?.target) continue;
		for (const { value } of collectModuleSpecifiers(source, filePath)) {
			const importedModule = normalizeImportedModule(value, file.target);
			if (!importedModule) continue;
			const owner = ownership.get(importedModule) ?? ownership.get(`${importedModule}/index`);
			if (
				!owner &&
				(value.startsWith('./') ||
					value.startsWith('../') ||
					value.startsWith('@/blocks/') ||
					value === '@/feature-packs' ||
					value.startsWith('@/feature-packs/'))
			) {
				throw new Error(`${filePath} imports unowned registry module '${value}'.`);
			}
			if (owner && owner !== item.name) dependencies.add(owner);
		}
	}

	return [...dependencies].sort();
}

function internalDependencyNames(item: RegistryItem, ownItemNames: ReadonlySet<string>): Set<string> {
	const names = new Set<string>();
	for (const dependency of item.registryDependencies ?? []) {
		const dependencyName = dependency.startsWith(CONSTRUCTIVE_NAMESPACE)
			? dependency.slice(CONSTRUCTIVE_NAMESPACE.length)
			: dependency;
		if (ownItemNames.has(dependencyName) && dependencyName !== item.name) names.add(dependencyName);
	}
	return names;
}

export function getInternalDependencyEdgeDiff(
	item: RegistryItem,
	derivedDependencies: ReadonlySet<string>,
	ownItemNames: ReadonlySet<string>,
	intentionalDependencyOnlyEdges: ReadonlySet<string>,
): { missing: string[]; stale: string[] } {
	const compiledDependencies = internalDependencyNames(item, ownItemNames);
	const missing = [...derivedDependencies].filter((dependency) => !compiledDependencies.has(dependency));
	const allowAllDeclared = (item.files?.length ?? 0) === 0;
	const stale = allowAllDeclared
		? []
		: [...compiledDependencies].filter(
				(dependency) =>
					dependency !== 'constructive-theme' &&
					!derivedDependencies.has(dependency) &&
					!intentionalDependencyOnlyEdges.has(dependency),
			);
	return { missing, stale };
}

export function assertExactInternalDependencyEdges(
	item: RegistryItem,
	derivedDependencies: ReadonlySet<string>,
	ownItemNames: ReadonlySet<string>,
	intentionalDependencyOnlyEdges: ReadonlySet<string>,
): void {
	const { missing, stale } = getInternalDependencyEdgeDiff(
		item,
		derivedDependencies,
		ownItemNames,
		intentionalDependencyOnlyEdges,
	);

	if (missing.length > 0 || stale.length > 0) {
		throw new Error(
			`${item.name} has non-exact internal registry dependencies. Missing: ${missing.join(', ') || 'none'}. Stale: ${stale.join(', ') || 'none'}.`,
		);
	}
}

export function compileRegistryDependencies(
	item: RegistryItem,
	derivedDependencies: Iterable<string>,
	ownItemNames: ReadonlySet<string>,
): string[] {
	const compiled: string[] = [];
	const seen = new Set<string>();

	const append = (dependency: string): void => {
		const namespaced = dependency.startsWith('@') || dependency.startsWith('http')
			? dependency
			: ownItemNames.has(dependency)
				? `${CONSTRUCTIVE_NAMESPACE}${dependency}`
				: dependency;
		if (namespaced === `${CONSTRUCTIVE_NAMESPACE}${item.name}` || seen.has(namespaced)) return;
		seen.add(namespaced);
		compiled.push(namespaced);
	};

	for (const dependency of item.registryDependencies ?? []) append(dependency);
	for (const dependency of [...derivedDependencies].sort()) append(dependency);
	if (item.type === 'registry:ui' || item.type === 'registry:block') append(CONSTRUCTIVE_THEME_DEPENDENCY);

	return compiled;
}

export function assertNoForbiddenDistributionReferences(item: RegistryItem, sourceByPath: ReadonlyMap<string, string>): void {
	for (const dependency of [...(item.dependencies ?? []), ...(item.devDependencies ?? [])]) {
		if (dependency === CONSTRUCTIVE_UI_PACKAGE || dependency.startsWith(`${CONSTRUCTIVE_UI_PACKAGE}/`)) {
			throw new Error(`${item.name} retains ${CONSTRUCTIVE_UI_PACKAGE} as an npm dependency.`);
		}
		if (dependency === 'tw-animate-css') throw new Error(`${item.name} retains forbidden dependency tw-animate-css.`);
	}

	for (const [filePath, source] of sourceByPath) {
		if (source.includes(CONSTRUCTIVE_UI_PACKAGE)) {
			throw new Error(`${item.name}/${filePath} retains ${CONSTRUCTIVE_UI_PACKAGE} after registry compilation.`);
		}
		if (source.includes('tw-animate-css')) {
			throw new Error(`${item.name}/${filePath} retains tw-animate-css after registry compilation.`);
		}
		if (source.includes('registry/constructive')) {
			throw new Error(`${item.name}/${filePath} retains a registry-internal path.`);
		}
		if (/['"]@schema-builder\//.test(source)) {
			throw new Error(`${item.name}/${filePath} retains an unshipped @schema-builder alias.`);
		}
	}
}

export function assertUniqueRegistryShape(items: readonly RegistryItem[]): void {
	const itemOwners = new Set<string>();
	const targetOwners = new Map<string, string>();

	for (const item of items) {
		if (itemOwners.has(item.name)) throw new Error(`Duplicate registry item '${item.name}'.`);
		itemOwners.add(item.name);

		for (const file of item.files ?? []) {
			if (!file.target) throw new Error(`${item.name}/${file.path} is missing an explicit install target.`);
			const existingOwner = targetOwners.get(file.target);
			if (existingOwner) {
				throw new Error(`Duplicate registry target '${file.target}' from ${existingOwner} and ${item.name}.`);
			}
			targetOwners.set(file.target, item.name);
		}
	}
}
