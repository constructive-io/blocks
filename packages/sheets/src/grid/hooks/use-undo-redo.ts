/**
 * useUndoRedo — a tiny two-stack history for grid mutations.
 *
 * Each {@link HistoryEntry} carries its own inverse: `undo` reverts the change,
 * `redo` re-applies it (both may be async — a server mutation). `record` pushes a
 * new entry onto the undo stack and CLEARS the redo stack (a fresh edit forks the
 * timeline). `undo`/`redo` move the top entry across the two stacks, running the
 * matching thunk. A thunk that throws did not change anything: the entry goes back
 * where it was, under any edit recorded meanwhile, so the step can be tried again (the
 * entry reports its own failure). A stack cleared or forked since has no place for it.
 * Steps run one at a time: one asked for while another runs (a held Mod+Z against a
 * slow server) starts when it ends, so writes reach the server in the order asked. An
 * edit or a clear cancels the steps asked for before it that have not started.
 *
 * The stacks live in refs so the handler identities (`undo`/`redo`/`record`) stay
 * STABLE across renders — keydown wiring binds them once. `canUndo`/`canRedo` are
 * reactive (state) so chrome can disable buttons. Depth is capped to bound memory.
 */
import { useCallback, useRef, useState } from 'react';

/** One reversible step: a label plus its undo / redo thunks (throw when nothing changed). */
export interface HistoryEntry {
	label: string;
	undo: () => Promise<void> | void;
	redo: () => Promise<void> | void;
}

export interface UseUndoRedoResult {
	/** Push a new entry; clears the redo stack. */
	record: (entry: HistoryEntry) => void;
	/** Pop the top undo entry, run its `undo`, push it to the redo stack. No-op when empty. */
	undo: () => Promise<void>;
	/** Pop the top redo entry, run its `redo`, push it to the undo stack. No-op when empty. */
	redo: () => Promise<void>;
	/** True when the undo stack is non-empty. */
	canUndo: boolean;
	/** True when the redo stack is non-empty. */
	canRedo: boolean;
	/** Drop all history. */
	clear: () => void;
}

const DEFAULT_MAX_DEPTH = 100;

export function useUndoRedo(maxDepth: number = DEFAULT_MAX_DEPTH): UseUndoRedoResult {
	const undoStack = useRef<HistoryEntry[]>([]);
	const redoStack = useRef<HistoryEntry[]>([]);
	// Moves on at every edit and clear: a step asked for before one of them does not run after it.
	const generation = useRef(0);
	const [canUndo, setCanUndo] = useState(false);
	const [canRedo, setCanRedo] = useState(false);

	const sync = useCallback(() => {
		setCanUndo(undoStack.current.length > 0);
		setCanRedo(redoStack.current.length > 0);
	}, []);

	const record = useCallback(
		(entry: HistoryEntry) => {
			undoStack.current.push(entry);
			if (undoStack.current.length > maxDepth) undoStack.current.shift();
			redoStack.current = [];
			generation.current += 1;
			sync();
		},
		[maxDepth, sync],
	);

	// The step running now; the next one waits for it. A step never rejects.
	const running = useRef<Promise<void>>(Promise.resolve());

	// Move the top entry from one stack to the other and run it; it moves back if it throws.
	const step = useCallback(
		(from: { current: HistoryEntry[] }, to: { current: HistoryEntry[] }, run: (entry: HistoryEntry) => Promise<void> | void) => {
			const asked = generation.current;
			const next = running.current.then(async () => {
				if (generation.current !== asked) return;
				const source = from.current;
				const entry = source.pop();
				if (!entry) return;
				const place = source.length;
				to.current.push(entry);
				sync();
				try {
					await run(entry);
				} catch {
					// Nothing changed: the entry leaves the other stack and goes back to its place,
					// under any edit recorded meanwhile. A stack replaced since (a clear, or the redo
					// stack an edit forked) has no place for it, so it is dropped.
					const index = to.current.lastIndexOf(entry);
					if (index >= 0) to.current.splice(index, 1);
					if (from.current === source) source.splice(Math.min(place, source.length), 0, entry);
					sync();
				}
			});
			running.current = next;
			return next;
		},
		[sync],
	);
	const undo = useCallback(() => step(undoStack, redoStack, (entry) => entry.undo()), [step]);
	const redo = useCallback(() => step(redoStack, undoStack, (entry) => entry.redo()), [step]);

	const clear = useCallback(() => {
		undoStack.current = [];
		redoStack.current = [];
		generation.current += 1;
		sync();
	}, [sync]);

	return { record, undo, redo, canUndo, canRedo, clear };
}
