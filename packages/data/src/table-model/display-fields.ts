import type { ColumnValueKind, DisplayFieldOverrides, DisplayFieldsModel, TableModel } from './types';

/**
 * The display rule: which fields label a record of a table, for relation
 * chips, pickers and the record title. A record's label is the first non-empty
 * value among the returned fields.
 *
 * This is presentation only, so name heuristics are allowed here and only
 * here. Order: host override, then known name fields, then the first text
 * column that is not a key, then the primary key.
 */

/** One candidate field for the display rule. */
export interface DisplayCandidate {
	name: string;
	kind: ColumnValueKind;
	isArray: boolean;
	/** True when the list document can select the field as a plain value. */
	isLeaf: boolean;
	isPrimaryKey: boolean;
	isForeignKey: boolean;
}

/** Known label fields, most specific first. Consolidates the grid's former lists. */
const NAME_FIELDS = [
	'displayName',
	'fullName',
	'name',
	'title',
	'label',
	'preferredName',
	'nickname',
	'username',
	'handle',
	'email',
	'firstName',
	'lastName',
	'givenName',
	'familyName',
	'slug',
	'code',
	'phone',
	'description',
];

const NAME_LIKE = /(name|title|label|display)/i;

/** Most label fields the rule returns. */
const MAX_DISPLAY_FIELDS = 3;

function isTextLike(candidate: DisplayCandidate): boolean {
	return candidate.isLeaf && !candidate.isArray && candidate.kind === 'text';
}

function overrideFor(
	overrides: DisplayFieldOverrides | undefined,
	table: { key: string; name: string },
): readonly string[] | null {
	if (!overrides) return null;
	return overrides[table.key] ?? overrides[table.name] ?? null;
}

/** Apply the display rule to a table's candidate fields. */
export function resolveDisplayFieldsFromCandidates(
	table: { key: string; name: string },
	candidates: readonly DisplayCandidate[],
	primaryKey: readonly string[],
	overrides?: DisplayFieldOverrides,
): DisplayFieldsModel {
	const byName = new Map(candidates.map((candidate) => [candidate.name, candidate]));

	const hostFields = (overrideFor(overrides, table) ?? []).filter((name) => byName.get(name)?.isLeaf);
	if (hostFields.length > 0) return { fields: hostFields, source: 'host' };

	const known = NAME_FIELDS.filter((name) => {
		const candidate = byName.get(name);
		return candidate ? isTextLike(candidate) : false;
	});
	const nameLike = candidates
		.filter((candidate) => isTextLike(candidate) && NAME_LIKE.test(candidate.name) && !known.includes(candidate.name))
		.map((candidate) => candidate.name)
		.sort((left, right) => left.length - right.length);
	const named = [...known, ...nameLike].slice(0, MAX_DISPLAY_FIELDS);
	if (named.length > 0) return { fields: named, source: 'name' };

	const text = candidates.find(
		(candidate) => isTextLike(candidate) && !candidate.isPrimaryKey && !candidate.isForeignKey,
	);
	if (text) return { fields: [text.name], source: 'text' };

	const key = primaryKey.filter((name) => byName.get(name)?.isLeaf);
	if (key.length > 0) return { fields: key, source: 'key' };

	return { fields: [], source: 'none' };
}

/** Apply the display rule to a built table model, for example with a different host override. */
export function resolveDisplayFields(table: TableModel, overrides?: DisplayFieldOverrides): DisplayFieldsModel {
	return resolveDisplayFieldsFromCandidates(
		table,
		table.columns.map((column) => ({
			name: column.name,
			kind: column.value.kind,
			isArray: column.value.isArray,
			isLeaf: column.readable && column.value.selection === null,
			isPrimaryKey: column.isPrimaryKey,
			isForeignKey: column.isForeignKey,
		})),
		table.primaryKey,
		overrides,
	);
}
