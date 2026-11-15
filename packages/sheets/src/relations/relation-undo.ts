// Undo for a saved link change. Each step runs the inverse of the writes the step before it
// made (see `invertRelationChanges`), so undo and redo take turns over the same links. A step
// that changes nothing throws after it says why, and the history keeps it to try again.
import type { HistoryEntry } from '../grid/hooks/use-undo-redo';
import {
	applyRelationChanges,
	describeFailures,
	invertRelationChanges,
	type RelationChangeOutcome,
	type RelationChangeRunner,
} from './relation-changes';

export interface RelationUndoDeps {
	run: RelationChangeRunner;
	/** Read the changed tables again. */
	refresh: () => Promise<void>;
	/** The step ran. */
	onDone?: (message: string) => void;
	/** The step, or part of it, did not run: why. */
	onFailed: (title: string, messages: readonly string[]) => void;
}

/** Thrown by a step that changed nothing; its reason was already reported. */
class RelationUndoRefused extends Error {}

/** The history entry for `outcome`, or null when it applied nothing. */
export function relationHistoryEntry(outcome: RelationChangeOutcome, deps: RelationUndoDeps): HistoryEntry | null {
	if (outcome.applied.length === 0) return null;
	let last: Pick<RelationChangeOutcome, 'applied' | 'created'> = outcome;
	let running = false;

	const step = (done: string, failed: string) => async () => {
		if (running) throw new RelationUndoRefused();
		const plan = invertRelationChanges(last);
		if (plan.ok === false) {
			deps.onFailed(failed, [plan.reason]);
			throw new RelationUndoRefused(plan.reason);
		}
		running = true;
		try {
			// In order, stopping at the first refusal: a single link is freed before it is taken again.
			const result = await applyRelationChanges(plan.changes, deps.run, { dependent: true });
			if (result.applied.length > 0) await deps.refresh();
			if (result.failed.length > 0) deps.onFailed(failed, describeFailures(result));
			if (result.applied.length === 0) throw new RelationUndoRefused();
			// What ran is what the next step turns back.
			last = result;
			if (result.failed.length === 0) deps.onDone?.(done);
		} finally {
			running = false;
		}
	};

	return {
		label: 'Change links',
		undo: step('Link change undone', 'The link change could not be undone'),
		redo: step('Link change redone', 'The link change could not be redone'),
	};
}
