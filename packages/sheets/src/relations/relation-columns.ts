/**
 * Which relation and foreign-key columns the grid shows, and in what order,
 * from the table model alone (never from the keys of a loaded row).
 *
 * - Every readable relation is a column, except a hasMany to a junction
 *   table that a pure manyToMany relation already shows.
 * - A foreign-key column is hidden only when its belongsTo relation is shown;
 *   the relation column takes the place of its first key column.
 * - Primary-key columns come first, then the other columns in model order,
 *   then hasOne, hasMany and manyToMany relations in model order.
 */
import type { RelationModel, TableModel } from '@constructive-io/data';

/** The relations the grid shows as columns, in model order. */
export function gridRelations(model: TableModel): RelationModel[] {
	const shownJunctions = new Set(
		model.relations.flatMap((relation) =>
			relation.kind === 'manyToMany' && relation.readable && relation.junction?.pure ? [relation.junction.tableKey] : [],
		),
	);
	return model.relations.filter(
		(relation) =>
			relation.readable &&
			!(relation.kind === 'hasMany' && relation.targetKey !== null && shownJunctions.has(relation.targetKey)),
	);
}

/** Relation fields the grid selects with its rows. */
export function gridRelationFieldNames(model: TableModel | null | undefined): string[] {
	return model ? gridRelations(model).map((relation) => relation.fieldName) : [];
}

/** Column keys in display order: columns and relation fields. */
export function gridColumnKeys(model: TableModel): string[] {
	const relations = gridRelations(model);
	const belongsToByKey = new Map<string, RelationModel>();
	for (const relation of relations) {
		if (relation.kind !== 'belongsTo') continue;
		for (const pair of relation.keys) if (!belongsToByKey.has(pair.local)) belongsToByKey.set(pair.local, relation);
	}

	const readable = model.columns.filter((column) => column.readable).map((column) => column.name);
	const keyFirst = [
		...model.primaryKey.filter((name) => readable.includes(name)),
		...readable.filter((name) => !model.primaryKey.includes(name)),
	];

	const keys: string[] = [];
	const placed = new Set<string>();
	for (const name of keyFirst) {
		const relation = belongsToByKey.get(name);
		if (!relation) {
			keys.push(name);
			continue;
		}
		if (!placed.has(relation.fieldName)) {
			placed.add(relation.fieldName);
			keys.push(relation.fieldName);
		}
	}
	for (const relation of relations) {
		if (!placed.has(relation.fieldName)) {
			placed.add(relation.fieldName);
			keys.push(relation.fieldName);
		}
	}
	return keys;
}
