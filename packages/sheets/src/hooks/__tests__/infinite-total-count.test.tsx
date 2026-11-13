/* @vitest-environment jsdom */
//
// The infinite grid counts its rows once per scope: only the first page of a
// filter/sort scope asks for `totalCount`, the pages after it do not, and the
// shown total still follows creates and deletes.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';

import { SheetsProvider } from '../../context/sheets-provider';
import { createMockExecute, type MockTable } from '../../testing/mock-sheets-provider';
import { useSheetsInfiniteTable } from '../use-sheets-infinite-table';
import { useSheetsTable } from '../use-sheets-table';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PAGE_SIZE = 2;

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

interface Harness {
	infinite: ReturnType<typeof useSheetsInfiniteTable>;
	table: ReturnType<typeof useSheetsTable>;
}

function Probe({ onRender }: { onRender: (harness: Harness) => void }) {
	const infinite = useSheetsInfiniteTable('products', { pageSize: PAGE_SIZE });
	const table = useSheetsTable('products', { enabled: false });
	onRender({ infinite, table });
	return null;
}

describe('infinite grid total count', () => {
	let root: Root;
	let container: HTMLDivElement;
	let latest: Harness | null;
	let listQueries: string[];

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
		latest = null;
		listQueries = [];
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

	it('counts on the first page of a scope only, and follows creates and deletes', async () => {
		const mock = createMockExecute({ tables: [products()] });
		const execute = (async (document: unknown, variables?: Record<string, unknown>) => {
			const source = String(document);
			if (/query ModelList_/.test(source)) listQueries.push(source);
			return mock.execute(document as never, variables);
		}) as typeof mock.execute;
		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
		});

		await act(async () => {
			root.render(
				<SheetsProvider
					config={{ endpoint: 'mock://sheets', auth: { mode: 'embedded', getToken: () => 'test' }, execute, queryClient }}
				>
					<Probe onRender={(harness) => (latest = harness)} />
				</SheetsProvider>,
			);
		});
		await settle(() => latest?.infinite.totalCount === 5);

		await act(async () => {
			latest!.infinite.ensureRowsLoaded(0, 5);
		});
		await settle(() => latest!.infinite.isRowLoaded(4));

		const counted = listQueries.filter((source) => /\btotalCount\b/.test(source));
		expect(listQueries.length).toBeGreaterThanOrEqual(3);
		expect(counted).toHaveLength(1);
		expect(latest!.infinite.totalCount).toBe(5);

		let createdId: string | null = null;
		await act(async () => {
			const { createdRow } = await latest!.table.create({ name: 'F' });
			createdId = String(createdRow?.id);
		});
		await settle(() => latest!.infinite.totalCount === 6);

		await act(async () => {
			await latest!.table.delete(createdId!);
		});
		await settle(() => latest!.infinite.totalCount === 5);
	});
});
