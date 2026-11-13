// The filter of a view counts only the conditions the list query carries. A table whose
// filter input has no `and` or `or` field cannot combine every set of conditions: the
// conditions left out say why and do not count as applied, and the search still applies.
// Built over the captured torture schema, with the logical operators taken away.
import { describe, expect, it } from 'vitest';

import { createTableModelResolver, type TableModel } from '@constructive-io/data';

import { createTortureBackend } from '../../../adapter/__tests__/torture-backend';
import { buildViewQuery } from '../build-view-query';
import { searchPlanOf, searchWhere } from '../search-plan';
import { SHEETS_VIEW_STATE_VERSION, type SheetsFilterNode, type SheetsViewState } from '../view-state.types';

async function modelWithoutLogicalOperators(table: string): Promise<TableModel> {
	const backend = createTortureBackend({ server: 'v2' });
	const model = await createTableModelResolver(backend.meta).resolve(backend.execute, table);
	const list = model.operations.list!;
	return { ...model, operations: { ...model.operations, list: { ...list, logicalOperators: [] } } };
}

function viewState(children: SheetsFilterNode[], search = ''): SheetsViewState {
	return {
		version: SHEETS_VIEW_STATE_VERSION,
		filters: { kind: 'group', id: 'root', logic: 'and', children },
		sort: [],
		search,
		columns: { order: [], hidden: [], frozenCount: 0, widths: {}, rowHeight: 'short' },
	};
}

const contains = (id: string, column: string, value: string): SheetsFilterNode => ({
	kind: 'column',
	id,
	column,
	operator: 'includesInsensitive',
	value,
});

describe('a filter input without logical operators', () => {
	it('combines conditions on different fields into one filter', async () => {
		const model = await modelWithoutLogicalOperators('ScalarKind');
		const query = buildViewQuery(viewState([contains('a', 'textValue', 'x'), contains('b', 'varcharValue', 'y')]), model);

		expect(query.where).toEqual({ textValue: { includesInsensitive: 'x' }, varcharValue: { includesInsensitive: 'y' } });
		expect(query.appliedCount).toBe(2);
	});

	it('reports conditions it cannot combine as not applied, and sends no filter for them', async () => {
		const model = await modelWithoutLogicalOperators('ScalarKind');
		const query = buildViewQuery(viewState([contains('a', 'textValue', 'x'), contains('b', 'textValue', 'y')]), model);

		expect(query.where).toBeUndefined();
		expect(query.appliedCount).toBe(0);
		expect(query.conditions.get('a')).toEqual({ status: 'invalid', message: expect.stringContaining('cannot combine') });
		expect(query.conditions.get('b')).toEqual({ status: 'invalid', message: expect.stringContaining('cannot combine') });
	});

	it('keeps the search and reports the condition it cannot be combined with', async () => {
		// Without a combined search field, the search matches the first text column.
		const model: TableModel = { ...(await modelWithoutLogicalOperators('ScalarKind')), search: null };
		const plan = searchPlanOf(model);
		if (plan?.mode !== 'columns') throw new Error('expected a search over columns');
		const searched = plan.columns[0]!.name;

		const query = buildViewQuery(viewState([contains('a', searched, 'x')], 'needle'), model);

		expect(query.where).toEqual(searchWhere(plan, 'needle'));
		expect(query.appliedCount).toBe(0);
		expect(query.conditions.get('a')).toEqual({ status: 'invalid', message: expect.stringContaining('with the search') });
	});
});
