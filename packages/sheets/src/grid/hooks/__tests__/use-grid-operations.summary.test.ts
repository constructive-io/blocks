import { describe, expect, it } from 'vitest';

import { summarizeDeleteResult } from '../use-grid-operations';

// Discarding an UNSAVED draft must not say a row was deleted.
//
// The bulk-delete handler distinguishes draft discards (client-side, nothing hits
// the server) from real server-row deletes. `summarizeDeleteResult(drafts, deleted,
// failed)` builds the save status the bar shows when the delete ends.

describe('summarizeDeleteResult', () => {
	it('only drafts discarded → "N draft(s) discarded" (no server delete claimed)', () => {
		expect(summarizeDeleteResult(1, 0, 0)).toEqual({ status: 'success', message: '1 draft discarded' });
		expect(summarizeDeleteResult(3, 0, 0)).toEqual({ status: 'success', message: '3 drafts discarded' });
	});

	it('only server rows → "Row deleted" / "N rows deleted"', () => {
		expect(summarizeDeleteResult(0, 1, 0)).toEqual({ status: 'success', message: 'Row deleted' });
		expect(summarizeDeleteResult(0, 4, 0)).toEqual({ status: 'success', message: '4 rows deleted' });
	});

	it('mixed → "N rows deleted, M drafts discarded"', () => {
		expect(summarizeDeleteResult(2, 3, 0)).toEqual({ status: 'success', message: '3 rows deleted, 2 drafts discarded' });
		expect(summarizeDeleteResult(1, 1, 0)).toEqual({ status: 'success', message: '1 row deleted, 1 draft discarded' });
	});

	it('partial (some failures) counts drafts and server rows as successes', () => {
		// 1 draft + 1 server succeeded, 2 server deletes failed.
		expect(summarizeDeleteResult(1, 1, 2)).toEqual({ status: 'partial', message: '2 deleted, 2 not deleted' });
	});

	it('all failed', () => {
		expect(summarizeDeleteResult(0, 0, 1)).toEqual({ status: 'error', message: 'Row not deleted' });
		expect(summarizeDeleteResult(0, 0, 3)).toEqual({ status: 'error', message: '3 rows not deleted' });
	});

	it('nothing happened → null (no status)', () => {
		expect(summarizeDeleteResult(0, 0, 0)).toBeNull();
	});
});
