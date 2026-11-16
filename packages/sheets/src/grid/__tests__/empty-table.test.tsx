/* @vitest-environment jsdom */
//
// A table with no rows keeps its toolbar (Import, New record, Add row), and the empty body offers
// the two ways to fill it: Add row and Import. A host's empty slot still replaces the grid.

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SheetsConfig } from '../../context/sheets-context';
import { SheetsProvider } from '../../context/sheets-provider';
import { Sheets } from '../sheets';
import { createTortureBackend } from '../../adapter/__tests__/torture-backend';

vi.mock('@constructive-io/ui/toast', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() } }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function waitUntil<T>(read: () => T | null | undefined | false, what: string): Promise<T> {
	for (let attempt = 0; attempt < 100; attempt++) {
		const found = read();
		if (found) return found;
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 20));
		});
	}
	throw new Error(`Timed out waiting for ${what}`);
}

describe('an empty table', () => {
	let root: Root;
	let container: HTMLDivElement;
	let queryClient: QueryClient;

	beforeEach(() => {
		vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(1200);
		vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(800);
		queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
	});

	afterEach(async () => {
		await act(async () => root.unmount());
		queryClient.clear();
		container.remove();
		vi.restoreAllMocks();
	});

	async function mount(slots?: { empty?: React.ReactNode }) {
		const backend = createTortureBackend();
		backend.rows.Country!.length = 0;
		const config: SheetsConfig = {
			endpoint: 'https://data.local/graphql',
			auth: { mode: 'embedded', getToken: () => null, getIdentityKey: () => 'user-1' },
			execute: backend.execute,
			queryClient,
		};
		await act(async () =>
			root.render(
				<div style={{ height: 800, width: 1200 }}>
					<SheetsProvider config={config}>
						<Sheets tableName='Country' slots={slots} />
					</SheetsProvider>
				</div>,
			),
		);
	}

	const buttons = (scope: ParentNode) =>
		Array.from(scope.querySelectorAll('button')).map((button) => button.getAttribute('aria-label') || button.textContent?.trim());

	it('keeps the toolbar and offers Add row and Import over the empty body', async () => {
		await mount();
		const empty = await waitUntil(() => container.querySelector<HTMLElement>('[data-part-id="sheets-empty"]'), 'the empty panel');
		expect(empty.textContent).toContain('No rows yet');
		expect(buttons(empty)).toEqual(expect.arrayContaining(['Add row', 'Import']));
		const toolbar = container.querySelector<HTMLElement>('[data-part-id="sheets-controls"]')!;
		expect(buttons(toolbar)).toEqual(expect.arrayContaining(['Import', 'New record', 'Add row']));

		// Add row leaves the empty state for the new row.
		const addRow = Array.from(empty.querySelectorAll('button')).find((button) => button.textContent?.includes('Add row'))!;
		await act(async () => addRow.click());
		await waitUntil(() => !container.querySelector('[data-part-id="sheets-empty"]'), 'the new row');
		expect(container.querySelector('[data-slot="draft-action-cell"]')).not.toBeNull();
	});

	it("shows only the host's empty slot when it gives one", async () => {
		await mount({ empty: <p data-testid='host-empty'>Nothing here</p> });
		await waitUntil(() => container.querySelector('[data-testid="host-empty"]'), 'the host empty slot');
		expect(container.querySelector('[data-part-id="sheets-controls"]')).toBeNull();
	});
});
