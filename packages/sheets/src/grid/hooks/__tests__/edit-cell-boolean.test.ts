/* @vitest-environment jsdom */
//
// RAW-BOOLEAN COMMIT test (STAGE 5 GATE — the boolean-commit fix).
//
// `useCellEditing` is the single native value-commit seam: the DOM inline-toggle and
// the portal editors call it with a RAW value that flows straight through — there is
// NO glide GridCell round-trip. The bug the cutover fixes lived in the old canvas
// path, where a boolean toggle was stringified (`false` -> `"false"`). Here we prove
// the native seam preserves the literal boolean for BOTH a server row (it lands in the
// `update` PATCH) and a draft row (it lands in `updateDraftCell`), so a boolean cell
// genuinely toggles true <-> false and never stores the string "false".
//
// No @testing-library/react in this package (see registry-gating.test.tsx); we render
// the hook with react-dom/client createRoot + act and expose its callback via a ref —
// the same idiom as the sibling boolean-toggle.test.tsx.
import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCellEditing } from '../use-cell-editing';
import { attachDraftMeta } from '../../row-model';
import type { SheetsRow } from '../../row-model';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type EditCell = ReturnType<typeof useCellEditing>;

// Render the hook in a throwaway component and hand its returned callback back out.
function HookHarness(props: Parameters<typeof useCellEditing>[0] & { onReady: (fn: EditCell) => void }) {
	const { onReady, ...params } = props;
	const editCell = useCellEditing(params);
	useEffect(() => {
		onReady(editCell);
	}, [editCell, onReady]);
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

// Mount the harness with the given params and return the live editCell callback.
function mountEditCell(params: Parameters<typeof useCellEditing>[0]): EditCell {
	let captured: EditCell | undefined;
	act(() => {
		root.render(createElement(HookHarness, { ...params, onReady: (fn) => (captured = fn) }));
	});
	if (!captured) throw new Error('editCell not captured');
	return captured;
}

describe('STAGE 5 — useCellEditing preserves a RAW boolean (no stringify)', () => {
	it('server row: committing false PATCHes the literal boolean false (not "false")', async () => {
		const update = vi.fn().mockResolvedValue({ updatedRow: null });
		const rows: SheetsRow[] = [{ id: 'r1', name: 'Alpha', active: true }];

		const editCell = mountEditCell({
			combinedRows: rows,
			fieldMetaMap: new Map([['active', { type: { gqlType: 'Boolean' } }]]),
			relationInfoByField: new Map(),
			updateDraftCell: vi.fn(),
			tableKey: 'widgets',
			update,
		});

		let result!: Awaited<ReturnType<EditCell>>;
		await act(async () => {
			result = await editCell(0, 'active', false);
		});

		expect(update).toHaveBeenCalledTimes(1);
		const [, patch] = update.mock.calls[0];
		// The load-bearing assertions: the stored value is a real boolean `false`.
		expect(patch).toEqual({ active: false });
		expect(typeof patch.active).toBe('boolean');
		expect(patch.active).toBe(false);
		expect(patch.active).not.toBe('false');
		// The hook reports the same raw value it sent.
		expect(result).toMatchObject({ type: 'server', patchField: 'active', patchValue: false });
		expect(typeof result.patchValue).toBe('boolean');
	});

	it('server row: a boolean cell toggles true -> false -> true (each commit stays raw)', async () => {
		const update = vi.fn().mockResolvedValue({ updatedRow: null });
		const rows: SheetsRow[] = [{ id: 'r1', active: true }];

		const editCell = mountEditCell({
			combinedRows: rows,
			fieldMetaMap: new Map([['active', { type: { gqlType: 'Boolean' } }]]),
			relationInfoByField: new Map(),
			updateDraftCell: vi.fn(),
			tableKey: 'widgets',
			update,
		});

		// Emulate the inline-toggle: commit !current each time, threading the raw boolean.
		let current = true;
		for (const expected of [false, true, false]) {
			current = !current;
			// eslint-disable-next-line no-await-in-loop
			await act(async () => {
				await editCell(0, 'active', current);
			});
			expect(current).toBe(expected);
		}

		expect(update.mock.calls.map((c) => c[1])).toEqual([{ active: false }, { active: true }, { active: false }]);
		for (const [, patch] of update.mock.calls) {
			expect(typeof patch.active).toBe('boolean');
		}
	});

	it('draft row: committing false stores the literal boolean in updateDraftCell', async () => {
		const updateDraftCell = vi.fn();
		const update = vi.fn().mockResolvedValue({ updatedRow: null });
		const draftRow: SheetsRow = attachDraftMeta(
			{ id: 'draft:abc', active: true },
			{ isDraft: true, draftRowId: 'draft:abc', status: 'idle', errors: null },
		);

		const editCell = mountEditCell({
			combinedRows: [draftRow],
			fieldMetaMap: new Map([['active', { type: { gqlType: 'Boolean' } }]]),
			relationInfoByField: new Map(),
			updateDraftCell,
			tableKey: 'widgets',
			update,
		});

		let result!: Awaited<ReturnType<EditCell>>;
		await act(async () => {
			result = await editCell(0, 'active', false);
		});

		expect(result).toEqual({ type: 'draft' });
		expect(update).not.toHaveBeenCalled(); // a draft never hits the server
		expect(updateDraftCell).toHaveBeenCalledTimes(1);
		const arg = updateDraftCell.mock.calls[0][0];
		expect(arg).toMatchObject({ tableKey: 'widgets', draftRowId: 'draft:abc', columnKey: 'active' });
		expect(typeof arg.value).toBe('boolean');
		expect(arg.value).toBe(false);
		expect(arg.value).not.toBe('false');
	});
});
