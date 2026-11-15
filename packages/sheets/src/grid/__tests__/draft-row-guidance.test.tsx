/* @vitest-environment jsdom */
//
// A new row, through the public surface over the torture schema: Add row puts the cursor on
// the first cell the row still needs (grid focused, so typing fills it), and a Save that
// still lacks required fields says which ones, marks them and takes the cursor there.

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SheetsConfig } from '../../context/sheets-context';
import { SheetsProvider } from '../../context/sheets-provider';
import { Sheets } from '../sheets';
import { createTortureBackend, type TortureBackend } from '../../adapter/__tests__/torture-backend';

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() }));
vi.mock('@constructive-io/ui/toast', () => ({ toast }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function settle(ms = 20) {
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, ms));
	});
}

async function waitUntil<T>(read: () => T | null | undefined | false, what: string): Promise<T> {
	for (let attempt = 0; attempt < 100; attempt++) {
		const found = read();
		if (found) return found;
		await settle();
	}
	throw new Error(`Timed out waiting for ${what}`);
}

async function click(element: Element) {
	await act(async () => {
		(element as HTMLElement).click();
	});
}

describe('a new row says what it needs', () => {
	let root: Root;
	let container: HTMLDivElement;
	let queryClient: QueryClient;

	beforeEach(() => {
		vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(20000);
		vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(800);
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 20000, 33));
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
		vi.clearAllMocks();
	});

	async function mount(table: string, backend: TortureBackend) {
		const config: SheetsConfig = {
			endpoint: 'https://data.local/graphql',
			auth: { mode: 'embedded', getToken: () => null, getIdentityKey: () => 'user-1' },
			execute: backend.execute,
			queryClient,
		};
		await act(async () =>
			root.render(
				<div style={{ height: 800, width: 20000 }}>
					<SheetsProvider config={config}>
						<Sheets tableName={table} />
					</SheetsProvider>
				</div>,
			),
		);
		await waitUntil(() => container.querySelector('[id^="sheets-cell-0-"]'), `${table} rows`);
	}

	const columnKeys = () =>
		Array.from(container.querySelectorAll<HTMLElement>('[data-part-id="sheets-header-cell"]')).map((header) => header.dataset.colKey ?? '');
	const grid = () => container.querySelector<HTMLElement>('[data-part-id="sheets-viewport"]')!;
	/** The column key under the cursor, from the grid's aria-activedescendant. */
	const cursorColumn = () => {
		const match = /^sheets-cell-(\d+)-(\d+)$/.exec(grid().getAttribute('aria-activedescendant') ?? '');
		return match ? { row: Number(match[1]), key: columnKeys()[Number(match[2])] } : null;
	};

	it('Add row puts the cursor on the first cell to fill; Save names what is missing and goes back there', async () => {
		await mount('Task', createTortureBackend());
		const addRow = Array.from(container.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Add row')!;
		await click(addRow);

		const save = await waitUntil(() => container.querySelector<HTMLButtonElement>('[data-slot="draft-action-cell"]'), 'the new row');
		const draftRow = Number(save.closest('[role="row"]')?.getAttribute('data-row'));
		const cursor = await waitUntil(() => cursorColumn()?.row === draftRow && cursorColumn(), 'the cursor on the new row');
		expect(document.activeElement).toBe(grid());

		await click(save);
		await waitUntil(() => toast.warning.mock.calls.length > 0, 'the message');
		const [{ message }] = toast.warning.mock.calls[0] as [{ message: string }];
		// Task needs its Project link and a Title; the key field behind Project is named by its link.
		expect(message).toBe('Fill in Project and Title to save this row.');
		expect(cursor.key).toBe('project');
		// The cursor sits on the first missing column, the one it started on.
		expect(cursorColumn()).toEqual(cursor);
		expect(save.getAttribute('title')).toBe(message);
		expect(save.getAttribute('aria-description')).toBe(message);
	});
});
