/* @vitest-environment jsdom */
//
// Stage-2 DOM row-marker test. Renders GridViewport with the optional leading
// checkbox / select-all column (the canvas `rowMarkers` analogue) and asserts it
// drives the canonical SheetsSelection RangeSet. The RowMarker prop is backed by
// a small in-test SheetsSelection so the assertions exercise the SAME pure
// selection helpers (toggleRow / selectRange / clear) the shell round-trips.
//
// Same idiom as grid-viewport-header.test.tsx: jsdom + react-dom/client createRoot
// + act (no @testing-library). jsdom does NO layout, so offsetWidth/offsetHeight
// are shimmed on HTMLElement so TanStack Virtual emits rows + columns.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { useSheetsTableInstance, type SheetsColumnDescriptor } from '../use-sheets-table-instance';
import { GridViewport, type RenderCell, type RowMarker } from '../grid-viewport';
import { clear, emptySheetsSelection, selectRange, toggleRow, type SheetsSelection } from '../../selection/selection-model';
import { RangeSet } from '../../selection/range-set';
import type { SheetsRow } from '../../grid/row-model';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const originalPointerEvent = window.PointerEvent;

beforeAll(() => {
	// Base UI creates a PointerEvent while normalizing checkbox activation, but
	// jsdom does not provide the constructor. MouseEvent implements every field
	// this interaction path reads and keeps the test focused on selection state.
	Object.defineProperty(window, 'PointerEvent', {
		configurable: true,
		writable: true,
		value: MouseEvent
	});
});

afterAll(() => {
	if (originalPointerEvent) {
		Object.defineProperty(window, 'PointerEvent', {
			configurable: true,
			writable: true,
			value: originalPointerEvent
		});
	} else {
		delete (window as unknown as Record<string, unknown>).PointerEvent;
	}
});

const COLUMNS: SheetsColumnDescriptor[] = [
	{ key: 'name', name: 'Name', size: 160 },
	{ key: 'count', name: 'Count', size: 160 },
	{ key: 'active', name: 'Active', size: 160 }
];

const ROWS: SheetsRow[] = [
	{ id: 'r1', name: 'Alpha', count: 11, active: true },
	{ id: 'r2', name: 'Bravo', count: 22, active: false },
	{ id: 'r3', name: 'Charlie', count: 33, active: true }
];

const noop = () => {};
const EMPTY = {} as never;

// Minimal cell renderer — this test is about the MARKER column, not cell content.
const renderCell: RenderCell = (_cell, ctx) => <div role='gridcell' data-col={ctx.columnIndex} />;

// Build a RowMarker over a given SheetsSelection, recording every toggle/range/all
// call so assertions can read the index/shiftKey the marker forwarded. `setSelection`
// is the test's seam into the canonical RangeSet — the pure helpers compute the next
// value exactly as SheetsDomInner does.
interface MarkerCalls {
	toggles: Array<{ index: number; shiftKey: boolean }>;
	all: number;
	next: SheetsSelection | null;
}

function makeRowMarker(sel: SheetsSelection, rowCount: number, calls: MarkerCalls, anchorRef: { value: number | null }): RowMarker {
	const selectedCount = sel.rows.length;
	const allSelected = rowCount > 0 && selectedCount === rowCount;
	return {
		isSelected: (index) => sel.rows.hasIndex(index),
		onToggleRow: (index, shiftKey) => {
			calls.toggles.push({ index, shiftKey });
			const anchor = anchorRef.value;
			calls.next = shiftKey && anchor !== null ? selectRange(sel, anchor, index) : toggleRow(sel, index);
			anchorRef.value = index;
		},
		allSelected,
		someSelected: selectedCount > 0 && !allSelected,
		onToggleAll: () => {
			calls.all += 1;
			calls.next =
				allSelected || rowCount === 0
					? clear(sel)
					: { current: { cell: [0, 0] }, rows: RangeSet.fromSingleSelection([0, rowCount]), columns: RangeSet.empty() };
		}
	};
}

interface HarnessProps {
	rowMarker?: RowMarker;
}

function Harness({ rowMarker }: HarnessProps) {
	const table = useSheetsTableInstance({
		columns: COLUMNS,
		data: ROWS,
		columnSizing: EMPTY,
		columnPinning: EMPTY,
		rowSelection: EMPTY,
		onColumnSizingChange: noop,
		onColumnPinningChange: noop,
		onRowSelectionChange: noop
	});
	return <GridViewport table={table} renderCell={renderCell} rowMarker={rowMarker} />;
}

describe('GridViewport row-marker column (leading checkbox + select-all → RangeSet)', () => {
	let root: Root;
	let container: HTMLDivElement;
	const proto = window.HTMLElement.prototype;
	const origW = Object.getOwnPropertyDescriptor(proto, 'offsetWidth');
	const origH = Object.getOwnPropertyDescriptor(proto, 'offsetHeight');

	beforeEach(() => {
		Object.defineProperty(proto, 'offsetWidth', { configurable: true, get: () => 1000 });
		Object.defineProperty(proto, 'offsetHeight', { configurable: true, get: () => 1000 });
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
	});

	afterEach(async () => {
		await act(async () => {
			root.unmount();
		});
		container.remove();
		if (origW) Object.defineProperty(proto, 'offsetWidth', origW);
		else delete (proto as unknown as Record<string, unknown>).offsetWidth;
		if (origH) Object.defineProperty(proto, 'offsetHeight', origH);
		else delete (proto as unknown as Record<string, unknown>).offsetHeight;
	});

	function markerCells(): HTMLElement[] {
		return Array.from(container.querySelectorAll<HTMLElement>('[data-slot="row-marker-cell"]'));
	}
	function markerHeader(): HTMLElement | null {
		return container.querySelector<HTMLElement>('[data-slot="row-marker-header"]');
	}
	function gridCells(): HTMLElement[] {
		return Array.from(container.querySelectorAll<HTMLElement>('[role="gridcell"]'));
	}
	// The base-ui Checkbox renders a <button data-slot="checkbox"> — the click target
	// that carries the native shiftKey for range-select.
	function checkboxIn(el: HTMLElement | null): HTMLElement | null {
		return el?.querySelector<HTMLElement>('[data-slot="checkbox"]') ?? null;
	}

	it('renders the marker header + a per-row checkbox cell when rowMarker is supplied', async () => {
		const calls: MarkerCalls = { toggles: [], all: 0, next: null };
		const anchorRef = { value: null as number | null };
		await act(async () => {
			root.render(<Harness rowMarker={makeRowMarker(emptySheetsSelection, ROWS.length, calls, anchorRef)} />);
		});

		// Header select-all cell renders, carrying a checkbox.
		expect(markerHeader()).toBeTruthy();
		expect(checkboxIn(markerHeader())).toBeTruthy();

		// One body marker cell per row, each carrying a checkbox.
		const cells = markerCells();
		expect(cells.length).toBe(ROWS.length);
		for (const cell of cells) expect(checkboxIn(cell)).toBeTruthy();
	});

	it('clicking a row checkbox calls onToggleRow with that row index (plain) or shiftKey (range)', async () => {
		const calls: MarkerCalls = { toggles: [], all: 0, next: null };
		const anchorRef = { value: null as number | null };
		await act(async () => {
			root.render(<Harness rowMarker={makeRowMarker(emptySheetsSelection, ROWS.length, calls, anchorRef)} />);
		});

		// Plain click on row 1's checkbox → onToggleRow(1, false) → selection becomes {1}.
		const row1 = checkboxIn(markerCells()[1]);
		expect(row1).toBeTruthy();
		await act(async () => {
			row1!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		expect(calls.toggles[0]).toEqual({ index: 1, shiftKey: false });
		expect(calls.next?.rows.toArray()).toEqual([1]);

		// Shift-click on row 2's checkbox → onToggleRow(2, true). Anchor is the prior
		// click (row 1), so selectRange yields the contiguous block {1,2}.
		const row2 = checkboxIn(markerCells()[2]);
		await act(async () => {
			row2!.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
		});
		expect(calls.toggles[1]).toEqual({ index: 2, shiftKey: true });
		expect(calls.next?.rows.toArray()).toEqual([1, 2]);
	});

	it('the header select-all reflects allSelected/someSelected and calls onToggleAll', async () => {
		const calls: MarkerCalls = { toggles: [], all: 0, next: null };
		const anchorRef = { value: null as number | null };

		// SOME selected (row 0 only) → header checkbox is indeterminate, not checked.
		const someSel: SheetsSelection = { rows: RangeSet.fromSingleSelection(0), columns: RangeSet.empty() };
		await act(async () => {
			root.render(<Harness rowMarker={makeRowMarker(someSel, ROWS.length, calls, anchorRef)} />);
		});
		const someBox = checkboxIn(markerHeader());
		expect(someBox?.getAttribute('aria-checked')).toBe('mixed'); // base-ui maps indeterminate → aria-checked="mixed"

		// Clicking select-all from a partial selection → onToggleAll → selects ALL rows [0,rowCount).
		await act(async () => {
			someBox!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		expect(calls.all).toBe(1);
		expect(calls.next?.rows.toArray()).toEqual([0, 1, 2]);

		// ALL selected → header checkbox is checked (not indeterminate).
		const allSel: SheetsSelection = { rows: RangeSet.fromSingleSelection([0, ROWS.length]), columns: RangeSet.empty() };
		await act(async () => {
			root.render(<Harness rowMarker={makeRowMarker(allSel, ROWS.length, calls, anchorRef)} />);
		});
		const allBox = checkboxIn(markerHeader());
		expect(allBox?.getAttribute('aria-checked')).toBe('true');

		// Clicking select-all when everything is selected → onToggleAll → clears back to empty.
		await act(async () => {
			allBox!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		expect(calls.all).toBe(2);
		expect(calls.next?.rows.toArray()).toEqual([]);
	});

	it('renders NO marker column when rowMarker is undefined (cell count unchanged)', async () => {
		// Baseline WITH the marker: capture the data-cell count.
		const calls: MarkerCalls = { toggles: [], all: 0, next: null };
		const anchorRef = { value: null as number | null };
		await act(async () => {
			root.render(<Harness rowMarker={makeRowMarker(emptySheetsSelection, ROWS.length, calls, anchorRef)} />);
		});
		expect(markerCells().length).toBe(ROWS.length);
		expect(markerHeader()).toBeTruthy();
		const cellsWithMarker = gridCells().length;

		// Re-render WITHOUT the marker: no marker header/cells, and the data-cell count is
		// identical (the marker column never participated in the gridcell count).
		await act(async () => {
			root.render(<Harness />);
		});
		expect(markerCells().length).toBe(0);
		expect(markerHeader()).toBeNull();
		expect(gridCells().length).toBe(cellsWithMarker);
	});
});
