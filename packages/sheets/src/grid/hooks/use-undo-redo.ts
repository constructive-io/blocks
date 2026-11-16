/**
 * useUndoRedo — a tiny two-stack history for grid mutations.
 *
 * Each {@link HistoryEntry} carries its own inverse: `undo` reverts the change,
 * `redo` re-applies it (both may be async — a server mutation). `record` pushes a
 * new entry onto the undo stack and CLEARS the redo stack (a fresh edit forks the
 * timeline). `undo`/`redo` move the top entry across the two stacks, running the
 * matching thunk. A thunk that throws did not change anything: the entry goes back
 * where it was, so the step can be tried again (the entry reports its own failure).
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
			sync();
		},
		[maxDepth, sync],
	);

	// Move the top entry from one stack to the other and run it; it moves back if it throws.
	const step = useCallback(
		async (from: { current: HistoryEntry[] }, to: { current: HistoryEntry[] }, run: (entry: HistoryEntry) => Promise<void> | void) => {
			const entry = from.current.pop();
			if (!entry) return;
			to.current.push(entry);
			sync();
			try {
				await run(entry);
			} catch {
				const index = to.current.lastIndexOf(entry);
				if (index >= 0) to.current.splice(index, 1);
				from.current.push(entry);
				sync();
			}
		},
		[sync],
	);
	const undo = useCallback(() => step(undoStack, redoStack, (entry) => entry.undo()), [step]);
	const redo = useCallback(() => step(redoStack, undoStack, (entry) => entry.redo()), [step]);

	const clear = useCallback(() => {
		undoStack.current = [];
		redoStack.current = [];
		sync();
	}, [sync]);

	return { record, undo, redo, canUndo, canRedo, clear };
}
