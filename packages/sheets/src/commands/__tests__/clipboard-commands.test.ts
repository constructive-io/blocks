/**
 * Integration spec for the clipboard.copy / cut / paste commands (Stage B).
 *
 * Each test runs the real command body against a ctx whose `getCellsInRange` / `toTSV`
 * are the REAL pure helpers (so copy serializes the actual range) and whose `commitCells`
 * is a spy (so we assert the exact tiled / cleared writes). A tiny ClipboardLike stub backs
 * a real DataTransfer (get/set text/plain).
 */

import { describe, expect, it, vi } from 'vitest';

import { createGridCommandRegistry, type ClipboardLike } from '../registry';
import type { GridCommand } from '../types';
import type { GridCommandContext, CellMatrix } from '../context';
import { getCellsInRange, toTSV } from '../../selection/cell-extract';
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
];

/** A minimal DataTransfer-like backing the clipboard payload. */
function makeClipboard(initial = ''): ClipboardLike {
	let text = initial;
	return {
		getData: (format) => (format === 'text/plain' ? text : ''),
		setData: (format, data) => {
			if (format === 'text/plain') text = data;
		},
	};
}

interface CtxOpts {
	activeCell?: [number, number];
	range?: SelectionRect;
	rows?: unknown[];
}

/** Build a ctx wired with the REAL extract helpers + a spy commitCells over a fixed grid. */
function makeCtx({ activeCell = [1, 0], range, rows = ROWS }: CtxOpts = {}) {
	const commitCells = vi.fn<(writes: CellWrite[]) => Promise<CommitCellsResult>>(async () => ({ applied: 0 }));
	const selection: SheetsSelection = {
		current: { cell: activeCell, range },
		rows: RangeSet.empty(),
		columns: RangeSet.empty(),
	};
	const ctx = {
		get rowCount() {
			return rows.length;
		},
		get colCount() {
			return COLS.length;
		},
		get activeCell() {
			return activeCell;
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
		setSelection: vi.fn(),
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
		emit: vi.fn(),
	} satisfies GridCommandContext;
	return { ctx, commitCells };
}

describe('clipboard.copy', () => {
	it('serializes the active range to TSV and writes text/plain', () => {
		const { ctx } = makeCtx({ activeCell: [1, 0], range: { x: 1, y: 0, width: 2, height: 2 } });
		const clipboard = makeClipboard();
		void cmd('clipboard.copy').run(ctx, { clipboard });
		expect(clipboard.getData('text/plain')).toBe('Alpha\ttrue\nBeta\tfalse');
	});

	it('serializes a 1×1 active cell when there is no range', () => {
		const { ctx } = makeCtx({ activeCell: [1, 2] });
		const clipboard = makeClipboard();
		void cmd('clipboard.copy').run(ctx, { clipboard });
		expect(clipboard.getData('text/plain')).toBe('Gamma');
	});

	it('canRun is false with no active cell/range (empty-range case)', () => {
		const { ctx } = makeCtx();
		const noCell = { ...ctx, get activeCell() { return undefined; }, get selection() { return undefined; } };
		expect(cmd('clipboard.copy').canRun?.(noCell as GridCommandContext)).toBe(false);
	});
});

describe('clipboard.cut', () => {
	it('copies the range then commits null across every source cell (one batch)', () => {
		const { ctx, commitCells } = makeCtx({ activeCell: [1, 0], range: { x: 1, y: 0, width: 2, height: 2 } });
		const clipboard = makeClipboard();
		void cmd('clipboard.cut').run(ctx, { clipboard });
		expect(clipboard.getData('text/plain')).toBe('Alpha\ttrue\nBeta\tfalse');
		expect(commitCells).toHaveBeenCalledTimes(1);
		expect(commitCells.mock.calls[0][0]).toEqual([
			{ rowIndex: 0, colKey: 'name', value: null },
			{ rowIndex: 0, colKey: 'active', value: null },
			{ rowIndex: 1, colKey: 'name', value: null },
			{ rowIndex: 1, colKey: 'active', value: null },
		]);
	});
});

describe('clipboard.paste', () => {
	it('tiles a 1×N row down a taller selection range and commits one batch', () => {
		const { ctx, commitCells } = makeCtx({ activeCell: [1, 0], range: { x: 1, y: 0, width: 2, height: 3 } });
		const clipboard = makeClipboard('X\tY');
		void cmd('clipboard.paste').run(ctx, { clipboard });
		expect(commitCells).toHaveBeenCalledTimes(1);
		expect(commitCells.mock.calls[0][0]).toEqual([
			{ rowIndex: 0, colKey: 'name', value: 'X' },
			{ rowIndex: 0, colKey: 'active', value: 'Y' },
			{ rowIndex: 1, colKey: 'name', value: 'X' },
			{ rowIndex: 1, colKey: 'active', value: 'Y' },
			{ rowIndex: 2, colKey: 'name', value: 'X' },
			{ rowIndex: 2, colKey: 'active', value: 'Y' },
		]);
	});

	it('writes a 2-D block from the anchor as-is (no tiling)', () => {
		const { ctx, commitCells } = makeCtx({ activeCell: [1, 0] });
		const clipboard = makeClipboard('A\tB\nC\tD');
		void cmd('clipboard.paste').run(ctx, { clipboard });
		expect(commitCells.mock.calls[0][0]).toEqual([
			{ rowIndex: 0, colKey: 'name', value: 'A' },
			{ rowIndex: 0, colKey: 'active', value: 'B' },
			{ rowIndex: 1, colKey: 'name', value: 'C' },
			{ rowIndex: 1, colKey: 'active', value: 'D' },
		]);
	});

	it('clamps writes that fall past the grid right/bottom edge', () => {
		// Anchor at the last column; a 2-wide paste should clamp to the single in-bounds col.
		const { ctx, commitCells } = makeCtx({ activeCell: [2, 2] });
		const clipboard = makeClipboard('P\tQ\nR\tS');
		void cmd('clipboard.paste').run(ctx, { clipboard });
		// row 3 is out of bounds (only 3 rows), col 3 is out of bounds (only 3 cols).
		expect(commitCells.mock.calls[0][0]).toEqual([{ rowIndex: 2, colKey: 'active', value: 'P' }]);
	});

	it('tolerates a trailing newline in the pasted TSV', () => {
		const { ctx, commitCells } = makeCtx({ activeCell: [1, 0] });
		const clipboard = makeClipboard('Z\n');
		void cmd('clipboard.paste').run(ctx, { clipboard });
		expect(commitCells.mock.calls[0][0]).toEqual([{ rowIndex: 0, colKey: 'name', value: 'Z' }]);
	});

	it('does not commit when the clipboard text is empty', () => {
		const { ctx, commitCells } = makeCtx({ activeCell: [1, 0] });
		void cmd('clipboard.paste').run(ctx, { clipboard: makeClipboard('') });
		expect(commitCells).not.toHaveBeenCalled();
	});
});
