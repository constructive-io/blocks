// Which record the record panel shows, and how it is named.
//
// A record is addressed by its table (`TableModel.key` plus the GraphQL type name)
// and the values of its primary key, by field name. Nothing assumes a key called
// `id` or a one-field key; the public identifier a host sees keeps the grid's
// existing contract (a scalar for a key named `id`, else the key object).

import type { RowKey, TableModel } from '@constructive-io/data';

import { targetRecordLabel } from '../relations/relation-label';
import type { SheetsRowIdentifier } from '../row-identity';

/** One saved record in the panel. */
export interface RecordPanelRecordEntry {
	kind: 'record';
	/** `TableModel.key` of the record's table. */
	tableKey: string;
	/** GraphQL type name of that table. */
	tableName: string;
	/** Primary-key values, by field name. */
	key: RowKey;
	/** A label to show while the record loads ('' when unknown). */
	label: string;
	/** The grid row the record was opened from, a hint for previous/next (checked against the key). */
	rowIndex?: number;
}

/** A new record being filled in the panel, not created yet. */
export interface RecordPanelNewEntry {
	kind: 'new';
	tableKey: string;
	tableName: string;
}

export type RecordPanelEntry = RecordPanelRecordEntry | RecordPanelNewEntry;

/** The primary-key values of a row, or null when the table has no key or the row lacks a key value. */
export function recordKeyOf(model: TableModel, row: Readonly<Record<string, unknown>> | null | undefined): RowKey | null {
	if (!row || model.primaryKey.length === 0) return null;
	const key: Record<string, unknown> = {};
	for (const field of model.primaryKey) {
		const value = row[field];
		if (value === null || value === undefined || value === '') return null;
		key[field] = value;
	}
	return key;
}

/** True when two entries show the same saved record. */
export function sameRecord(a: RecordPanelEntry | null, b: RecordPanelEntry | null): boolean {
	if (!a || !b || a.kind !== 'record' || b.kind !== 'record' || a.tableKey !== b.tableKey) return false;
	const fields = Object.keys(a.key);
	return fields.length === Object.keys(b.key).length && fields.every((field) => String(a.key[field]) === String(b.key[field]));
}

/** The grid's public row identifier for a key: a scalar for a key named `id`, else the key object. */
export function identifierOfKey(key: RowKey): SheetsRowIdentifier {
	const fields = Object.keys(key);
	const only = fields.length === 1 ? key[fields[0]!] : undefined;
	if (fields[0] === 'id' && (typeof only === 'string' || typeof only === 'number')) return only;
	return Object.fromEntries(
		Object.entries(key).map(([field, value]) => [field, typeof value === 'number' ? value : String(value)]),
	);
}

/** The key of a public row identifier (the inverse of `identifierOfKey`). */
export function keyOfIdentifier(model: TableModel, identifier: SheetsRowIdentifier): RowKey | null {
	if (typeof identifier === 'object' && identifier !== null) return identifier;
	return model.primaryKey.length === 1 ? { [model.primaryKey[0]!]: identifier } : null;
}

/** The record's title: its table's display fields, else its key values. */
export function recordTitle(model: TableModel, row: Readonly<Record<string, unknown>> | null | undefined): string {
	return targetRecordLabel(row ?? null, { primaryKey: model.primaryKey, labelFields: model.display.fields }) || 'Untitled record';
}
