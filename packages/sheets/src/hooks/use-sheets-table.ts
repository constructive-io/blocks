/**
 * Unified hooks system for table operations
 * Consolidates all table operations into a single, powerful hook
 *
 * Ported from apps/admin use-table.ts with context injection.
 */
import { useMemo } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSheetsMeta } from './use-sheets-meta';
import { useSheetsAdapter } from '../adapter/use-sheets-adapter';
import { useSheetsContext } from '../context/sheets-context';
import type { SheetsScopeKey } from '../context/sheets-context';

import { cleanTable, type CleanTable, type MetaTable, type MutationOptions, type QueryOptions } from '@constructive-io/data';
import { createError } from '@constructive-io/data';
import type { FieldSelection } from '@constructive-io/data';
import {
	buildSelect,
	toCamelCasePlural,
	toCamelCaseSingular,
	toOrderByEnumValue,
} from '@constructive-io/data';
import { sheetsQueryKeys } from './query-keys';
import { resolveRelationFieldMap } from './relation-field-resolution';
import { validateOrderByVariables } from './orderby-enum-resolution';

type RowRecord = Record<string, unknown>;
type DeleteIdentifier = string | number | Record<string, string | number>;

function extractRowId(row: RowRecord | null | undefined): string | number | null {
	if (!row || typeof row !== 'object') {
		return null;
	}

	const candidate = (row as RowRecord).id;
	return typeof candidate === 'string' || typeof candidate === 'number' ? candidate : null;
}

/**
 * Transform relation data by extracting nodes from hasMany/manyToMany connections
 */
export function transformRelationData<TData extends RowRecord>(data: unknown, table: CleanTable): TData[] {
	if (!data) return [] as TData[];
	if (!Array.isArray(data)) return data as TData[];

	const transformed = data.map((row) => {
		if (!row || typeof row !== 'object') return row as TData;

		const transformedRow: RowRecord = { ...(row as RowRecord) };

		const hasManyRelations = table.relations.hasMany || [];
		const manyToManyRelations = table.relations.manyToMany || [];
		const connectionRelations = [...hasManyRelations, ...manyToManyRelations];

		connectionRelations.forEach((relation) => {
			const fieldName = relation.fieldName;
			if (!fieldName || !(fieldName in transformedRow)) return;

			const relationValue = transformedRow[fieldName];
			if (relationValue && typeof relationValue === 'object' && 'nodes' in (relationValue as RowRecord)) {
				const connectionData = relationValue as { nodes?: unknown[] };
				transformedRow[fieldName] = connectionData.nodes || [];
			}
		});

		return transformedRow as TData;
	});

	return transformed as TData[];
}

/**
 * Unified table hook options
 */
export interface UseTableOptions extends QueryOptions {
	/** Enable/disable automatic data fetching */
	enabled?: boolean;
	/** Field selection for queries */
	select?: FieldSelection;
	/** Mutation options */
	mutationOptions?: MutationOptions;
}

/**
 * Unified table hook result
 */
export interface UseTableResult<TData extends RowRecord = RowRecord> {
	// Data
	data: TData[];
	totalCount: number;
	isLoading: boolean;
	error: Error | null;

	// Single row operations
	findOne: (id: string | number) => Promise<TData | null>;

	// Mutations
	create: (data: RowRecord) => Promise<{ createdRow: TData | null }>;
	update: (id: string | number, patch: RowRecord) => Promise<{ updatedRow: TData | null }>;
	delete: (id: DeleteIdentifier) => Promise<{ deletedId: DeleteIdentifier }>;

	// Mutation states
	isCreating: boolean;
	isUpdating: boolean;
	isDeleting: boolean;

	// Mutation errors
	createError: Error | null;
	updateError: Error | null;
	deleteError: Error | null;

	// Utilities
	refetch: () => Promise<unknown>;
	invalidate: () => void;
}

/**
 * Generate query keys for consistent cache management
 */
export const sheetsTableQueryKeys = {
	scope: (scope: SheetsScopeKey) => sheetsQueryKeys.scope(scope),
	table: (scope: SheetsScopeKey, tableName: string) => sheetsQueryKeys.table(scope, tableName),
	tableRows: (scope: SheetsScopeKey, tableName: string, options?: QueryOptions) =>
		sheetsQueryKeys.tableRows(scope, tableName, options),
	tableRow: (scope: SheetsScopeKey, tableName: string, id: unknown) =>
		sheetsQueryKeys.tableRow(scope, tableName, id),
	tableCount: (scope: SheetsScopeKey, tableName: string, where?: Record<string, unknown>) =>
		sheetsQueryKeys.tableCount(scope, tableName, where),
};

const sheetsTableMutationKeys = {
	create: (scope: SheetsScopeKey, tableName: string) =>
		[...sheetsTableQueryKeys.table(scope, tableName), 'mutation', 'create'] as const,
	update: (scope: SheetsScopeKey, tableName: string) =>
		[...sheetsTableQueryKeys.table(scope, tableName), 'mutation', 'update'] as const,
	delete: (scope: SheetsScopeKey, tableName: string) =>
		[...sheetsTableQueryKeys.table(scope, tableName), 'mutation', 'delete'] as const,
};

/**
 * Transform QueryOptions to PostGraphile pagination variables
 */
export function transformToPostGraphileVariables(table: CleanTable, options: QueryOptions = {}): Record<string, unknown> {
	const variables: Record<string, unknown> = {};

	// Transform limit to first (PostGraphile uses first for forward pagination)
	const limitValue = options.limit ?? options.first;
	if (limitValue !== undefined) {
		variables.first = limitValue;
	}

	// Keep offset as is (PostGraphile supports offset-based pagination)
	if (options.offset !== undefined) {
		variables.offset = options.offset;
	}

	// Add cursor-based pagination variables (for infinite scroll)
	if (options.after !== undefined) {
		variables.after = options.after;
	}
	if (options.before !== undefined) {
		variables.before = options.before;
	}

	// Transform orderBy to PostGraphile format
	// PostGraphile expects format like: ["ID_ASC", "NAME_DESC"]
	if (options.orderBy && options.orderBy.length > 0) {
		const availableFields = new Set(table.fields.map((field) => field.name));
		variables.orderBy = options.orderBy
			.filter(({ field }) => availableFields.has(field))
			.map(({ field, direction }) => toOrderByEnumValue(field, direction));
	}

	// Add where/filter conditions if present
	if (options.where) {
		// constructive APIs expose the connection filter as `where` (buildSelect emits `$where`).
		// Naming this variable `filter` left `$where` unbound → server-side filtering was
		// silently dropped (every `where` returned all rows). Must match buildSelect's `$where`.
		variables.where = options.where;
	}

	return variables;
}

/**
 * Main unified table hook
 * Returns all table operations in a single hook
 */
export function useSheetsTable<TData extends RowRecord = RowRecord>(
	tableName: string,
	options: UseTableOptions = {},
): UseTableResult<TData> {
	const queryClient = useQueryClient();
	const { execute, scopeKey } = useSheetsContext();
	const { data: meta } = useSheetsMeta();
	const adapter = useSheetsAdapter();

	const tables = useMemo<CleanTable[]>(() => {
		if (!meta?._meta?.tables) return [];

		return meta._meta.tables
			.filter((candidate): candidate is MetaTable => candidate != null)
			.map((metaTable) => cleanTable(metaTable));
	}, [meta]);

	const table = useMemo<CleanTable | null>(
		() => tables.find((candidate) => candidate.name === tableName) ?? null,
		[tables, tableName],
	);

	// Extract options
	const { enabled = true, select: fieldSelection, mutationOptions = {}, ...queryOptions } = options;

	// Update query options with field selection
	const finalQueryOptions: QueryOptions = {
		...queryOptions,
		fieldSelection,
	};

	// Data fetching with error handling
	const {
		data,
		isLoading,
		error,
		refetch,
		} = useQuery<{ rows: TData[]; totalCount: number }>({
			queryKey: sheetsTableQueryKeys.tableRows(scopeKey, tableName, finalQueryOptions),
			queryFn: async () => {
				if (!table) {
					throw createError.notFound(`Table '${tableName}' not found`);
				}

				// Cache-bound resolution stays in the hook. The orderBy validation mutates
				// `variables.orderBy` (PostGraphile enum strings) in place; we fold that
				// result back into the `{ field, direction }[]` orderBy we hand the adapter,
				// so the adapter rebuilds an identical (validated) variables payload.
				const variables = transformToPostGraphileVariables(table, finalQueryOptions);

				const [relationFieldMap] = await Promise.all([
					resolveRelationFieldMap({
						table,
						fieldSelection: finalQueryOptions.fieldSelection,
						scopeKey,
						queryClient,
						execute,
					}),
					validateOrderByVariables(variables, table, scopeKey, queryClient, execute),
				]);

				const validatedOrderByEnum = new Set((variables.orderBy as string[] | undefined) ?? []);
				const availableOrderByFields = new Set(table.fields.map((field) => field.name));
				const validatedOrderBy = finalQueryOptions.orderBy?.filter(
					({ field, direction }) =>
						availableOrderByFields.has(field) && validatedOrderByEnum.has(toOrderByEnumValue(field, direction)),
				);

				const { rows, totalCount } = await adapter.listRows<TData>(
					{ table, allTables: tables, tableName },
					{
						...finalQueryOptions,
						orderBy: validatedOrderBy,
						// resolveRelationFieldMap yields `string | null` (null = omit field). The
						// contract narrows to `string`, but the null values are passed through to
						// buildSelect unchanged at runtime — behavior is identical to before.
						relationFieldMap: relationFieldMap as Record<string, string>,
					},
					execute,
				);
				return { rows, totalCount };
			},
		enabled: enabled && !!table,
		placeholderData: keepPreviousData,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});

	const rowsData = data?.rows ?? [];
	const totalCount = data?.totalCount ?? 0;

	// Create mutation with error handling
	const createMutation = useMutation<
		{ createdRow: TData | null; __rawResult: Record<string, unknown> },
		Error,
		RowRecord
	>({
		mutationKey: sheetsTableMutationKeys.create(scopeKey, tableName),
		mutationFn: async (data: RowRecord) => {
			if (!table) {
				throw createError.notFound(`Table '${tableName}' not found`);
			}

			// Get all tables for AST generation
			const allTables = meta?._meta?.tables
				? meta._meta.tables.filter((t): t is NonNullable<typeof t> => t != null).map(cleanTable)
				: [];

			const createdRow = await adapter.createRow<TData>({ table, allTables, tableName }, data, execute, {
				...mutationOptions,
				fieldSelection: mutationOptions.fieldSelection || fieldSelection || 'display',
			});

			return { createdRow, __rawResult: {} };
		},
		onSuccess: ({ createdRow }: { createdRow: TData | null; __rawResult: Record<string, unknown> }) => {
			// Invalidate all related queries for paginated mode
			queryClient.invalidateQueries({ queryKey: sheetsTableQueryKeys.table(scopeKey, tableName) });

			// Cross-invalidate infinite scroll queries to ensure both modes stay in sync
			queryClient.invalidateQueries({ queryKey: sheetsQueryKeys.infiniteTable(scopeKey, tableName) });

			// Update individual row cache
			const createdRowId = extractRowId(createdRow as RowRecord | null);
			if (createdRowId !== null) {
				queryClient.setQueryData(sheetsTableQueryKeys.tableRow(scopeKey, tableName, createdRowId), createdRow);
			}
		},
	});

	// Update mutation with error handling
	const updateMutation = useMutation<
		{ updatedRow: TData | null; __rawResult: Record<string, unknown> },
		Error,
		{ id: string | number; patch: RowRecord },
		{ previousRows: Array<[readonly unknown[], { rows: TData[]; totalCount: number } | undefined]> }
	>({
		mutationKey: sheetsTableMutationKeys.update(scopeKey, tableName),
		mutationFn: async ({ id, patch }) => {
			if (!table) {
				throw createError.notFound(`Table '${tableName}' not found`);
			}

			// Get all tables for AST generation
			const allTables = meta?._meta?.tables
				? meta._meta.tables.filter((t): t is NonNullable<typeof t> => t != null).map(cleanTable)
				: [];

			const updatedRow = await adapter.updateRow<TData>({ table, allTables, tableName }, id, patch, execute, {
				...mutationOptions,
				fieldSelection: mutationOptions.fieldSelection || fieldSelection || 'display',
			});

			return { updatedRow, __rawResult: {} };
		},
		// Optimistic patch: an inline cell edit must show the new value instantly,
		// not after the server round-trip + the onSuccess refetch round-trip. The
		// active rows cache is `{ rows, totalCount }` keyed by `tableRows(...options)`;
		// patch every cached `tableRows` variant that holds the row (the active query
		// key embeds `finalQueryOptions`, but other option permutations may be cached
		// too), matching the row by its scalar `id`.
		onMutate: async ({ id, patch }) => {
			const tablePrefix = sheetsTableQueryKeys.table(scopeKey, tableName);
			await queryClient.cancelQueries({ queryKey: tablePrefix });

			const isRowsKey = (key: readonly unknown[]) => key[key.length - 2] === 'rows';
			const previousRows = queryClient
				.getQueriesData<{ rows: TData[]; totalCount: number }>({ queryKey: tablePrefix })
				.filter(([key]) => isRowsKey(key)) as Array<
				[readonly unknown[], { rows: TData[]; totalCount: number } | undefined]
			>;

			for (const [key] of previousRows) {
				queryClient.setQueryData<{ rows: TData[]; totalCount: number }>(key, (old) => {
					if (!old) return old;
					let changed = false;
					const rows = old.rows.map((row) => {
						if (extractRowId(row as RowRecord) === id) {
							changed = true;
							return { ...(row as RowRecord), ...patch } as TData;
						}
						return row;
					});
					return changed ? { ...old, rows } : old;
				});
			}

			return { previousRows };
		},
		onError: (_err, _vars, ctx) => {
			// Roll the optimistic patch back to the snapshot on failure.
			ctx?.previousRows.forEach(([key, data]) => queryClient.setQueryData(key, data));
		},
		onSuccess: ({ updatedRow }: { updatedRow: TData | null; __rawResult: Record<string, unknown> }) => {
			// Invalidate all related queries for paginated mode
			queryClient.invalidateQueries({ queryKey: sheetsTableQueryKeys.table(scopeKey, tableName) });

			// NOTE: deliberately NOT invalidating the infinite-scroll cache here.
			// An inline field update never changes row membership/ordering/count, so:
			//   - infinite mode reconciles via the caller's optimistic `updateRowAtIndex`
			//     (+ self-heal refetch on a cache miss) in use-sheets.ts;
			//   - paginated mode is covered by the `table` invalidation above.
			// A blanket `infiniteTable` invalidation would refetch EVERY loaded page
			// (the live-observed 2x refetch on each edit) and clobber the optimistic
			// patch on the active page. The create/delete mutations still
			// cross-invalidate the infinite cache since no per-cell optimistic patch
			// covers a membership change.

			// Update individual row cache
			const updatedRowId = extractRowId(updatedRow as RowRecord | null);
			if (updatedRowId !== null) {
				queryClient.setQueryData(sheetsTableQueryKeys.tableRow(scopeKey, tableName, updatedRowId), updatedRow);
			}
		},
	});

	// Delete mutation with error handling
	const deleteMutation = useMutation<
		{ deletedId: DeleteIdentifier; __rawResult: Record<string, unknown> },
		Error,
		DeleteIdentifier
	>({
		mutationKey: sheetsTableMutationKeys.delete(scopeKey, tableName),
		mutationFn: async (idOrPk) => {
			if (!table) {
				throw createError.notFound(`Table '${tableName}' not found`);
			}

			// Get all tables for AST generation
			const allTables = meta?._meta?.tables
				? meta._meta.tables.filter((t): t is NonNullable<typeof t> => t != null).map(cleanTable)
				: [];

			await adapter.deleteRow({ table, allTables, tableName }, idOrPk, execute, mutationOptions);

			return { deletedId: idOrPk, __rawResult: {} };
		},
		onSuccess: ({ deletedId }: { deletedId: DeleteIdentifier; __rawResult: Record<string, unknown> }) => {
			// Invalidate all related queries for paginated mode
			queryClient.invalidateQueries({ queryKey: sheetsTableQueryKeys.table(scopeKey, tableName) });

			// Cross-invalidate infinite scroll queries to ensure both modes stay in sync
			queryClient.invalidateQueries({ queryKey: sheetsQueryKeys.infiniteTable(scopeKey, tableName) });

			// Remove individual row cache (only for scalar PK rows — composite PK rows aren't individually cached)
			if (deletedId && typeof deletedId !== 'object') {
				queryClient.removeQueries({
					queryKey: sheetsTableQueryKeys.tableRow(scopeKey, tableName, deletedId),
				});
			}
		},
	});

	// Find one function with error handling
	const findOne = async (id: string | number) => {
		if (!table) {
			throw createError.notFound(`Table '${tableName}' not found`);
		}

		const doc = buildSelect(table, tables, {
			where: { id: { equalTo: id } },
			limit: 1,
		});
		const variables = transformToPostGraphileVariables(table, {
			where: { id: { equalTo: id } },
			limit: 1,
		});
		const result = (await execute(doc, variables)) as Record<string, unknown>;

		// Some schemas expose a singular root field; keep this as a compatibility fallback.
		const singularName = toCamelCaseSingular(tableName, table);
		const singularData = result[singularName];
		if (singularData && typeof singularData === 'object') {
			return singularData as TData;
		}

		// Handle Relay-style response structure (connection fallback)
		const queryTableName = toCamelCasePlural(tableName, table);
		const data = result[queryTableName];

		if (data && typeof data === 'object' && 'nodes' in data) {
			const nodes = (data as { nodes: unknown[] }).nodes || [];
			const transformedNodes = transformRelationData<TData>(nodes, table);
			return transformedNodes[0] || null;
		}

		// Fallback for direct array response
		const rows = (result[tableName] as unknown[]) || [];
		const transformedRows = transformRelationData<TData>(rows, table);
		return transformedRows[0] || null;
	};

	// Invalidate function
	const invalidate = () => {
		queryClient.invalidateQueries({ queryKey: sheetsTableQueryKeys.table(scopeKey, tableName) });
	};

	return {
		// Data
		data: rowsData,
		totalCount,
		isLoading,
		error,

		// Single row operations
		findOne,

		// Mutations
		create: (data: RowRecord) => createMutation.mutateAsync(data),
		update: (id: string | number, patch: RowRecord) => updateMutation.mutateAsync({ id, patch }),
		delete: (id: DeleteIdentifier) => deleteMutation.mutateAsync(id),

		// Mutation states
		isCreating: createMutation.isPending,
		isUpdating: updateMutation.isPending,
		isDeleting: deleteMutation.isPending,

		// Mutation errors
		createError: createMutation.error,
		updateError: updateMutation.error,
		deleteError: deleteMutation.error,

		// Utilities
		refetch,
		invalidate,
	};
}
