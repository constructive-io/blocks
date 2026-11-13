// The save status is one state for every write. These are the races it exists to stop:
// overlapping writes showing two outcomes, a fast save replacing a slow one that is still
// running, and an old dismiss timer clearing a newer status.
import { describe, expect, it } from 'vitest';

import { createInitialState, feedbackReducer, type FeedbackState } from '../feedback-reducer';

type Action = Parameters<typeof feedbackReducer>[1];

function run(...actions: Action[]): FeedbackState {
	return actions.reduce(feedbackReducer, createInitialState());
}

const start = (id: string, operationType: 'update' | 'submit' | 'delete' = 'update', total = 1, now = 1): Action => ({
	type: 'OPERATION_START',
	id,
	operationType,
	total,
	now,
});
const complete = (id: string, status: 'success' | 'partial' | 'error', message: string, now = 2): Action => ({
	type: 'OPERATION_COMPLETE',
	id,
	status,
	message,
	dismissAfter: 0,
	now,
});

describe('save status', () => {
	it('stays "saving" while a slow write runs, even when a fast one ends first', () => {
		const state = run(start('slow'), start('fast'), complete('fast', 'success', 'Saved'));
		expect(state.operation).toMatchObject({ status: 'pending', message: 'Saving…' });
	});

	it('settles once, when the last write ends, with one outcome for all of them', () => {
		const ok = run(start('a'), start('b'), complete('a', 'success', 'Saved'), complete('b', 'success', 'Saved'));
		expect(ok.operation).toMatchObject({ status: 'success', message: 'All changes saved' });

		const mixed = run(start('a'), start('b'), complete('a', 'error', 'Not saved'), complete('b', 'success', 'Saved'));
		expect(mixed.operation).toMatchObject({ status: 'partial', message: 'Some changes were not saved' });

		// A failure that ends first is not hidden by a success that ends later.
		const failed = run(start('a'), start('b'), complete('a', 'error', 'Not saved'), complete('b', 'error', 'Not saved'));
		expect(failed.operation).toMatchObject({ status: 'error', message: 'Changes were not saved' });
	});

	it('keeps a single write its own words', () => {
		expect(run(start('d', 'delete', 3), complete('d', 'success', '3 rows deleted')).operation).toMatchObject({
			status: 'success',
			message: '3 rows deleted',
		});
		expect(run(start('d', 'delete', 3)).operation?.message).toBe('Deleting 3 rows…');
		expect(run(start('a'), start('d', 'delete', 2)).operation?.message).toBe('Saving…');
	});

	it('keeps its id while on screen, so a new write changes the status in place', () => {
		const settled = run(start('a'), complete('a', 'success', 'Saved'));
		const again = feedbackReducer(settled, start('b', 'update', 1, 3));
		expect(again.operation?.id).toBe(settled.operation?.id);
		expect(again.operation?.status).toBe('pending');
		// The new set of writes settles on its own outcome, not on the earlier one.
		expect(feedbackReducer(again, complete('b', 'error', 'Not saved', 4)).operation).toMatchObject({ status: 'error', message: 'Not saved' });
	});

	it('ignores a dismiss meant for an older status', () => {
		const settled = run(start('a'), complete('a', 'success', 'Saved', 2));
		const id = settled.operation!.id;
		// A write started since: the old timer must not clear it.
		const saving = feedbackReducer(settled, start('b', 'update', 1, 3));
		expect(feedbackReducer(saving, { type: 'OPERATION_DISMISS', id, timestamp: 2 }).operation?.status).toBe('pending');
		// Settled again at a later time: the old timer still does nothing.
		const later = feedbackReducer(saving, complete('b', 'success', 'Saved', 5));
		expect(feedbackReducer(later, { type: 'OPERATION_DISMISS', id, timestamp: 2 }).operation).not.toBeNull();
		// Its own timer clears it.
		expect(feedbackReducer(later, { type: 'OPERATION_DISMISS', id, timestamp: 5 }).operation).toBeNull();
	});

	it('ignores the end of a write from before a reset', () => {
		const reset = feedbackReducer(run(start('a')), { type: 'OPERATION_CLEAR' });
		expect(feedbackReducer(reset, complete('a', 'error', 'Not saved')).operation).toBeNull();
	});

	it('keeps an error on screen longer than a success', () => {
		expect(run(start('a'), complete('a', 'success', 'Saved')).operation?.dismissAfter).toBe(3000);
		expect(run(start('a'), complete('a', 'error', 'Not saved')).operation?.dismissAfter).toBe(5000);
	});
});
