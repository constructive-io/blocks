/* @vitest-environment jsdom */
//
// Behavior lock — optimistic-update self-heal (PR #229).
//
// `useInfiniteGridData.updateRowAtIndex` (src/grid/hooks/use-infinite-grid-data.ts)
// forwards the boolean from `useSheetsInfiniteTable.updateRowAtIndex`
// (src/hooks/use-sheets-infinite-table.ts:562) WITHOUT swallowing it:
//   - true  on a cache hit  (row present in the React Query page cache → patched)
//   - false on a cache miss (page/row not loaded → caller can self-heal/refetch)
//
// We mount through the shipped `/testing` MockSheetsProvider (zero network) so the
// full real path runs: _meta introspection → table resolution → page-0 fetch via
// the PostGraphile adapter + buildSelect. We then exercise the PUBLIC hook surface
// rather than reaching into the private query-cache key, so the lock survives any
// internal refactor of the cache key / stable-options serialization.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MockSheetsProvider, type MockTable } from '../../../testing/mock-sheets-provider';
import { useInfiniteGridData } from '../use-infinite-grid-data';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const widgetsFixture: MockTable = {
	name: 'widgets',
	fields: [
		{ name: 'id', gqlType: 'UUID', pgType: 'uuid' },
		{ name: 'name', gqlType: 'String', pgType: 'text' },
	],
	rows: [
		{ id: 'w1', name: 'Alpha' },
		{ id: 'w2', name: 'Beta' },
	],
};

type Handle = ReturnType<typeof useInfiniteGridData>;

function Probe({ onRender }: { onRender: (h: Handle) => void }) {
	const handle = useInfiniteGridData({ tableName: 'widgets', pageSize: 100 });
	onRender(handle);
	return null;
}

describe('useInfiniteGridData.updateRowAtIndex — optimistic self-heal contract', () => {
	let root: Root;
	let container: HTMLDivElement;
	let latest: Handle | null;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
		latest = null;
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

	async function mountAndLoad() {
		await act(async () => {
			root.render(
				<MockSheetsProvider options={{ tables: [structuredClone(widgetsFixture)] }}>
					<Probe onRender={(handle) => (latest = handle)} />
				</MockSheetsProvider>,
			);
		});
		// Drive the async page-0 query to completion.
		for (let i = 0; i < 25 && !latest?.hasInitialData; i++) {
			await flush();
		}
		expect(latest?.hasInitialData).toBe(true);
		return latest as Handle;
	}

	it('returns true and patches the row on a cache hit', async () => {
		const handle = await mountAndLoad();
		expect(handle.getRowAtIndex(0)).toMatchObject({ id: 'w1', name: 'Alpha' });

		const result = handle.updateRowAtIndex(0, { name: 'Patched' });
		expect(result).toBe(true);

		await flush();
		// getRowAtIndex reads from the React Query cache, so the optimistic patch is visible.
		expect((latest as Handle).getRowAtIndex(0)).toMatchObject({ id: 'w1', name: 'Patched' });
	});

	it('returns false on a cache miss (row in an unloaded page) without throwing', async () => {
		const handle = await mountAndLoad();

		// Row 9999 lives in a page that was never requested → cache miss.
		const result = handle.updateRowAtIndex(9999, { name: 'Nope' });
		expect(result).toBe(false);
	});

	it('returns false for a miss inside the loaded page (index past the row count)', async () => {
		const handle = await mountAndLoad();

		// Page 0 is loaded with 2 rows; index 50 is within page 0's range but past
		// its rows → the underlying hook treats a missing in-page row as a miss.
		const result = handle.updateRowAtIndex(50, { name: 'Nope' });
		expect(result).toBe(false);
	});
});
