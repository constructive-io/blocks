/**
 * Conditions on relations, built only from what the table models prove.
 *
 * "Has any" / "has none" use the relation's exists field. "Linked record
 * contains" matches the related table's label columns that have a
 * case-insensitive contains operator, and only when the relation's record filter
 * is the related table's own filter input, so the related model's column filters
 * apply to it.
 */
import type { ColumnModel, RelationModel, TableModel } from '@constructive-io/data';

import type { SheetsRelationCondition, SheetsRelationTest } from '../view-state/view-state.types';
import type { FilterValueResult } from './filter-value';

export interface RelationFilterTest {
	test: SheetsRelationTest;
	label: string;
	/** Why the test cannot be used, or null when it can. */
	reason: string | null;
}

const CONTAINS = 'includesInsensitive';

function isMany(relation: RelationModel): boolean {
	return relation.kind === 'hasMany' || relation.kind === 'manyToMany';
}

/** Label columns of the related table that a "contains" condition can match. */
export function relationLabelColumns(relation: RelationModel, related: TableModel | null): ColumnModel[] {
	const filter = relation.filter;
	if (!filter || !related || !filter.recordFilterType) return [];
	if (related.operations.list?.filter?.typeName !== filter.recordFilterType) return [];
	if (filter.many && !filter.many.some) return [];
	return relation.target.labelFields.flatMap((name) => {
		const column = related.columns.find((candidate) => candidate.name === name);
		const contains = column?.filter?.operators.find((operator) => operator.name === CONTAINS);
		return column && contains && contains.input.shape === 'scalar' && !contains.input.isList ? [column] : [];
	});
}

/** The tests a relation offers, with the reason for each one it cannot use. */
export function relationFilterTests(relation: RelationModel, related: TableModel | null): RelationFilterTest[] {
	const filter = relation.filter;
	const many = isMany(relation);
	const noExists = 'This table cannot test whether a record has links here.';
	const labelReason = !relation.targetKey
		? 'The linked table is not available.'
		: !related
		? 'The linked table is still loading.'
		: relationLabelColumns(relation, related).length === 0
			? 'The linked records cannot be searched by their name.'
			: null;
	return [
		{ test: 'any', label: many ? 'has any linked records' : 'has a linked record', reason: filter?.exists ? null : noExists },
		{ test: 'none', label: many ? 'has no linked records' : 'has no linked record', reason: filter?.exists ? null : noExists },
		{ test: 'labelContains', label: many ? 'has a linked record that contains' : 'linked record contains', reason: filter ? labelReason : noExists },
	];
}

/** True when the relation can be filtered by any test without its related model. */
export function isRelationFilterable(relation: RelationModel): boolean {
	return Boolean(relation.filter && (relation.filter.exists || relation.filter.recordFilterType));
}

export interface RelationWhereResult {
	result: FilterValueResult;
	/** `TableModel.key` of a related table whose model the condition still needs, or null. */
	waitingFor: string | null;
}

/** The filter for one relation condition, as a part of this table's filter input. */
export function relationConditionWhere(
	relation: RelationModel,
	condition: SheetsRelationCondition,
	related: TableModel | null,
): RelationWhereResult {
	const filter = relation.filter;
	if (!filter) return { result: { status: 'invalid', message: 'This relation cannot be filtered.' }, waitingFor: null };
	if (condition.test === 'any' || condition.test === 'none') {
		if (!filter.exists) return { result: { status: 'invalid', message: 'This table cannot test whether a record has links here.' }, waitingFor: null };
		return { result: { status: 'ready', value: { [filter.exists]: condition.test === 'any' } }, waitingFor: null };
	}

	const text = (condition.value ?? '').trim();
	if (text === '') return { result: { status: 'incomplete' }, waitingFor: null };
	if (!related) {
		return { result: { status: 'incomplete' }, waitingFor: relation.targetKey };
	}
	const columns = relationLabelColumns(relation, related);
	if (columns.length === 0) {
		return { result: { status: 'invalid', message: 'The linked records cannot be searched by their name.' }, waitingFor: null };
	}
	const parts = columns.map((column) => ({ [column.filter!.field]: { [CONTAINS]: text } }));
	const canOr = related.operations.list?.logicalOperators.includes('or') ?? false;
	const record = parts.length === 1 || !canOr ? parts[0]! : { or: parts };
	const value = filter.many ? { [filter.field]: { [filter.many.some!]: record } } : { [filter.field]: record };
	return { result: { status: 'ready', value }, waitingFor: null };
}
