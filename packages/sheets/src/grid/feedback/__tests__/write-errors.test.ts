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

describe('writeErrorMessages for the database rules', () => {
	const rule = (code: string, message: string, context: Record<string, unknown>) =>
		withResponseErrors(new Error(message), null, [{ message, extensions: { code, context } }]);

	it('names each refusal the server classifies in plain words, never its constraint text', () => {
		expect(writeErrorMessages(rule('UNIQUE_VIOLATION', 'duplicate key value violates unique constraint "tags_label_key"', { constraint: 'tags_label_key' }), 'update')).toEqual([
			'Another record already has this value.',
		]);
		expect(writeErrorMessages(rule('NOT_NULL_VIOLATION', 'null value in column "due_on" violates not-null constraint', { column: 'due_on' }), 'update')).toEqual([
			'Due on needs a value.',
		]);
		expect(writeErrorMessages(rule('CHECK_VIOLATION', 'new row violates check constraint "tasks_priority_chk"', { constraint: 'tasks_priority_chk' }), 'create')).toEqual([
			'This value is not allowed by a rule of this table.',
		]);
		const missingLink = rule('FOREIGN_KEY_VIOLATION', 'violates foreign key constraint "tasks_project_id_fkey"', { constraint: 'tasks_project_id_fkey' });
		expect(writeErrorMessages(missingLink, 'update')).toEqual(['The linked record does not exist.']);
		expect(writeErrorMessages(missingLink, 'delete')).toEqual(['Other records still link to this record.']);
	});

	it('prefers the message registered for the constraint', () => {
		expect(writeErrorMessages(rule('UNIQUE_VIOLATION', 'duplicate key value violates unique constraint "people_email_key"', { constraint: 'people_email_key' }), 'update')).toEqual([
			'This email address is already registered.',
		]);
	});

	it('names the table whose records still link to a record the database will not delete', () => {
		const restrict = new Error('update or delete on table "people" violates RESTRICT setting of foreign key constraint "projects_owner_id_fkey" on table "projects"');
		expect(writeErrorMessages(restrict, 'delete')).toEqual(['Other records in Projects still link to this record. Change or remove them first.']);
	});
});
