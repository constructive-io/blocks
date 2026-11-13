// The v9 table instance the DOM grid renders, mirrored from the shell: column
// descriptors, sizing and pinning, and the row selection in both directions.
import { useCallback, useMemo, useRef } from 'react';
import {
	functionalUpdate,
	type ColumnPinningState,
	type ColumnSizingState,
	type OnChangeFn,
	type RowSelectionState,
} from '@tanstack/react-table';

import { RangeSet } from '../../selection/range-set';
import { emptySheetsSelection } from '../../selection/selection-model';
import { useSheetsTableInstance, type SheetsColumnDescriptor } from '../../table/use-sheets-table-instance';
import { narrowColumnNames } from '../columns/column-layout';
import type { SheetsRow } from '../row-model';
import { DRAFT_ACTION_COLUMN_KEY } from '../sheets.constants';
import type { UseSheetsInternalResult } from '../use-sheets';

// Row selection (Phase 6), column sizing + pinning (Stage 2) are all wired to the shell now.
// Pinning is shell-DERIVED (frozenCount), never edited from the grid, so its onChange is a no-op.
// Stable empty row-selection map returned when nothing is selected.
const EMPTY_ROW_SELECTION: RowSelectionState = {};
const noop = () => {};

export function useGridTableState<TRow extends SheetsRow = SheetsRow>(s: UseSheetsInternalResult<TRow>) {
	const shell = s._shell;

	const columns = useMemo<SheetsColumnDescriptor[]>(
		() => s.columns.map((col) => ({ key: col.id, name: col.title, size: col.width })),
		[s.columns],
	);

	// ============== COLUMN SIZING + PINNING STATE MIRROR (Stage 2) ==============
	// Sizing: project the shell's columnWidths Map → v9 ColumnSizingState; a width committed
	// by the header drag-resize handle goes STRAIGHT to resizeColumn (the same setter the canvas
	// onColumnResize uses), so the Map stays the single source of truth and the table just mirrors.
	// Pinning: pin col0 ('id') exactly when the canvas freezes it (frozenCount), else nothing —
	// GridViewport's findStickyColumnIndex falls back to col0 anyway, so the sticky column is identical.
	const columnWidths = shell.columnWidths;
	const resizeColumn = shell.resizeColumn;
	const frozenCount = shell.frozenCount;
	const firstColumnKey = shell.columnKeys[0];

	const columnSizing = useMemo<Record<string, number>>(() => {
		const sizing: Record<string, number> = {};
		columnWidths.forEach((width, key) => {
			sizing[key] = width;
		});
		return sizing;
	}, [columnWidths]);

	// Columns that keep their width when the grid is wider than its columns: the ones the user
	// resized, and the draft-row action column. The viewport shares the spare width among the rest.
	const userWidths = shell.view.layout.layout.widths;
	const fixedWidthColumns = useMemo(
		() => new Set([...Object.keys(userWidths), ...columnWidths.keys(), DRAFT_ACTION_COLUMN_KEY]),
		[userWidths, columnWidths],
	);
	// Checkbox and number columns take spare width only when no other column can.
	const narrowColumns = useMemo(() => narrowColumnNames(shell.tableModel), [shell.tableModel]);

	const columnPinning = useMemo<ColumnPinningState>(
		() => ({ start: frozenCount > 0 && firstColumnKey ? [firstColumnKey] : [], end: [] }),
		[frozenCount, firstColumnKey],
	);

	const onColumnSizingChange = useCallback<OnChangeFn<ColumnSizingState>>(
		(updater) => {
			const next = functionalUpdate(updater, columnSizing);
			for (const key of Object.keys(next)) {
				if (next[key] !== columnSizing[key]) resizeColumn(key, next[key]);
			}
		},
		[columnSizing, resizeColumn],
	);

	// ============== ROW-SELECTION STATE MIRROR (Phase 6, both directions) ==============
	// The native SheetsSelection (RangeSet of ROW indices) stays canonical; the v9
	// table only needs a derived `Record<rowId, true>` view. Both directions use the
	// same metadata-defined row key, so renamed/composite PK selections round-trip.
	const combinedRows = shell.combinedRows;
	const getRowId = shell.getRowId;
	const selection = s.selection.gridSelection;
	const setSelection = s.selection.setGridSelection;
	// Active (keyboard cursor) cell `[col, row]`, threaded to the viewport for the focus ring +
	// aria-activedescendant. Derived in render (a plain read, no setState) per the no-setState-in-render rule.
	const activeCell = selection?.current?.cell;
	// The last active cell, where the cursor comes back after a clear (Escape, a press outside).
	const lastActiveCellRef = useRef<[number, number] | undefined>(undefined);
	if (activeCell) lastActiveCellRef.current = activeCell;

	const rowSelection = useMemo<RowSelectionState>(() => {
		if (!selection) return EMPTY_ROW_SELECTION;
		const map: RowSelectionState = {};
		for (const index of selection.rows.toArray()) {
			map[getRowId(combinedRows[index], index)] = true;
		}
		return map;
	}, [selection, combinedRows, getRowId]);

	const onRowSelectionChange = useCallback<OnChangeFn<RowSelectionState>>(
		(updater) => {
			const next = functionalUpdate(updater, rowSelection);
			// Map the selected row IDS back to row INDICES via combinedRows, then fold
			// into a fresh RangeSet. Active cell follows the lowest selected index (or
			// clears to the empty selection when nothing is selected).
			const indexById = new Map<string, number>();
			for (let i = 0; i < combinedRows.length; i++) indexById.set(getRowId(combinedRows[i], i), i);

			let rows = RangeSet.empty();
			let lowest: number | undefined;
			for (const id of Object.keys(next)) {
				if (!next[id]) continue;
				const index = indexById.get(id);
				if (index === undefined) continue;
				rows = rows.add(index);
				if (lowest === undefined || index < lowest) lowest = index;
			}

			if (lowest === undefined) {
				setSelection(emptySheetsSelection);
				return;
			}
			setSelection({ current: { cell: [0, lowest] }, rows, columns: RangeSet.empty() });
		},
		[rowSelection, combinedRows, getRowId, setSelection],
	);

	const table = useSheetsTableInstance({
		columns,
		data: combinedRows,
		columnSizing,
		columnPinning,
		rowSelection,
		onColumnSizingChange,
		// Pinning is shell-derived (frozenCount), never edited from the grid → no writer needed.
		onColumnPinningChange: noop,
		onRowSelectionChange,
		getRowId,
	});

	return {
		columns,
		table,
		resizeColumn,
		fixedWidthColumns,
		narrowColumns,
		combinedRows,
		getRowId,
		selection,
		setSelection,
		activeCell,
		lastActiveCellRef,
	};
}
