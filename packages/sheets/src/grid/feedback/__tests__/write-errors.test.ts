// A refused write in plain words: an ended session reads the same whichever
// authentication code the server sent, and other server text passes through.
import { describe, expect, it } from 'vitest';

import { withResponseErrors } from '../../../context/sheets-execute';
import { writeErrorMessages } from '../write-errors';

const SESSION_ENDED = 'Your session has ended. Sign in again to save changes.';

function refused(code: string, message: string): Error {
	return withResponseErrors(new Error(message), null, [{ message, extensions: { code } }]);
}

describe('writeErrorMessages', () => {
	it('says the session has ended for every authentication code', () => {
		expect(writeErrorMessages(refused('UNAUTHENTICATED', 'jwt expired'), 'update')).toEqual([SESSION_ENDED]);
		expect(writeErrorMessages(refused('BAD_TOKEN_DEFINITION', 'Bad token'), 'update')).toEqual([SESSION_ENDED]);
	});

	it("keeps the server's own words for any other refusal", () => {
		expect(writeErrorMessages(refused('23505', 'That code is already taken.'), 'create')).toEqual(['That code is already taken.']);
	});

	it('turns the server text for a write that matched no row into plain words', () => {
		const deleted = new Error("No values were deleted in collection 'owned_notes' because no values you can delete were found matching these criteria.");
		expect(writeErrorMessages(deleted, 'delete')).toEqual(['This record was not deleted. You may not be allowed to delete it, or it no longer exists.']);
		const updated = new Error("No values were updated in collection 'tasks' because no values you can update were found matching these criteria.");
		expect(writeErrorMessages(updated, 'update')).toEqual(['This record was not changed. You may not be allowed to change it, or it no longer exists.']);
	});
});
