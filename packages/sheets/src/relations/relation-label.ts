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

/**
 * What tells a related record apart from others with the same label: its other label fields
 * (an email beside a name), else its key. '' when nothing adds to the label.
 */
export function relationRecordDistinction(relation: RelationModel, record: RecordValues | null | undefined): string {
	if (!record || typeof record !== 'object') return '';
	const label = relationRecordLabel(relation, record);
	const others = relation.target.labelFields.map((field) => text(record[field])).filter((value) => value && value !== label);
	const distinction = others.length > 0 ? others.join(KEY_SEPARATOR) : joined(record, relation.target.primaryKey);
	return distinction === label ? '' : distinction;
}

/** The labels more than one record in a list shares. */
export function sharedLabels(labels: readonly string[]): ReadonlySet<string> {
	const seen = new Set<string>();
	const shared = new Set<string>();
	for (const label of labels) {
		if (seen.has(label)) shared.add(label);
		else seen.add(label);
	}
	return shared;
}

/** A link cell as text to read elsewhere: the linked record's label, or a list's labels, comma separated. */
export function relationCopyText(relation: RelationModel, value: unknown): string {
	if (Array.isArray(value)) {
		return value
			.map((record) => relationRecordLabel(relation, record as RecordValues))
			.filter(Boolean)
			.join(', ');
	}
	return value && typeof value === 'object' ? relationRecordLabel(relation, value as RecordValues) : '';
}
