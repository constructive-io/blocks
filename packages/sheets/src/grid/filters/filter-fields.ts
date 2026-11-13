/**
 * The columns and relations a table can be filtered by, and the condition a
 * new filter on one of them starts with.
 */
import type { ColumnModel, RelationModel, TableModel } from '@constructive-io/data';

import { defaultOperatorOption, isColumnFilterable } from '../filter-operators';
import { createFilterNodeId } from '../view-state/view-state';
import type { SheetsFilterCondition } from '../view-state/view-state.types';
import { emptyFilterValue } from './filter-value';
import { isRelationFilterable, relationFilterTests } from './relation-filters';

/** A column or relation the builder can filter by. */
export type FilterField =
	| { kind: 'column'; key: string; name: string; label: string; column: ColumnModel }
	| { kind: 'relation'; key: string; name: string; label: string; relation: RelationModel };

/** Every filterable column and relation of a table, in table order. */
export function filterFieldsOf(model: TableModel | null, label: (name: string) => string): FilterField[] {
	if (!model?.operations.list?.filter) return [];
	const columns: FilterField[] = model.columns
		.filter(isColumnFilterable)
		.map((column) => ({ kind: 'column', key: `column:${column.name}`, name: column.name, label: label(column.name), column }));
	const relations: FilterField[] = model.relations
		.filter((relation) => relation.readable && isRelationFilterable(relation))
		.map((relation) => ({
			kind: 'relation',
			key: `relation:${relation.fieldName}`,
			name: relation.fieldName,
			label: label(relation.fieldName),
			relation,
		}));
	return [...columns, ...relations];
}

/** A new condition on a field, with its default test or operator. */
export function newCondition(field: FilterField, related: TableModel | null): SheetsFilterCondition | null {
	if (field.kind === 'relation') {
		const tests = relationFilterTests(field.relation, related);
		// "Linked record contains" waits for the related table's model, which loads once the builder is open.
		const waitsForModel = !related && Boolean(field.relation.targetKey && field.relation.filter?.recordFilterType);
		const test = tests.find((entry) => !entry.reason) ?? (waitsForModel ? tests.find((entry) => entry.test === 'labelContains') : undefined);
		if (!test) return null;
		return { kind: 'relation', id: createFilterNodeId(), relation: field.name, test: test.test, value: test.test === 'labelContains' ? '' : null };
	}
	const option = defaultOperatorOption(field.column);
	if (!option) return null;
	return {
		kind: 'column',
		id: createFilterNodeId(),
		column: field.name,
		operator: option.operator,
		value: option.control.kind === 'none' ? option.fixedValue ?? null : emptyFilterValue(option.control),
	};
}
