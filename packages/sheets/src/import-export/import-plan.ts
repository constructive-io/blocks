// From file records to the values of new records, each cell checked first.
//
// Every mapped cell passes the grid's own value parser (`parseColumnInput`), so
// a value the grid would refuse is refused here with the same reason. A blank
// cell leaves its field out, so the table's default applies; a blank cell of a
// required field is an error. A row with any error is not imported; it is
// listed in the error report with its spreadsheet row number.

import { parseColumnInput } from '../cell-types/column-value';
import type { DelimitedTable } from './delimited-text';
import type { ImportMapping, ImportTarget } from './import-targets';
import type { LinkResult } from './linked-records';

/** One problem of the import, as the error report lists it. */
export interface ImportIssue {
	/** Spreadsheet row number of the file (the header is row 1). */
	row: number;
	/** The file column, or '' for a problem of the whole row. */
	column: string;
	/** Index of the file column, or null for a problem of the whole row. */
	columnIndex: number | null;
	reason: string;
}

/** A file row, checked, before its linked records are looked up. */
export interface ImportRowDraft {
	row: number;
	values: Record<string, unknown>;
	/** Cells that name a linked record. */
	links: readonly { target: ImportTarget & { kind: 'relation' }; text: string; columnIndex: number }[];
	issues: ImportIssue[];
}

/** A row ready to be created. */
export interface ImportRow {
	row: number;
	values: Record<string, unknown>;
}

const REQUIRED_REASON = 'This field needs a value.';

/** The name of a file column in messages: its header, or its position when the header is blank. */
export function fileColumnName(header: readonly string[], index: number): string {
	const name = header[index]?.trim();
	return name ? name : `Column ${index + 1}`;
}

/** Check every mapped cell of every record. */
export function draftImportRows(
	table: DelimitedTable,
	mapping: ImportMapping,
	targets: readonly ImportTarget[],
): ImportRowDraft[] {
	const byKey = new Map(targets.map((target) => [target.key, target]));
	const required = new Set(
		targets.flatMap((target) => (target.kind === 'column' && target.column.write.requiredOnCreate ? [target.column.name] : [])),
	);
	const mapped = mapping.flatMap((key, index) => {
		const target = key ? byKey.get(key) : undefined;
		return target ? [{ index, target, column: fileColumnName(table.header, index) }] : [];
	});

	return table.records.map((record) => {
		const values: Record<string, unknown> = {};
		const links: ImportRowDraft['links'][number][] = [];
		const issues: ImportIssue[] = [];
		const issue = (columnIndex: number | null, column: string, reason: string) =>
			issues.push({ row: record.row, column, columnIndex, reason });

		const extra = record.fields.slice(table.header.length);
		if (extra.some((field) => field.trim() !== '')) {
			issue(null, '', `This row has ${record.fields.length} values, but the header has ${table.header.length} columns.`);
		}

		for (const { index, target, column } of mapped) {
			const text = record.fields[index] ?? '';
			if (target.kind === 'relation') {
				if (text.trim() !== '') links.push({ target, text, columnIndex: index });
				else if (target.relation.keys.some((pair) => required.has(pair.local))) issue(index, column, REQUIRED_REASON);
				continue;
			}
			if (text.trim() === '') {
				if (target.column.write.requiredOnCreate) issue(index, column, REQUIRED_REASON);
				continue;
			}
			const parsed = parseColumnInput(target.column, text, { fromText: true });
			if (parsed.ok === false) issue(index, column, parsed.reason);
			else values[target.column.name] = parsed.value;
		}
		return { row: record.row, values, links, issues };
	});
}

/** The distinct cell texts that name a linked record, per relation target key. */
export function linkedTexts(drafts: readonly ImportRowDraft[]): Map<string, string[]> {
	const texts = new Map<string, Set<string>>();
	for (const draft of drafts) {
		if (draft.issues.length > 0) continue;
		for (const link of draft.links) {
			const set = texts.get(link.target.key) ?? new Set<string>();
			set.add(link.text);
			texts.set(link.target.key, set);
		}
	}
	return new Map([...texts].map(([key, set]) => [key, [...set]]));
}

/** Rows ready to create, and every problem, once the linked records are known (target key -> text -> result). */
export function finishImportRows(
	drafts: readonly ImportRowDraft[],
	header: readonly string[],
	links: ReadonlyMap<string, ReadonlyMap<string, LinkResult>>,
): { rows: ImportRow[]; issues: ImportIssue[] } {
	const rows: ImportRow[] = [];
	const issues: ImportIssue[] = [];
	for (const draft of drafts) {
		const rowIssues = [...draft.issues];
		const values = { ...draft.values };
		for (const link of draft.links) {
			const result = links.get(link.target.key)?.get(link.text);
			if (result?.ok) {
				Object.assign(values, result.values);
				continue;
			}
			// A row that already has a problem is not looked up; its other problems stand for it.
			if (!result && draft.issues.length > 0) continue;
			rowIssues.push({
				row: draft.row,
				column: fileColumnName(header, link.columnIndex),
				columnIndex: link.columnIndex,
				reason: result && result.ok === false ? result.reason : 'The linked record was not looked up.',
			});
		}
		if (rowIssues.length === 0) rows.push({ row: draft.row, values });
		else issues.push(...rowIssues);
	}
	return { rows, issues };
}
