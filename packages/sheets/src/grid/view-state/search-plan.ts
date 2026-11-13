/**
 * What the toolbar search box searches, from the table model.
 *
 * A table with a combined search field searches through it. Otherwise the
 * search matches every text column that really has a case-insensitive contains
 * operator, combined with `or`; without `or` it matches the first such column.
 */
import type { ColumnModel, TableModel } from '@constructive-io/data';

const CONTAINS = 'includesInsensitive';

export type SearchPlan =
	| {
			mode: 'unified';
			/** Filter input field that takes the search text. */
			field: string;
			/** Columns the table's search covers, when the server names them. */
			columns: readonly string[];
	  }
	| {
			mode: 'columns';
			/** Columns matched with a case-insensitive contains, in table order. */
			columns: readonly { name: string; field: string }[];
	  };

function containsField(column: ColumnModel): string | null {
	if (!column.readable || column.value.kind !== 'text' || column.value.isArray || !column.filter) return null;
	const operator = column.filter.operators.find((candidate) => candidate.name === CONTAINS);
	return operator && operator.input.shape === 'scalar' && !operator.input.isList ? column.filter.field : null;
}

/** The search plan of a table, or null when nothing can be searched. */
export function searchPlanOf(model: TableModel | null): SearchPlan | null {
	if (!model?.operations.list?.filter) return null;
	if (model.search?.unifiedSearchField) {
		return { mode: 'unified', field: model.search.unifiedSearchField, columns: model.search.columns.map((column) => column.name) };
	}
	const columns = model.columns.flatMap((column) => {
		const field = containsField(column);
		return field ? [{ name: column.name, field }] : [];
	});
	if (columns.length === 0) return null;
	const canOr = model.operations.list.logicalOperators.includes('or');
	return { mode: 'columns', columns: canOr ? columns : columns.slice(0, 1) };
}

/** The columns a plan searches, by name. Empty for a combined search the server does not describe. */
export function searchedColumns(plan: SearchPlan): readonly string[] {
	return plan.mode === 'unified' ? plan.columns : plan.columns.map((column) => column.name);
}

/** The filter for search text, or null for empty text. */
export function searchWhere(plan: SearchPlan, text: string): Record<string, unknown> | null {
	const term = text.trim();
	if (term === '') return null;
	if (plan.mode === 'unified') return { [plan.field]: term };
	const parts = plan.columns.map((column) => ({ [column.field]: { [CONTAINS]: term } }));
	return parts.length === 1 ? parts[0]! : { or: parts };
}
