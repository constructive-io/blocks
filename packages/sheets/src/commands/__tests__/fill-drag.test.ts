/**
 * Spec for the fill.drag command (P4 Phase 3, Stage B) + the pure fill-handle geometry.
 *
 * `fill.drag` is the pointer-driven analogue of fill.down/right: the nub release hands the
 * source band + the dropped `[col,row]`; the command extends the band along the DOMINANT axis,
 * REPLICATES the source across the new cells (one commitCells batch), and WIDENS the selection.
 * SCOPE — value replication only; SERIES detection is DEFERRED.
 */

import { describe, expect, it, vi } from 'vitest';

import { createGridCommandRegistry } from '../registry';
import type { GridCommand } from '../types';
import type { GridCommandContext, CellMatrix } from '../context';
import { getCellsInRange, toTSV } from '../../selection/cell-extract';
import { extendedFillRect, fillDragWrites } from '../../selection/fill';
import type { SheetsSelection, SelectionRect } from '../../selection/selection-model';
import { RangeSet } from '../../selection/range-set';
import type { CellWrite, CommitCellsResult } from '../../grid/hooks/use-batch-commit';

const registry = createGridCommandRegistry();
function cmd(id: string): GridCommand {
	const c = registry.get(id);
	if (!c) throw new Error(`missing command ${id}`);
	return c;
}

const COLS = ['id', 'name', 'active'];
const ROWS = [
	{ id: 'r0', name: 'Alpha', active: true },
	{ id: 'r1', name: 'Beta', active: false },
	{ id: 'r2', name: 'Gamma', active: true },
	{ id: 'r3', name: 'Delta', active: false }
];

function makeCtx(range?: SelectionRect, rows: unknown[] = ROWS) {
	const commitCells = vi.fn<(writes: CellWrite[]) => Promise<CommitCellsResult>>(async () => ({ applied: 0 }));
	const setSelection = vi.fn<(s: SheetsSelection | undefined) => void>();
	const selection: SheetsSelection = {
		current: { cell: [range?.x ?? 0, range?.y ?? 0], range },
		rows: RangeSet.empty(),
		columns: RangeSet.empty()
	};
	const ctx = {
		get rowCount() {
			return rows.length;
		},
		get colCount() {
			return COLS.length;
		},
		get activeCell() {
			return [range?.x ?? 0, range?.y ?? 0] as [number, number];
		},
		get selection() {
			return selection;
		},
		get combinedRows() {
			return rows;
		},
		get columnKeys() {
			return COLS;
		},
		getAnchor: () => null,
		setAnchor: vi.fn(),
		setActiveCell: vi.fn(),
		moveActiveCell: vi.fn(),
		extendToCell: vi.fn(),
		setSelection,
		commitCells,
		openEditorAtActive: vi.fn(() => false),
		openEditorAt: vi.fn(),
		undo: vi.fn(),
		redo: vi.fn(),
		scrollToCell: vi.fn(),
		sortToggle: vi.fn(),
		toggleRow: vi.fn(),
		toggleAll: vi.fn(),
		getCellsInRange: (rect: SelectionRect): CellMatrix => {
			const r = getCellsInRange(rect, rows, COLS);
			return { cols: r.cols, rows: r.rows, values: r.values };
		},
		toTSV: (values: (readonly unknown[])[]) => toTSV(values),
		emit: vi.fn()
	} satisfies GridCommandContext;
	return { ctx, commitCells, setSelection };
}

describe('extendedFillRect (pure geometry)', () => {
	const from: SelectionRect = { x: 1, y: 0, width: 2, height: 1 };

	it('extends DOWN when the target overshoots vertically', () => {
		expect(extendedFillRect(from, [1, 3])).toEqual({ x: 1, y: 0, width: 2, height: 4 });
	});

	it('extends RIGHT when the target overshoots horizontally', () => {
		const src: SelectionRect = { x: 0, y: 1, width: 1, height: 2 };
		expect(extendedFillRect(src, [3, 1])).toEqual({ x: 0, y: 1, width: 4, height: 2 });
	});

	it('extends UP (grows toward a row above the band)', () => {
		const src: SelectionRect = { x: 0, y: 2, width: 1, height: 1 };
		expect(extendedFillRect(src, [0, 0])).toEqual({ x: 0, y: 0, width: 1, height: 3 });
	});

	it('collapses to `from` when the target is inside the band', () => {
		const src: SelectionRect = { x: 0, y: 0, width: 2, height: 2 };
		expect(extendedFillRect(src, [1, 1])).toEqual(src);
	});

	it('picks the dominant axis when both overshoot (vertical wins on tie/greater)', () => {
		const src: SelectionRect = { x: 0, y: 0, width: 1, height: 1 };
		// down by 3, right by 2 -> vertical dominates.
		expect(extendedFillRect(src, [2, 3])).toEqual({ x: 0, y: 0, width: 1, height: 4 });
	});
});

describe('fillDragWrites (pure replication)', () => {
	it('replicates the source column into the new rows only (skips the source band)', () => {
		const from: SelectionRect = { x: 1, y: 0, width: 1, height: 1 }; // seed = name@r0 = 'Alpha'
		const extended: SelectionRect = { x: 1, y: 0, width: 1, height: 3 };
		expect(fillDragWrites(from, extended, ROWS, COLS)).toEqual([
			{ rowIndex: 1, colKey: 'name', value: 'Alpha' },
			{ rowIndex: 2, colKey: 'name', value: 'Alpha' }
		]);
	});

	it('tiles a multi-row source band down the extension', () => {
		const from: SelectionRect = { x: 1, y: 0, width: 1, height: 2 }; // Alpha, Beta
		const extended: SelectionRect = { x: 1, y: 0, width: 1, height: 4 };
		expect(fillDragWrites(from, extended, ROWS, COLS)).toEqual([
			{ rowIndex: 2, colKey: 'name', value: 'Alpha' },
			{ rowIndex: 3, colKey: 'name', value: 'Beta' }
		]);
	});
});

describe('fill.drag command', () => {
	it('canRun is false without a payload', () => {
		const { ctx } = makeCtx();
		expect(cmd('fill.drag').canRun?.(ctx)).toBe(false);
	});

	it('canRun is true with from + to', () => {
		const { ctx } = makeCtx();
		expect(cmd('fill.drag').canRun?.(ctx, { from: { x: 0, y: 0, width: 1, height: 1 }, to: [0, 2] })).toBe(true);
	});

	it('dragging down extends + replicates the source column, then grows the selection', () => {
		const from: SelectionRect = { x: 1, y: 0, width: 1, height: 1 };
		const { ctx, commitCells, setSelection } = makeCtx(from);
		void cmd('fill.drag').run(ctx, { from, to: [1, 2] });

		expect(commitCells).toHaveBeenCalledTimes(1);
		expect(commitCells.mock.calls[0][0]).toEqual([
			{ rowIndex: 1, colKey: 'name', value: 'Alpha' },
			{ rowIndex: 2, colKey: 'name', value: 'Alpha' }
		]);
		// Selection widened to the extended rect; active cell parks on the far corner.
		expect(setSelection).toHaveBeenCalledTimes(1);
		const next = setSelection.mock.calls[0][0]!;
		expect(next.current?.range).toEqual({ x: 1, y: 0, width: 1, height: 3 });
		expect(next.current?.cell).toEqual([1, 2]);
	});

	it('is a no-op when the drop target is inside the source band', () => {
		const from: SelectionRect = { x: 0, y: 0, width: 2, height: 2 };
		const { ctx, commitCells, setSelection } = makeCtx(from);
		void cmd('fill.drag').run(ctx, { from, to: [1, 1] });
		expect(commitCells).not.toHaveBeenCalled();
		expect(setSelection).not.toHaveBeenCalled();
	});
});
