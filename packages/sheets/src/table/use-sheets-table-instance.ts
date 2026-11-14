// The TanStack Table v9 instance for the DOM port: the COLUMNS (sizes, pins,
// resizing, headers). It is a state-mirror, not a layout layer (TanStack Virtual
// lays out in GridViewport) and not a data layer (useSheets loads the rows).
//
// It holds no rows. v9 builds its row model eagerly over every row of `data` and
// rebuilds it whenever the array changes, which on a 100k-row table cost seconds per
// interaction. The viewport draws rows by index straight from the row array instead.
//
// Controlled state (S1): v8-style `state` partial + per-feature `on*Change`
// callbacks. The CALLER owns the slices (useGridState / the store) — the table
// is never a second writer, so there is no echo loop.
import { useMemo } from 'react';
import { createColumnHelper, useTable } from '@tanstack/react-table';
import type {
	ColumnDef,
	ColumnPinningState,
	ColumnResizeMode,
	ColumnSizingState,
	OnChangeFn
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
	/** Committed column widths (caller-owned). */
	columnSizing: ColumnSizingState;
	/** Logical start/end column pins (caller-owned). */
	columnPinning: ColumnPinningState;
	onColumnSizingChange: OnChangeFn<ColumnSizingState>;
	onColumnPinningChange: OnChangeFn<ColumnPinningState>;
}

const NO_ROWS: SheetsRow[] = [];

/**
 * Build a v9 table instance wired with {@link sheetsTableFeatures} and the
 * caller-owned controlled column state. The column defs carry only a minimal value
 * accessor (`row[key]`); the cell RENDER is the cell host's job.
 */
export function useSheetsTableInstance(params: UseSheetsTableInstanceParams) {
	const { columns, columnSizing, columnPinning, onColumnSizingChange, onColumnPinningChange } = params;

	const columnDefs = useMemo<SheetsColumnDef[]>(() => {
		const helper = createColumnHelper<SheetsTableFeatures, SheetsRow>();
		// accessor-FUNCTION branch (value by key) → requires an explicit `id`.
		return columns.map((col) => helper.accessor((row) => row?.[col.key], { id: col.key, header: col.name, size: col.size }));
	}, [columns]);

	// The v9 pinning feature reads `state.columnPinning.{start,end}` directly (no defaulting
	// when a partial object is supplied), so `column.getIsPinned()` throws on a bare `{}`.
	// Normalize to a complete shape so callers may pass `{}` for "nothing pinned".
	const normalizedPinning = useMemo<ColumnPinningState>(
		() => ({ start: columnPinning.start ?? [], end: columnPinning.end ?? [] }),
		[columnPinning]
	);

	// `useTable` returns a new object whenever this options object is new: memoized, the table
	// (and the header and row components memoized on what it gives) keeps its identity.
	const options = useMemo(
		() => ({
			features: sheetsTableFeatures,
			columns: columnDefs,
			data: NO_ROWS,
			enableColumnPinning: true,
			enableColumnResizing: true,
			columnResizeMode: 'onChange' as ColumnResizeMode,
			// Controlled: our reducer/store is the source of truth for these slices.
			state: { columnSizing, columnPinning: normalizedPinning },
			onColumnSizingChange,
			onColumnPinningChange
		}),
		[columnDefs, columnSizing, normalizedPinning, onColumnSizingChange, onColumnPinningChange]
	);

	// Subscribe to NOTHING (`() => null`). v9 `useTable` runs `table.setOptions(...)` DURING render
	// to sync the controlled `state` above into its @tanstack/store atoms; a broad selector would make
	// THIS component a store subscriber, so that render-phase write notifies it synchronously →
	// `forceStoreRerender` → React's "Cannot update a component while rendering" warning. The slices
	// are caller-owned (the shell is the single source of truth) and the DOM grid reads layout via direct
	// table methods (getSize/getIsPinned), not `table.state`, so no subscription is needed —
	// the grid already re-renders from the shell's own state. (TanStack production-readiness: prefer
	// `() => null` + `table.Subscribe` over a broad `() => state` selector.)
	return useTable(options, (): null => null);
}
