/**
 * Spec for the navigator.clipboard FALLBACK path of clipboard.copy / cut / paste (Stage B).
 *
 * The context menu dispatches these commands WITHOUT a native event (no DataTransfer), so the
 * command bodies fall back to the async `navigator.clipboard` API. These tests mock
 * navigator.clipboard.writeText/readText and assert: copy/cut write the TSV; cut also clears the
 * source (after the write resolves); paste reads + commits. The native (payload.clipboard) path is
 * covered by clipboard-commands.test.ts and stays first in each body.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

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

/** Install a mock navigator.clipboard; returns the spies + a restore fn. */
function mockClipboard(readValue = '') {
	const writeText = vi.fn<(t: string) => Promise<void>>(async () => {});
	const readText = vi.fn<() => Promise<string>>(async () => readValue);
	const original = (globalThis as { navigator?: Navigator }).navigator;
	Object.defineProperty(globalThis, 'navigator', {
		configurable: true,
		value: { clipboard: { writeText, readText } },
	});
	return {
		writeText,
		readText,
		restore: () =>
			Object.defineProperty(globalThis, 'navigator', { configurable: true, value: original }),
	};
}

afterEach(() => vi.restoreAllMocks());

describe('clipboard.copy (navigator fallback)', () => {
	it('writes the range TSV via navigator.clipboard.writeText when no DataTransfer is given', async () => {
		const { ctx } = makeCtx({ activeCell: [1, 0], range: { x: 1, y: 0, width: 2, height: 2 } });
		const cb = mockClipboard();
		await cmd('clipboard.copy').run(ctx, undefined);
		expect(cb.writeText).toHaveBeenCalledTimes(1);
		expect(cb.writeText).toHaveBeenCalledWith('Alpha\ttrue\nBeta\tfalse');
		cb.restore();
	});

	it('serializes the 1×1 active cell when there is no range', async () => {
		const { ctx } = makeCtx({ activeCell: [1, 2] });
		const cb = mockClipboard();
		await cmd('clipboard.copy').run(ctx, undefined);
		expect(cb.writeText).toHaveBeenCalledWith('Gamma');
		cb.restore();
	});
});

describe('clipboard.cut (navigator fallback)', () => {
	it('writes the TSV then clears the source range (after the write resolves)', async () => {
		const { ctx, commitCells } = makeCtx({ activeCell: [1, 0], range: { x: 1, y: 0, width: 2, height: 1 } });
		const cb = mockClipboard();
		await cmd('clipboard.cut').run(ctx, undefined);
		expect(cb.writeText).toHaveBeenCalledWith('Alpha\ttrue');
		expect(commitCells).toHaveBeenCalledTimes(1);
		expect(commitCells.mock.calls[0][0]).toEqual([
			{ rowIndex: 0, colKey: 'name', value: null },
			{ rowIndex: 0, colKey: 'active', value: null },
		]);
		cb.restore();
	});

	it('does NOT clear the source when the clipboard write rejects', async () => {
		const { ctx, commitCells } = makeCtx({ activeCell: [1, 0] });
		const cb = mockClipboard();
		cb.writeText.mockRejectedValueOnce(new Error('denied'));
		await cmd('clipboard.cut').run(ctx, undefined);
		expect(commitCells).not.toHaveBeenCalled();
		cb.restore();
	});
});

describe('clipboard.paste (navigator fallback)', () => {
	it('reads via navigator.clipboard.readText, tiles, and commits one batch', async () => {
		const { ctx, commitCells } = makeCtx({ activeCell: [1, 0], range: { x: 1, y: 0, width: 2, height: 2 } });
		const cb = mockClipboard('X\tY');
		await cmd('clipboard.paste').run(ctx, undefined);
		expect(cb.readText).toHaveBeenCalledTimes(1);
		expect(commitCells.mock.calls[0][0]).toEqual([
			{ rowIndex: 0, colKey: 'name', value: 'X' },
			{ rowIndex: 0, colKey: 'active', value: 'Y' },
			{ rowIndex: 1, colKey: 'name', value: 'X' },
			{ rowIndex: 1, colKey: 'active', value: 'Y' },
		]);
		cb.restore();
	});

	it('does not commit when the read returns empty text', async () => {
		const { ctx, commitCells } = makeCtx({ activeCell: [1, 0] });
		const cb = mockClipboard('');
		await cmd('clipboard.paste').run(ctx, undefined);
		expect(commitCells).not.toHaveBeenCalled();
		cb.restore();
	});
});
