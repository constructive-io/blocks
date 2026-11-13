// A view's full result as CSV: every page, with the view's filter and sort, the
// view's columns in its order.
//
// Values use the grid's copy format (`formatColumnValue`), so an exported file
// imports back exactly: choices as their labels, structured values and lists as
// JSON. A linked record is written as its label; a list of linked records as a
// JSON list of labels. Only the requested columns are read from the server.

import { readCellError, readRelationTotalCount } from '@constructive-io/data';
import type { ColumnModel, RelationModel, SortSpec, TableModel } from '@constructive-io/data';

import { copyText, formatColumnValue } from '../cell-types/column-value';
import { relationRecordLabel } from '../relations/relation-label';
import { csvFileText } from './delimited-text';
import { isNumberColumn, protectFormulaText, type CsvExportOptions } from './formula-protection';
import { readAllRows, type RowSource } from './read-all-rows';

type RowRecord = Record<string, unknown>;

export type ExportColumn =
	| { kind: 'column'; key: string; column: ColumnModel }
	| { kind: 'relation'; key: string; relation: RelationModel };

export interface ExportViewQuery {
	/** The view's filter, search included. */
	where?: Readonly<Record<string, unknown>>;
	orderBy?: readonly SortSpec[];
	/** Column keys in the view's order: column names and relation field names. */
	columns: readonly string[];
}

export interface ExportViewResult {
	/** The CSV file body. */
	text: string;
	rowCount: number;
	/** Cells the server could not send; they are written empty. */
	unreadableCells: number;
	/** Cells of a list of linked records that hold only the first `RELATION_PAGE_SIZE` records. */
	truncatedLists: number;
}

/** Linked records written per list cell. */
export const RELATION_PAGE_SIZE = 100;

/** The columns of `keys` a file can hold, in order: readable columns and readable relations. Other keys are left out. */
export function exportColumns(model: TableModel, keys: readonly string[]): ExportColumn[] {
	const out: ExportColumn[] = [];
	for (const key of new Set(keys)) {
		const column = model.columns.find((candidate) => candidate.name === key);
		if (column) {
			if (column.readable) out.push({ kind: 'column', key, column });
			continue;
		}
		const relation = model.relations.find((candidate) => candidate.fieldName === key);
		if (relation?.readable) out.push({ kind: 'relation', key, relation });
	}
	return out;
}

function relationText(relation: RelationModel, value: unknown): string {
	if (Array.isArray(value)) return value.length ? JSON.stringify(value.map((record) => relationRecordLabel(relation, record))) : '';
	return value && typeof value === 'object' ? relationRecordLabel(relation, value as RowRecord) : '';
}

/**
 * Rows as a CSV file body, with `columns` as the header, and the cells that could not
 * be written in full. With `protectFormulas`, text cells that start like a formula get
 * a leading apostrophe; number columns and the header are never changed.
 */
export function rowsCsvText(
	columns: readonly ExportColumn[],
	rows: readonly RowRecord[],
	options: CsvExportOptions = {},
): Omit<ExportViewResult, 'rowCount'> {
	let unreadableCells = 0;
	let truncatedLists = 0;
	const protect = (text: string) => (options.protectFormulas ? protectFormulaText(text) : text);
	const records = rows.map((row) =>
		columns.map((entry) => {
			if (entry.kind === 'column') {
				if (readCellError(row, entry.column.name) !== null) {
					unreadableCells += 1;
					return '';
				}
				const text = formatColumnValue(entry.column, row[entry.column.name]);
				return isNumberColumn(entry.column) ? text : protect(text);
			}
			const value = row[entry.relation.fieldName];
			const total = readRelationTotalCount(row, entry.relation.fieldName);
			if (Array.isArray(value) && total !== null && total > value.length) truncatedLists += 1;
			return protect(relationText(entry.relation, value));
		}),
	);
	return { text: csvFileText([columns.map((entry) => entry.key), ...records]), unreadableCells, truncatedLists };
}

/**
 * Rows the grid holds (the selected rows, or the loaded ones) as a CSV file body.
 * With a model, its columns and relations in the copy format, and keys the grid adds
 * itself left out; before the model loads, every key as plain text.
 */
export function loadedRowsCsv(
	model: TableModel | null,
	rows: readonly RowRecord[],
	keys: readonly string[],
	options: CsvExportOptions = {},
): string {
	if (model) return rowsCsvText(exportColumns(model, keys), rows, options).text;
	// Without a model only a value that is text itself can be told apart from a number.
	const cell = (value: unknown, key: string) => {
		const text = copyText(null, key, value);
		return options.protectFormulas && typeof value === 'string' ? protectFormulaText(text) : text;
	};
	return csvFileText([keys, ...rows.map((row) => keys.map((key) => cell(row[key], key)))]);
}

/** Read every row of the view and write it as CSV. Throws the abort reason when `signal` aborts. */
export async function exportViewCsv(
	source: RowSource,
	query: ExportViewQuery,
	options: CsvExportOptions & {
		signal?: AbortSignal;
		onProgress?: (progress: { loaded: number; total: number | null }) => void;
	} = {},
): Promise<ExportViewResult> {
	const columns = exportColumns(source.model, query.columns);
	const rows = await readAllRows(
		source,
		{
			where: query.where,
			orderBy: query.orderBy,
			columns: columns.flatMap((entry) => (entry.kind === 'column' ? [entry.column.name] : [])),
			relations: columns.flatMap((entry) => (entry.kind === 'relation' ? [entry.relation.fieldName] : [])),
			relationPageSize: RELATION_PAGE_SIZE,
		},
		{ signal: options.signal, onPage: options.onProgress },
	);
	return { ...rowsCsvText(columns, rows, { protectFormulas: options.protectFormulas }), rowCount: rows.length };
}
