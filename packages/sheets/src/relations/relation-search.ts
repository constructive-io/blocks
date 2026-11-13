/**
 * Searching related records by their label fields, with only the filter
 * fields and operators the related table's filter model really has.
 */
import type { TableModel } from '@constructive-io/data';

/** Text operators in order of preference. */
const TEXT_OPERATORS = ['includesInsensitive', 'includes'] as const;

interface SearchClause {
	/** Filter input field. */
	field: string;
	/** Operator to use. */
	operator: (typeof TEXT_OPERATORS)[number];
}

/** The label fields that can be searched as text, with the operator each uses. */
export function searchClauses(target: TableModel, fields: readonly string[]): SearchClause[] {
	const clauses: SearchClause[] = [];
	for (const name of fields) {
		const column = target.columns.find((candidate) => candidate.name === name);
		const filter = column?.filter;
		if (!filter || column.value.isArray) continue;
		const operator = TEXT_OPERATORS.find((candidate) => filter.operators.some((entry) => entry.name === candidate));
		if (operator) clauses.push({ field: filter.field, operator });
	}
	return clauses;
}

/**
 * The filter for a search text, or null when the text is empty or nothing
 * can be searched. Several fields are combined with `or` only when the
 * related table's filter has it; otherwise the first searchable field is used.
 */
export function searchFilter(
	target: TableModel,
	fields: readonly string[],
	text: string,
): Record<string, unknown> | null {
	const query = text.trim();
	if (!query) return null;
	const clauses = searchClauses(target, fields);
	if (clauses.length === 0) return null;
	const parts = clauses.map((clause) => ({ [clause.field]: { [clause.operator]: query } }));
	const canCombine = target.operations.list?.logicalOperators.includes('or') ?? false;
	if (parts.length > 1 && canCombine) return { or: parts };
	return parts[0] ?? null;
}
