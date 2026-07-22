/* @vitest-environment jsdom */
//
// Spec for the useUndoRedo two-stack history. Asserts stack ordering (record →
// undo → redo), redo-cleared-on-new-record, clear, and the canUndo/canRedo flags.
// Rendered with react-dom/client createRoot + act (no @testing-library/react in
// this package; same idiom as edit-cell-boolean.test.ts).
import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useUndoRedo, type UseUndoRedoResult, type HistoryEntry } from '../use-undo-redo';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function HookHarness(props: { onReady: (api: UseUndoRedoResult) => void }) {
	const api = useUndoRedo();
	useEffect(() => {
		props.onReady(api);
	});
	return null;
}

let container: HTMLDivElement;
let root: Root;
let api: UseUndoRedoResult;

beforeEach(() => {
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	act(() => {
		root.render(createElement(HookHarness, { onReady: (a) => (api = a) }));
	});
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

function entry(log: string[], name: string): HistoryEntry {
	return {
		label: name,
		undo: () => void log.push(`undo:${name}`),
		redo: () => void log.push(`redo:${name}`),
	};
}

describe('useUndoRedo', () => {
	it('records make canUndo true and undo runs entries LIFO', async () => {
		const log: string[] = [];
		expect(api.canUndo).toBe(false);
		act(() => api.record(entry(log, 'a')));
		act(() => api.record(entry(log, 'b')));
		expect(api.canUndo).toBe(true);
		expect(api.canRedo).toBe(false);

		await act(async () => {
			await api.undo();
		});
		expect(log).toEqual(['undo:b']);
		expect(api.canRedo).toBe(true);

		await act(async () => {
			await api.undo();
		});
		expect(log).toEqual(['undo:b', 'undo:a']);
		expect(api.canUndo).toBe(false);
	});

	it('redo replays the last undone entry and returns it to the undo stack', async () => {
		const log: string[] = [];
		act(() => api.record(entry(log, 'a')));
		await act(async () => {
			await api.undo();
		});
		await act(async () => {
			await api.redo();
		});
		expect(log).toEqual(['undo:a', 'redo:a']);
		expect(api.canUndo).toBe(true);
		expect(api.canRedo).toBe(false);
	});

	it('recording a new entry CLEARS the redo stack', async () => {
		const log: string[] = [];
		act(() => api.record(entry(log, 'a')));
		await act(async () => {
			await api.undo();
		});
		expect(api.canRedo).toBe(true);
		act(() => api.record(entry(log, 'b')));
		expect(api.canRedo).toBe(false);
		await act(async () => {
			await api.redo();
		});
		// redo stack was cleared -> nothing replays.
		expect(log).toEqual(['undo:a']);
	});

	it('undo / redo on empty stacks are no-ops', async () => {
		await act(async () => {
			await api.undo();
			await api.redo();
		});
		expect(api.canUndo).toBe(false);
		expect(api.canRedo).toBe(false);
	});

	it('clear drops all history', async () => {
		const log: string[] = [];
		act(() => api.record(entry(log, 'a')));
		act(() => api.clear());
		expect(api.canUndo).toBe(false);
		expect(api.canRedo).toBe(false);
		await act(async () => {
			await api.undo();
		});
		expect(log).toEqual([]);
	});
});
