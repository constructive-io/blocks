// The rows source: infinite scroll or paginated, unified into one shape, plus the
// write capabilities the table model proves and the row identity helpers.
import { useCallback, useMemo } from 'react';

import type { SortSpec } from '@constructive-io/data';

import { resolveSheetsRowIdentity, sheetsRowKey, type SheetsRowIdentifier } from '../../row-identity';
import type { useGridState } from '../hooks/use-grid-state';
import { useInfiniteGridData } from '../hooks/use-infinite-grid-data';
import { useDataLoading } from '../hooks/use-load-grid';
import { getDraftMeta, type SheetsRow } from '../row-model';

export interface UseSheetsDataInput {
	tableName: string;
	pageSize: number;
	infiniteScroll: boolean;
	orderByClause: SortSpec[] | undefined;
	effectiveWhere: Record<string, unknown> | undefined;
	fetchColumns: string[] | undefined;
	fetchRelations: string[] | undefined;
	gridState: ReturnType<typeof useGridState>['state'];
}

export function useSheetsData({
	tableName,
	pageSize,
	infiniteScroll,
	orderByClause,
	effectiveWhere,
	fetchColumns,
	fetchRelations,
	gridState,
}: UseSheetsDataInput) {
	// ============== INFINITE SCROLL MODE ==============
	const infiniteGridData = useInfiniteGridData({
		tableName,
		pageSize,
		orderBy: orderByClause,
		where: effectiveWhere,
		columns: fetchColumns,
		relations: fetchRelations,
		enabled: infiniteScroll,
	});

	// ============== PAGINATED MODE ==============
	const initialQueryOptions = useMemo(
		() => ({
			limit: pageSize,
			offset: gridState.pageIndex * pageSize,
			orderBy: orderByClause,
			where: effectiveWhere,
			columns: fetchColumns,
			relations: fetchRelations,
		}),
		[pageSize, gridState.pageIndex, orderByClause, effectiveWhere, fetchColumns, fetchRelations],
	);

	// In infinite scroll mode we still use mutations from useDataLoading,
	// but disable row/count queries to avoid duplicate fetching.
	const dataLoadingResult = useDataLoading({
		tableName,
		queryOptions: initialQueryOptions,
		enabled: !infiniteScroll,
	});

	// ============== UNIFIED DATA ACCESS ==============
	// Choose data source based on mode
	const {
		serverData,
		totalCount,
		tableMeta,
		tableModel,
		fieldMetaMap,
		allRelationFields,
		hasCompletedInitialLoad,
		dataError,
		isInitialLoading,
		isFetchingRows,
	} = useMemo(() => {
		if (infiniteScroll) {
			return {
				serverData: [] as any[], // Not used directly in infinite mode
				totalCount: infiniteGridData.totalCount,
				tableMeta: infiniteGridData.tableMeta,
				tableModel: infiniteGridData.tableModel,
				fieldMetaMap: infiniteGridData.fieldMetaMap,
				allRelationFields: infiniteGridData.allRelationFields,
				hasCompletedInitialLoad: infiniteGridData.hasInitialData,
				dataError: infiniteGridData.error,
				// Only the first load (no rows yet) should show the loading screen; refetches keep previous data.
				isInitialLoading: infiniteGridData.isLoading && !infiniteGridData.hasInitialData,
				isFetchingRows: infiniteGridData.isFetching,
			};
		}
		const ctx = dataLoadingResult.contextValue;
		const rows = ctx.data || [];
		return {
			serverData: rows,
			totalCount: ctx.totalCount,
			tableMeta: ctx.tableMeta,
			tableModel: ctx.tableModel,
			fieldMetaMap: ctx.fieldMetaMap,
			allRelationFields: ctx.allRelationFields,
			hasCompletedInitialLoad: !ctx.isLoading,
			dataError: ctx.error,
			// isLoading is true only until the active scope receives its first result.
			isInitialLoading: ctx.isLoading && rows.length === 0,
			isFetchingRows: ctx.isFetching,
		};
	}, [infiniteScroll, infiniteGridData, dataLoadingResult.contextValue]);

	// Writes are allowed only for operations the table model proved against the schema.
	const canCreate = Boolean(tableModel?.operations.create);
	const canUpdate = Boolean(tableModel?.operations.update);
	const canDelete = Boolean(tableModel?.operations.delete);
	const primaryKeyFields = useMemo(() => new Set(tableModel?.primaryKey ?? []), [tableModel]);
	const readOnlyReason = tableModel && !canUpdate
		? tableModel.issues.find((issue) => issue.scope === 'operation' && issue.target === 'update')?.message ?? null
		: null;
	const getRowIdentifier = useCallback(
		(row: Readonly<Record<string, unknown>>): SheetsRowIdentifier | null => {
			if (!tableMeta) return null;
			const resolution = resolveSheetsRowIdentity(tableMeta, row);
			return resolution.status === 'identified' ? resolution.identifier : null;
		},
		[tableMeta],
	);
	const getRowId = useCallback(
		(row: SheetsRow | null | undefined, index: number): string => {
			const draftMeta = getDraftMeta(row);
			if (draftMeta) return draftMeta.draftRowId;
			if (row && tableMeta) return sheetsRowKey(tableMeta, row, index);
			return `${tableMeta?.schemaName ?? ''}:${tableName}:row:${index}`;
		},
		[tableMeta, tableName],
	);

	return {
		infiniteGridData,
		dataLoadingResult,
		serverData,
		totalCount,
		tableMeta,
		tableModel,
		fieldMetaMap,
		allRelationFields,
		hasCompletedInitialLoad,
		dataError,
		isInitialLoading,
		isFetchingRows,
		canCreate,
		canUpdate,
		canDelete,
		primaryKeyFields,
		readOnlyReason,
		getRowIdentifier,
		getRowId,
	};
}
