/**
 * What a failed write tells the user: every message the server returned, in
 * plain words, with a title that names the cell or row when the write did.
 * A permission refusal reads as a permission problem; only an explicit
 * authentication error means the session ended.
 */
import { getErrorCode, isAuthenticationCode } from '@constructive-io/data';
import type { TableModel } from '@constructive-io/data';

import { responseErrorsOf } from '../../context/sheets-execute';

export type WriteAction = 'update' | 'create' | 'delete';

const PERMISSION_CODES = new Set(['FORBIDDEN', '42501']);
const PERMISSION_TEXT = /\bpermission denied\b|\bnot allowed\b|\binsufficient privilege/i;

// The server's words when an update or delete matched no row it lets this user change.
const NOT_APPLIED_TEXT = /\bNo values were (?:updated|deleted) in collection\b/i;

const NOT_APPLIED_MESSAGES: Record<WriteAction, string> = {
	update: 'This record was not changed. You may not be allowed to change it, or it no longer exists.',
	create: 'This record was not created.',
	delete: 'This record was not deleted. You may not be allowed to delete it, or it no longer exists.',
};

const PERMISSION_MESSAGES: Record<WriteAction, string> = {
	update: 'You do not have permission to change this record.',
	create: 'You do not have permission to add records to this table.',
	delete: 'You do not have permission to delete this record.',
};

interface MessageSource {
	message?: string | null;
	code?: string | null;
}

function plainMessage(source: MessageSource, action: WriteAction): string | null {
	const message = source.message?.trim() ?? '';
	if ((source.code && PERMISSION_CODES.has(source.code)) || PERMISSION_TEXT.test(message)) return PERMISSION_MESSAGES[action];
	if (NOT_APPLIED_TEXT.test(message)) return NOT_APPLIED_MESSAGES[action];
	if (isAuthenticationCode(source.code)) return 'Your session has ended. Sign in again to save changes.';
	return message || null;
}

/** Every distinct message of a failed write, in plain words. */
export function writeErrorMessages(error: unknown, action: WriteAction): string[] {
	const responseErrors = responseErrorsOf(error) ?? [];
	const fromResponse = responseErrors.map((entry) =>
		plainMessage({ message: entry.message, code: entry.extensions?.code ?? null }, action),
	);
	const messages = fromResponse.filter((message): message is string => Boolean(message));
	if (messages.length === 0) {
		const message = error instanceof Error ? error.message : typeof error === 'string' ? error : null;
		const plain = plainMessage({ message, code: getErrorCode(error) }, action);
		messages.push(plain ?? 'The change could not be saved.');
	}
	return [...new Set(messages)];
}

/** The text that names a record: its display fields, else its position. */
export function recordLabel(model: TableModel | null, row: Readonly<Record<string, unknown>> | null | undefined, rowIndex: number): string {
	const parts = (model?.display.fields ?? [])
		.map((field) => row?.[field])
		.filter((value) => value !== null && value !== undefined && value !== '' && typeof value !== 'object')
		.map(String);
	const label = parts.join(' · ');
	if (!label) return `row ${rowIndex + 1}`;
	return label.length > 60 ? `"${label.slice(0, 57)}..."` : `"${label}"`;
}

/** One failed write, as the grid shows it. */
export interface WriteErrorReport {
	id: string;
	title: string;
	messages: readonly string[];
}

let nextReportId = 0;

export function createWriteErrorReport(title: string, messages: readonly string[]): WriteErrorReport {
	nextReportId += 1;
	return { id: `write-error-${nextReportId}`, title, messages };
}
