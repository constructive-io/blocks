import { describe, expect, it, vi } from 'vitest';

import { MetaContractError } from '@constructive-io/data';
import type { MetaQuery } from '@constructive-io/data';

import type { SheetsExecuteFn } from '../context/sheets-execute';
import { createMetaContractFixture } from '../testing/meta-contract-fixture';
import { createPostGraphileAdapter } from './postgraphile-adapter';

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
