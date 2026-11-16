/**
 * Unified hooks system for table operations
 * Consolidates all table operations into a single, powerful hook
 *
 * Ported from apps/admin use-table.ts with context injection. Every document
 * is built from the table model (see `useTableModel`).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSheetsAdapter } from '../adapter/use-sheets-adapter';
import { useSheetsContext } from '../context/sheets-context';
import { partialResultOf } from '../context/sheets-execute';
import type { SheetsScopeKey } from '../context/sheets-context';

import { buildFindOneDocument, createError, type TableModel } from '@constructive-io/data';
import type { FieldSelection, MutationOptions, QueryOptions } from '@constructive-io/data';
import { reuseSheetsPlaceholderData, sheetsMutationKeys, sheetsQueryKeys } from './query-keys';
import { relationsFromSelection, sortSpecs, whereFilter } from './list-query';
import { useTableModel } from './use-table-model';
import {
	resolveSheetsIdentifier,
	resolveSheetsRowIdentity,
	sheetsIdentifierCacheKey,
	sheetsIdentifierToRowKey,
	type SheetsRowIdentifier,
} from '../row-identity';

type RowRecord = Record<string, unknown>;
type DeleteIdentifier = SheetsRowIdentifier;

/**
 * Unified table hook options
 */
export interface UseTableOptions extends Omit<QueryOptions, 'where'> {
	/** A filter in the server's filter input shape (any operator the model reports, relation and search fields included). */
	where?: Readonly<Record<string, unknown>>;
	/** Columns to fetch (the primary key and relation keys are always added). Omitted: every readable column. */
	columns?: readonly string[];
	/** Enable/disable automatic data fetching */
	enabled?: boolean;
	/** Field selection for queries: `includeRelations` (or the `full` preset) chooses the relations to select. */
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
	/** True while a request for the current options is in flight, also while the previous rows are still shown. */
	isFetching: boolean;
	error: Error | null;

	/** The table model, or null while it loads or when it failed. */
	model: TableModel | null;

	// Single row operations
	findOne: (id: SheetsRowIdentifier) => Promise<TData | null>;

	// Mutations
	create: (data: RowRecord) => Promise<{ createdRow: TData | null }>;
	update: (id: SheetsRowIdentifier, patch: RowRecord) => Promise<{ updatedRow: TData | null }>;
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
 * Generate query keys for consistent cache management. `tableRef` is a
 * `TableModel.key` or a table name.
 */
export const sheetsTableQueryKeys = {
	scope: (scope: SheetsScopeKey) => sheetsQueryKeys.scope(scope),
	table: (scope: SheetsScopeKey, tableRef: string) => sheetsQueryKeys.table(scope, tableRef),
	tableRows: (scope: SheetsScopeKey, tableRef: string, options?: unknown) =>
		sheetsQueryKeys.tableRows(scope, tableRef, options),
	tableRow: (scope: SheetsScopeKey, tableRef: string, id: unknown) =>
		sheetsQueryKeys.tableRow(scope, tableRef, id),
	tableCount: (scope: SheetsScopeKey, tableRef: string, where?: Readonly<Record<string, unknown>>) =>
		sheetsQueryKeys.tableCount(scope, tableRef, where),
};

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
	const adapter = useSheetsAdapter();
	const {
		model,
		tableKey,
		metaTable: tableMeta,
		isLoading: isModelLoading,
		error: modelError,
		refetch: refetchModel,
	} = useTableModel(tableName);
	// Cache entries are keyed by `TableModel.key`; the bare name is only a fallback before `_meta` loads.
	const cacheRef = tableKey ?? tableName;

	const requireModel = (): TableModel => {
		if (model) return model;
		throw modelError ?? createError.notFound(`Table '${tableName}' not found`);
	};

	const resolveIdentifier = (identifier: SheetsRowIdentifier): SheetsRowIdentifier => {
		if (!tableMeta) throw createError.notFound(`Table '${tableName}' not found`);
		const resolution = resolveSheetsIdentifier(tableMeta, identifier);
		if (resolution.status !== 'identified') {
			throw createError.badRequest(`Cannot resolve a primary-key identity for table '${tableName}'.`);
		}
		return resolution.identifier;
	};

	const rowCacheKey = (row: RowRecord | null | undefined): string | number | null => {
		if (!tableMeta || !row) return null;
		const resolution = resolveSheetsRowIdentity(tableMeta, row);
		if (resolution.status !== 'identified') return null;
		return typeof resolution.identifier === 'object' ? resolution.key : resolution.identifier;
	};

	// Extract options
	const { enabled = true, select: fieldSelection, mutationOptions = {}, ...queryOptions } = options;

	// Update query options with field selection
	const finalQueryOptions = {
		...queryOptions,
		fieldSelection,
	};

	// Data fetching with error handling
	const {
		data,
		isLoading: isRowsLoading,
		isFetching,
		error: rowsError,
		refetch,
	} = useQuery<{ rows: TData[]; totalCount: number }>({
		queryKey: sheetsTableQueryKeys.tableRows(scopeKey, cacheRef, finalQueryOptions),
		queryFn: async ({ signal }) => {
			const where = whereFilter(finalQueryOptions.where);
			// The total depends on the filter only, so turning a page or re-sorting reuses it.
			// Creates, updates and deletes invalidate it with the rest of the table.
			const countKey = sheetsTableQueryKeys.tableCount(scopeKey, cacheRef, where);
			const known = queryClient.getQueryState<number>(countKey);
			const knownCount = known?.status === 'success' && !known.isInvalidated ? known.data : undefined;
			const { rows, totalCount } = await adapter.listRows<TData>(
				{ model: requireModel(), tableName },
				{
					where,
					orderBy: sortSpecs(finalQueryOptions.orderBy),
					limit: finalQueryOptions.limit ?? finalQueryOptions.first,
					offset: finalQueryOptions.offset,
					after: finalQueryOptions.after,
					relations: relationsFromSelection(fieldSelection),
					columns: finalQueryOptions.columns,
					includeTotalCount: knownCount === undefined,
					signal,
				},
				execute,
			);
			if (knownCount !== undefined) return { rows, totalCount: knownCount };
			queryClient.setQueryData(countKey, totalCount);
			return { rows, totalCount };
		},
		enabled: enabled && !!model,
		placeholderData: (previousData, previousQuery) =>
			reuseSheetsPlaceholderData(previousData, previousQuery?.queryKey, scopeKey),
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
		mutationKey: sheetsMutationKeys.table(scopeKey, cacheRef, 'create'),
		mutationFn: async (data: RowRecord) => {
			const createdRow = await adapter.createRow<TData>({ model: requireModel(), tableName }, data, execute, mutationOptions);
			return { createdRow, __rawResult: {} };
		},
		onSuccess: ({ createdRow }: { createdRow: TData | null; __rawResult: Record<string, unknown> }) => {
			// Invalidate all related queries for paginated mode
			queryClient.invalidateQueries({ queryKey: sheetsTableQueryKeys.table(scopeKey, cacheRef) });

			// Cross-invalidate infinite scroll queries to ensure both modes stay in sync
			queryClient.invalidateQueries({ queryKey: sheetsQueryKeys.infiniteTable(scopeKey, cacheRef) });

			// Update individual row cache
			const createdRowKey = rowCacheKey(createdRow as RowRecord | null);
			if (createdRowKey !== null) {
				queryClient.setQueryData(sheetsTableQueryKeys.tableRow(scopeKey, cacheRef, createdRowKey), createdRow);
			}
		},
	});

	// Update mutation with error handling
	const updateMutation = useMutation<
		{ updatedRow: TData | null; __rawResult: Record<string, unknown> },
		Error,
		{ id: SheetsRowIdentifier; patch: RowRecord },
		{ previousRows: Array<[readonly unknown[], { rows: TData[]; totalCount: number } | undefined]> }
	>({
		mutationKey: sheetsMutationKeys.table(scopeKey, cacheRef, 'update'),
		mutationFn: async ({ id, patch }) => {
			const updatedRow = await adapter.updateRow<TData>(
				{ model: requireModel(), tableName },
				resolveIdentifier(id),
				patch,
				execute,
				mutationOptions,
			);
			return { updatedRow, __rawResult: {} };
		},
		// Optimistic patch: an inline cell edit must show the new value instantly,
		// not after the server round-trip + the onSuccess refetch round-trip. The
		// active rows cache is `{ rows, totalCount }` keyed by `tableRows(...options)`;
		// patch every cached `tableRows` variant that holds the row (the active query
		// key embeds `finalQueryOptions`, but other option permutations may be cached
		// too), matching the row by its primary-key identity.
		onMutate: async ({ id, patch }) => {
			const tablePrefix = sheetsTableQueryKeys.table(scopeKey, cacheRef);
			await queryClient.cancelQueries({ queryKey: tablePrefix });
			const targetKey = tableMeta ? sheetsIdentifierCacheKey(tableMeta, id) : null;

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
						if (targetKey !== null && rowCacheKey(row as RowRecord) === targetKey) {
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
			queryClient.invalidateQueries({ queryKey: sheetsTableQueryKeys.table(scopeKey, cacheRef) });

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
			const updatedRowKey = rowCacheKey(updatedRow as RowRecord | null);
			if (updatedRowKey !== null) {
				queryClient.setQueryData(sheetsTableQueryKeys.tableRow(scopeKey, cacheRef, updatedRowKey), updatedRow);
			}
		},
	});

	// Delete mutation with error handling
	const deleteMutation = useMutation<
		{ deletedId: DeleteIdentifier; __rawResult: Record<string, unknown> },
		Error,
		DeleteIdentifier
	>({
		mutationKey: sheetsMutationKeys.table(scopeKey, cacheRef, 'delete'),
		mutationFn: async (idOrPk) => {
			await adapter.deleteRow({ model: requireModel(), tableName }, resolveIdentifier(idOrPk), execute, mutationOptions);
			return { deletedId: idOrPk, __rawResult: {} };
		},
		onSuccess: ({ deletedId }: { deletedId: DeleteIdentifier; __rawResult: Record<string, unknown> }) => {
			// Invalidate all related queries for paginated mode
			queryClient.invalidateQueries({ queryKey: sheetsTableQueryKeys.table(scopeKey, cacheRef) });

			// Cross-invalidate infinite scroll queries to ensure both modes stay in sync
			queryClient.invalidateQueries({ queryKey: sheetsQueryKeys.infiniteTable(scopeKey, cacheRef) });

			const deletedRowKey = tableMeta ? sheetsIdentifierCacheKey(tableMeta, deletedId) : null;
			if (deletedRowKey !== null) {
				queryClient.removeQueries({
					queryKey: sheetsTableQueryKeys.tableRow(scopeKey, cacheRef, deletedRowKey),
				});
			}
		},
	});

	// Read one row through the list field filtered by its primary key.
	const findOne = async (id: SheetsRowIdentifier): Promise<TData | null> => {
		const tableModel = requireModel();
		const document = buildFindOneDocument(tableModel, sheetsIdentifierToRowKey(tableModel, resolveIdentifier(id)), {
			relations: relationsFromSelection(fieldSelection),
		});
		try {
			return document.read(await execute(document.document, document.variables)) as TData | null;
		} catch (error) {
			// Like a list read: a record with a cell the API could not serve still loads, with that cell's error on it.
			const partial = partialResultOf(error);
			if (!partial) throw error;
			try {
				return document.read(partial.data, partial.errors) as TData | null;
			} catch {
				throw error;
			}
		}
	};

	// Invalidate function
	const invalidate = () => {
		queryClient.invalidateQueries({ queryKey: sheetsTableQueryKeys.table(scopeKey, cacheRef) });
	};

	return {
		// Data
		data: rowsData,
		totalCount,
		isLoading: (enabled && isModelLoading) || isRowsLoading,
		isFetching,
		error: rowsError ?? (enabled ? modelError : null),
		model,

		// Single row operations
		findOne,

		// Mutations
		create: (data: RowRecord) => createMutation.mutateAsync(data),
		update: (id: SheetsRowIdentifier, patch: RowRecord) => updateMutation.mutateAsync({ id, patch }),
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
		// A table whose model failed has no rows query to run: load the model again; the rows follow.
		refetch: () => (model ? refetch() : refetchModel()),
		invalidate,
	};
}
