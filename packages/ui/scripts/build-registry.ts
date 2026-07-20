#!/usr/bin/env -S tsx

import {
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectModuleSpecifiers, portableTargetForUiFile, type Registry } from '../../../apps/registry/scripts/compiler';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDirectory, '..');
const sourceRoot = path.join(packageRoot, 'src');
const outputRoot = path.join(packageRoot, 'registry', 'constructive');
const manifest = JSON.parse(readFileSync(path.join(packageRoot, 'registry.json'), 'utf8')) as Registry;
const sourceFilePattern = /\.[cm]?[jt]sx?$/;

const clientFiles = new Set([
	'alert-dialog.tsx',
	'alert.tsx',
	'autocomplete.tsx',
	'avatar.tsx',
	'calendar-rac.tsx',
	'checkbox-group.tsx',
	'checkbox.tsx',
	'collapsible.tsx',
	'combobox.tsx',
	'command.tsx',
	'dialog.tsx',
	'dock.tsx',
	'drawer.tsx',
	'dropdown-menu.tsx',
	'flickering-grid.tsx',
	'flow-zoom-panel.tsx',
	'form-control.tsx',
	'form.tsx',
	'input-group.tsx',
	'input.tsx',
	'json-input.tsx',
	'label.tsx',
	'motion-grid.tsx',
	'multi-select.tsx',
	'popover.tsx',
	'portal.tsx',
	'progress.tsx',
	'progressive-blur-scroll-container.tsx',
	'progressive-blur.tsx',
	'radio-group.tsx',
	'record-picker.tsx',
	'resizable.tsx',
	'responsive-diagram.tsx',
	'scroll-area.tsx',
	'select.tsx',
	'separator.tsx',
	'sheet.tsx',
	'sidebar.tsx',
	'sonner.tsx',
	'stepper.tsx',
	'switch.tsx',
	'tabs.tsx',
	'tags.tsx',
	'textarea.tsx',
	'tooltip.tsx',
	'deferred-card-content.tsx',
	'stack-backdrop.tsx',
	'stack-card.tsx',
	'stack-context.tsx',
	'stack-header.tsx',
	'stack-viewport.tsx',
	'use-peek-gestures.ts',
	'use-stack-gestures.ts',
	'use-stack-responsive.ts',
	'toast-error.tsx',
	'toast-info.tsx',
	'toast-success.tsx',
	'toast-warning.tsx',
	'org-chart.tsx',
	'org-chart-context.tsx',
	'org-chart-edge.tsx',
	'org-chart-empty.tsx',
	'org-chart-node.tsx',
	'bucket-config-sheet.tsx',
	'bucket-rail.tsx',
	'object-detail-sheet.tsx',
	'object-table.tsx',
	'object-toolbar.tsx',
	'storage-breadcrumb.tsx',
	'storage-browser.tsx',
	'storage-empty-state.tsx',
	'upload-dropzone.tsx',
	'use-mobile.ts',
]);

function sourcePathForRegistryPath(registryPath: string): string {
	const prefix = 'registry/constructive/';
	if (!registryPath.startsWith(prefix)) throw new Error(`Unexpected UI registry path: ${registryPath}`);
	const relativePath = registryPath.slice(prefix.length);
	if (relativePath.startsWith('ui/')) return path.join(sourceRoot, 'components', relativePath.slice(3));
	if (relativePath.startsWith('lib/')) return path.join(sourceRoot, 'lib', relativePath.slice(4));
	if (relativePath.startsWith('hooks/')) return path.join(sourceRoot, 'lib', relativePath.slice(6));
	if (relativePath.startsWith('blocks/')) return path.join(sourceRoot, 'components', relativePath.slice(7));
	throw new Error(`Cannot resolve canonical UI source for ${registryPath}.`);
}

function importAliasForRegistryPath(registryPath: string): string {
	const target = portableTargetForUiFile(registryPath)
		.replace(/^@ui\//, '@/components/ui/')
		.replace(/^@lib\//, '@/lib/')
		.replace(/^@hooks\//, '@/hooks/')
		.replace(/\.(?:tsx?|jsx?)$/, '');
	return target.endsWith('/index') ? target.slice(0, -'/index'.length) : target;
}

const files = manifest.items.flatMap((item) => item.files ?? []);
const sourceToAlias = new Map<string, string>();
const outputPaths = new Set<string>();

for (const file of files) {
	const sourcePath = sourcePathForRegistryPath(file.path);
	if (!existsSync(sourcePath)) throw new Error(`${file.path} is missing canonical source ${sourcePath}.`);
	if (sourceToAlias.has(sourcePath)) throw new Error(`Canonical UI source appears more than once: ${sourcePath}`);
	sourceToAlias.set(sourcePath, importAliasForRegistryPath(file.path));
	outputPaths.add(path.join(packageRoot, file.path));
}

function resolveRelativeSource(containingFile: string, specifier: string): string | undefined {
	const base = path.resolve(path.dirname(containingFile), specifier);
	for (const candidate of [
		base,
		`${base}.ts`,
		`${base}.tsx`,
		`${base}.js`,
		`${base}.jsx`,
		path.join(base, 'index.ts'),
		path.join(base, 'index.tsx'),
	]) {
		if (existsSync(candidate)) return candidate;
	}
	return undefined;
}

function rewriteRelativeImports(source: string, sourcePath: string): string {
	const edits: Array<{ start: number; end: number; replacement: string }> = [];
	for (const { literal, value } of collectModuleSpecifiers(source, sourcePath)) {
		if (!value.startsWith('.')) continue;
		const resolvedSource = resolveRelativeSource(sourcePath, value);
		if (!resolvedSource) throw new Error(`${sourcePath} has unresolved relative import '${value}'.`);
		const replacement = sourceToAlias.get(resolvedSource);
		if (!replacement) {
			throw new Error(
				`${sourcePath} imports ${resolvedSource}, but that source is missing from packages/ui/registry.json.`,
			);
		}
		edits.push({ start: literal.getStart() + 1, end: literal.getEnd() - 1, replacement });
	}

	let rewritten = source;
	for (const edit of edits.sort((left, right) => right.start - left.start)) {
		rewritten = `${rewritten.slice(0, edit.start)}${edit.replacement}${rewritten.slice(edit.end)}`;
	}
	return rewritten;
}

function ensureUseClient(source: string, sourcePath: string): string {
	if (!clientFiles.has(path.basename(sourcePath))) return source;
	const trimmed = source.trimStart();
	if (trimmed.startsWith('"use client"') || trimmed.startsWith("'use client'")) return source;
	return `'use client';\n\n${source}`;
}

rmSync(outputRoot, { recursive: true, force: true });

for (const file of files) {
	const sourcePath = sourcePathForRegistryPath(file.path);
	const outputPath = path.join(packageRoot, file.path);
	let source = readFileSync(sourcePath, 'utf8');
	if (sourceFilePattern.test(sourcePath)) source = rewriteRelativeImports(source, sourcePath);
	source = ensureUseClient(source, sourcePath);

	if (sourcePath === path.join(sourceRoot, 'components/org-chart/org-chart.tsx')) {
		const styleImport = "import '@xyflow/react/dist/style.css';";
		if (!source.includes(styleImport)) {
			source = source.replace(/(['"]use client['"];?)/, `$1\n\n${styleImport}`);
		}
	}

	mkdirSync(path.dirname(outputPath), { recursive: true });
	writeFileSync(outputPath, source, 'utf8');
}

const actualOutputs = new Set<string>();
function walk(directory: string): void {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const entryPath = path.join(directory, entry.name);
		if (entry.isDirectory()) walk(entryPath);
		else actualOutputs.add(entryPath);
	}
}
walk(outputRoot);

if (
	actualOutputs.size !== outputPaths.size ||
	[...actualOutputs].some((outputPath) => !outputPaths.has(outputPath))
) {
	throw new Error(`UI registry staging drifted: expected ${outputPaths.size} exact files, found ${actualOutputs.size}.`);
}

console.log(`Built ${manifest.items.length} UI registry items from ${files.length} exact canonical files.`);
