/**
 * Hook for fetching database constraints and indexes
 * Tier 4 wrapper: Uses SDK hooks + cache invalidation
 *
 * This includes:
 * - Primary key constraints
 * - Unique constraints
 * - Foreign key constraints
 * - Indexes
 *
 * These are fetched globally (no databaseId filter) because:
 * - tableId is globally unique across all databases
 * - During transformation, constraints are mapped by tableId to correct tables
 * - See transformUserDatabases() in transformers.ts
 *
 * Split from the original mega-query to enable different caching strategies:
 * - Constraints: 5min staleTime (changes rarely)
 * - Databases: 30s staleTime (see use-accessible-databases.ts)
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
	schemaBuilderQueryKey,
	useSchemaBuilderSdkClient,
	useSchemaBuilderRuntime,
} from '@/blocks/schema/schema-builder-core/context/block-config';

import type { SchemaContext } from '../../../../app-config';
import { parseListField } from './parse-list-field';

// Constraint types
export interface PrimaryKeyConstraint {
	databaseId: string;
	fieldIds: string[];
	id: string;
	name: string;
	tableId: string;
	type: string;
}

export interface UniqueConstraint {
	databaseId: string;
	fieldIds: string[];
	id: string;
	name: string;
	tableId: string;
	type: string;
}

export interface ForeignKeyConstraint {
	createdAt: string | null;
	databaseId: string;
	deleteAction: string | null;
	description: string | null;
	fieldIds: string[];
	id: string;
	name: string;
	refFieldIds: string[];
	refTableId: string;
	smartTags: Record<string, unknown> | null;
	tableId: string;
	type: string;
	updateAction: string | null;
}

export interface DatabaseIndex {
	accessMethod: string | null;
	createdAt: string | null;
	databaseId: string;
	fieldIds: string[];
	id: string;
	includeFieldIds: string[] | null;
	indexParams: string | null;
	isUnique: boolean | null;
	name: string;
	tableId: string;
	whereClause: string | null;
}

interface DatabaseConstraintsData {
	primaryKeyConstraints: PrimaryKeyConstraint[];
	uniqueConstraints: UniqueConstraint[];
	foreignKeyConstraints: ForeignKeyConstraint[];
	indexes: DatabaseIndex[];
}

export interface UseDatabaseConstraintsOptions {
	/** Enable/disable the query */
	enabled?: boolean;
	/** Override schema context (defaults to schema-builder) */
	context?: SchemaContext;
}

export interface UseDatabaseConstraintsResult {
	/** Primary key constraints across all databases */
	primaryKeyConstraints: PrimaryKeyConstraint[];
	/** Unique constraints across all databases */
	uniqueConstraints: UniqueConstraint[];
	/** Foreign key constraints across all databases */
	foreignKeyConstraints: ForeignKeyConstraint[];
	/** Index definitions across all databases */
	indexes: DatabaseIndex[];
	/** True only on initial load (no cached data yet) */
	isLoading: boolean;
	/** True when fetching (including background refetch with cached data) */
	isFetching: boolean;
	/** Error state */
	error: Error | null;
	/** Refetch function */
	refetch: () => Promise<unknown>;
}

/**
 * Hook for fetching database constraints and indexes
 *
 * This fetches constraints/indexes which change rarely (5min staleTime).
 * For databases/tables/fields (which change more often), use useAccessibleDatabases.
 *
 * @example
 * ```tsx
 * const {
 *   primaryKeyConstraints,
 *   foreignKeyConstraints,
 *   indexes,
 *   isLoading
 * } = useDatabaseConstraints();
 *
 * // Constraints are mapped by tableId in the transformer
 * foreignKeyConstraints.forEach(fk => {
 *   console.log(fk.name, fk.tableId, '->', fk.refTableId);
 * });
 * ```
 */
export function useDatabaseConstraints(
	options: UseDatabaseConstraintsOptions = {}
): UseDatabaseConstraintsResult {
	const { enabled = true, context = 'schema-builder' } = options;
	const { scope } = useSchemaBuilderRuntime();
	const {
		fetchForeignKeyConstraintsQuery,
		fetchIndicesQuery,
		fetchPrimaryKeyConstraintsQuery,
		fetchUniqueConstraintsQuery,
	} = useSchemaBuilderSdkClient();
	void context; // Context is handled by SDK execute-adapter

	const {
		data,
		isLoading,
		isFetching,
		error,
		refetch,
	} = useQuery<DatabaseConstraintsData>({
		queryKey: schemaBuilderQueryKey(scope, 'core', 'databaseConstraints', { context }),
		queryFn: async () => {
			// Fetch all constraint types in parallel using SDK fetch functions
			const [pkResult, uqResult, fkResult, idxResult] = await Promise.all([
				fetchPrimaryKeyConstraintsQuery({
					selection: {
						fields: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true },
					},
				}),
				fetchUniqueConstraintsQuery({
					selection: {
						fields: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true },
					},
				}),
				fetchForeignKeyConstraintsQuery({
					selection: {
						fields: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true, refFieldIds: true, refTableId: true, deleteAction: true, updateAction: true, description: true, smartTags: true, createdAt: true },
						orderBy: ['CREATED_AT_DESC'],
					},
				}),
				fetchIndicesQuery({
					selection: {
						fields: { id: true, databaseId: true, tableId: true, name: true, fieldIds: true, includeFieldIds: true, accessMethod: true, indexParams: true, whereClause: true, isUnique: true, createdAt: true },
						orderBy: ['CREATED_AT_DESC'],
					},
				}),
			]);

			// Map SDK types to local types
			const primaryKeyConstraints: PrimaryKeyConstraint[] = (pkResult.primaryKeyConstraints?.nodes ?? []).map(
				(node) => ({
					databaseId: node.databaseId ?? '',
					fieldIds: parseListField(node.fieldIds),
					id: node.id ?? '',
					name: node.name ?? '',
					tableId: node.tableId ?? '',
					type: node.type ?? '',
				}),
			);

			const uniqueConstraints: UniqueConstraint[] = (uqResult.uniqueConstraints?.nodes ?? []).map((node) => ({
				databaseId: node.databaseId ?? '',
				fieldIds: parseListField(node.fieldIds),
				id: node.id ?? '',
				name: node.name ?? '',
				tableId: node.tableId ?? '',
				type: node.type ?? '',
			}));

			const foreignKeyConstraints: ForeignKeyConstraint[] = (fkResult.foreignKeyConstraints?.nodes ?? []).map(
				(node) => ({
					createdAt: node.createdAt ?? null,
					databaseId: node.databaseId ?? '',
					deleteAction: node.deleteAction ?? null,
					description: node.description ?? null,
					fieldIds: parseListField(node.fieldIds),
					id: node.id ?? '',
					name: node.name ?? '',
					refFieldIds: parseListField(node.refFieldIds),
					refTableId: node.refTableId ?? '',
					smartTags: (node.smartTags as Record<string, unknown>) ?? null,
					tableId: node.tableId ?? '',
					type: node.type ?? '',
					updateAction: node.updateAction ?? null,
				}),
			);

			const indexes: DatabaseIndex[] = (idxResult.indices?.nodes ?? []).map((node): DatabaseIndex => ({
				accessMethod: node.accessMethod ?? null,
				createdAt: node.createdAt ?? null,
				databaseId: node.databaseId ?? '',
				fieldIds: parseListField(node.fieldIds),
				id: node.id ?? '',
				includeFieldIds: parseListField(node.includeFieldIds) ?? null,
				indexParams: typeof node.indexParams === 'string' ? node.indexParams : null,
				isUnique: node.isUnique ?? null,
				name: node.name ?? '',
				tableId: node.tableId ?? '',
				whereClause: typeof node.whereClause === 'string' ? node.whereClause : null,
			}));

			return {
				primaryKeyConstraints,
				uniqueConstraints,
				foreignKeyConstraints,
				indexes,
			};
		},
		enabled,
		staleTime: 5 * 60 * 1000, // 5 minutes - constraints change rarely
		refetchOnMount: true, // Respect staleTime (NOT 'always' which ignores cache)
		// Keep previous data during refetch to prevent UI flicker
		// This prevents constraint arrays from resetting to [] during background refetch
		placeholderData: keepPreviousData,
	});

	return {
		primaryKeyConstraints: data?.primaryKeyConstraints ?? [],
		uniqueConstraints: data?.uniqueConstraints ?? [],
		foreignKeyConstraints: data?.foreignKeyConstraints ?? [],
		indexes: data?.indexes ?? [],
		isLoading,
		isFetching,
		error,
		refetch,
	};
}

/**
 * Generate query keys for consistent cache management
 */
export const databaseConstraintsQueryKeys = {
	all: ['database-constraints'] as const,
	byContext: (context: SchemaContext) =>
		[...databaseConstraintsQueryKeys.all, { context }] as const,
};
