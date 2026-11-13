// Files in and out of the browser: read a chosen file as text, save text as a
// download, and the import error report.

import { csvFileText } from './delimited-text';
import type { ImportIssue } from './import-plan';

/** Shown when a file read as UTF-8 holds characters that could not be decoded. */
export const NOT_UTF8_WARNING =
	'Some characters of this file could not be read. Save the file as UTF-8 text (in a spreadsheet app, "CSV UTF-8") and choose it again.';

/** Read a chosen file as UTF-8 text. */
export async function readTextFile(file: Blob): Promise<string> {
	if (typeof file.text === 'function') return file.text();
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result ?? ''));
		reader.onerror = () => reject(reader.error ?? new Error('The file could not be read.'));
		reader.readAsText(file);
	});
}

/** Save text as a file the browser downloads. */
export function downloadTextFile(text: string, filename: string, type = 'text/csv;charset=utf-8'): void {
	if (typeof document === 'undefined') return;
	const url = URL.createObjectURL(new Blob([text], { type }));
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.rel = 'noopener';
	document.body.appendChild(link);
	link.click();
	link.remove();
	// Some browsers start the download after the click handler returns.
	setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** A file name from a table name and a suffix, with characters file systems refuse replaced. */
export function safeFileName(base: string, suffix: string): string {
	const cleaned = base.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'records';
	return `${cleaned}${suffix}`;
}

export const NOT_SENT_REASON = 'Not imported: the import stopped before this row was sent.';

/** The error report of an import as CSV: one line per problem, by row. */
export function importErrorReportText(issues: readonly ImportIssue[], notSent: readonly number[] = []): string {
	const all = [
		...issues,
		...notSent.map((row): ImportIssue => ({ row, column: '', columnIndex: null, reason: NOT_SENT_REASON })),
	].sort((left, right) => left.row - right.row || (left.columnIndex ?? -1) - (right.columnIndex ?? -1));
	return csvFileText([['Row', 'Column', 'Reason'], ...all.map((issue) => [String(issue.row), issue.column, issue.reason])]);
}
