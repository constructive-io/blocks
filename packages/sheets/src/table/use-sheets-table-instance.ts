// The TanStack Table v9 instance for the DOM port.
//
// This is a STATE-MIRROR over already-server-processed rows — NOT a layout
// layer (TanStack Virtual does layout in S4) and NOT a data layer (useSheets
// does data). The hook takes EXPLICIT params (it never calls useSheets) so it
// is unit-testable with hand-fed data.
//
// Controlled state (S1): v8-style `state` partial + per-feature `on*Change`
// callbacks. The CALLER owns the slices (useGridState / the store) — the table
// is never a second writer, so there is no echo loop.
//
// manualSorting / manualFiltering / manualPagination / rowCount are OMITTED:
// they live only on the sorting/filtering/pagination feature option types,
// which we do not register, so those keys are not in our TableOptions and
// passing them is a TS error (S1 verdict).
import { useMemo } from 'react';
import { createColumnHelper, useTable } from '@tanstack/react-table';
import type {
	ColumnDef,
	ColumnPinningState,
	ColumnResizeMode,
	ColumnSizingState,
	OnChangeFn,
	RowSelectionState
} from '@tanstack/react-table';

import type { SheetsRow } from '../grid/row-model';
import { sheetsTableFeatures, type SheetsTableFeatures } from './features';

/** Smallest column descriptor the instance needs — key + header label (+ optional width). */
export interface SheetsColumnDescriptor {
	key: string;
	name: string;
	size?: number;
}

export type SheetsColumnDef = ColumnDef<SheetsTableFeatures, SheetsRow>;

export interface UseSheetsTableInstanceParams {
	/** Render-column descriptors (header label + key), in display order. */
	columns: SheetsColumnDescriptor[];
	/** Rows fed AS-IS — already server sorted/filtered/paginated by useSheets. */
	data: SheetsRow[];
	/** Committed column widths (caller-owned). */
	columnSizing: ColumnSizingState;
	/** Left/right column pins (caller-owned). */
	columnPinning: ColumnPinningState;
	/** Row selection map (caller-owned). */
	rowSelection: RowSelectionState;
	onColumnSizingChange: OnChangeFn<ColumnSizingState>;
	onColumnPinningChange: OnChangeFn<ColumnPinningState>;
	onRowSelectionChange: OnChangeFn<RowSelectionState>;
	/** Stable row id from the server primary key / draft meta. Defaults to `row.id`. */
	getRowId?: (row: SheetsRow, index: number) => string;
}

function defaultGetRowId(row: SheetsRow, index: number): string {
	// In infinite-scroll mode `data` is the null-backed proxy from useSheets: indices not yet
	// fetched read back as `null`. TanStack Table v9 builds its row model over EVERY index
	// (getRowId is called per row, eagerly), so guard the null placeholder and key it on the
	// index — the stable id an unloaded slot should carry until its page resolves.
	return row?.id != null ? String(row.id) : String(index);
}

/**
 * Build a v9 table instance wired with {@link sheetsTableFeatures} and the
 * caller-owned controlled state. The column defs carry only a minimal value
 * accessor (`row[key]`); the actual cell RENDER is the S5 host's job, so no
 * `cell` renderer is duplicated here.
 */
export function useSheetsTableInstance(params: UseSheetsTableInstanceParams) {
	const {
		columns,
		data,
		columnSizing,
		columnPinning,
		rowSelection,
		onColumnSizingChange,
		onColumnPinningChange,
		onRowSelectionChange,
		getRowId = defaultGetRowId
	} = params;

	const columnDefs = useMemo<SheetsColumnDef[]>(() => {
		const helper = createColumnHelper<SheetsTableFeatures, SheetsRow>();
		// accessor-FUNCTION branch (value by key) → requires an explicit `id`. Null-guard the row:
		// v9 evaluates accessors eagerly while building the row model, and in infinite-scroll mode
		// `data` is the null-backed proxy (unloaded indices read as `null`). The DOM cell host paints
		// those slots from `getSheetsCellContent` (→ loading skeleton), so this accessor value is only
		// a placeholder; returning `undefined` for a null row keeps the eager build from throwing.
		return columns.map((col) => helper.accessor((row) => row?.[col.key], { id: col.key, header: col.name, size: col.size }));
	}, [columns]);

	// The v9 pinning feature reads `state.columnPinning.{left,right}` directly (no defaulting
	// when a partial object is supplied), so `column.getIsPinned()` throws on a bare `{}`.
	// Normalize to a complete shape so callers may pass `{}` for "nothing pinned".
	const normalizedPinning = useMemo<ColumnPinningState>(
		() => ({ left: columnPinning.left ?? [], right: columnPinning.right ?? [] }),
		[columnPinning]
	);

	return useTable({
		features: sheetsTableFeatures,
		columns: columnDefs,
		data,
		getRowId,
		enableColumnPinning: true,
		enableColumnResizing: true,
		enableRowSelection: true,
		columnResizeMode: 'onChange' as ColumnResizeMode,
		// Controlled: our reducer/store is the source of truth for these slices.
		state: { columnSizing, columnPinning: normalizedPinning, rowSelection },
		onColumnSizingChange,
		onColumnPinningChange,
		onRowSelectionChange
		// Subscribe to NOTHING (`() => null`). v9 `useTable` runs `table.setOptions(...)` DURING render
		// to sync the controlled `state` above into its @tanstack/store atoms; a broad selector would make
		// THIS component a store subscriber, so that render-phase write notifies it synchronously →
		// `forceStoreRerender` → React's "Cannot update a component while rendering" warning. The slices
		// are caller-owned (the shell is the single source of truth) and the DOM grid reads layout via direct
		// table methods (getRowModel/getSize/getIsPinned), not `table.state`, so no subscription is needed —
		// the grid already re-renders from the shell's own state. (TanStack production-readiness: prefer
		// `() => null` + `table.Subscribe` over a broad `() => state` selector.)
	}, () => null);
}
