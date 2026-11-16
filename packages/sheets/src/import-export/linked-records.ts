// Find the linked record a file cell names, for a belongsTo column of an import.
//
// A cell names a record by an exact key value or by an exact label (the related
// table's label fields). Each distinct cell text is looked up once, in batches,
// with the filter fields and operators the related table really has. A text
// that matches exactly one record links to it; a text that matches no record,
// or more than one, is an error of its row. Nothing is guessed: no partial,
// case-insensitive or trimmed matching.

import type { ColumnModel, RelationModel, TableModel } from '@constructive-io/data';

import { parseColumnInput } from '../cell-types/column-value';
import { fieldLabel, relationFieldLabel } from '../cell-types/field-label';
import { readAllRows, type RowSource } from './read-all-rows';

type RowRecord = Record<string, unknown>;

/** The key values a cell text links to, or why it links to nothing. */
export type LinkResult = { ok: true; values: Record<string, unknown> } | { ok: false; reason: string };

/** Values per lookup request. */
const LOOKUP_BATCH = 50;

interface Matcher {
	column: ColumnModel;
	/** Filter input field of the column. */
	filterField: string;
}

function isAbort(error: unknown, signal: AbortSignal | undefined): boolean {
	return Boolean(signal?.aborted) || (error instanceof Error && error.name === 'AbortError');
}

/** One value as a comparable string. UUIDs compare without case, everything else exactly. */
function comparable(column: ColumnModel, value: unknown): string | null {
	if (value === null || value === undefined) return null;
	const text = typeof value === 'string' ? value : JSON.stringify(value);
	return column.value.kind === 'uuid' ? text.toLowerCase() : text;
}

/** Columns of the related table that can find a record by an exact value: the linked key, then the label fields. */
function matchersOf(relation: RelationModel, target: TableModel): Matcher[] {
	const fields = [...(relation.keys.length === 1 ? [relation.keys[0]!.remote] : []), ...relation.target.labelFields];
	const matchers: Matcher[] = [];
	for (const field of new Set(fields)) {
		const column = target.columns.find((candidate) => candidate.name === field);
		const filter = column?.filter;
		if (!column || !filter || !column.readable || column.value.isArray) continue;
		if (!filter.operators.some((operator) => operator.name === 'in')) continue;
		matchers.push({ column, filterField: filter.field });
	}
	return matchers;
}

/** Why the records of the related table cannot be matched at all, or null. */
export function linkUnavailableReason(relation: RelationModel, target: TableModel | null): string | null {
	const label = relationFieldLabel(relation);
	if (!target) return `The records of ${label} could not be loaded, so no record can be linked.`;
	if (!target.operations.list?.filter) return `The records of ${label} cannot be searched, so no record can be linked.`;
	const remote = relation.keys.map((pair) => target.columns.find((column) => column.name === pair.remote));
	if (remote.some((column) => !column?.readable)) return `The records of ${label} cannot be read, so no record can be linked.`;
	if (matchersOf(relation, target).length === 0) return `The records of ${label} cannot be found by a value.`;
	return null;
}

function chunks<T>(items: readonly T[], size: number): T[][] {
	const out: T[][] = [];
	for (let index = 0; index < items.length; index += size) out.push(items.slice(index, index + size));
	return out;
}

/**
 * Resolve each distinct cell text of a belongsTo column to the key values of
 * the one record it names. Throws only when `signal` aborts.
 */
export async function resolveLinkedRecords(
	relation: RelationModel,
	source: Omit<RowSource, 'model'> & { target: TableModel | null },
	texts: readonly string[],
	signal?: AbortSignal,
): Promise<Map<string, LinkResult>> {
	const results = new Map<string, LinkResult>();
	const distinct = [...new Set(texts)];
	const unavailable = linkUnavailableReason(relation, source.target);
	if (unavailable || !source.target) {
		for (const text of distinct) results.set(text, { ok: false, reason: unavailable ?? '' });
		return results;
	}
	const target = source.target;
	const matchers = matchersOf(relation, target);
	const remoteFields = relation.keys.map((pair) => pair.remote);
	const columns = [...new Set([...remoteFields, ...matchers.map((matcher) => matcher.column.name)])];

	// Text -> the records it matches, by their linked key values.
	const found = new Map<string, Map<string, RowRecord>>(distinct.map((text) => [text, new Map()]));
	try {
		for (const matcher of matchers) {
			// Comparable value -> the parsed value and the texts that parse to it.
			const values = new Map<string, { value: unknown; texts: string[] }>();
			for (const text of distinct) {
				const parsed = parseColumnInput(matcher.column, text, { fromText: true });
				const key = parsed.ok ? comparable(matcher.column, parsed.value) : null;
				if (!parsed.ok || key === null) continue;
				const entry = values.get(key) ?? { value: parsed.value, texts: [] };
				entry.texts.push(text);
				values.set(key, entry);
			}
			for (const batch of chunks([...values.values()], LOOKUP_BATCH)) {
				const rows = await readAllRows(
					{ adapter: source.adapter, execute: source.execute, model: target },
					{ where: { [matcher.filterField]: { in: batch.map((entry) => entry.value) } }, columns, relations: 'none' },
					{ signal },
				);
				for (const row of rows) {
					const key = comparable(matcher.column, row[matcher.column.name]);
					const entry = key === null ? undefined : values.get(key);
					if (!entry || remoteFields.some((field) => row[field] === null || row[field] === undefined)) continue;
					const identity = JSON.stringify(remoteFields.map((field) => row[field]));
					for (const text of entry.texts) found.get(text)!.set(identity, row);
				}
			}
		}
	} catch (error) {
		if (isAbort(error, signal)) throw error;
		const message = error instanceof Error && error.message ? ` ${error.message}` : '';
		for (const text of distinct) results.set(text, { ok: false, reason: `The linked records could not be looked up.${message}` });
		return results;
	}

	const byWhat = matchers.map((matcher) => fieldLabel(matcher.column.name).toLowerCase()).join(' or ');
	for (const text of distinct) {
		const records = [...found.get(text)!.values()];
		const [record] = records;
		if (records.length === 1 && record) {
			results.set(text, { ok: true, values: Object.fromEntries(relation.keys.map((pair) => [pair.local, record[pair.remote]])) });
		} else if (records.length === 0) {
			results.set(text, { ok: false, reason: `No record has "${text}" as its ${byWhat}.` });
		} else {
			results.set(text, { ok: false, reason: `${records.length} records match "${text}". Use a value that only one record has.` });
		}
	}
	return results;
}
