import { describe, expect, it } from 'vitest';

import { summarizeDeleteResult } from '../use-grid-operations';

// FIX B — discarding an UNSAVED draft must not toast "Deleted 1 row".
//
// The bulk-delete handler distinguishes draft discards (client-side, nothing hits
// the server) from real server-row deletes. `summarizeDeleteResult(drafts, deleted,
// failed)` builds the completion toast. The all-success wording reflects reality;
// the failure (partial/error) wording is unchanged from prior behavior.

describe('FIX B — summarizeDeleteResult toast selection', () => {
	it('only drafts discarded → "Discarded N draft(s)" (no server delete claimed)', () => {
		expect(summarizeDeleteResult(1, 0, 0)).toEqual({ status: 'success', message: 'Discarded 1 draft' });
		expect(summarizeDeleteResult(3, 0, 0)).toEqual({ status: 'success', message: 'Discarded 3 drafts' });
	});

	it('only server rows → current wording "Deleted N row(s)"', () => {
		expect(summarizeDeleteResult(0, 1, 0)).toEqual({ status: 'success', message: 'Deleted 1 row' });
		expect(summarizeDeleteResult(0, 4, 0)).toEqual({ status: 'success', message: 'Deleted 4 rows' });
	});

	it('mixed → "Deleted N rows, discarded M drafts"', () => {
		expect(summarizeDeleteResult(2, 3, 0)).toEqual({
			status: 'success',
			message: 'Deleted 3 rows, discarded 2 drafts',
		});
		expect(summarizeDeleteResult(1, 1, 0)).toEqual({
			status: 'success',
			message: 'Deleted 1 row, discarded 1 draft',
		});
	});

	it('partial (some failures) keeps prior wording, counting drafts+server as successes', () => {
		// 1 draft + 1 server succeeded, 2 server deletes failed.
		expect(summarizeDeleteResult(1, 1, 2)).toEqual({ status: 'partial', message: 'Deleted 2, 2 failed' });
	});

	it('all failed → error wording unchanged', () => {
		expect(summarizeDeleteResult(0, 0, 1)).toEqual({ status: 'error', message: 'Failed to delete 1 row' });
		expect(summarizeDeleteResult(0, 0, 3)).toEqual({ status: 'error', message: 'Failed to delete 3 rows' });
	});

	it('nothing happened → null (no toast)', () => {
		expect(summarizeDeleteResult(0, 0, 0)).toBeNull();
	});
});
