/* @vitest-environment jsdom */
//
// What a cursor move, a range and an edit render. Each body row is memoized on its own
// share of the selection and editing state, so a change renders only the rows it touches;
// rendering the whole window on every move made a large table slow to navigate and edit.
// Counted through `renderCell`, which the viewport calls once per cell of each row it renders.
//
// Same idiom as the other viewport tests: jsdom + createRoot + act, with offsetWidth and
// offsetHeight shimmed so TanStack Virtual lays out rows and columns.
import { act, useMemo, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { SheetsRow } from '../../grid/row-model';
import type { SelectionRect } from '../../selection/selection-model';
import { GridViewport, type GridEditingCell, type RenderCell } from '../grid-viewport';
import { useSheetsTableInstance, type SheetsColumnDescriptor } from '../use-sheets-table-instance';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const COLUMNS: SheetsColumnDescriptor[] = [
	{ key: 'name', name: 'Name', size: 160 },
	{ key: 'count', name: 'Count', size: 160 },
	{ key: 'active', name: 'Active', size: 160 },
];

const ROWS: SheetsRow[] = Array.from({ length: 12 }, (_, index) => ({ id: `r${index}`, name: `Row ${index}`, count: index, active: index % 2 === 0 }));

const noop = () => {};
const EMPTY = {} as never;

/** Rows `renderCell` was called for since the last reset. */
let renderedRows = new Set<number>();
const renderCell: RenderCell = (ctx) => {
	renderedRows.add(ctx.rowIndex);
	return <div role='gridcell' id={`sheets-cell-${ctx.rowIndex}-${ctx.columnIndex}`} data-active={ctx.isActive || undefined} />;
};

interface GridState {
	activeCell?: [number, number];
	activeRange?: SelectionRect;
	editingCell?: GridEditingCell;
}

let setGridState: (state: GridState) => void = noop;

function Harness() {
	const [state, setState] = useState<GridState>({ activeCell: [0, 2] });
	setGridState = setState;
	const table = useSheetsTableInstance({
		columns: COLUMNS,
		columnSizing: EMPTY,
		columnPinning: EMPTY,
		onColumnSizingChange: noop,
		onColumnPinningChange: noop,
	});
	const rows = useMemo(() => ROWS, []);
	return (
		<GridViewport
			table={table}
			rows={rows}
			renderCell={renderCell}
			activeCell={state.activeCell}
			activeRange={state.activeRange}
			editingCell={state.editingCell}
		/>
	);
}

describe('GridViewport render scope', () => {
	let root: Root;
	let container: HTMLDivElement;
	const proto = window.HTMLElement.prototype;
	const origW = Object.getOwnPropertyDescriptor(proto, 'offsetWidth');
	const origH = Object.getOwnPropertyDescriptor(proto, 'offsetHeight');

	beforeEach(async () => {
		Object.defineProperty(proto, 'offsetWidth', { configurable: true, get: () => 1000 });
		Object.defineProperty(proto, 'offsetHeight', { configurable: true, get: () => 1000 });
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
		await act(async () => {
			root.render(<Harness />);
		});
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

	async function change(state: GridState): Promise<number[]> {
		renderedRows = new Set();
		await act(async () => setGridState(state));
		return [...renderedRows].sort((a, b) => a - b);
	}

	it('draws every row once, then a cursor move renders only the row it leaves and the row it enters', async () => {
		expect(container.querySelectorAll('[role="row"][data-row]').length).toBe(ROWS.length);

		expect(await change({ activeCell: [1, 3] })).toEqual([2, 3]);
		expect(container.querySelector('[data-active]')?.id).toBe('sheets-cell-3-1');
		// Along the same row: that row only.
		expect(await change({ activeCell: [2, 3] })).toEqual([3]);
	});

	it('a range renders the rows it covers or leaves, and an in-place editor only its row', async () => {
		expect(await change({ activeCell: [0, 2], activeRange: { x: 0, y: 2, width: 2, height: 3 } })).toEqual([2, 3, 4]);
		expect(await change({ activeCell: [0, 2] })).toEqual([2, 3, 4]);
		expect(await change({ activeCell: [0, 2], editingCell: { rowIndex: 2, columnId: 'name' } })).toEqual([2]);
	});
});
