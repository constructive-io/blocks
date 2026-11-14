/**
 * Hook for integrating infinite scroll with the data grid
 * Wraps useSheetsInfiniteTable and provides grid-specific utilities
 */
import { useCallback, useMemo } from 'react';

import type { MetaField, MetaQuery, TableModel } from '@constructive-io/data';

import { useSheetsMeta } from '../../hooks/use-sheets-meta';
import { useSheetsInfiniteTable, type UseInfiniteTableOptions } from '../../hooks/use-sheets-infinite-table';

import { useTableModel } from '../../hooks/use-table-model';
import { gridRelationFieldNames } from '../../relations/relation-columns';
import { gridRelationSelection } from '../../hooks/list-query';
import { normalizeServerRow } from '../sheets.utils';
import { buildFieldMetaMap, findTableMeta } from './use-load-grid';

type RowRecord = Record<string, unknown>;

/** Native inclusive row window — the DOM grid's visible-range shape (no glide Rectangle). */
export interface VisibleRowRange {
	startIndex: number;
	endIndex: number;
}

type MetaTable = NonNullable<NonNullable<NonNullable<MetaQuery['_meta']>['tables']>[number]>;

export interface UseInfiniteGridDataOptions extends Omit<UseInfiniteTableOptions, 'select'> {
	tableName: string;
	/** Relation fields to fetch, for example the ones the view shows. Omitted: every relation the grid shows. */
	relations?: readonly string[];
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
	/** True while a page request for the current options is in flight, also while placeholder rows from the previous options show */
	isFetching: boolean;
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
	/** The table model, or null while it loads. */
	tableModel: TableModel | null;
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
	columns,
	relations,
	enabled = true,
}: UseInfiniteGridDataOptions): UseInfiniteGridDataResult {
	// Get metadata
	const { data: meta, error: metaError } = useSheetsMeta({ enabled });

	const tableMeta = useMemo<MetaTable | null>(() => findTableMeta(meta, tableName), [meta, tableName]);

	// `_meta` fields by name, for quick lookup
	const fieldMetaMap = useMemo(() => {
		const fields = (tableMeta?.fields as MetaField[]) || [];
		return buildFieldMetaMap(fields);
	}, [tableMeta]);

	// The relations the grid shows, from the table model (the same cache entry the pages use).
	const { model: relationModel } = useTableModel(tableName, { enabled });
	const allRelationFields = useMemo<string[]>(() => gridRelationFieldNames(relationModel), [relationModel]);

	const relationFieldNames = useMemo(() => new Set(allRelationFields), [allRelationFields]);

	// The stable options key compares options by content, so a new `relations` array with the same fields reuses the pages.
	const fieldSelection = useMemo(() => gridRelationSelection(allRelationFields, relations), [allRelationFields, relations]);

	// Use the infinite table hook
	const infiniteTable = useSheetsInfiniteTable<RowRecord>(tableName, {
		pageSize,
		orderBy,
		where,
		columns,
		select: fieldSelection,
		enabled,
	});

	// One normalized row per server row object. A server row is never changed in place (an
	// optimistic update writes a new row object), so a row read twice is the same object: the
	// cells keep their memoized output and the normalization runs once per row, not per read.
	const normalizedRows = useMemo(() => new WeakMap<RowRecord, RowRecord>(), [relationFieldNames]);
	const readRow = infiniteTable.getRowAtIndex;
	const getRowAtIndex = useCallback(
		(rowIndex: number): RowRecord | null => {
			const rawRow = readRow(rowIndex);
			if (rawRow === null) return null;
			let row = normalizedRows.get(rawRow);
			if (!row) {
				row = normalizeServerRow(rawRow, relationFieldNames);
				normalizedRows.set(rawRow, row);
			}
			return row;
		},
		[readRow, normalizedRows, relationFieldNames],
	);

	// Prefetch rows for an inclusive visible window (native range).
	const ensureRowsLoaded = infiniteTable.ensureRowsLoaded;
	const onVisibleRegionChanged = useCallback(
		(range: VisibleRowRange) => {
			// Add buffer for smoother scrolling
			const buffer = Math.ceil(pageSize / 2);
			ensureRowsLoaded(Math.max(0, range.startIndex - buffer), range.endIndex + buffer);
		},
		[ensureRowsLoaded, pageSize],
	);

	return useMemo(
		() => ({
			getRowAtIndex,
			totalCount: infiniteTable.totalCount,
			isRowLoaded: infiniteTable.isRowLoaded,
			onVisibleRegionChanged,
			isLoading: infiniteTable.isLoading,
			isFetching: infiniteTable.isFetching,
			hasInitialData: infiniteTable.hasInitialData,
			error: metaError ?? infiniteTable.error,
			invalidate: infiniteTable.invalidate,
			// Optimistically update a single row without refetching; false on a cache miss so callers refetch.
			updateRowAtIndex: infiniteTable.updateRowAtIndex,
			tableMeta,
			tableModel: infiniteTable.model,
			fieldMetaMap,
			allRelationFields,
			pageSize,
		}),
		[getRowAtIndex, infiniteTable, onVisibleRegionChanged, metaError, tableMeta, fieldMetaMap, allRelationFields, pageSize],
	);
}
