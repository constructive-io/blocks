// A full-text column is the table's search index: the search box does not name it
// ("Search Search" for a column called `search`).
import { describe, expect, it } from 'vitest';

import type { TableModel } from '@constructive-io/data';

import { searchScopeText } from '../../search/search-box';
import { searchPlanOf, searchedColumns } from '../search-plan';

const column = (name: string, kind: string) => ({ name, readable: true, value: { kind, isArray: false }, filter: null });
const model = {
	key: 'app.BigRow',
	primaryKey: ['id'],
	columns: [column('id', 'integer'), column('title', 'text'), column('search', 'fulltext')],
	relations: [],
	operations: { list: { filter: 'BigRowFilter', logicalOperators: ['or'] } },
	search: { unifiedSearchField: 'unifiedSearch', columns: [{ name: 'search' }, { name: 'title' }] },
} as unknown as TableModel;

describe('a full-text search column', () => {
	it('is not named by the search box', () => {
		const plan = searchPlanOf(model)!;
		expect(searchedColumns(plan)).toEqual(['title']);
		expect(searchScopeText(plan, (name) => name)).toBe("Searches the table's search fields: title");
	});
});
