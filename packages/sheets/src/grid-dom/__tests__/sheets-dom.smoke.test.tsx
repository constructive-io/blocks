/* @vitest-environment jsdom */
//
// Phase-1 DOM-spine smoke test. Renders the S4 GridViewport over the S3 table
// instance with the S5 SheetsCellHost, fed HAND-CRAFTED rows — NOT the full
// GraphQL-backed Sheets (its data hooks pull @constructive-io/data, awkward
// under vitest; full integration is Chrome-verified at Phase 8).
//
// Uses the package's existing component-test idiom: jsdom + react-dom/client
// createRoot + act (no @testing-library — not a dep of this package).
//
// jsdom does NO layout, so TanStack Virtual's `getRect` (reads offsetWidth/
// offsetHeight) sees 0 → outerSize 0 → range null → zero virtual items. We shim
// offsetWidth/offsetHeight on HTMLElement so the scroll element reports a real
// viewport and every fixture row/column virtualizes in.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useSheetsTableInstance, type SheetsColumnDescriptor } from '../../table/use-sheets-table-instance';
import { GridViewport, type RenderCell } from '../../table/grid-viewport';
import { SheetsCellHost } from '../sheets-cell-host';
import { createSheetsCell } from '../../cell-model/create-sheets-cell';
import { makeMetadata } from '../../grid/__golden__/display-cases';
import type { CellType } from '../../cell-types/types';
import type { SheetsCellResolution } from '../use-sheets-content';
import type { SheetsRow } from '../../grid/row-model';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

// Map each fixture column to the CellType the resolver should build it as. The host
// now requires an injected resolver (it no longer guesses kind from the JS value),
// so the test stands in for the real `getSheetsCellContent`: read the hand-fed value
// and dispatch through the same `createSheetsCell` family selection the shell uses.
const COL_TYPE: Record<string, CellType> = { name: 'text', count: 'number', active: 'boolean' };

const getSheetsCellContent = (rowIndex: number, colKey: string): SheetsCellResolution => {
	const value = (ROWS[rowIndex] as Record<string, unknown>)?.[colKey];
	const typeKey = COL_TYPE[colKey] ?? 'unknown';
	const cell = createSheetsCell(value, makeMetadata(typeKey));
	return { cell, component: undefined, colKey, typeKey };
};

const renderCell: RenderCell = (c, ctx) => (
	<SheetsCellHost cell={c} ctx={ctx} getSheetsCellContent={getSheetsCellContent} />
);

const noop = () => {};
const EMPTY = {} as never;

function Harness() {
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
	return <GridViewport table={table} renderCell={renderCell} />;
}

describe('DOM spine smoke (GridViewport + SheetsCellHost, hand-fed)', () => {
	let root: Root;
	let container: HTMLDivElement;
	const proto = window.HTMLElement.prototype;
	const origW = Object.getOwnPropertyDescriptor(proto, 'offsetWidth');
	const origH = Object.getOwnPropertyDescriptor(proto, 'offsetHeight');

	beforeEach(() => {
		// Give the (layout-less) jsdom elements a non-zero size so TanStack
		// Virtual's getRect yields outerSize > 0 and emits virtual items.
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

	it('renders real gridcell nodes, value text, the dom marker, and zero canvas', async () => {
		await act(async () => {
			root.render(<Harness />);
		});

		// (a) Real DOM nodes with role=gridcell. 3 rows × 3 cols (col0 sticky +
		// 2 virtualized) = 9. Asserts count > 0 AND the exact expected count.
		const gridcells = container.querySelectorAll('[role="gridcell"]');
		expect(gridcells.length).toBeGreaterThan(0);
		expect(gridcells.length).toBe(ROWS.length * COLUMNS.length);

		// (b) text / number values surface as DOM text. Booleans render via BooleanCellView
		// as a read-only design-system Checkbox (role=checkbox + aria-checked), NOT the
		// literal "true"/"false".
		const text = container.textContent ?? '';
		expect(text).toContain('Alpha'); // text
		expect(text).toContain('Charlie');
		expect(text).toContain('11'); // number
		expect(text).toContain('33');
		expect(text).not.toContain('true'); // booleans never surface as literal strings
		expect(text).not.toContain('false');
		// Boolean cells exist (one per row's `active` column), each a read-only Checkbox;
		// both polarities are present (some checked, some unchecked).
		const boolCells = Array.from(container.querySelectorAll<HTMLElement>('[data-slot="boolean-cell"]'));
		expect(boolCells.length).toBe(ROWS.length);
		expect(boolCells.every((c) => c.querySelector('[data-slot="checkbox"]'))).toBe(true); // each renders a Checkbox
		expect(boolCells.some((c) => c.querySelector('[data-slot="checkbox"][aria-checked="true"]'))).toBe(true); // some checked
		expect(boolCells.some((c) => c.querySelector('[data-slot="checkbox"][aria-checked="false"]'))).toBe(true); // some unchecked

		// (c) the DOM-path marker is present (GridViewport root).
		expect(container.querySelector('[data-impl="dom"]')).not.toBeNull();

		// (d) ZERO canvas elements — the canvas render path is not on the DOM spine.
		expect(container.querySelectorAll('canvas').length).toBe(0);
	});
});
