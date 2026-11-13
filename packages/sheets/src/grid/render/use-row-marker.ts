// The leading checkbox / select-all column: its toggles write the canonical selection,
// and each row's open button opens the record panel, all through the command pipeline.
import { useCallback, useMemo, useRef } from 'react';

import type { TableModel } from '@constructive-io/data';

import type { Dispatch } from '../../commands/dispatch';
import { RangeSet } from '../../selection/range-set';
import { clear, emptySheetsSelection, selectRange, toggleRow, type SheetsSelection } from '../../selection/selection-model';
import type { RowMarker } from '../../table/grid-viewport';
import type { SheetsRow } from '../row-model';

export interface UseRowMarkerInput {
	combinedRows: SheetsRow[];
	selection: SheetsSelection | undefined;
	setSelection: (selection: SheetsSelection | undefined) => void;
	tableModel: TableModel | null;
	dispatch: Dispatch;
}

export function useRowMarker({ combinedRows, selection, setSelection, tableModel, dispatch }: UseRowMarkerInput) {
	// ============== LEADING CHECKBOX / SELECT-ALL COLUMN (drives the canonical RangeSet) ==============
	// The DOM grid has no canvas rowMarkers, so the GridViewport paints a sticky checkbox column whose
	// toggles write the canonical SheetsSelection directly (the rowSelection mirror above derives FROM
	// it). selectRange/toggleRow/clear are the same pure helpers the canvas projection round-trips, so
	// shift-range and ctrl-toggle behave identically. `shiftAnchorRef` records the last-toggled index so
	// a subsequent shift-click selects the contiguous block — caller-owned, matching selectRange's contract.
	const rowCount = combinedRows.length;
	const shiftAnchorRef = useRef<number | null>(null);
	// Latch selection + rowCount so the STABLE toggle impls (ctx methods) read the latest values
	// without re-creating, while rowMarker's handlers dispatch the named commands through `dispatch`.
	const rowMarkerSelectionRef = useRef(selection);
	rowMarkerSelectionRef.current = selection;
	const rowCountRef = useRef(rowCount);
	rowCountRef.current = rowCount;
	// Verbatim toggle bodies, lifted from the previous inline rowMarker handlers — the rowMarker
	// dispatches `rowmarker.toggleRow` / `rowmarker.toggleAll`, whose commands call these.
	const toggleRowImpl = useCallback((index: number, shiftKey: boolean) => {
		const sel = rowMarkerSelectionRef.current ?? emptySheetsSelection;
		const anchor = shiftAnchorRef.current;
		const next = shiftKey && anchor !== null ? selectRange(sel, anchor, index) : toggleRow(sel, index);
		shiftAnchorRef.current = index;
		setSelection(next);
	}, [setSelection]);
	const toggleAllImpl = useCallback(() => {
		const sel = rowMarkerSelectionRef.current ?? emptySheetsSelection;
		const rc = rowCountRef.current;
		const allSelected = rc > 0 && sel.rows.length === rc;
		shiftAnchorRef.current = null;
		setSelection(
			allSelected || rc === 0
				? clear(sel)
				: { current: { cell: [0, 0] }, rows: RangeSet.fromSingleSelection([0, rc]), columns: RangeSet.empty() },
		);
	}, [setSelection]);
	// Records open one by one only on a table with a primary key (the record panel needs it).
	const canOpenRecords = (tableModel?.primaryKey.length ?? 0) > 0;
	const rowMarker = useMemo<RowMarker>(() => {
		const sel = selection ?? emptySheetsSelection;
		const selectedCount = sel.rows.length;
		const allSelected = rowCount > 0 && selectedCount === rowCount;
		return {
			isSelected: (index) => sel.rows.hasIndex(index),
			// The row's open button runs `record.open` through the same pipeline as the key and the menu.
			onExpandRow: canOpenRecords ? (index) => dispatch('record.open', undefined, { rowIndex: index }) : undefined,
			// Toggle handlers route through the ONE dispatch pipeline (rowmarker.toggleRow /
			// rowmarker.toggleAll); the command bodies call toggleRowImpl / toggleAllImpl (the
			// verbatim selectRange/toggleRow/clear logic lifted above).
			onToggleRow: (index, shiftKey) => dispatch('rowmarker.toggleRow', undefined, { rowIndex: index, shift: shiftKey }),
			allSelected,
			someSelected: selectedCount > 0 && !allSelected,
			onToggleAll: () => dispatch('rowmarker.toggleAll'),
		};
	}, [selection, rowCount, dispatch, canOpenRecords]);

	return { rowMarker, toggleRowImpl, toggleAllImpl, canOpenRecords };
}
