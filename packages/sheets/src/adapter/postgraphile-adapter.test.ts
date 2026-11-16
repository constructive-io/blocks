import { describe, expect, it, vi } from 'vitest';
import type { IntrospectionObjectType, IntrospectionQuery } from 'graphql';

import { MetaContractError, TableModelError, readCellError } from '@constructive-io/data';
import type { MetaQuery, TableModel } from '@constructive-io/data';

import type { SheetsExecuteFn } from '../context/sheets-execute';
import { createMetaContractFixture } from '../testing/meta-contract-fixture';
import { createPostGraphileAdapter } from './postgraphile-adapter';
import { createTortureBackend, tortureIntrospection, tortureMeta, type TortureServer } from './__tests__/torture-backend';

const fields = (names: readonly string[]) => names.map((name) => ({ name }));

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

/** The adapter over the captured torture schema, with every request recorded. */
async function setup(options: { server?: TortureServer; introspection?: IntrospectionQuery; meta?: MetaQuery } = {}) {
	const backend = createTortureBackend(options);
	const adapter = createPostGraphileAdapter();
	const meta = await adapter.fetchMeta(backend.execute);
	const model = (name: string) => adapter.fetchTableModel(backend.execute, meta, name);
	const ctx = (tableModel: TableModel) => ({ model: tableModel, tableName: tableModel.name });
	return { backend, adapter, meta, model, ctx };
}

describe('PostGraphile adapter writes, through the table model', () => {
	it('updates and deletes by every field of a composite key', async () => {
		const { backend, adapter, model, ctx } = await setup();
		const items = await model('WarehouseItem');
		const [first] = (await adapter.listRows(ctx(items), { limit: 5 }, backend.execute)).rows;
		const key = { warehouseCode: String(first!.warehouseCode), sku: String(first!.sku) };

		const updated = await adapter.updateRow(ctx(items), key, { quantity: 7 }, backend.execute);
		await adapter.deleteRow(ctx(items), key, backend.execute);

		expect(updated).toMatchObject({ ...key, quantity: 7 });
		expect(backend.mutationRequests().map((request) => request.variables)).toEqual([
			{ input: { ...key, warehouseItemPatch: { quantity: 7 } } },
			{ input: key },
		]);
		expect(backend.rows.WarehouseItem!.some((row) => row.warehouseCode === key.warehouseCode && row.sku === key.sku))
			.toBe(false);
	});

	it('creates a row whose key has no default by sending the key', async () => {
		const { backend, adapter, model, ctx } = await setup();
		const countries = await model('Country');

		const created = await adapter.createRow(ctx(countries), { isoCode: 'NZ', name: 'New Zealand' }, backend.execute);

		expect(created).toEqual({ isoCode: 'NZ', name: 'New Zealand' });
		expect(backend.mutationRequests()[0]!.variables).toEqual({ input: { country: { isoCode: 'NZ', name: 'New Zealand' } } });
	});

	it('writes enum values as the API names them, from a label or a value, and refuses anything else', async () => {
		const { backend, adapter, model, ctx } = await setup();
		const tasks = await model('Task');
		const [task] = (await adapter.listRows(ctx(tasks), { limit: 1 }, backend.execute)).rows;

		const fromLabel = await adapter.updateRow(ctx(tasks), task!.id as string, { status: 'in_progress' }, backend.execute);
		const fromValue = await adapter.updateRow(ctx(tasks), task!.id as string, { status: 'DONE' }, backend.execute);
		const sent = backend.mutationRequests().length;

		expect(fromLabel?.status).toBe('IN_PROGRESS');
		expect(fromValue?.status).toBe('DONE');
		expect(backend.mutationRequests().map((request) => request.variables?.input)).toEqual([
			{ id: task!.id, taskPatch: { status: 'IN_PROGRESS' } },
			{ id: task!.id, taskPatch: { status: 'DONE' } },
		]);
		await expect(adapter.updateRow(ctx(tasks), task!.id as string, { status: 'archived' }, backend.execute))
			.rejects.toThrow('"archived" is not one of its choices');
		expect(backend.mutationRequests()).toHaveLength(sent);
	});

	it('round-trips large integers and decimals as exact strings', async () => {
		const { backend, adapter, model, ctx } = await setup();
		const scalars = await model('ScalarKind');
		const rows = (await adapter.listRows(ctx(scalars), { limit: 10 }, backend.execute)).rows;
		const row = rows.find((candidate) => typeof candidate.numericUnbounded === 'string' && candidate.numericUnbounded.length > 20);
		expect(row).toBeDefined();
		const { numericUnbounded, bigintValue } = row!;

		const updated = await adapter.updateRow(ctx(scalars), row!.id as string, { numericUnbounded, bigintValue }, backend.execute);

		expect(backend.mutationRequests()[0]!.variables?.input).toEqual({
			id: row!.id,
			scalarKindPatch: { numericUnbounded, bigintValue },
		});
		expect(updated).toMatchObject({ numericUnbounded, bigintValue });
		expect(typeof updated?.numericUnbounded).toBe('string');
	});

	it('creates a row with exactly the values given, empty strings and nulls included', async () => {
		const { backend, adapter, model, ctx } = await setup();
		const scalars = await model('ScalarKind');

		const created = await adapter.createRow(ctx(scalars), { label: '', textValue: null, boolRequired: false }, backend.execute);

		expect(backend.mutationRequests()[0]!.variables).toEqual({
			input: { scalarKind: { label: '', textValue: null, boolRequired: false } },
		});
		expect(created).toMatchObject({ label: '', textValue: null, boolRequired: false });
	});

	it('updates a field to an empty string or to null', async () => {
		const { backend, adapter, model, ctx } = await setup();
		const scalars = await model('ScalarKind');
		const [row] = (await adapter.listRows(ctx(scalars), { limit: 1 }, backend.execute)).rows;

		await adapter.updateRow(ctx(scalars), row!.id as string, { textValue: '' }, backend.execute);
		const cleared = await adapter.updateRow(ctx(scalars), row!.id as string, { textValue: null, citextValue: undefined }, backend.execute);
		const unchanged = await adapter.updateRow(ctx(scalars), row!.id as string, { textValue: undefined }, backend.execute);

		expect(backend.mutationRequests().map((request) => request.variables?.input)).toEqual([
			{ id: row!.id, scalarKindPatch: { textValue: '' } },
			{ id: row!.id, scalarKindPatch: { textValue: null } },
		]);
		expect(cleared).toMatchObject({ textValue: null });
		expect(unchanged).toBeNull();
	});

	it('refuses a field the create input does not accept instead of dropping it', async () => {
		const { backend, adapter, model, ctx } = await setup();
		const generated = await model('GeneratedValue');

		await expect(adapter.createRow(ctx(generated), { id: 5, unitPrice: '1.50' }, backend.execute))
			.rejects.toThrow(TableModelError);
		expect(backend.mutationRequests()).toHaveLength(0);
	});

	it('refuses to write a computed column when the server marks it', async () => {
		const { backend, adapter, model, ctx } = await setup({ server: 'v2' });
		const generated = await model('GeneratedValue');
		const [row] = (await adapter.listRows(ctx(generated), { limit: 1 }, backend.execute)).rows;

		await expect(adapter.updateRow(ctx(generated), row!.id as number, { total: '9.99' }, backend.execute))
			.rejects.toThrow('This value is calculated automatically.');
		await expect(adapter.updateRow(ctx(generated), row!.id as number, { quantity: 3 }, backend.execute))
			.resolves.toMatchObject({ quantity: 3 });
		expect(backend.mutationRequests()).toHaveLength(1);
	});
});

/** The captured schema with one root field removed. */
function withoutQueryField(field: string): IntrospectionQuery {
	const introspection = tortureIntrospection();
	return {
		__schema: {
			...introspection.__schema,
			types: introspection.__schema.types.map((type) =>
				type.name === 'Query'
					? { ...(type as IntrospectionObjectType), fields: (type as IntrospectionObjectType).fields.filter((candidate) => candidate.name !== field) }
					: type,
			),
		},
	};
}

describe('PostGraphile adapter failure isolation', () => {
	it('keeps a page whose cells cannot be served, and still fails a write that returns such a cell', async () => {
		const { backend, adapter, model, ctx } = await setup();
		const special = await model('SpecialValue');
		const rows = backend.rows.SpecialValue!;
		rows[0]!.realValue = Number.NaN;

		const result = await adapter.listRows(ctx(special), { limit: 10 }, backend.execute);

		expect(result.rows).toHaveLength(rows.length);
		expect(result.rows[0]!.realValue).toBeNull();
		expect(readCellError(result.rows[0], 'realValue')).toContain('NaN');
		expect(readCellError(result.rows[0], 'label')).toBeNull();
		expect(readCellError(result.rows[1], 'realValue')).toBeNull();
		await expect(adapter.updateRow(ctx(special), rows[0]!.id as number, { label: 'renamed' }, backend.execute))
			.rejects.toThrow('NaN');
	});

	it('keeps loading other tables when one table cannot be read', async () => {
		const { backend, adapter, model, ctx } = await setup({ introspection: withoutQueryField('labels') });

		const labels = await model('Label');
		const tasks = await model('Task');

		expect(labels.operations.list).toBeNull();
		expect(labels.issues.map((issue) => issue.code)).toContain('LIST_UNAVAILABLE');
		await expect(adapter.listRows(ctx(labels), { limit: 5 }, backend.execute)).rejects.toThrow(TableModelError);
		await expect(adapter.listRows(ctx(tasks), { limit: 5, relations: 'all' }, backend.execute)).resolves.toMatchObject({
			totalCount: expect.any(Number),
		});
	});

	it('loads the schema when one table declares enum labels the API does not have', async () => {
		const meta = tortureMeta();
		const task = meta._meta!.tables!.find((table) => table?.name === 'Task')!;
		const status = task.fields!.find((field) => field?.name === 'status')!;
		status.enumValues = { name: status.enumValues!.name, values: [...status.enumValues!.values, 'archived'] };
		const { backend, adapter, model, ctx } = await setup({ meta });

		const tasks = await model('Task');

		expect(tasks.columns.find((column) => column.name === 'status')?.value.options?.map((option) => option.value)).toEqual([
			'TODO', 'IN_PROGRESS', 'DONE_ISH', '_1ST_REVIEW', 'BLOCKED', 'DONE',
		]);
		await expect(adapter.listRows(ctx(tasks), { limit: 5 }, backend.execute)).resolves.toMatchObject({
			rows: expect.any(Array),
		});
	});

	it('names every candidate when a bare table name is ambiguous', async () => {
		const meta = tortureMeta();
		const label = meta._meta!.tables!.find((table) => table?.name === 'Label')!;
		meta._meta!.tables!.push({ ...label, schemaName: 'other_schema' });
		const { model } = await setup({ meta });

		await expect(model('Label')).rejects.toMatchObject({
			code: 'TABLE_AMBIGUOUS',
			candidates: ['sheets_torture.Label', 'other_schema.Label'],
		});
		await expect(model('other_schema.Label')).resolves.toMatchObject({ key: 'other_schema.Label' });
	});
});
