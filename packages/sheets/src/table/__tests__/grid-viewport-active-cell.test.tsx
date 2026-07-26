/* @vitest-environment jsdom */
//
// Stage-2 active-cell test. Renders GridViewport wired with `activeCell`, `onActivateCell`,
// and `onGridKeyDown` and asserts the spreadsheet keyboard/active-cell FOUNDATION:
//   • the active cell renders with aria-selected + the stable id="sheets-cell-${row}-${col}"
//     and the focus-ring class (z-10 ring-2 ...) — driven by ctx.isActive at the call site.
//   • a click on a cell calls onActivateCell(col, row).
//   • an ArrowDown on the grid ROOT advances the active cell down one row (via moveActive),
//     and clamps at the last row.
//
// Same idiom as grid-viewport-rowmarker.test.tsx: jsdom + react-dom/client createRoot + act
// (no @testing-library). jsdom does NO layout, so offsetWidth/offsetHeight are shimmed so
// TanStack Virtual emits rows + columns. No real layout/scroll is asserted (jsdom-safe).
import { act, useCallback, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSheetsTableInstance, type SheetsColumnDescriptor } from '../use-sheets-table-instance';
import { GridViewport, type RenderCell } from '../grid-viewport';
import { moveActive, type SheetsSelection } from '../../selection/selection-model';
import { RangeSet } from '../../selection/range-set';
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

const noop = () => {};
const EMPTY = {} as never;

interface HarnessProps {
	onActivateCell?: (col: number, row: number) => void;
}

// Mirrors SheetsDomInner's active-cell wiring: state holds the canonical SheetsSelection;
// the grid root keydown advances the active cell via the SAME pure `moveActive` helper the
// shell reducer uses, clamped to grid bounds. `onActivateCell` (click) parks the active cell.
function Harness({ onActivateCell }: HarnessProps) {
	const [selection, setSelection] = useState<SheetsSelection>(() => ({
		current: { cell: [0, 0] },
		rows: RangeSet.empty(),
		columns: RangeSet.empty()
	}));

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

	const activate = useCallback(
		(col: number, row: number) => {
			onActivateCell?.(col, row);
			setSelection((sel) => ({ ...sel, current: { cell: [col, row] } }));
		},
		[onActivateCell]
	);

	// Minimal renderer that mirrors the host: surfaces ctx.isActive (id + aria-selected + ring)
	// and wires onClick → onActivateCell, WITHOUT depending on the full SheetsCellHost.
	const renderCell = useCallback<RenderCell>(
		(_cell, ctx) => (
			<div
				role='gridcell'
				id={`sheets-cell-${ctx.rowIndex}-${ctx.columnIndex}`}
				aria-selected={ctx.isActive || undefined}
				data-active={ctx.isActive ? 'true' : undefined}
				onClick={() => activate(ctx.columnIndex, ctx.rowIndex)}
				className={ctx.isActive ? 'z-10 ring-2 ring-inset ring-primary' : ''}
			/>
		),
		[activate]
	);

	const onGridKeyDown = useCallback((e: React.KeyboardEvent) => {
		const deltas: Record<string, [number, number]> = {
			ArrowUp: [0, -1],
			ArrowDown: [0, 1],
			ArrowLeft: [-1, 0],
			ArrowRight: [1, 0]
		};
		const delta = deltas[e.key];
		if (!delta) return;
		e.preventDefault();
		setSelection((sel) => moveActive(sel, delta[0], delta[1], COLUMNS.length, ROWS.length));
	}, []);

	const activeCell = selection.current?.cell;
	return (
		<GridViewport
			table={table}
			renderCell={renderCell}
			activeCell={activeCell}
			onGridKeyDown={onGridKeyDown}
			activeDescendantId={activeCell ? `sheets-cell-${activeCell[1]}-${activeCell[0]}` : undefined}
		/>
	);
}

describe('GridViewport active cell (focus ring + click-to-activate + arrow nav)', () => {
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
		vi.clearAllMocks();
		if (origW) Object.defineProperty(proto, 'offsetWidth', origW);
		else delete (proto as unknown as Record<string, unknown>).offsetWidth;
		if (origH) Object.defineProperty(proto, 'offsetHeight', origH);
		else delete (proto as unknown as Record<string, unknown>).offsetHeight;
	});

	function gridRoot(): HTMLElement {
		return container.querySelector<HTMLElement>('[data-part-id="sheets-viewport"]')!;
	}
	function activeCellNode(): HTMLElement | null {
		return container.querySelector<HTMLElement>('[data-active="true"]');
	}

	it('renders the active cell with aria-selected, the ring id, and the focus-ring class', async () => {
		await act(async () => {
			root.render(<Harness />);
		});

		// The active cell is [0,0] → id sheets-cell-0-0, aria-selected, ring class.
		const active = activeCellNode();
		expect(active).toBeTruthy();
		expect(active!.id).toBe('sheets-cell-0-0');
		expect(active!.getAttribute('aria-selected')).toBe('true');
		expect(active!.className).toContain('ring-2');

		// The grid root mirrors it via aria-activedescendant.
		expect(gridRoot().getAttribute('aria-activedescendant')).toBe('sheets-cell-0-0');

		// Exactly ONE active cell.
		expect(container.querySelectorAll('[data-active="true"]').length).toBe(1);
	});

	it('a click on a cell calls onActivateCell(col, row) and moves the ring', async () => {
		const onActivateCell = vi.fn();
		await act(async () => {
			root.render(<Harness onActivateCell={onActivateCell} />);
		});

		// Click the cell at row 2, col 1 (id sheets-cell-2-1).
		const target = container.querySelector<HTMLElement>('#sheets-cell-2-1')!;
		expect(target).toBeTruthy();
		await act(async () => {
			target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(onActivateCell).toHaveBeenCalledTimes(1);
		expect(onActivateCell).toHaveBeenCalledWith(1, 2);
		// The ring followed the click.
		expect(activeCellNode()!.id).toBe('sheets-cell-2-1');
	});

	it('ArrowDown on the grid root advances the active cell one row and clamps at the last row', async () => {
		await act(async () => {
			root.render(<Harness />);
		});
		expect(activeCellNode()!.id).toBe('sheets-cell-0-0');

		// ArrowDown → row 1.
		await act(async () => {
			gridRoot().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
		});
		expect(activeCellNode()!.id).toBe('sheets-cell-1-0');

		// ArrowDown → row 2 (last row).
		await act(async () => {
			gridRoot().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
		});
		expect(activeCellNode()!.id).toBe('sheets-cell-2-0');

		// ArrowDown again → CLAMPED at the last row (still row 2).
		await act(async () => {
			gridRoot().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
		});
		expect(activeCellNode()!.id).toBe('sheets-cell-2-0');
	});
});
