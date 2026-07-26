/**
 * Integration spec for the cell.clear command (Stage A — Delete / Backspace → null).
 *
 * Runs the real command body against a ctx whose `commitCells` is a spy, asserting the
 * exact null writes and the active-cell/range canRun gate. commitCells skips readonly/UUID
 * internally and gives ONE undo entry — here we just assert the writes + single batch.
 */

import { describe, expect, it, vi } from 'vitest';

import { createGridCommandRegistry } from '../registry';
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

interface CtxOpts {
	activeCell?: [number, number];
	range?: SelectionRect;
}

function makeCtx({ activeCell = [1, 0], range }: CtxOpts = {}) {
	const commitCells = vi.fn<(writes: CellWrite[]) => Promise<CommitCellsResult>>(async () => ({ applied: 0 }));
	const selection: SheetsSelection = {
		current: { cell: activeCell, range },
		rows: RangeSet.empty(),
		columns: RangeSet.empty(),
	};
	const ctx = {
		get rowCount() {
			return ROWS.length;
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
			return ROWS;
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
			const r = getCellsInRange(rect, ROWS, COLS);
			return { cols: r.cols, rows: r.rows, values: r.values };
		},
		toTSV: (values: (readonly unknown[])[]) => toTSV(values),
		emit: vi.fn(),
	} satisfies GridCommandContext;
	return { ctx, commitCells };
}

describe('cell.clear', () => {
	it('writes one null over a single active cell (no range)', () => {
		const { ctx, commitCells } = makeCtx({ activeCell: [1, 2] });
		void cmd('cell.clear').run(ctx);
		expect(commitCells).toHaveBeenCalledTimes(1);
		expect(commitCells.mock.calls[0][0]).toEqual([{ rowIndex: 2, colKey: 'name', value: null }]);
	});

	it('writes 4 nulls over a 2×2 range in ONE commitCells batch', () => {
		const { ctx, commitCells } = makeCtx({ activeCell: [1, 0], range: { x: 1, y: 0, width: 2, height: 2 } });
		void cmd('cell.clear').run(ctx);
		expect(commitCells).toHaveBeenCalledTimes(1);
		expect(commitCells.mock.calls[0][0]).toEqual([
			{ rowIndex: 0, colKey: 'name', value: null },
			{ rowIndex: 0, colKey: 'active', value: null },
			{ rowIndex: 1, colKey: 'name', value: null },
			{ rowIndex: 1, colKey: 'active', value: null },
		]);
	});

	it('canRun is true with an active cell', () => {
		const { ctx } = makeCtx({ activeCell: [0, 0] });
		expect(cmd('cell.clear').canRun?.(ctx)).toBe(true);
	});

	it('canRun is false with no active cell/range', () => {
		const { ctx } = makeCtx();
		const noCell = { ...ctx, get activeCell() { return undefined; }, get selection() { return undefined; } };
		expect(cmd('cell.clear').canRun?.(noCell as GridCommandContext)).toBe(false);
	});
});
