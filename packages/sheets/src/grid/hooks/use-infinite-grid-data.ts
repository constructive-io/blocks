/**
 * Hook for integrating infinite scroll with the data grid
 * Wraps useSheetsInfiniteTable and provides grid-specific utilities
 */
import { useCallback, useMemo } from 'react';

import type { MetaField, MetaQuery } from '@constructive-io/data';

import { useSheetsContext } from '../../context/sheets-context';
import { useSheetsMeta } from '../../hooks/use-sheets-meta';
import { useSheetsInfiniteTable, type UseInfiniteTableOptions } from '../../hooks/use-sheets-infinite-table';

import { getAllRelationFields } from '../../utils/relation-utils';
import { normalizeServerRow } from '../sheets.utils';

type RowRecord = Record<string, unknown>;

/** Native inclusive row window — the DOM grid's visible-range shape (no glide Rectangle). */
export interface VisibleRowRange {
	startIndex: number;
	endIndex: number;
}

type MetaTable = NonNullable<NonNullable<NonNullable<MetaQuery['_meta']>['tables']>[number]>;

/**
 * Apply field type overrides from SheetsConfig to field metadata.
 * Mirrors the logic in use-load-grid.ts for consistent behavior.
 */
function buildFieldMetaMap(
	fields: MetaField[],
	tableName: string,
	fieldTypeOverrides?: Record<string, string>,
): Map<string, MetaField> {
	const map = new Map<string, MetaField>();

	if (!fields || fields.length === 0) return map;

	for (const field of fields) {
		if (!field?.name) continue;

		const overrideKey = `${tableName}.${field.name}`;
		const overridePgAlias = fieldTypeOverrides?.[overrideKey];

		if (overridePgAlias && field.type?.pgAlias !== overridePgAlias) {
			map.set(field.name, {
				...field,
				type: {
					...field.type,
					pgAlias: overridePgAlias,
				},
			} as MetaField);
		} else {
			map.set(field.name, field);
		}
	}

	return map;
}

export interface UseInfiniteGridDataOptions extends Omit<UseInfiniteTableOptions, 'select'> {
	tableName: string;
}

export interface UseInfiniteGridDataResult {
	/** Get row at index, returns null if not loaded */
	getRowAtIndex: (index: number) => RowRecord | null;
	/** Total count of rows */
	totalCount: number;
	/** Check if row is loaded */
	isRowLoaded: (rowIndex: number) => boolean;
	/** Prefetch the rows in an inclusive visible window (native range, not a glide Rectangle). */
	onVisibleRegionChanged: (range: VisibleRowRange) => void;
	/** Whether data is loading */
	isLoading: boolean;
	/** Whether initial data has been fetched */
	hasInitialData: boolean;
	/** Error if any */
	error: Error | null;
	/** Invalidate and refetch all data */
	invalidate: () => void;
	/**
	 * Optimistically update a single row in the cache without refetching.
	 * Used after successful cell edits to avoid full grid refresh.
	 * @param rowIndex The index of the row to update
	 * @param patch Partial row data to merge with existing row
	 * @returns true if the row was found and updated, false on a cache miss
	 */
	updateRowAtIndex: (rowIndex: number, patch: Partial<RowRecord>) => boolean;
	/** Table metadata */
	tableMeta: MetaTable | null;
	/** Field metadata map */
	fieldMetaMap: Map<string, MetaField>;
	/** All relation field names */
	allRelationFields: string[];
	/** Page size */
	pageSize: number;
}

/**
 * Hook that provides infinite scroll data loading for the grid
 */
export function useInfiniteGridData({
	tableName,
	pageSize = 100,
	orderBy,
	where,
	enabled = true,
}: UseInfiniteGridDataOptions): UseInfiniteGridDataResult {
	// Get metadata
	const { data: meta, error: metaError } = useSheetsMeta({ enabled });
	const { config } = useSheetsContext();

	const tableMeta = useMemo<MetaTable | null>(() => {
		const candidate = meta?._meta?.tables?.find((t) => t?.name === tableName) as MetaTable | undefined;
		return candidate ?? null;
	}, [meta, tableName]);

	// Field metadata map for quick lookup, enhanced with field type overrides
	const fieldMetaMap = useMemo(() => {
		const candidate = meta?._meta?.tables?.find((t) => t?.name === tableName) as MetaTable | undefined;
		const fields = (candidate?.fields as MetaField[]) || [];
		return buildFieldMetaMap(fields, tableName, config.fieldTypeOverrides);
	}, [meta, tableName, config.fieldTypeOverrides]);

	const metaTables = meta?._meta?.tables;
	const allRelationFields = useMemo<string[]>(
		() => {
			const rawTables = metaTables?.filter((t): t is NonNullable<typeof t> => t != null);
			return getAllRelationFields(tableMeta?.relations, rawTables);
		},
		[tableMeta, metaTables],
	);

	const relationFieldNames = useMemo(() => new Set(allRelationFields), [allRelationFields]);

	const fieldSelection = useMemo(() => {
		if (allRelationFields.length === 0) return 'all' as const;
		return { includeRelations: allRelationFields };
	}, [allRelationFields]);

	// Use the infinite table hook
	const infiniteTable = useSheetsInfiniteTable<RowRecord>(tableName, {
		pageSize,
		orderBy,
		where,
		select: fieldSelection,
		enabled,
	});

	// Get row at index with normalization
	// Note: We don't cache normalized rows because optimistic updates change the underlying
	// data without changing the row id. Caching by id causes stale data to be returned.
	// Normalization is cheap enough to do on every access.
	const getRowAtIndex = useCallback(
		(rowIndex: number): RowRecord | null => {
			const rawRow = infiniteTable.getRowAtIndex(rowIndex);
			if (rawRow === null) return null;

			// Always normalize - caching caused stale data issues with optimistic updates
			// because the cache key (id) doesn't change when other fields are updated
			return normalizeServerRow(rawRow, relationFieldNames);
		},
		[infiniteTable, relationFieldNames],
	);

	// Prefetch rows for an inclusive visible window (native range).
	const onVisibleRegionChanged = useCallback(
		(range: VisibleRowRange) => {
			const startRow = range.startIndex;
			const endRow = range.endIndex;

			// Add buffer for smoother scrolling
			const buffer = Math.ceil(pageSize / 2);
			infiniteTable.ensureRowsLoaded(Math.max(0, startRow - buffer), endRow + buffer);
		},
		[infiniteTable, pageSize],
	);

	// Invalidate and refetch
	const invalidate = useCallback(() => {
		infiniteTable.invalidate();
	}, [infiniteTable]);

	// Optimistically update a single row without refetching
	const updateRowAtIndex = useCallback(
		(rowIndex: number, patch: Partial<RowRecord>): boolean => {
			// Update the underlying React Query page cache
			// getRowAtIndex will return the updated data on next access.
			// Propagate the inner boolean so callers can self-heal (refetch) on a cache miss.
			return infiniteTable.updateRowAtIndex(rowIndex, patch);
		},
		[infiniteTable],
	);

	return {
		getRowAtIndex,
		totalCount: infiniteTable.totalCount,
		isRowLoaded: infiniteTable.isRowLoaded,
		onVisibleRegionChanged,
		isLoading: infiniteTable.isLoading,
		hasInitialData: infiniteTable.hasInitialData,
		error: metaError ?? infiniteTable.error,
		invalidate,
		updateRowAtIndex,
		tableMeta,
		fieldMetaMap,
		allRelationFields,
		pageSize,
	};
}
