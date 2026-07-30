#!/usr/bin/env -S tsx

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	CONSTRUCTIVE_DATA_DEPENDENCY,
	NODE_TYPE_REGISTRY_DEPENDENCY,
	collectModuleSpecifiers,
} from '../../../apps/registry/scripts/compiler';
import { buildSourceRegistry } from '../../../apps/registry/scripts/build-source-registry';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exactAliases = new Map<string, string>([
	['@/blocks/schema/schema-builder-core/context/block-config', '@/components/schema-builder/compat/block-config'],
	[
		'@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder',
		'@/components/schema-builder/schema/schema-builder-core/lib/gql/hooks/schema-builder/use-schema-builder-selectors',
	],
	['@/generated/modules/hooks/queries/useRelationProvisionsQuery', '@/components/schema-builder/compat/relation-provisions'],
	['@/generated/schema-builder', '@/components/schema-builder/compat/schema-builder-sdk'],
	['@/generated/auth/hooks', '@/components/schema-builder/compat/auth-sdk'],
	['@/generated/admin/hooks', '@/components/schema-builder/compat/admin-sdk'],
	['@/generated/modules', '@/components/schema-builder/compat/modules-sdk'],
	['@/lib/utils', '@/components/schema-builder/lib/utils'],
]);

function rewriteSchemaBuilderAliases(source: string, relativePath: string): string {
	const edits: Array<{ start: number; end: number; replacement: string }> = [];
	for (const moduleSpecifier of collectModuleSpecifiers(source, relativePath)) {
		const exactAlias = exactAliases.get(moduleSpecifier.value);
		const replacement = exactAlias ?? (
			moduleSpecifier.value.startsWith('@/blocks/schema/')
				? `@/components/schema-builder/schema/${moduleSpecifier.value.slice('@/blocks/schema/'.length)}`
				: undefined
		);
		if (!replacement) continue;
		edits.push({
			start: moduleSpecifier.literal.getStart() + 1,
			end: moduleSpecifier.literal.getEnd() - 1,
			replacement,
		});
	}

	let rewritten = source;
	for (const edit of edits.sort((left, right) => right.start - left.start)) {
		rewritten = `${rewritten.slice(0, edit.start)}${edit.replacement}${rewritten.slice(edit.end)}`;
	}
	return rewritten;
}

buildSourceRegistry({
	packageRoot,
	item: {
		name: 'schema-builder',
		type: 'registry:block',
		title: 'Schema Builder',
		description: 'An adapter-driven PostgreSQL schema editor for tables, fields, relationships, indexes, and RLS policies.',
		categories: ['blocks', 'schema'],
		docs: "Install the complete source-owned editor with `pnpm dlx shadcn@latest add @constructive/schema-builder`, then import `SchemaBuilder` and `defineSchemaBuilderAdapter` from `@/components/schema-builder`. The host supplies its generated-SDK adapter, control-plane scope, navigation, preferences, and invalidation behavior; the block never owns backend endpoints or credentials.",
	},
	registrySubdirectory: 'blocks/schema-builder',
	targetPrefix: '@components/schema-builder',
	dependencies: [
		CONSTRUCTIVE_DATA_DEPENDENCY,
		'@dnd-kit/core',
		'@dnd-kit/utilities',
		'@fluentui/react-context-selector',
		'@pgsql/types@17.6.2',
		'@remixicon/react',
		'@tanstack/react-query',
		'clsx',
		'lucide-react',
		'motion',
		NODE_TYPE_REGISTRY_DEPENDENCY,
		'pg-ast@2.11.3',
		'tailwind-merge',
		'zustand',
	],
	rewriteSource: rewriteSchemaBuilderAliases,
});
