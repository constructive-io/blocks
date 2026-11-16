/* @vitest-environment jsdom */
//
// Request discipline of the table hooks, through the mock backend:
// - paginated mode counts rows once per filter, not on every page, and counts
//   again after a create;
// - a changed filter aborts the page request that was in flight;
// - Retry on a table whose model failed loads the model again, then the rows;
// - one record with a cell the API cannot serve still loads, with that cell's error.
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';

import { readCellError } from '@constructive-io/data';

import { createTortureBackend } from '../../adapter/__tests__/torture-backend';

import type { SheetsExecuteFn } from '../../context/sheets-execute';
import { SheetsProvider } from '../../context/sheets-provider';
import { createMockExecute, type MockTable } from '../../testing/mock-sheets-provider';
import { useSheetsInfiniteTable } from '../use-sheets-infinite-table';
import { useSheetsTable } from '../use-sheets-table';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function products(): MockTable {
	return {
		name: 'products',
		fields: [
			{ name: 'id', gqlType: 'UUID', pgType: 'uuid' },
			{ name: 'name', gqlType: 'String', pgType: 'text' },
		],
		rows: ['A', 'B', 'C', 'D', 'E'].map((name, index) => ({ id: `00000000-0000-4000-8000-00000000000${index}`, name })),
	};
}

describe('table hook requests', () => {
	let root: Root;
	let container: HTMLDivElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
	});

	afterEach(async () => {
		await act(async () => {
			root.unmount();
		});
		container.remove();
	});

	async function settle(until: () => boolean) {
		for (let attempt = 0; attempt < 40 && !until(); attempt += 1) {
			await act(async () => {
				await new Promise((resolve) => setTimeout(resolve, 0));
			});
		}
		expect(until()).toBe(true);
	}

	function mount(execute: SheetsExecuteFn, children: React.ReactNode) {
		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false, retryDelay: 0, gcTime: 60_000 }, mutations: { retry: false } },
		});
		return act(async () => {
			root.render(
				<SheetsProvider
					config={{ endpoint: 'mock://sheets', auth: { mode: 'embedded', getToken: () => 'test' }, execute, queryClient }}
				>
					{children}
				</SheetsProvider>,
			);
		});
	}

	it('counts once per filter while turning pages, and again after a create', async () => {
		const mock = createMockExecute({ tables: [products()] });
		const lists: string[] = [];
		const execute = (async (document: unknown, variables?: Record<string, unknown>) => {
			if (/query ModelList_/.test(String(document))) lists.push(String(document));
			return mock.execute(document as never, variables);
		}) as SheetsExecuteFn;
		let latest: { table: ReturnType<typeof useSheetsTable>; setOffset: (offset: number) => void } | null = null;
		function Probe() {
			const [offset, setOffset] = useState(0);
			const table = useSheetsTable('products', { limit: 2, offset });
			latest = { table, setOffset };
			return null;
		}

		await mount(execute, <Probe />);
		await settle(() => latest?.table.totalCount === 5);
		await act(async () => latest!.setOffset(2));
		await settle(() => latest!.table.data[0]?.name === 'C');
		expect(latest!.table.totalCount).toBe(5);
		expect(lists.map((source) => /\btotalCount\b/.test(source))).toEqual([true, false]);

		await act(async () => {
			await latest!.table.create({ name: 'F' });
		});
		await settle(() => latest!.table.totalCount === 6);
		expect(/\btotalCount\b/.test(lists[lists.length - 1]!)).toBe(true);
	});

	it('aborts the page request of a filter that is no longer shown', async () => {
		const mock = createMockExecute({ tables: [products()] });
		const signals: AbortSignal[] = [];
		const execute = (async (document: unknown, variables?: Record<string, unknown>, options?: { signal?: AbortSignal }) => {
			if (/query ModelList_/.test(String(document)) && options?.signal) {
				signals.push(options.signal);
				// Hold the request until it is aborted or the test moves on.
				await new Promise((resolve) => options.signal!.addEventListener('abort', resolve, { once: true }));
			}
			return mock.execute(document as never, variables);
		}) as SheetsExecuteFn;
		let setWhere: ((where: Record<string, unknown>) => void) | null = null;
		function Probe() {
			const [where, update] = useState<Record<string, unknown>>({ name: { equalTo: 'A' } });
			setWhere = update;
			useSheetsInfiniteTable('products', { pageSize: 2, where });
			return null;
		}

		await mount(execute, <Probe />);
		await settle(() => signals.length === 1);
		await act(async () => setWhere!({ name: { equalTo: 'B' } }));
		await settle(() => signals.length === 2);

		expect(signals[0]!.aborted).toBe(true);
		expect(signals[1]!.aborted).toBe(false);
	});

	it('retries a table whose model failed by loading the model again', async () => {
		const mock = createMockExecute({ tables: [products()] });
		let schemaReads = 0;
		const execute = (async (document: unknown, variables?: Record<string, unknown>) => {
			// The first two schema reads fail (the read and its automatic retry).
			if (/ConstructiveSchemaRoots/.test(String(document)) && (schemaReads += 1) <= 2) throw new Error('network down');
			return mock.execute(document as never, variables);
		}) as SheetsExecuteFn;
		let latest: ReturnType<typeof useSheetsTable> | null = null;
		function Probe() {
			latest = useSheetsTable('products', { limit: 10 });
			return null;
		}

		await mount(execute, <Probe />);
		await settle(() => latest?.error !== null && latest?.error !== undefined);
		expect(latest!.data).toEqual([]);

		await act(async () => {
			await latest!.refetch();
		});
		await settle(() => latest!.data.length === 5);
		expect(latest!.error).toBeNull();
	});

	it('loads one record whose cell the API cannot serve, with that cell marked', async () => {
		const backend = createTortureBackend();
		backend.rows.SpecialValue![0]!.realValue = Number.NaN;
		let latest: ReturnType<typeof useSheetsTable> | null = null;
		function Probe() {
			latest = useSheetsTable('SpecialValue', { limit: 10 });
			return null;
		}

		await mount(backend.execute, <Probe />);
		await settle(() => latest?.model !== null && latest?.model !== undefined);
		let record: Record<string, unknown> | null = null;
		await act(async () => {
			record = await latest!.findOne(1);
		});
		expect(record).toMatchObject({ id: 1, label: 'not a number' });
		expect(readCellError(record, 'realValue')).toContain('NaN');
		expect(readCellError(record, 'label')).toBeNull();
	});
});
