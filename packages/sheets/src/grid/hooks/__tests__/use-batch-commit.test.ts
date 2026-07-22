/* @vitest-environment jsdom */
//
// Spec for the batched commit primitive (useBatchCommit). Proves the load-bearing
// coalescing + undo contract:
//   • a multi-cell write COALESCES to ONE optimistic patch + ONE update PER ROW
//     (not per cell);
//   • prior values are captured BEFORE the optimistic patch, so undo restores the
//     exact pre-edit value;
//   • undo/redo replays do NOT double-record (record:false);
//   • readonly UUID `id` + null (unfetched) rows are skipped.
// Rendered with react-dom/client createRoot + act (same idiom as the sibling tests).
import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useBatchCommit, type CellWrite } from '../use-batch-commit';
import { useUndoRedo, type UseUndoRedoResult } from '../use-undo-redo';
import type { SheetsRow } from '../../row-model';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type CommitCells = ReturnType<typeof useBatchCommit>;

interface Harness {
	commit: CommitCells;
	history: UseUndoRedoResult;
}

function HookHarness(
	props: Omit<Parameters<typeof useBatchCommit>[0], 'record'> & { onReady: (h: Harness) => void },
) {
	const { onReady, ...params } = props;
	const history = useUndoRedo();
	const commit = useBatchCommit({ ...params, record: history.record });
	useEffect(() => {
		onReady({ commit, history });
	});
	return null;
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

// Returns a LIVE view: `commit`/`history` re-read the latest render (canUndo/canRedo
// are reactive state, so a stale snapshot would miss the post-record flag flip).
function mount(params: Omit<Parameters<typeof useBatchCommit>[0], 'record'>): Harness {
	const holder: { current?: Harness } = {};
	act(() => {
		root.render(createElement(HookHarness, { ...params, onReady: (h) => (holder.current = h) }));
	});
	if (!holder.current) throw new Error('harness not captured');
	return {
		get commit() {
			return holder.current!.commit;
		},
		get history() {
			return holder.current!.history;
		},
	} as Harness;
}

const META = new Map<string, any>([
	['name', { type: { gqlType: 'String' } }],
	['active', { type: { gqlType: 'Boolean' } }],
	['id', { type: { gqlType: 'UUID' } }],
]);

describe('useBatchCommit — coalescing', () => {
	it('a 2×2 write issues ONE update per ROW (merged cols), not per cell', async () => {
		const update = vi.fn().mockResolvedValue({ updatedRow: null });
		const applyOptimisticPatch = vi.fn().mockReturnValue(() => {});
		const rows: SheetsRow[] = [
			{ id: 'r0', name: 'A', active: true },
			{ id: 'r1', name: 'B', active: false },
		];
		const { commit } = mount({
			combinedRows: rows,
			fieldMetaMap: META,
			relationInfoByField: new Map(),
			update,
			applyOptimisticPatch,
			editCell: vi.fn(),
		});

		const writes: CellWrite[] = [
			{ rowIndex: 0, colKey: 'name', value: 'A2' },
			{ rowIndex: 0, colKey: 'active', value: false },
			{ rowIndex: 1, colKey: 'name', value: 'B2' },
			{ rowIndex: 1, colKey: 'active', value: true },
		];
		let res!: Awaited<ReturnType<CommitCells>>;
		await act(async () => {
			res = await commit(writes);
		});

		expect(res.applied).toBe(4);
		// 2 rows -> 2 optimistic patches + 2 updates (merged), NOT 4.
		expect(applyOptimisticPatch).toHaveBeenCalledTimes(2);
		expect(update).toHaveBeenCalledTimes(2);
		expect(update.mock.calls[0]).toEqual(['r0', { name: 'A2', active: false }]);
		expect(update.mock.calls[1]).toEqual(['r1', { name: 'B2', active: true }]);
	});

	it('skips the readonly UUID id and null (unfetched) proxy rows', async () => {
		const update = vi.fn().mockResolvedValue({ updatedRow: null });
		const rows = [{ id: 'r0', name: 'A' }, null] as unknown as SheetsRow[];
		const { commit } = mount({
			combinedRows: rows,
			fieldMetaMap: META,
			relationInfoByField: new Map(),
			update,
			editCell: vi.fn(),
		});

		let res!: Awaited<ReturnType<CommitCells>>;
		await act(async () => {
			res = await commit([
				{ rowIndex: 0, colKey: 'id', value: 'hacked' }, // UUID id -> skipped
				{ rowIndex: 0, colKey: 'name', value: 'A2' }, // ok
				{ rowIndex: 1, colKey: 'name', value: 'ghost' }, // null row -> skipped
			]);
		});

		expect(res.applied).toBe(1);
		expect(update).toHaveBeenCalledTimes(1);
		expect(update.mock.calls[0]).toEqual(['r0', { name: 'A2' }]);
	});
});

describe('useBatchCommit — undo/redo', () => {
	it('records an inverse whose undo restores the EXACT prior values, then redo re-applies', async () => {
		const update = vi.fn().mockResolvedValue({ updatedRow: null });
		const rows: SheetsRow[] = [{ id: 'r0', name: 'old', active: true }];
		const h = mount({
			combinedRows: rows,
			fieldMetaMap: META,
			relationInfoByField: new Map(),
			update,
			editCell: vi.fn(),
		});

		await act(async () => {
			await h.commit([{ rowIndex: 0, colKey: 'name', value: 'new' }]);
		});
		expect(update.mock.calls[0]).toEqual(['r0', { name: 'new' }]);
		expect(h.history.canUndo).toBe(true);

		update.mockClear();
		await act(async () => {
			await h.history.undo();
		});
		// undo PATCHes the captured prior value, and does NOT re-record (canUndo now false).
		expect(update).toHaveBeenCalledTimes(1);
		expect(update.mock.calls[0]).toEqual(['r0', { name: 'old' }]);
		expect(h.history.canUndo).toBe(false);
		expect(h.history.canRedo).toBe(true);

		update.mockClear();
		await act(async () => {
			await h.history.redo();
		});
		expect(update.mock.calls[0]).toEqual(['r0', { name: 'new' }]);
		expect(h.history.canUndo).toBe(true);
	});

	it('opts.record === false does not push history', async () => {
		const update = vi.fn().mockResolvedValue({ updatedRow: null });
		const rows: SheetsRow[] = [{ id: 'r0', name: 'old' }];
		const h = mount({
			combinedRows: rows,
			fieldMetaMap: META,
			relationInfoByField: new Map(),
			update,
			editCell: vi.fn(),
		});

		await act(async () => {
			await h.commit([{ rowIndex: 0, colKey: 'name', value: 'new' }], { record: false });
		});
		expect(update).toHaveBeenCalledTimes(1);
		expect(h.history.canUndo).toBe(false);
	});

	it('reverts ALL optimistic patches when a server update rejects', async () => {
		const revertA = vi.fn();
		const revertB = vi.fn();
		const applyOptimisticPatch = vi.fn().mockReturnValueOnce(revertA).mockReturnValueOnce(revertB);
		const update = vi.fn().mockRejectedValue(new Error('boom'));
		const rows: SheetsRow[] = [
			{ id: 'r0', name: 'A' },
			{ id: 'r1', name: 'B' },
		];
		const h = mount({
			combinedRows: rows,
			fieldMetaMap: META,
			relationInfoByField: new Map(),
			update,
			applyOptimisticPatch,
			editCell: vi.fn(),
		});

		await act(async () => {
			await expect(
				h.commit([
					{ rowIndex: 0, colKey: 'name', value: 'A2' },
					{ rowIndex: 1, colKey: 'name', value: 'B2' },
				]),
			).rejects.toThrow('boom');
		});
		expect(revertA).toHaveBeenCalledTimes(1);
		expect(revertB).toHaveBeenCalledTimes(1);
		expect(h.history.canUndo).toBe(false);
	});
});
