import { describe, expect, it } from 'vitest';

import { createSheetsStore } from './sheets-store';

const TABLE_KEY = 'db-1::users';

function buildMetaArgs(metaVersion: string) {
	return {
		tableKey: TABLE_KEY,
		columnOrder: ['name'],
		fieldMetaByKey: {
			name: {
				name: 'name',
				type: {
					gqlType: 'String',
					isArray: false,
					pgAlias: 'text',
					pgType: 'text',
					subtype: null,
				},
			},
		},
		relationInfoByKey: undefined,
		metaVersion,
	} as const;
}

describe('draft rows slice', () => {
	it('does not create empty table state during meta sync when no drafts exist', () => {
		const store = createSheetsStore();

		store.getState().syncDraftRowsWithMeta(buildMetaArgs('meta-v1'));

		expect(store.getState().draftRowsByTable[TABLE_KEY]).toBeUndefined();
	});

	it('removes stale empty table state during meta sync', () => {
		const store = createSheetsStore();

		store.setState({
			draftRowsByTable: {
				[TABLE_KEY]: {
					order: [],
					map: {},
					template: { name: null },
					metaVersion: 'old-meta',
					columnOrder: ['name'],
				},
			},
		});

		store.getState().syncDraftRowsWithMeta(buildMetaArgs('meta-v2'));

		expect(store.getState().draftRowsByTable[TABLE_KEY]).toBeUndefined();
	});

	it('skips updateDraftCell state writes when value is unchanged and row has no errors', () => {
		const store = createSheetsStore();
		const createArgs = buildMetaArgs('meta-v1');
		const draftRowId = store.getState().createDraftRow(createArgs);
		const beforeState = store.getState();

		store.getState().updateDraftCell({
			tableKey: TABLE_KEY,
			draftRowId,
			columnKey: 'name',
			value: null,
		});

		expect(store.getState()).toBe(beforeState);
	});

	it('skips setDraftRowStatus writes when status/errors are unchanged', () => {
		const store = createSheetsStore();
		const createArgs = buildMetaArgs('meta-v1');
		const draftRowId = store.getState().createDraftRow(createArgs);
		const beforeState = store.getState();

		store.getState().setDraftRowStatus({
			tableKey: TABLE_KEY,
			draftRowId,
			status: 'idle',
			errors: null,
		});

		expect(store.getState()).toBe(beforeState);
	});
});
