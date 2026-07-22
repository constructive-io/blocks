import { describe, expect, it, vi } from 'vitest';

import { MetaContractError } from '@constructive-io/data';
import type { CleanTable, MetaQuery } from '@constructive-io/data';

import type { SheetsExecuteFn } from '../context/sheets-execute';
import { createMetaContractFixture } from '../testing/meta-contract-fixture';
import { createPostGraphileAdapter } from './postgraphile-adapter';

const fields = (names: readonly string[]) => names.map((name) => ({ name }));

function mutationTable(name: string, primaryKeyFields: string[]): CleanTable {
	return {
		name,
		fields: [
			...primaryKeyFields.map((fieldName) => ({
				name: fieldName,
				type: { gqlType: 'UUID', isArray: false },
				isPrimaryKey: true,
			})),
			{ name: 'label', type: { gqlType: 'String', isArray: false } },
		],
		relations: { belongsTo: [], hasOne: [], hasMany: [], manyToMany: [] },
		query: {
			all: `all${name}s`,
			one: name.charAt(0).toLowerCase() + name.slice(1),
			create: `create${name}`,
			update: `update${name}`,
			delete: `delete${name}`,
		},
	} as CleanTable;
}

describe('PostGraphile metadata adapter', () => {
	it('preflights once per executor and then returns current metadata', async () => {
		const meta: MetaQuery = { _meta: { tables: [] } };
		const execute = vi.fn(async (document: unknown) => {
			const query = String(document);
			return query.includes('ConstructiveMetaContract') ? createMetaContractFixture() : meta;
		}) as unknown as SheetsExecuteFn;
		const adapter = createPostGraphileAdapter();

		await expect(adapter.fetchMeta(execute)).resolves.toBe(meta);
		await expect(adapter.fetchMeta(execute)).resolves.toBe(meta);

		expect(execute).toHaveBeenCalledTimes(3);
		expect(String(vi.mocked(execute).mock.calls[0][0])).toContain('ConstructiveMetaContract');
		expect(String(vi.mocked(execute).mock.calls[1][0])).toContain('query ConstructiveMeta');
	});

	it('throws a typed upgrade error before sending the full metadata query', async () => {
		const outdated = createMetaContractFixture();
		outdated.metaType = { name: 'MetaType', fields: fields(['pgType', 'gqlType', 'isArray']) };
		const execute = vi.fn(async () => outdated) as unknown as SheetsExecuteFn;
		const adapter = createPostGraphileAdapter();

		await expect(adapter.fetchMeta(execute)).rejects.toBeInstanceOf(MetaContractError);
		expect(execute).toHaveBeenCalledTimes(1);
	});

	it('retries the compatibility preflight after a transient transport failure', async () => {
		const meta: MetaQuery = { _meta: { tables: [] } };
		let failed = false;
		const execute = vi.fn(async (document: unknown) => {
			if (!String(document).includes('ConstructiveMetaContract')) return meta;
			if (!failed) {
				failed = true;
				throw new Error('temporary network error');
			}
			return createMetaContractFixture();
		}) as unknown as SheetsExecuteFn;
		const adapter = createPostGraphileAdapter();

		await expect(adapter.fetchMeta(execute)).rejects.toThrow('temporary network error');
		await expect(adapter.fetchMeta(execute)).resolves.toBe(meta);
		expect(execute).toHaveBeenCalledTimes(3);
	});
});

describe('PostGraphile primary-key mutation inputs', () => {
	it('spreads a renamed primary key beside the patch', async () => {
		const table = mutationTable('NodeTypeRegistry', ['name']);
		const execute = vi.fn(async () => ({})) as unknown as SheetsExecuteFn;
		const adapter = createPostGraphileAdapter();

		await adapter.updateRow(
			{ table, allTables: [table], tableName: table.name },
			{ name: 'invoice' },
			{ label: 'Invoice' },
			execute,
		);

		expect(vi.mocked(execute).mock.calls[0][1]).toEqual({
			input: {
				name: 'invoice',
				nodeTypeRegistryPatch: { label: 'Invoice' },
			},
		});
	});

	it('spreads every composite key for update and delete', async () => {
		const table = mutationTable('ActionGoal', ['actionId', 'goalId']);
		const execute = vi.fn(async () => ({})) as unknown as SheetsExecuteFn;
		const adapter = createPostGraphileAdapter();
		const primaryKey = { actionId: 'action-1', goalId: 'goal-1' };

		await adapter.updateRow(
			{ table, allTables: [table], tableName: table.name },
			primaryKey,
			{ label: 'Primary' },
			execute,
		);
		await adapter.deleteRow(
			{ table, allTables: [table], tableName: table.name },
			primaryKey,
			execute,
		);

		expect(vi.mocked(execute).mock.calls[0][1]).toEqual({
			input: {
				actionId: 'action-1',
				goalId: 'goal-1',
				actionGoalPatch: { label: 'Primary' },
			},
		});
		expect(vi.mocked(execute).mock.calls[1][1]).toEqual({ input: primaryKey });
	});
});
