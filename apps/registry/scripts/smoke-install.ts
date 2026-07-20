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
const generatedFixtureRoot = path.join(repositoryRoot, 'apps', 'blocks', 'src', 'generated');
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'constructive-registry-smoke-'));

type SmokeCase = {
	name: string;
	customAliases?: boolean;
	generatedFixtures?: boolean;
	noRequirementsSidecar?: boolean;
	expected: string[];
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
		name: 'auth-sign-in-card',
		generatedFixtures: true,
		expected: [
			'src/blocks/auth/sign-in-card/sign-in-card.tsx',
			'.constructive/blocks/auth-sign-in-card.requires.json',
		],
	},
	{
		name: 'billing-usage-overview',
		noRequirementsSidecar: true,
		expected: [
			'src/blocks/billing/billing-contracts/billing-contracts.ts',
			'src/blocks/billing/billing-ui/billing-ui.tsx',
			'src/blocks/billing/billing-usage-overview/billing-usage-overview.tsx',
			'src/blocks/billing/billing-usage-overview/messages.ts',
		],
	},
	{
		name: 'billing-credits-card',
		noRequirementsSidecar: true,
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
		noRequirementsSidecar: true,
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
	{
		name: 'schema-builder-indexes',
		generatedFixtures: true,
		expected: [
			'src/blocks/schema/schema-builder-indexes/components/table-editor/indexes/indexes-view.tsx',
			'.constructive/blocks/schema-builder-indexes.requires.json',
		],
	},
	{
		name: 'schema-builder',
		generatedFixtures: true,
		expected: [
			'src/blocks/schema/schema-builder/schema-builder-block.tsx',
			'.constructive/blocks/schema-builder.requires.json',
			'.constructive/blocks/schema-builder-core.requires.json',
			'.constructive/blocks/schema-builder-fields.requires.json',
			'.constructive/blocks/schema-builder-relationships.requires.json',
			'.constructive/blocks/schema-builder-indexes.requires.json',
			'.constructive/blocks/schema-builder-policies.requires.json',
			'.constructive/blocks/schema-builder-tables.requires.json',
		],
	},
];
const selectedCases = process.env.SMOKE_CASE
	? cases.filter((testCase) => testCase.name === process.env.SMOKE_CASE)
	: cases;
if (selectedCases.length === 0) throw new Error(`Unknown SMOKE_CASE: ${process.env.SMOKE_CASE}`);

function write(root: string, relativePath: string, contents: string): void {
	const target = path.join(root, relativePath);
	fs.mkdirSync(path.dirname(target), { recursive: true });
	fs.writeFileSync(target, contents);
}

function prepareConsumer(root: string, origin: string, testCase: SmokeCase): void {
	const packageJson = {
		name: `registry-smoke-${testCase.name}`,
		private: true,
		version: '0.0.0',
		dependencies: {
			react: '19.2.0',
			'react-dom': '19.2.0',
			...(testCase.generatedFixtures
				? {
					'@0no-co/graphql.web': '^1.2.0',
					'@constructive-io/graphql-types': '^3.4.3',
					'gql-ast': '^3.3.3',
					graphql: '16.13.0',
				}
				: {}),
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
				style: 'new-york',
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

	if (testCase.generatedFixtures) {
		fs.cpSync(generatedFixtureRoot, path.join(root, 'src', 'generated'), {
			recursive: true,
			filter: (source) => path.basename(source) !== 'ui-demo-source.ts',
		});
	}
}

async function run(
	command: string,
	arguments_: string[],
	cwd: string,
	description: string,
): Promise<void> {
	const exitCode = await new Promise<number>((resolve, reject) => {
		const child = spawn(command, arguments_, { cwd, stdio: 'inherit' });
		child.on('error', reject);
		child.on('exit', (code) => resolve(code ?? 1));
	});
	if (exitCode !== 0) throw new Error(`${description} exited with code ${exitCode}.`);
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

async function compileTailwind(root: string, itemName: string): Promise<void> {
	const program = [
		"const fs = require('node:fs')",
		"const postcss = require('postcss')",
		"const tailwind = require('@tailwindcss/postcss')",
		"const css = fs.readFileSync('src/app/globals.css', 'utf8')",
		"const expected = ['.shadow-card-lg', '.scrollbar-hide', '.animate-shimmer', '@keyframes shimmer', '@media (prefers-reduced-motion: reduce)']",
		"postcss([tailwind()]).process(css, { from: 'src/app/globals.css' }).then((result) => { for (const fragment of expected) { if (!result.css.includes(fragment)) throw new Error('Compiled Tailwind CSS is missing ' + fragment) } }).catch((error) => { console.error(error); process.exitCode = 1 })",
	].join(';');
	await run('node', ['-e', program], root, `${itemName} Tailwind compilation`);
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
	if (packageJsonSource.includes('@constructive-io/ui')) {
		throw new Error(`@constructive/${testCase.name} installed @constructive-io/ui.`);
	}
	if (packageJsonSource.includes('tw-animate-css')) {
		throw new Error(`@constructive/${testCase.name} installed tw-animate-css.`);
	}

	for (const relativePath of testCase.expected) {
		if (!fs.existsSync(path.join(root, relativePath))) {
			throw new Error(`@constructive/${testCase.name} did not create ${relativePath}.`);
		}
	}
	if (fs.existsSync(path.join(root, 'src', '.constructive'))) {
		throw new Error(`@constructive/${testCase.name} installed requirements under src/.constructive.`);
	}
	if (testCase.noRequirementsSidecar) {
		const requirementsFiles = walk(path.join(root, '.constructive')).filter((file) =>
			file.endsWith('.requires.json'),
		);
		if (requirementsFiles.length > 0) {
			throw new Error(
				`@constructive/${testCase.name} unexpectedly installed requirements sidecars: ${requirementsFiles
					.map((file) => path.relative(root, file))
					.join(', ')}.`,
			);
		}
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

await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Unable to start registry smoke server.');
const origin = `http://127.0.0.1:${address.port}`;

try {
	for (const testCase of selectedCases) {
		const root = path.join(temporaryRoot, testCase.name);
		const itemNames = testCase.items ?? [testCase.name];
		prepareConsumer(root, origin, testCase);
		await install(root, itemNames);
		assertInstalled(root, testCase);
		await typecheck(root, testCase.name);
		await compileTailwind(root, testCase.name);
		console.log(`Clean package-free install passed: ${itemNames.map((itemName) => `@constructive/${itemName}`).join(', ')}.`);
	}
} finally {
	await new Promise<void>((resolve) => server.close(() => resolve()));
	fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
