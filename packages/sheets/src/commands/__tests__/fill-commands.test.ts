/**
 * Integration spec for the fill.down / fill.right commands (P4 Phase 3).
 *
 * Runs the real command bodies against a ctx whose `commitCells` is a spy, asserting the
 * exact replicate writes and the single-row/single-col canRun gates. SCOPE — value
 * replication only; SERIES detection is DEFERRED.
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

function makeCtx(range?: SelectionRect, rows: unknown[] = ROWS) {
	const commitCells = vi.fn<(writes: CellWrite[]) => Promise<CommitCellsResult>>(async () => ({ applied: 0 }));
	const selection: SheetsSelection = {
		current: { cell: [range?.x ?? 0, range?.y ?? 0], range },
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

describe('fill.down', () => {
	it('canRun is false on a single-row range', () => {
		const { ctx } = makeCtx({ x: 0, y: 0, width: 3, height: 1 });
		expect(cmd('fill.down').canRun?.(ctx)).toBe(false);
	});

	it('canRun is false with no range', () => {
		const { ctx } = makeCtx();
		expect(cmd('fill.down').canRun?.(ctx)).toBe(false);
	});

	it('canRun is true on a multi-row range', () => {
		const { ctx } = makeCtx({ x: 1, y: 0, width: 2, height: 3 });
		expect(cmd('fill.down').canRun?.(ctx)).toBe(true);
	});

	it('commits the top-row replicate writes (source = top row)', () => {
		const { ctx, commitCells } = makeCtx({ x: 1, y: 0, width: 2, height: 3 });
		void cmd('fill.down').run(ctx);
		expect(commitCells).toHaveBeenCalledTimes(1);
		expect(commitCells.mock.calls[0][0]).toEqual([
			{ rowIndex: 1, colKey: 'name', value: 'Alpha' },
			{ rowIndex: 1, colKey: 'active', value: true },
			{ rowIndex: 2, colKey: 'name', value: 'Alpha' },
			{ rowIndex: 2, colKey: 'active', value: true },
		]);
	});
});

describe('fill.right', () => {
	it('canRun is false on a single-col range', () => {
		const { ctx } = makeCtx({ x: 0, y: 0, width: 1, height: 3 });
		expect(cmd('fill.right').canRun?.(ctx)).toBe(false);
	});

	it('canRun is true on a multi-col range', () => {
		const { ctx } = makeCtx({ x: 0, y: 0, width: 3, height: 2 });
		expect(cmd('fill.right').canRun?.(ctx)).toBe(true);
	});

	it('commits the left-column replicate writes (source = left column, per row)', () => {
		const { ctx, commitCells } = makeCtx({ x: 0, y: 0, width: 3, height: 2 });
		void cmd('fill.right').run(ctx);
		expect(commitCells).toHaveBeenCalledTimes(1);
		expect(commitCells.mock.calls[0][0]).toEqual([
			{ rowIndex: 0, colKey: 'name', value: 'r0' },
			{ rowIndex: 0, colKey: 'active', value: 'r0' },
			{ rowIndex: 1, colKey: 'name', value: 'r1' },
			{ rowIndex: 1, colKey: 'active', value: 'r1' },
		]);
	});
});
