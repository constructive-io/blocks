// What a column of an imported file can fill, and the automatic header match.
//
// A file column fills one field a new record accepts (`write.create`), or a
// linked record of a belongsTo relation, matched later by an exact key value or
// an exact unique label. Matching a header to a field compares letters and
// digits only (`Due on`, `due_on` and `dueOn` match `dueOn`); a header that
// matches no field, or more than one, starts unmapped.

import type { ColumnModel, RelationModel, TableModel } from '@constructive-io/data';

import { fieldLabel, relationFieldLabel } from '../cell-types/field-label';

export type ImportTarget =
	| { kind: 'column'; key: string; label: string; column: ColumnModel }
	| { kind: 'relation'; key: string; label: string; relation: RelationModel };

/** A header index -> target key, or null for "do not import". */
export type ImportMapping = readonly (string | null)[];

/** Kinds a file cell cannot carry: files need an upload, the rest can only be viewed. */
const NOT_IMPORTABLE = new Set(['file', 'binary', 'vector', 'fulltext', 'unknown']);

function normalized(text: string): string {
	return text.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
}

/** Fields of a new record a file can fill, in the model's order. */
export function importTargets(model: TableModel): ImportTarget[] {
	const columns: ImportTarget[] = model.columns
		.filter((column) => column.write.create && !NOT_IMPORTABLE.has(column.value.kind))
		.map((column) => ({ kind: 'column', key: `column:${column.name}`, label: fieldLabel(column.name), column }));
	const writable = new Set(columns.map((target) => (target.kind === 'column' ? target.column.name : '')));
	const relations: ImportTarget[] = model.relations
		.filter(
			(relation) =>
				relation.kind === 'belongsTo' &&
				relation.editable &&
				relation.targetKey !== null &&
				relation.keys.length > 0 &&
				relation.keys.every((pair) => writable.has(pair.local)),
		)
		.map((relation) => ({ kind: 'relation', key: `relation:${relation.fieldName}`, label: relationFieldLabel(relation), relation }));
	return [...columns, ...relations];
}

/** The fields a target writes. */
export function targetFields(target: ImportTarget): string[] {
	return target.kind === 'column' ? [target.column.name] : target.relation.keys.map((pair) => pair.local);
}

/** The automatic mapping: each header to the one target it names, each target used at most once. */
export function matchHeaders(headers: readonly string[], targets: readonly ImportTarget[]): (string | null)[] {
	const used = new Set<string>();
	return headers.map((header) => {
		const wanted = normalized(header);
		if (!wanted) return null;
		const matches = targets.filter((target) => {
			const name = target.kind === 'column' ? target.column.name : target.relation.fieldName;
			return normalized(name) === wanted || normalized(target.label) === wanted;
		});
		const [match] = matches;
		if (matches.length !== 1 || !match || used.has(match.key)) return null;
		used.add(match.key);
		return match.key;
	});
}

/** Why a mapping cannot be imported as it stands, or an empty list. */
export function mappingProblems(mapping: ImportMapping, targets: readonly ImportTarget[], model: TableModel): string[] {
	const byKey = new Map(targets.map((target) => [target.key, target]));
	const mapped = mapping.flatMap((key) => {
		const target = key ? byKey.get(key) : undefined;
		return target ? [target] : [];
	});
	if (mapped.length === 0) return ['Choose a field for at least one column of the file.'];
	const problems: string[] = [];

	const uses = new Map<ImportTarget, number>();
	for (const target of mapped) uses.set(target, (uses.get(target) ?? 0) + 1);
	for (const [target, count] of uses) {
		if (count > 1) problems.push(`${target.label} is chosen for ${count} columns of the file. Choose it for one column.`);
	}

	// A linked record writes its key fields, so the same field cannot also come from a column of its own.
	const writers = new Map<string, ImportTarget>();
	for (const target of uses.keys()) {
		for (const field of targetFields(target)) {
			const other = writers.get(field);
			if (other) problems.push(`${other.label} and ${target.label} both set ${fieldLabel(field)}. Choose one of them.`);
			else writers.set(field, target);
		}
	}

	const importable = new Set(targets.flatMap(targetFields));
	for (const column of model.columns) {
		if (!column.write.requiredOnCreate || writers.has(column.name)) continue;
		const label = fieldLabel(column.name);
		problems.push(
			importable.has(column.name)
				? `Every new record needs ${label}. Choose a column of the file for it.`
				: `Every new record needs ${label}, and ${label} cannot be set from a file.`,
		);
	}
	return problems;
}
