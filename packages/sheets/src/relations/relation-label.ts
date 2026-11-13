/**
 * Labels of related records, from the related table's display rule
 * (`RelationTargetModel.labelFields`, which already applies the host
 * override). No field-name lists live here.
 */
import type { RelationModel, RelationTargetModel } from '@constructive-io/data';

import { linkFields, type RecordValues } from './relation-keys';

const KEY_SEPARATOR = ' · ';

function text(value: unknown): string {
	if (value === null || value === undefined) return '';
	if (typeof value === 'object') return '';
	return String(value).trim();
}

function sameFields(left: readonly string[], right: readonly string[]): boolean {
	return left.length === right.length && left.every((field, index) => field === right[index]);
}

/** Join the values of `fields` that have text, or '' when none has. */
function joined(record: RecordValues, fields: readonly string[]): string {
	return fields.map((field) => text(record[field])).filter(Boolean).join(KEY_SEPARATOR);
}

/**
 * The label of one related record. The first non-empty label field wins; a
 * label made of the key fields shows every key value, because one part of a
 * composite key does not identify the record. A record whose label fields are
 * empty falls back to its key value.
 */
export function targetRecordLabel(
	record: RecordValues | null | undefined,
	target: RelationTargetModel,
	fallbackFields: readonly string[] = [],
): string {
	if (!record || typeof record !== 'object') return '';
	const { labelFields, primaryKey } = target;
	if (labelFields.length > 0 && sameFields(labelFields, primaryKey)) {
		const key = joined(record, primaryKey);
		if (key) return key;
	} else {
		for (const field of labelFields) {
			const value = text(record[field]);
			if (value) return value;
		}
	}
	return joined(record, primaryKey) || joined(record, fallbackFields);
}

/** The label of a record related through `relation`, falling back to the fields the relation links by. */
export function relationRecordLabel(relation: RelationModel, record: RecordValues | null | undefined): string {
	return targetRecordLabel(record, relation.target, linkFields(relation));
}
