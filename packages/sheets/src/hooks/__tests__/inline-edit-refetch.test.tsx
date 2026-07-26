/* @vitest-environment jsdom */
//
// Perf lock — a single inline edit on a server row in INFINITE-SCROLL mode must
// trigger AT MOST one list (rows) refetch.
//
// Live-observed bug (PR #229 HAR): every single-cell edit produced 1 update
// mutation + 2 full list refetches (page 0 `{first:N}` + page 1
// `{first:N, after:cursor}`), because the update mutation's onSuccess
// unconditionally invalidated the whole `infinite-table` query prefix — which
// refetches EVERY loaded page — even though the grid's optimistic
// `updateRowAtIndex` had already patched the active page in place. (The 2x is
// page-count-dependent: with K loaded pages the blanket invalidation refetches
// all K. The root defect is that it refetches the active, already-patched page
// AT ALL.)
//
// We mount the real hooks through a SheetsProvider with a counting `execute`
// (built on the shipped `/testing` mock backend) so the full path runs with zero
// network: _meta introspection → table resolution → page fetch via the
// PostGraphile adapter + buildSelect → update mutation + its cache invalidation.
//
// The infinite grid (`useSheetsInfiniteTable`) is the ACTIVE observer here, and
// the update flows through `useSheetsTable` (the same mutation `useSheets` wires
// via `useDataLoading`). The shipped mock backend serves a single page (it does
// not paginate), so we lock the precise contract: when the optimistic
// `updateRowAtIndex` patches the active page in place (a cache HIT), the edit
// must trigger ZERO additional rows refetches. A blanket infinite-prefix
// invalidation refetches that active page (the bug) AND, in the live multi-page
// app, every other loaded page (the observed 2x).
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { print, type DocumentNode } from 'graphql';

import { SheetsProvider } from '../../context/sheets-provider';
import { createMockExecute, type MockTable } from '../../testing/mock-sheets-provider';
import { useSheetsInfiniteTable } from '../use-sheets-infinite-table';
import { useSheetsTable } from '../use-sheets-table';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PAGE_SIZE = 100;

function makeFixture(): MockTable {
	return {
		name: 'products',
		fields: [
			{ name: 'id', gqlType: 'UUID', pgType: 'uuid' },
			{ name: 'name', gqlType: 'String', pgType: 'text' },
		],
		rows: [
			{ id: 'p1', name: 'A' },
			{ id: 'p2', name: 'B' },
		],
	};
}

interface Harness {
	infinite: ReturnType<typeof useSheetsInfiniteTable>;
	table: ReturnType<typeof useSheetsTable>;
}

// `infiniteActive` mirrors use-sheets: infinite mode mounts the infinite hook as
// the active observer and disables the paginated rows query (mutations only).
// Paginated mode does the inverse.
function Probe({ onRender, infiniteActive }: { onRender: (h: Harness) => void; infiniteActive: boolean }) {
	const infinite = useSheetsInfiniteTable('products', { pageSize: PAGE_SIZE, enabled: infiniteActive });
	const table = useSheetsTable('products', { enabled: !infiniteActive });
	onRender({ infinite, table });
	return null;
}

describe('inline edit refetch — infinite mode (perf lock)', () => {
	let root: Root;
	let container: HTMLDivElement;
	let latest: Harness | null;
	let listQueryCount: number;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
		latest = null;
		listQueryCount = 0;
	});

	afterEach(async () => {
		await act(async () => {
			root.unmount();
		});
		container.remove();
	});

	async function flush() {
		await act(async () => {
			await Promise.resolve();
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
	}

	async function mountAndLoad({ infiniteActive }: { infiniteActive: boolean }) {
		const mock = createMockExecute({ tables: [makeFixture()] });
		// Wrap execute to count list (rows) queries — the `products` connection,
		// excluding the `_meta` introspection and mutations. Stringify exactly as the
		// mock backend does (graphql `print` for DocumentNodes) so detection matches.
		const stringify = (document: unknown): string => {
			if (typeof document === 'string') return document;
			if (document instanceof String) return document.toString();
			if (document && typeof document === 'object' && 'kind' in (document as DocumentNode)) {
				return print(document as DocumentNode);
			}
			return String(document ?? '');
		};
		const countingExecute = (async (document: unknown, variables?: Record<string, unknown>) => {
			const text = stringify(document);
			const looksLikeList =
				text.includes('products') && !text.includes('_meta') && !/(^|\s)mutation(\s|\{)/.test(text);
			if (looksLikeList) listQueryCount += 1;
			return mock.execute(document as never, variables);
		}) as typeof mock.execute;

		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
		});

		await act(async () => {
			root.render(
				<SheetsProvider
					config={{
						endpoint: 'mock://sheets',
						auth: { mode: 'embedded', getToken: () => 'test' },
						execute: countingExecute,
						executeUpload: mock.executeUpload,
						queryClient,
					}}
				>
					<Probe onRender={(h) => (latest = h)} infiniteActive={infiniteActive} />
				</SheetsProvider>,
			);
		});

		// Drive the active rows query to completion.
		const ready = () => (infiniteActive ? latest?.infinite.hasInitialData : (latest?.table.totalCount ?? 0) > 0);
		for (let i = 0; i < 25 && !ready(); i++) await flush();
		expect(ready()).toBe(true);

		return latest as Harness;
	}

	it('infinite: a cache-hit inline edit triggers no extra rows refetch (optimistic patch suffices)', async () => {
		const h = await mountAndLoad({ infiniteActive: true });

		expect(h.infinite.getRowAtIndex(0)).toMatchObject({ id: 'p1' });
		// One page fetched during load.
		expect(listQueryCount).toBe(1);
		const beforeEdit = listQueryCount;

		// Edit a server row — the exact flow useSheets.onCellEdited runs in infinite
		// mode: the update mutation resolves, then the optimistic page-cache patch.
		await act(async () => {
			const { updatedRow } = await h.table.update('p1', { name: 'A-edited' });
			const ok = h.infinite.updateRowAtIndex(0, (updatedRow ?? { name: 'A-edited' }) as Record<string, unknown>);
			// Sanity: the active page is cached, so the optimistic patch is a HIT —
			// the self-heal (`if (!ok) invalidate()`) path is NOT exercised here.
			expect(ok).toBe(true);
		});
		// Let any invalidation-driven refetches settle.
		for (let i = 0; i < 10; i++) await flush();

		const refetches = listQueryCount - beforeEdit;
		// ZERO additional rows refetches: the optimistic patch already updated the
		// active page in place. The blanket infinite-prefix invalidation (the bug)
		// would refetch the active page here (and every other loaded page in the
		// live multi-page app — the observed 2x).
		expect(refetches).toBe(0);

		// The optimistic patch must survive — no refetch clobbered it back to 'A'.
		expect(h.infinite.getRowAtIndex(0)).toMatchObject({ id: 'p1', name: 'A-edited' });
	});

	it('infinite: self-heal still refetches on a cache MISS (contract preserved)', async () => {
		const h = await mountAndLoad({ infiniteActive: true });
		const beforeEdit = listQueryCount;

		// Mirror onCellEdited's self-heal branch: a patch targeting an unloaded
		// row misses the cache → `updateRowAtIndex` returns false → caller invalidates.
		await act(async () => {
			const ok = h.infinite.updateRowAtIndex(9999, { name: 'Nope' });
			expect(ok).toBe(false);
			if (!ok) h.infinite.invalidate();
		});
		for (let i = 0; i < 10; i++) await flush();

		// The self-heal invalidate must refetch page 0 (>= 1). This locks that the
		// fix did NOT disable the self-heal refetch path.
		expect(listQueryCount - beforeEdit).toBeGreaterThanOrEqual(1);
	});

	it('paginated: an inline edit still refetches the active rows query (no regression)', async () => {
		const h = await mountAndLoad({ infiniteActive: false });

		expect(h.table.totalCount).toBe(2);
		const beforeEdit = listQueryCount;

		// Paginated mode has NO optimistic patch — it relies on the update mutation's
		// `table`-key invalidation to refetch. The fix kept that invalidation intact.
		await act(async () => {
			await h.table.update('p1', { name: 'A-edited' });
		});
		for (let i = 0; i < 15; i++) await flush();

		expect(listQueryCount - beforeEdit).toBeGreaterThanOrEqual(1);
	});
});
