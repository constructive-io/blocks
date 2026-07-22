//
// Drift-pin — the shipped `/testing` mock execute vs @constructive-io/data builders.
//
// `createMockExecute` (src/testing/mock-sheets-provider.tsx) is a hand-written,
// partial PostGraphile emulator. It recognizes operations by STRING-MATCHING the
// printed GraphQL document against PostGraphile inflection names. If the real
// document builders in @constructive-io/data ever change their field/mutation
// naming or output shape, this mock would silently stop recognizing real queries
// and every consumer test built on it would rot.
//
// This test pins the mock against builder drift by feeding it the ACTUAL
// documents that the production PostGraphile adapter produces
// (src/adapter/postgraphile-adapter.ts):
//   - list:   buildSelect(table, allTables, { ...queryOptions, relationFieldMap })
//   - create: buildPostGraphileCreate(table, allTables, { ...options, fieldSelection })
//
// It then asserts the mock returns data in the exact shape the real hooks parse:
//   - list   → result[camelPlural] = { nodes, totalCount, pageInfo }
//   - create → result[createMutationName][camelSingular] = echoed row,
//              plus a RecordedMutation { op: 'create', ... }.
//
// NOTE: upload (`executeUpload`) is intentionally NOT exercised here — that path
// is being changed independently; the select/create paths are the stable contract.
import { describe, expect, it } from 'vitest';

import {
	buildSelect,
	buildPostGraphileCreate,
	toCamelCasePlural,
	toCamelCaseSingular,
	toCreateMutationName,
	type CleanTable,
	type QueryOptions,
	type MutationOptions,
} from '@constructive-io/data';

import { createMockExecute, type MockTable } from '../mock-sheets-provider';

const TABLE_NAME = 'widgets';

// Real CleanTable (mirrors the canonical shape consumed by the builders — see
// packages/data/src/__tests__/fixtures.ts). The builders accept a CleanTable and
// emit a real GraphQL document; we deliberately do NOT stub the document.
const cleanTable: CleanTable = {
	name: TABLE_NAME,
	fields: [
		{ name: 'id', type: { gqlType: 'UUID', isArray: false, modifier: null, pgAlias: null, pgType: 'uuid', subtype: null, typmod: null } },
		{ name: 'name', type: { gqlType: 'String', isArray: false, modifier: null, pgAlias: null, pgType: 'text', subtype: null, typmod: null } },
		{ name: 'isActive', type: { gqlType: 'Boolean', isArray: false, modifier: null, pgAlias: null, pgType: 'boolean', subtype: null, typmod: null } },
	],
	relations: { belongsTo: [], hasOne: [], hasMany: [], manyToMany: [] },
};

function makeMockTable(): MockTable {
	return {
		name: TABLE_NAME,
		fields: [
			{ name: 'id', gqlType: 'UUID', pgType: 'uuid' },
			{ name: 'name', gqlType: 'String', pgType: 'text' },
			{ name: 'isActive', gqlType: 'Boolean', pgType: 'boolean' },
		],
		rows: [
			{ id: 'w1', name: 'Alpha', isActive: true },
			{ id: 'w2', name: 'Beta', isActive: false },
		],
	};
}

describe('createMockExecute — drift-pin against @constructive-io/data builders', () => {
	it('recognizes a real buildSelect document and returns the connection shape the hooks parse', async () => {
		const { execute } = createMockExecute({ tables: [makeMockTable()] });

		// Exactly how the PostGraphile adapter builds the list document.
		const listDoc = buildSelect(cleanTable, [cleanTable], {
			fieldSelection: 'all',
			includePageInfo: true,
		} as QueryOptions);

		const result = (await execute(listDoc)) as Record<string, unknown>;

		// Real hooks read result[camelPlural].{ nodes, totalCount }.
		const connection = result[toCamelCasePlural(TABLE_NAME)] as {
			nodes: Array<Record<string, unknown>>;
			totalCount: number;
			pageInfo: Record<string, unknown>;
		};

		expect(connection).toBeDefined();
		expect(Array.isArray(connection.nodes)).toBe(true);
		expect(connection.nodes.map((row) => row.id)).toEqual(['w1', 'w2']);
		expect(connection.totalCount).toBe(2);
		// pageInfo is present so the cursor-based hooks can read it.
		expect(connection.pageInfo).toMatchObject({ hasNextPage: false });
	});

	it('recognizes a real buildPostGraphileCreate document, records the mutation, and echoes the row', async () => {
		const { execute, mutations } = createMockExecute({ tables: [makeMockTable()] });

		const createDoc = buildPostGraphileCreate(cleanTable, [cleanTable], {
			fieldSelection: 'all',
		} as MutationOptions);

		const singular = toCamelCaseSingular(TABLE_NAME);
		// Variable shape the adapter sends: { input: { [singular]: data } }.
		const variables = { input: { [singular]: { name: 'Gamma', isActive: true } } };

		const result = (await execute(createDoc, variables)) as Record<string, unknown>;

		// A create mutation was recorded with op:'create' and the table name + variables.
		expect(mutations).toHaveLength(1);
		expect(mutations[0]).toMatchObject({
			op: 'create',
			tableName: TABLE_NAME,
			variables,
		});

		// Real hooks read result[createMutationName][camelSingular].
		const payload = result[toCreateMutationName(TABLE_NAME)] as Record<string, unknown>;
		expect(payload).toBeDefined();
		const echoedRow = payload[singular] as Record<string, unknown>;

		// The created row echoes the submitted input and is given a synthesized id.
		expect(echoedRow).toMatchObject({ name: 'Gamma', isActive: true });
		expect(typeof echoedRow.id).toBe('string');
		expect((echoedRow.id as string).length).toBeGreaterThan(0);
	});

	it('does not misclassify a list query as a mutation', async () => {
		const { execute, mutations } = createMockExecute({ tables: [makeMockTable()] });

		const listDoc = buildSelect(cleanTable, [cleanTable], { fieldSelection: 'all' } as QueryOptions);
		await execute(listDoc);

		// A read must never be recorded as a mutation.
		expect(mutations).toHaveLength(0);
	});
});
