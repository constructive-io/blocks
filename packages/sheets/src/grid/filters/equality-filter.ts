/**
 * A filter group that matches the rows whose columns equal given values, for
 * opening a table on the rows that belong to one record (for example the
 * junction rows of a project: `projectId = 1`). A host can pass the group
 * straight to `<Sheets filters>`.
 */
import type { TableModel } from '@constructive-io/data';

import { filterValueControl } from '../filter-operators';
import { createFilterGroup, createFilterNodeId } from '../view-state/view-state';
import type { SheetsColumnCondition, SheetsFilterGroup } from '../view-state/view-state.types';
import { encodeFilterValue } from './filter-value';

/** A value as the server sends it, in the form the filter editor holds: numbers as their text. */
function enteredValue(wire: unknown): string | boolean | null {
	if (typeof wire === 'string' || typeof wire === 'boolean') return wire;
	if (typeof wire === 'number' && Number.isFinite(wire)) return String(wire);
	return null;
}

/**
 * One `equalTo` condition per column, combined with "and". Null when a column is
 * not in the model, cannot be filtered by `equalTo`, or holds a value the filter
 * would not send back exactly as given (a timestamp the editor normalizes, an
 * object, null), so a caller never opens a table on the wrong rows.
 */
export function equalityFilterGroup(model: TableModel, values: Readonly<Record<string, unknown>>): SheetsFilterGroup | null {
	const entries = Object.entries(values);
	if (entries.length === 0 || !model.operations.list?.filter) return null;
	const conditions: SheetsColumnCondition[] = [];
	for (const [name, wire] of entries) {
		const column = model.columns.find((candidate) => candidate.name === name);
		const operator = column?.readable ? column.filter?.operators.find((candidate) => candidate.name === 'equalTo') : undefined;
		const value = enteredValue(wire);
		if (!column || !operator || value === null) return null;
		const encoded = encodeFilterValue(filterValueControl(column, operator), value);
		if (encoded.status !== 'ready' || String(encoded.value) !== String(wire)) return null;
		conditions.push({ kind: 'column', id: createFilterNodeId(), column: name, operator: 'equalTo', value });
	}
	return createFilterGroup('and', conditions);
}
