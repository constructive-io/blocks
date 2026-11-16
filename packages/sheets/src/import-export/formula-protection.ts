// Protection against spreadsheet formulas in exported CSV ("CSV injection").
//
// A spreadsheet app opening a CSV file runs a cell that starts with `=`, `+`, `-`
// or `@` as a formula, and some apps also treat a leading tab or carriage return
// that way. With protection on, such a text value is written with a leading
// apostrophe, which the app shows as text and does not run. It is opt-in: the
// apostrophe changes the value, so a file meant to be imported back as data
// should be written without it.
//
// Only text is protected. A number stored as a number (a negative integer, or a
// big or exact decimal the server sends as a string) is written as is, so it
// stays a number in the spreadsheet.

import type { ColumnModel, ColumnValueKind } from '@constructive-io/data';

/** Characters that make a spreadsheet app treat a cell as a formula. */
const FORMULA_START = /^[=+\-@\t\r]/;

/** Kinds whose values are numbers, even when the server sends them as strings. */
const NUMBER_KINDS: ReadonlySet<ColumnValueKind> = new Set(['integer', 'bigint', 'decimal', 'float']);

/** Options every CSV export takes. */
export interface CsvExportOptions {
	/** Prefix text that starts like a formula with an apostrophe. Default false. */
	protectFormulas?: boolean;
}

/** The text with a leading apostrophe when a spreadsheet app would run it as a formula. */
export function protectFormulaText(text: string): string {
	return FORMULA_START.test(text) ? `'${text}` : text;
}

/** Whether a column holds numbers, which are never prefixed. */
export function isNumberColumn(column: ColumnModel): boolean {
	return NUMBER_KINDS.has(column.value.kind);
}
