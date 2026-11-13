/**
 * Identity and write values of related records, read only from the relation
 * model. Nothing here assumes a key named `id`, a one-field key, or a naming
 * convention: every field comes from `RelationModel.keys`, `junction` or
 * `target.primaryKey`, and records are compared by value.
 */
import type { RelationModel, TableModel } from '@constructive-io/data';

/** A record as the API returns it. */
export type RecordValues = Readonly<Record<string, unknown>>;

/** Key values per field, in the shape a document builder takes. */
export type FieldValues = Record<string, unknown>;

function present(value: unknown): boolean {
	return value !== null && value !== undefined;
}

/**
 * A comparable key for the values of `fields`, or null when any of them is
 * missing. Two records with the same values get the same key.
 */
export function valuesKey(values: readonly unknown[]): string | null {
	if (values.length === 0 || !values.every(present)) return null;
	return JSON.stringify(values);
}

/** The comparable key of `record` over `fields`, or null when a field has no value. */
export function recordKey(record: RecordValues | null | undefined, fields: readonly string[]): string | null {
	if (!record) return null;
	return valuesKey(fields.map((field) => record[field]));
}

/** The values of `fields` in `record`, or null when one is missing. */
export function fieldValues(record: RecordValues | null | undefined, fields: readonly string[]): FieldValues | null {
	if (!record || fields.length === 0) return null;
	const values: FieldValues = {};
	for (const field of fields) {
		const value = record[field];
		if (!present(value)) return null;
		values[field] = value;
	}
	return values;
}

/**
 * The fields of a related record that identify it for this relation:
 * the referenced fields for belongsTo, the related table's primary key for
 * hasOne/hasMany (the write targets that row), and the fields the junction
 * references for manyToMany.
 */
export function linkFields(relation: RelationModel): readonly string[] {
	switch (relation.kind) {
		case 'belongsTo':
			return relation.keys.map((pair) => pair.remote);
		case 'hasOne':
		case 'hasMany':
			return relation.target.primaryKey;
		case 'manyToMany':
			return relation.junction?.right.map((pair) => pair.remote) ?? [];
	}
}

/** The comparable identity of a related record for this relation. */
export function linkKey(relation: RelationModel, record: RecordValues | null | undefined): string | null {
	return recordKey(record, linkFields(relation));
}

/** belongsTo: the key of the record this row links to now, read from the row's own fields. */
export function belongsToCurrentKey(relation: RelationModel, row: RecordValues | null | undefined): string | null {
	if (!row) return null;
	return valuesKey(relation.keys.map((pair) => row[pair.local]));
}

/**
 * belongsTo: the values to write on this row to link `record`
 * (`keys[].local` from `keys[].remote`), or null when the record lacks one
 * of the referenced values.
 */
export function belongsToLinkPatch(relation: RelationModel, record: RecordValues): FieldValues | null {
	const patch: FieldValues = {};
	for (const pair of relation.keys) {
		const value = record[pair.remote];
		if (!present(value)) return null;
		patch[pair.local] = value;
	}
	return patch;
}

/** belongsTo: the values that clear the link on this row. */
export function belongsToClearPatch(relation: RelationModel): FieldValues {
	return Object.fromEntries(relation.keys.map((pair): [string, null] => [pair.local, null]));
}

/**
 * hasOne/hasMany: the values to write on a related record so it points at
 * this row (`keys[].remote` from this row's `keys[].local`), or null when this
 * row has no value for one of them.
 */
export function hasLinkPatch(relation: RelationModel, row: RecordValues): FieldValues | null {
	const patch: FieldValues = {};
	for (const pair of relation.keys) {
		const value = row[pair.local];
		if (!present(value)) return null;
		patch[pair.remote] = value;
	}
	return patch;
}

/** hasOne/hasMany: the values that detach a related record from this row. */
export function hasUnlinkPatch(relation: RelationModel): FieldValues {
	return Object.fromEntries(relation.keys.map((pair): [string, null] => [pair.remote, null]));
}

/**
 * hasOne/hasMany: where a related record points now. `here` when it links to
 * this row, `elsewhere` when it links to another record, `none` when it is free.
 */
export function hasLinkOwner(
	relation: RelationModel,
	row: RecordValues,
	record: RecordValues,
): 'here' | 'elsewhere' | 'none' {
	const values = relation.keys.map((pair) => record[pair.remote]);
	if (!values.some(present)) return 'none';
	const here = valuesKey(relation.keys.map((pair) => row[pair.local]));
	return here !== null && valuesKey(values) === here ? 'here' : 'elsewhere';
}

/**
 * manyToMany: the values of a new junction row linking this row and `record`,
 * or null when either side lacks a referenced value.
 */
export function junctionLinkValues(relation: RelationModel, row: RecordValues, record: RecordValues): FieldValues | null {
	const junction = relation.junction;
	if (!junction) return null;
	const values: FieldValues = {};
	for (const pair of junction.left) {
		const value = row[pair.local];
		if (!present(value)) return null;
		values[pair.junction] = value;
	}
	for (const pair of junction.right) {
		const value = record[pair.remote];
		if (!present(value)) return null;
		values[pair.junction] = value;
	}
	return values;
}

/** manyToMany: the filter values that select this row's junction rows (`left[].junction` = this row's values). */
export function junctionLeftValues(relation: RelationModel, row: RecordValues): FieldValues | null {
	const junction = relation.junction;
	if (!junction) return null;
	const values: FieldValues = {};
	for (const pair of junction.left) {
		const value = row[pair.local];
		if (!present(value)) return null;
		values[pair.junction] = value;
	}
	return values;
}

/** manyToMany: the identity of the related record a junction row points at, comparable with {@link linkKey}. */
export function junctionRightKey(relation: RelationModel, junctionRow: RecordValues): string | null {
	const right = relation.junction?.right ?? [];
	return valuesKey(right.map((pair) => junctionRow[pair.junction]));
}

/**
 * manyToMany: a stand-in for the related record a junction row points at,
 * carrying the referenced values under the related table's field names.
 */
export function junctionRightRecord(relation: RelationModel, junctionRow: RecordValues): FieldValues {
	const right = relation.junction?.right ?? [];
	return Object.fromEntries(right.map((pair) => [pair.remote, junctionRow[pair.junction]]));
}

/** The primary-key values of a record of `model`, or null when the table has no key or the record lacks a value. */
export function primaryKeyValues(model: TableModel, record: RecordValues): FieldValues | null {
	return fieldValues(record, model.primaryKey);
}

/**
 * The equality filter that selects records of `model` whose `fields` equal
 * `values`, using the filter input names and operators the model proved.
 * Null when one of the fields cannot be filtered by equality.
 */
export function equalityFilter(model: TableModel, values: FieldValues): Record<string, unknown> | null {
	const filter: Record<string, unknown> = {};
	for (const [field, value] of Object.entries(values)) {
		const column = model.columns.find((candidate) => candidate.name === field);
		const supportsEquality = column?.filter?.operators.some((operator) => operator.name === 'equalTo');
		if (!column?.filter || !supportsEquality) return null;
		filter[column.filter.field] = { equalTo: value };
	}
	return Object.keys(filter).length > 0 ? filter : null;
}
