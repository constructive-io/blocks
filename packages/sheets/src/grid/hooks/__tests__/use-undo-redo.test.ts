/* @vitest-environment jsdom */
//
// Spec for the useUndoRedo two-stack history. Asserts stack ordering (record →
// undo → redo), redo-cleared-on-new-record, clear, and the canUndo/canRedo flags.
// Rendered with react-dom/client createRoot + act (no @testing-library/react in
// this package; same idiom as edit-cell-boolean.test.ts).
import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('a step that changes nothing', () => {
	it('stays where it was, so it can be tried again, and the older steps stay behind it', async () => {
		const log: string[] = [];
		let refuse = true;
		act(() => {
			api.record(entry(log, 'cell'));
			api.record({
				label: 'link',
				undo: () => {
					if (refuse) throw new Error('refused');
					log.push('undo:link');
				},
				redo: () => void log.push('redo:link'),
			});
		});
		await act(() => api.undo());
		expect(log).toEqual([]);
		expect(api.canRedo).toBe(false);
		refuse = false;
		await act(() => api.undo());
		await act(() => api.undo());
		expect(log).toEqual(['undo:link', 'undo:cell']);
	});
});

describe('steps that wait for the server', () => {
	// A held Mod+Z fires the next undo before the server answered the one before it.
	it('run one at a time, in the order they were asked for', async () => {
		const log: string[] = [];
		const answers: Array<() => void> = [];
		const slow = (name: string): HistoryEntry => ({
			label: name,
			undo: () =>
				new Promise<void>((resolve) => {
					log.push(`start:${name}`);
					answers.push(() => {
						log.push(`end:${name}`);
						resolve();
					});
				}),
			redo: () => void log.push(`redo:${name}`),
		});
		act(() => {
			api.record(slow('a'));
			api.record(slow('b'));
		});

		let both!: Promise<unknown>;
		await act(async () => {
			both = Promise.all([api.undo(), api.undo()]);
			await Promise.resolve();
		});
		// The second undo waits: only b has started.
		expect(log).toEqual(['start:b']);

		await act(async () => {
			answers.shift()!();
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		expect(log).toEqual(['start:b', 'end:b', 'start:a']);

		await act(async () => {
			answers.shift()!();
			await both;
		});
		expect(log).toEqual(['start:b', 'end:b', 'start:a', 'end:a']);
		expect(api.canUndo).toBe(false);
		expect(api.canRedo).toBe(true);
	});

	it('keep a refused step once, when the next step was asked for while it ran', async () => {
		let refuse!: (error: Error) => void;
		const redo = vi.fn();
		act(() =>
			api.record({
				label: 'cell',
				undo: () => new Promise<void>((_resolve, reject) => (refuse = reject)),
				redo,
			}),
		);

		let both!: Promise<unknown>;
		await act(async () => {
			both = Promise.all([api.undo(), api.redo()]);
			await Promise.resolve();
		});
		await act(async () => {
			refuse(new Error('refused'));
			await both;
		});
		// The refused undo goes back once; the redo had nothing to redo.
		expect(redo).not.toHaveBeenCalled();
		expect(api.canUndo).toBe(true);
		expect(api.canRedo).toBe(false);
	});
});

describe('an edit or a clear while a step waits for the server', () => {
	function waiting(log: string[], name: string) {
		let refuse!: (error: Error) => void;
		const entry: HistoryEntry = {
			label: name,
			undo: () =>
				new Promise<void>((_resolve, reject) => {
					log.push(`undo:${name}`);
					refuse = reject;
				}),
			redo: () => void log.push(`redo:${name}`),
		};
		return { entry, refuse: () => refuse(new Error('refused')) };
	}

	it('puts a refused undo back under the newer edit, so the next undo is the edit', async () => {
		const log: string[] = [];
		const a = waiting(log, 'a');
		act(() => api.record(a.entry));
		let pending!: Promise<void>;
		await act(async () => {
			pending = api.undo();
			await Promise.resolve();
		});
		act(() => api.record(entry(log, 'e')));
		await act(async () => {
			a.refuse();
			await pending;
		});
		await act(() => api.undo());
		expect(log).toEqual(['undo:a', 'undo:e']);
	});

	it('drops a refused step whose history was cleared', async () => {
		const log: string[] = [];
		const a = waiting(log, 'a');
		act(() => api.record(a.entry));
		let pending!: Promise<void>;
		await act(async () => {
			pending = api.undo();
			await Promise.resolve();
		});
		act(() => api.clear());
		await act(async () => {
			a.refuse();
			await pending;
		});
		expect(api.canUndo).toBe(false);
		expect(api.canRedo).toBe(false);
	});

	it('does not run a step asked for before the edit', async () => {
		const log: string[] = [];
		let answer!: () => void;
		act(() => {
			api.record(entry(log, 'a'));
			api.record({
				label: 'b',
				undo: () =>
					new Promise<void>((resolve) => {
						log.push('undo:b');
						answer = resolve;
					}),
				redo: () => void log.push('redo:b'),
			});
		});
		let both!: Promise<unknown>;
		await act(async () => {
			both = Promise.all([api.undo(), api.undo()]);
			await Promise.resolve();
		});
		act(() => api.record(entry(log, 'e')));
		await act(async () => {
			answer();
			await both;
		});
		// The second press was for `a`; after the edit it must not undo `e` (or `a`).
		expect(log).toEqual(['undo:b']);
		expect(api.canUndo).toBe(true);
	});
});
