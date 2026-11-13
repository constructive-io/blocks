// The grid's columns: the view's layout over every column of the table, the files-table
// preview column and the draft action column, with committed widths and the resize rule.
import { useCallback, useMemo } from 'react';

import type { MetaField, TableModel } from '@constructive-io/data';

import { useDataGridColumns, type RelationGridColumn } from '../../hooks/use-relation-columns';
import { filesTablePreviewColumn } from '../../uploads/files-table-preview';
import { layoutGridColumns } from '../columns/layout-grid-columns';
import type { useGridState } from '../hooks/use-grid-state';
import type { useInfiniteGridData } from '../hooks/use-infinite-grid-data';
import type { SheetsRow } from '../row-model';
import { DRAFT_ACTION_COLUMN_KEY } from '../sheets.constants';
import { mapFromFieldMetaMap } from '../sheets.utils';
import type { SheetsViewBindings } from '../view-state/use-sheets-view';

export interface UseSheetsColumnsInput {
	tableName: string;
	infiniteScroll: boolean;
	infiniteGridData: ReturnType<typeof useInfiniteGridData>;
	normalizedServerData: unknown[];
	combinedRows: SheetsRow[];
	fieldMetaMap: Map<string, MetaField>;
	tableModel: TableModel | null;
	view: SheetsViewBindings;
	hasDraftRows: boolean;
	gridState: ReturnType<typeof useGridState>['state'];
	gridActions: ReturnType<typeof useGridState>['actions'];
}

export function useSheetsColumns({
	tableName,
	infiniteScroll,
	infiniteGridData,
	normalizedServerData,
	combinedRows,
	fieldMetaMap,
	tableModel,
	view,
	hasDraftRows,
	gridState,
	gridActions,
}: UseSheetsColumnsInput) {
	const fieldMetaByKey = useMemo(() => mapFromFieldMetaMap(fieldMetaMap), [fieldMetaMap]);

	// Build columns with actual data
	// In infinite scroll mode, check if we have initial data
	const hasServerRows = infiniteScroll ? infiniteGridData.hasInitialData : normalizedServerData.length > 0;

	const { columns: allColumns, columnKeys: allColumnKeys } = useDataGridColumns(
		tableName,
		hasServerRows ? combinedRows : undefined,
	);
	// The view's column layout: which columns show, in what order (see grid/columns).
	const { columns: baseColumns, columnKeys } = useMemo(
		() => layoutGridColumns(allColumns, view.layout),
		[allColumns, view.layout],
	);

	// A storage files table gets a preview column (thumbnail and download link).
	const filePreviewColumn = useMemo(() => filesTablePreviewColumn(tableModel), [tableModel]);
	const gridColumnKeys = useMemo(() => {
		const keys = filePreviewColumn ? [...columnKeys, filePreviewColumn.id] : columnKeys;
		if (!hasDraftRows) return keys;
		return [...keys, DRAFT_ACTION_COLUMN_KEY];
	}, [columnKeys, filePreviewColumn, hasDraftRows]);

	// Apply custom widths to columns (the header draws the sort carets itself)
	const columns = useMemo<RelationGridColumn[]>(() => {
		const mapped = baseColumns.map((col) => ({
			...col,
			width: gridState.columnWidths.get(col.id || '') ?? col.width,
		}));

		if (filePreviewColumn) {
			mapped.push({ ...filePreviewColumn, width: gridState.columnWidths.get(filePreviewColumn.id) ?? filePreviewColumn.width });
		}

		if (hasDraftRows) {
			mapped.push({
				id: DRAFT_ACTION_COLUMN_KEY,
				title: '',
				width: gridState.columnWidths.get(DRAFT_ACTION_COLUMN_KEY) ?? 132,
			});
		}

		return mapped;
	}, [baseColumns, filePreviewColumn, gridState.columnWidths, hasDraftRows]);

	// Frozen columns come from the view's layout; a width drag on a table column goes to the
	// layout, one on a column the grid adds itself (preview, draft actions) to the grid state.
	const frozenCount = view.layout.frozenCount;
	const layoutSetWidth = view.layout.setWidth;
	const resizeColumn = useCallback(
		(id: string, width: number) => (allColumnKeys.includes(id) ? layoutSetWidth(id, width) : gridActions.resizeColumn(id, width)),
		[allColumnKeys, layoutSetWidth, gridActions],
	);

	return { fieldMetaByKey, allColumnKeys, columnKeys, gridColumnKeys, columns, frozenCount, resizeColumn };
}
