#!/usr/bin/env -S tsx

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = path.resolve(appDirectory, '..', '..');
const publicDirectory = path.join(appDirectory, 'public');
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'constructive-registry-smoke-'));

type SmokeCase = {
	name: string;
	customAliases?: boolean;
	expected: string[];
	expectedPackages?: string[];
	forbidden?: string[];
	forbiddenPackages?: string[];
	items?: string[];
};

const overlayItems = [
	'alert-dialog',
	'dialog',
	'drawer',
	'dropdown-menu',
	'popover',
	'select',
	'sheet',
	'tooltip',
] as const;

const featurePackIds = [
	'data',
	'auth',
	'users',
	'organizations',
	'storage',
	'billing',
	'notifications',
] as const;

type FeaturePackId = (typeof featurePackIds)[number];

const consoleCoreFiles = [
	'src/blocks/console-runtime/capabilities.ts',
	'src/blocks/console-runtime/endpoints.ts',
	'src/blocks/console-runtime/feature-adapter.ts',
	'src/blocks/console-runtime/index.ts',
	'src/blocks/console-runtime/session.ts',
	'src/blocks/console-runtime/standalone-session.ts',
	'src/blocks/console-runtime/transport.ts',
	'src/feature-packs/capabilities.ts',
	'src/feature-packs/catalog.ts',
	'src/feature-packs/catalog-validation.ts',
	'src/feature-packs/index.ts',
	'src/feature-packs/manifest.ts',
	'src/blocks/console-kit/feature-module.ts',
	'src/blocks/console-kit/console-kit-contracts.ts',
	'src/blocks/console-kit/console-connection-menu.tsx',
	'src/blocks/console-kit/console-kit-runtime.tsx',
	'src/blocks/console-kit/use-latest-callback.ts',
	'src/blocks/console-kit/console-kit-core.tsx',
	'src/blocks/console-kit/console-kit.tsx',
	'src/blocks/console-kit/constructive/constructive-adapter-utils.ts',
	'src/blocks/console-kit/constructive/constructive-capabilities.ts',
	'src/blocks/console-kit/constructive/constructive-console-kit.tsx',
	'src/blocks/console-kit/constructive/constructive-graphql.ts',
	'src/blocks/console-kit/constructive/constructive-meta-utils.ts',
	'src/blocks/console-kit/store/adapter-slice.ts',
	'src/blocks/console-kit/store/context-slice.ts',
	'src/blocks/console-kit/store/endpoint-capability-slice.ts',
	'src/blocks/console-kit/store/navigation-slice.ts',
	'src/blocks/console-kit/store/runtime-slice.ts',
	'src/blocks/console-kit/store/session-slice.ts',
	'src/blocks/console-kit/store/console-kit-store.tsx',
	'src/blocks/console-kit/store/index.ts',
] as const;

const featurePackViewFiles: Record<FeaturePackId, readonly string[]> = {
	data: [
		'src/blocks/feature-packs/data/data-feature-pack.tsx',
	],
	auth: [
		'src/blocks/feature-packs/auth/auth-contracts.ts',
		'src/blocks/feature-packs/auth/auth-entry-panel.tsx',
		'src/blocks/feature-packs/auth/auth-challenge-panel.tsx',
		'src/blocks/feature-packs/auth/auth-account-view.tsx',
		'src/blocks/feature-packs/auth/auth-feature-pack.tsx',
	],
	users: [
		'src/blocks/feature-packs/users/users-feature-pack.tsx',
	],
	organizations: [
		'src/blocks/feature-packs/organizations/organizations-feature-pack.tsx',
	],
	storage: [
		'src/blocks/feature-packs/storage/storage-feature-pack.tsx',
	],
	billing: [
		'src/blocks/feature-packs/billing/billing-feature-pack.tsx',
	],
	notifications: [
		'src/blocks/feature-packs/notifications/notifications-feature-pack.tsx',
	],
};

const consoleModuleFiles: Record<FeaturePackId, readonly string[]> = {
	data: [
		'src/blocks/feature-packs/data/data-console-module.tsx',
	],
	auth: [
		'src/blocks/feature-packs/auth/auth-console-module.tsx',
		'src/blocks/console-kit/constructive/auth-adapter.ts',
	],
	users: [
		'src/blocks/feature-packs/users/users-console-module.tsx',
		'src/blocks/console-kit/constructive/users-adapter.ts',
	],
	organizations: [
		'src/blocks/feature-packs/organizations/organizations-console-module.tsx',
		'src/blocks/feature-packs/organizations/organizations-meta-contract.ts',
		'src/blocks/console-kit/constructive/organizations-adapter.ts',
	],
	storage: [
		'src/blocks/feature-packs/storage/storage-console-module.tsx',
		'src/blocks/feature-packs/storage/storage-console-slice.ts',
		'src/blocks/feature-packs/storage/storage-meta-contract.ts',
		'src/blocks/console-kit/constructive/storage-adapter.ts',
	],
	billing: [
		'src/blocks/feature-packs/billing/billing-console-module.tsx',
		'src/blocks/console-kit/constructive/billing-adapter.ts',
	],
	notifications: [
		'src/blocks/feature-packs/notifications/notifications-console-module.tsx',
		'src/blocks/console-kit/constructive/notifications-adapter.ts',
	],
};

const featurePackManifest = (id: FeaturePackId): string =>
	`.constructive/feature-packs/${id}.json`;

const presetManifest = (id: string): string =>
	`.constructive/feature-packs/${id}.json`;

function featurePackClosure(ids: readonly FeaturePackId[]): string[] {
	return ids.flatMap((id) => [...featurePackViewFiles[id], featurePackManifest(id)]);
}

function consoleModuleClosure(ids: readonly FeaturePackId[]): string[] {
	return [
		...consoleCoreFiles,
		...ids.flatMap((id) => [
			...featurePackViewFiles[id],
			...consoleModuleFiles[id],
			featurePackManifest(id),
		]),
	];
}

function forbiddenFeaturePacks(ids: readonly FeaturePackId[]): string[] {
	const selected = new Set(ids);
	return featurePackIds
		.filter((id) => !selected.has(id))
		.map(featurePackManifest);
}

const standaloneFeaturePackCases: SmokeCase[] = featurePackIds.map((id) => ({
	name: `feature-pack-${id}`,
	expectedPackages: id === 'data'
		? ['@constructive-io/data', '@constructive-io/sheets']
		: [],
	forbiddenPackages: [
		'zustand',
		...(id === 'data' ? [] : ['@constructive-io/data', '@constructive-io/sheets']),
	],
	expected: featurePackClosure([id]),
	forbidden: [
		...consoleCoreFiles,
		...featurePackIds.flatMap((featureId) => consoleModuleFiles[featureId]),
		...forbiddenFeaturePacks([id]),
		presetManifest('blank'),
		presetManifest('auth-hardened'),
		presetManifest('b2b-storage'),
		presetManifest('full'),
	],
}));

const consoleModuleCases: SmokeCase[] = featurePackIds.map((id) => ({
	name: `console-module-${id}`,
	expectedPackages: [
		'@constructive-io/data',
		...(id === 'data' ? ['@constructive-io/sheets'] : []),
		'zustand',
	],
	forbiddenPackages: id === 'data' ? [] : ['@constructive-io/sheets'],
	expected: consoleModuleClosure([id]),
	forbidden: [
		...featurePackIds
			.filter((featureId) => featureId !== id)
			.flatMap((featureId) => consoleModuleFiles[featureId]),
		...forbiddenFeaturePacks([id]),
		presetManifest('blank'),
		presetManifest('auth-hardened'),
		presetManifest('b2b-storage'),
		presetManifest('full'),
	],
}));

const presetCases: SmokeCase[] = [
	{
		id: 'auth-hardened',
		packs: ['data', 'auth', 'users'],
	},
	{
		id: 'b2b-storage',
		packs: ['data', 'auth', 'users', 'organizations', 'storage'],
	},
	{
		id: 'full',
		packs: [...featurePackIds],
	},
].map(({ id, packs }) => ({
	name: `preset-${id}`,
	expectedPackages: ['@constructive-io/data', '@constructive-io/sheets', 'zustand'],
	expected: [
		...consoleModuleClosure(packs as readonly FeaturePackId[]),
		`src/blocks/presets/${id}-console-kit.tsx`,
		presetManifest(id),
	],
	forbidden: [
		...forbiddenFeaturePacks(packs as readonly FeaturePackId[]),
		presetManifest('blank'),
		...['auth-hardened', 'b2b-storage', 'full']
			.filter((presetId) => presetId !== id)
			.map(presetManifest),
	],
}));

const cases: SmokeCase[] = [
	{
		name: 'button',
		expected: ['src/components/ui/button.tsx'],
	},
	{
		name: 'resizable',
		expected: ['src/components/ui/resizable.tsx'],
	},
	{
		name: 'overlays-default',
		items: [...overlayItems],
		expected: [
			...overlayItems.map((item) => `src/components/ui/${item}.tsx`),
			'src/components/ui/portal.tsx',
		],
	},
	{
		name: 'overlays-custom',
		customAliases: true,
		items: [...overlayItems],
		expected: [
			...overlayItems.map((item) => `src/design-system/primitives/${item}.tsx`),
			'src/design-system/primitives/portal.tsx',
		],
	},
	{
		name: 'stack',
		customAliases: true,
		expected: [
			'src/design-system/primitives/stack/index.ts',
			'src/design-system/primitives/stack/deferred-card-content.tsx',
			'src/design-system/primitives/stack/stack-card.tsx',
		],
	},
	{
		name: 'app-shell',
		expected: ['src/components/ui/app-shell.tsx', 'src/components/ui/app-bar.tsx'],
	},
	{
		name: 'console-kit-core',
		expectedPackages: ['@constructive-io/data', 'zustand'],
		forbiddenPackages: ['@constructive-io/sheets'],
		expected: [...consoleCoreFiles],
		forbidden: [
			...featurePackIds.map(featurePackManifest),
			presetManifest('blank'),
			presetManifest('auth-hardened'),
			presetManifest('b2b-storage'),
			presetManifest('full'),
		],
	},
	...standaloneFeaturePackCases,
	...consoleModuleCases,
	...presetCases,
	{
		name: 'console-kit-nextjs',
		expectedPackages: [
			'@constructive-io/data',
			'@constructive-io/sheets',
			'zustand',
		],
		expected: [
			...consoleModuleClosure(featurePackIds),
			'src/blocks/presets/full-console-kit.tsx',
			presetManifest('full'),
			'src/blocks/console-kit/constructive/index.ts',
		],
		forbidden: [
			presetManifest('blank'),
			presetManifest('auth-hardened'),
			presetManifest('b2b-storage'),
		],
	},
	{
		name: 'billing-usage-overview',
		expected: [
			'src/blocks/billing/billing-contracts/billing-contracts.ts',
			'src/blocks/billing/billing-ui/billing-ui.tsx',
			'src/blocks/billing/billing-usage-overview/billing-usage-overview.tsx',
			'src/blocks/billing/billing-usage-overview/messages.ts',
		],
	},
	{
		name: 'billing-credits-card',
		expected: [
			'src/blocks/billing/billing-contracts/billing-contracts.ts',
			'src/blocks/billing/billing-ui/billing-ui.tsx',
			'src/blocks/billing/billing-credits-card/billing-credits-card.tsx',
			'src/blocks/billing/billing-credits-card/messages.ts',
		],
	},
	{
		name: 'billing-settings-page',
		customAliases: true,
		expected: [
			'src/blocks/billing/billing-settings-page/billing-settings-page.tsx',
			'src/blocks/billing/billing-settings-page/messages.ts',
			'src/blocks/billing/billing-activity-table/billing-activity-table.tsx',
			'src/blocks/billing/billing-activity-table/messages.ts',
			'src/blocks/billing/billing-contracts/billing-contracts.ts',
			'src/blocks/billing/billing-ui/billing-ui.tsx',
			'src/blocks/billing/billing-credits-card/billing-credits-card.tsx',
			'src/blocks/billing/billing-credits-card/messages.ts',
			'src/blocks/billing/billing-entitlements-list/billing-entitlements-list.tsx',
			'src/blocks/billing/billing-entitlements-list/messages.ts',
			'src/blocks/billing/billing-pricing-table/billing-pricing-table.tsx',
			'src/blocks/billing/billing-pricing-table/messages.ts',
			'src/blocks/billing/billing-subscription-card/billing-subscription-card.tsx',
			'src/blocks/billing/billing-subscription-card/messages.ts',
			'src/blocks/billing/billing-usage-history/billing-usage-history.tsx',
			'src/blocks/billing/billing-usage-history/messages.ts',
			'src/blocks/billing/billing-usage-overview/billing-usage-overview.tsx',
			'src/blocks/billing/billing-usage-overview/messages.ts',
			'src/design-system/primitives/alert.tsx',
			'src/design-system/primitives/badge.tsx',
			'src/design-system/primitives/button.tsx',
			'src/design-system/primitives/card.tsx',
			'src/design-system/primitives/field.tsx',
			'src/design-system/primitives/label.tsx',
			'src/design-system/primitives/pagination.tsx',
			'src/design-system/primitives/portal.tsx',
			'src/design-system/primitives/progress.tsx',
			'src/design-system/primitives/select.tsx',
			'src/design-system/primitives/separator.tsx',
			'src/design-system/primitives/sheet.tsx',
			'src/design-system/primitives/skeleton.tsx',
			'src/design-system/primitives/table.tsx',
			'src/design-system/primitives/tabs.tsx',
			'src/design-system/primitives/tooltip.tsx',
			'src/react/use-controllable-state.ts',
			'src/shared/motion/motion-config.ts',
			'src/shared/slot.tsx',
			'src/shared/utils.ts',
		],
	},
];
const requestedCases = process.env.SMOKE_CASE?.split(',').map((value) => value.trim()).filter(Boolean);
const selectedCases = requestedCases
	? cases.filter((testCase) => requestedCases.includes(testCase.name))
	: cases;
if (requestedCases && selectedCases.length !== new Set(requestedCases).size) {
	const knownCases = new Set(cases.map((testCase) => testCase.name));
	const unknownCases = requestedCases.filter((name) => !knownCases.has(name));
	throw new Error(`Unknown SMOKE_CASE: ${unknownCases.join(', ')}`);
}

function write(root: string, relativePath: string, contents: string): void {
	const target = path.join(root, relativePath);
	fs.mkdirSync(path.dirname(target), { recursive: true });
	fs.writeFileSync(target, contents);
}

function prepareConsumer(
	root: string,
	origin: string,
	testCase: SmokeCase,
	packageRegistryOrigin?: string,
): void {
	const packageJson = {
		name: `registry-smoke-${testCase.name}`,
		private: true,
		version: '0.0.0',
		dependencies: {
			react: '19.2.0',
			'react-dom': '19.2.0',
		},
		devDependencies: {
			'@tailwindcss/postcss': '4.1.18',
			'@types/node': '^24.10.1',
			'@types/react': '^19.2.0',
			'@types/react-dom': '^19.2.0',
			postcss: '^8.5.6',
			tailwindcss: '4.1.18',
			typescript: '^5.9.3',
		},
	};
	write(root, 'package.json', `${JSON.stringify(packageJson, null, 2)}\n`);
	write(root, 'pnpm-lock.yaml', 'lockfileVersion: 9.0\n');
	if (packageRegistryOrigin) {
		write(
			root,
			'.npmrc',
			`@constructive-io:registry=${packageRegistryOrigin}\nauto-install-peers=true\n`,
		);
	}

	const pathAliases = testCase.customAliases
		? { '~/*': ['./src/*'] }
		: { '@/*': ['./src/*'] };
	write(
		root,
		'tsconfig.json',
		`${JSON.stringify(
			{
				compilerOptions: {
					allowSyntheticDefaultImports: true,
					baseUrl: '.',
					esModuleInterop: true,
					isolatedModules: true,
					jsx: 'react-jsx',
					lib: ['ES2022', 'DOM', 'DOM.Iterable'],
					module: 'ESNext',
					moduleResolution: 'Bundler',
					noEmit: true,
					paths: pathAliases,
					resolveJsonModule: true,
					skipLibCheck: true,
					strict: true,
					strictNullChecks: false,
					target: 'ES2022',
				},
				include: ['src/**/*.ts', 'src/**/*.tsx'],
			},
			null,
			2,
		)}\n`,
	);
	write(root, 'src/app/globals.css', '@import "tailwindcss";\n');

	const aliases = testCase.customAliases
		? {
			components: '~/components',
			utils: '~/shared/utils',
			ui: '~/design-system/primitives',
			lib: '~/shared',
			hooks: '~/react',
		}
		: {
			components: '@/components',
			utils: '@/lib/utils',
			ui: '@/components/ui',
			lib: '@/lib',
			hooks: '@/hooks',
		};
	write(
		root,
		'components.json',
		`${JSON.stringify(
			{
				$schema: 'https://ui.shadcn.com/schema.json',
				style: 'base-nova',
				rsc: true,
				tsx: true,
				tailwind: {
					config: '',
					css: 'src/app/globals.css',
					baseColor: 'neutral',
					cssVariables: true,
					prefix: '',
				},
				aliases,
				registries: { '@constructive': `${origin}/r/{name}.json` },
			},
			null,
			2,
		)}\n`,
	);
}

async function run(
	command: string,
	arguments_: string[],
	cwd: string,
	description: string,
	environment: NodeJS.ProcessEnv = process.env,
): Promise<void> {
	const exitCode = await new Promise<number>((resolve, reject) => {
		const child = spawn(command, arguments_, { cwd, env: environment, stdio: 'inherit' });
		child.on('error', reject);
		child.on('exit', (code) => resolve(code ?? 1));
	});
	if (exitCode !== 0) throw new Error(`${description} exited with code ${exitCode}.`);
}

async function startPackageRegistry(): Promise<{
	origin: string;
	close: () => Promise<void>;
}> {
	const artifacts = path.join(repositoryRoot, '.artifacts', 'npm');
	fs.mkdirSync(artifacts, { recursive: true });
	for (const packageName of [
		'@constructive-io/ui',
		'@constructive-io/data',
		'@constructive-io/sheets',
	]) {
		await run(
			'pnpm',
			['--filter', packageName, 'build'],
			repositoryRoot,
			`${packageName} local registry build`,
		);
		await run(
			'pnpm',
			['--filter', packageName, 'pack', '--pack-destination', artifacts],
			repositoryRoot,
			`${packageName} local registry pack`,
			{ ...process.env, npm_config_ignore_scripts: 'true' },
		);
	}

	const child = spawn('pnpm', ['local:registry'], {
		cwd: repositoryRoot,
		env: {
			...process.env,
			LOCAL_NPM_REGISTRY_PORT: '0',
			LOCAL_NPM_REGISTRY_PACKAGE_DIRECTORIES:
				'packages/ui,packages/data,packages/sheets',
		},
		stdio: ['ignore', 'pipe', 'pipe'],
	});
	child.stderr.pipe(process.stderr);
	const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
	let output = '';
	let ready = false;
	const origin = await new Promise<string>((resolve, reject) => {
		child.once('error', reject);
		child.once('exit', (code) => {
			if (!ready) reject(new Error(`Local package registry exited before startup with code ${code}.`));
		});
		child.stdout.on('data', (chunk: Buffer) => {
			const text = chunk.toString();
			process.stdout.write(text);
			output += text;
			const match = output.match(/Local package registry listening on (http:\/\/[^\s]+)/);
			if (match?.[1] && !ready) {
				ready = true;
				resolve(match[1]);
			}
		});
	});

	return {
		origin,
		close: async () => {
			if (child.exitCode === null) child.kill('SIGTERM');
			await exited;
		},
	};
}

async function install(root: string, itemNames: readonly string[]): Promise<void> {
	await run(
		'pnpm',
		['exec', 'shadcn', 'add', ...itemNames.map((itemName) => `@constructive/${itemName}`), '--cwd', root, '--yes'],
		appDirectory,
		`shadcn add ${itemNames.map((itemName) => `@constructive/${itemName}`).join(' ')}`,
	);
}

async function typecheck(root: string, itemName: string): Promise<void> {
	await run('pnpm', ['exec', 'tsc', '--pretty', 'false', '-p', 'tsconfig.json'], root, `${itemName} typecheck`);
}

async function compileTailwind(root: string, testCase: SmokeCase): Promise<void> {
	const expected = [
		'.shadow-card-lg',
		'.scrollbar-hide',
		'.animate-shimmer',
		'@keyframes shimmer',
		'@media (prefers-reduced-motion: reduce)',
		...(testCase.expectedPackages?.includes('@constructive-io/sheets')
			? ['.w-\\[52px\\]']
			: []),
	];
	const program = [
		"const fs = require('node:fs')",
		"const postcss = require('postcss')",
		"const tailwind = require('@tailwindcss/postcss')",
		"const css = fs.readFileSync('src/app/globals.css', 'utf8')",
		`const expected = ${JSON.stringify(expected)}`,
		"postcss([tailwind()]).process(css, { from: 'src/app/globals.css' }).then((result) => { for (const fragment of expected) { if (!result.css.includes(fragment)) throw new Error('Compiled Tailwind CSS is missing ' + fragment) } }).catch((error) => { console.error(error); process.exitCode = 1 })",
	].join(';');
	await run('node', ['-e', program], root, `${testCase.name} Tailwind compilation`);
}

function walk(root: string): string[] {
	if (!fs.existsSync(root)) return [];
	return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
		const target = path.join(root, entry.name);
		return entry.isDirectory() ? walk(target) : [target];
	});
}

function assertInstalled(root: string, testCase: SmokeCase): void {
	const packageJsonPath = path.join(root, 'package.json');
	const packageJsonSource = fs.readFileSync(packageJsonPath, 'utf8');
	const packageJson = JSON.parse(packageJsonSource) as {
		dependencies?: Record<string, string>;
		devDependencies?: Record<string, string>;
	};
	if (packageJsonSource.includes('@constructive-io/ui')) {
		throw new Error(`@constructive/${testCase.name} installed @constructive-io/ui.`);
	}
	if (packageJsonSource.includes('tw-animate-css')) {
		throw new Error(`@constructive/${testCase.name} installed tw-animate-css.`);
	}
	for (const packageName of testCase.expectedPackages ?? []) {
		if (!packageJson.dependencies?.[packageName] && !packageJson.devDependencies?.[packageName]) {
			throw new Error(`@constructive/${testCase.name} did not install ${packageName}.`);
		}
	}
	for (const packageName of testCase.forbiddenPackages ?? []) {
		if (packageJson.dependencies?.[packageName] || packageJson.devDependencies?.[packageName]) {
			throw new Error(`@constructive/${testCase.name} unexpectedly installed ${packageName}.`);
		}
	}

	for (const relativePath of testCase.expected) {
		if (!fs.existsSync(path.join(root, relativePath))) {
			throw new Error(`@constructive/${testCase.name} did not create ${relativePath}.`);
		}
	}
	for (const relativePath of testCase.forbidden ?? []) {
		if (fs.existsSync(path.join(root, relativePath))) {
			throw new Error(`@constructive/${testCase.name} unexpectedly created ${relativePath}.`);
		}
	}
	if (fs.existsSync(path.join(root, 'src', '.constructive'))) {
		throw new Error(`@constructive/${testCase.name} installed Constructive metadata under src/.constructive.`);
	}
	const requirementsFiles = walk(path.join(root, '.constructive')).filter((file) =>
		file.endsWith('.requires.json'),
	);
	if (requirementsFiles.length > 0) {
		throw new Error(
			`@constructive/${testCase.name} installed obsolete generated-SDK sidecars: ${requirementsFiles
				.map((file) => path.relative(root, file))
				.join(', ')}.`,
		);
	}

	const inspectedFiles = [
		...walk(path.join(root, 'src')).filter((entry) => /\.[cm]?[jt]sx?$/.test(entry)),
		path.join(root, 'src/app/globals.css'),
	];
	for (const file of inspectedFiles) {
		const source = fs.readFileSync(file, 'utf8');
		if (source.includes('@constructive-io/ui')) {
			throw new Error(`@constructive/${testCase.name} left @constructive-io/ui in ${file}.`);
		}
		if (source.includes('tw-animate-css')) {
			throw new Error(`@constructive/${testCase.name} left tw-animate-css in ${file}.`);
		}
		if (source.includes('registry/constructive')) {
			throw new Error(`@constructive/${testCase.name} left a registry-internal path in ${file}.`);
		}
		if (/['"]@schema-builder\//.test(source)) {
			throw new Error(`@constructive/${testCase.name} left an unshipped @schema-builder alias in ${file}.`);
		}
	}

	const css = fs.readFileSync(path.join(root, 'src/app/globals.css'), 'utf8');
	if (
		testCase.expectedPackages?.includes('@constructive-io/sheets') &&
		!css.includes("@import '@constructive-io/sheets/styles.css'")
	) {
		throw new Error(`@constructive/${testCase.name} did not install the Sheets Tailwind source import.`);
	}
	if (!css.includes('--background')) {
		throw new Error(`@constructive/${testCase.name} did not install Constructive theme variables.`);
	}
	for (const fragment of [
		'@layer base {',
		'@layer utilities {',
		'@keyframes shimmer {',
		'.shadow-card-lg {',
		'.scrollbar-hide {',
		'@media (prefers-reduced-motion: reduce) {',
	]) {
		if (!css.includes(fragment)) {
			throw new Error(`@constructive/${testCase.name} installed an incomplete theme missing ${fragment}.`);
		}
	}
	if (/@(?:layer\s+(?:base|utilities)|keyframes\s+[\w-]+)\s*;/.test(css)) {
		throw new Error(`@constructive/${testCase.name} installed an empty theme at-rule.`);
	}
}

const server = http.createServer((request, response) => {
	const requestPath = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
	const filePath = path.resolve(publicDirectory, `.${requestPath}`);
	if (!filePath.startsWith(`${publicDirectory}${path.sep}`) || !fs.existsSync(filePath)) {
		response.writeHead(404).end('Not found');
		return;
	}
	response.setHeader('content-type', 'application/json');
	fs.createReadStream(filePath).pipe(response);
});

const packageRegistry = selectedCases.some((testCase) => testCase.expectedPackages?.length)
	? await startPackageRegistry()
	: undefined;
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Unable to start registry smoke server.');
const origin = `http://127.0.0.1:${address.port}`;

try {
	for (const testCase of selectedCases) {
		const root = path.join(temporaryRoot, testCase.name);
		const itemNames = testCase.items ?? [testCase.name];
		prepareConsumer(root, origin, testCase, packageRegistry?.origin);
		await install(root, itemNames);
		assertInstalled(root, testCase);
		await typecheck(root, testCase.name);
		await compileTailwind(root, testCase);
		const installKind = testCase.expectedPackages?.length ? 'package-backed' : 'package-free';
		console.log(`Clean ${installKind} install passed: ${itemNames.map((itemName) => `@constructive/${itemName}`).join(', ')}.`);
	}
} finally {
	await new Promise<void>((resolve) => server.close(() => resolve()));
	await packageRegistry?.close();
	fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
