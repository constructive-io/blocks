/* @vitest-environment jsdom */
//
// A host-level read-only grid (`<Sheets readOnly>`), through the public surface over
// the captured torture schema: every write path refuses with the host's reason
// (cells, paste, Add row, New record, Import, Delete, the record panel), while
// viewing, sorting, search and export keep working. Nothing reaches the server as a write.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTortureBackend, type TortureBackend } from '../../adapter/__tests__/torture-backend';
import { SheetsProvider } from '../../context/sheets-provider';
import { Sheets } from '../sheets';

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() }));
vi.mock('@constructive-io/ui/toast', () => ({ toast }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
vi.setConfig({ testTimeout: 30_000 });

const REASON = 'Archived projects cannot be changed.';

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

async function waitUntil<T>(read: () => T | null | undefined | false, what: string): Promise<T> {
	for (let attempt = 0; attempt < 400; attempt++) {
		const found = read();
		if (found) return found;
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 20));
		});
	}
	throw new Error(`Timed out waiting for ${what}`);
}

async function fire(element: Element, type: string) {
	await act(async () => {
		element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
	});
}

async function mount(readOnly: boolean | string): Promise<TortureBackend> {
	const backend = createTortureBackend({ server: 'v2' });
	await act(async () =>
		root.render(
			<div style={{ height: 800, width: 20000 }}>
				<SheetsProvider
					config={{
						endpoint: 'https://data.local/graphql',
						auth: { mode: 'embedded', getToken: () => null, getIdentityKey: () => 'user-1' },
						execute: backend.execute,
						queryClient,
					}}
				>
					<Sheets tableName='Project' readOnly={readOnly} />
				</SheetsProvider>
			</div>,
		),
	);
	await waitUntil(() => container.querySelector('[id^="sheets-cell-0-"]'), 'the Project rows');
	return backend;
}

function cell(rowIndex: number, key: string): HTMLElement {
	const keys = Array.from(container.querySelectorAll<HTMLElement>('[data-part-id="sheets-header-cell"]')).map(
		(header) => header.dataset.colKey ?? '',
	);
	const element = container.querySelector<HTMLElement>(`#sheets-cell-${rowIndex}-${keys.indexOf(key)}`);
	if (!element) throw new Error(`No cell for ${key} in row ${rowIndex}`);
	return element;
}

const byLabel = (label: string) => container.querySelector<HTMLElement>(`[aria-label="${label}"]`);
const buttonByText = (text: string) =>
	Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.trim() === text);
const describedText = (element: HTMLElement | null | undefined) =>
	document.getElementById(element?.getAttribute('aria-describedby') ?? '')?.textContent ?? null;
const listRequests = (backend: TortureBackend) => backend.requests.filter((request) => request.source.includes('query ModelList_Project'));

describe('Sheets readOnly', () => {
	it('refuses every write in the grid with the host reason, and keeps viewing, search and export', async () => {
		const backend = await mount(REASON);

		// The toolbar: no Add row; New record, Import and Delete say why they are off.
		expect(buttonByText('Add row')).toBeUndefined();
		const newRecord = await waitUntil(() => buttonByText('New record'), 'the New record button');
		expect(newRecord.disabled).toBe(true);
		expect(newRecord.getAttribute('aria-description')).toBe(REASON);
		const importButton = await waitUntil(() => {
			const found = buttonByText('Import');
			return describedText(found) === REASON ? found : null;
		}, 'the reason Import is off');
		expect(importButton.disabled).toBe(true);
		expect(buttonByText('Delete')?.disabled).toBe(true);
		expect(buttonByText('Delete')?.getAttribute('title')).toBe(REASON);

		// A cell says why, refuses an edit and refuses a paste, all with the host reason.
		expect(cell(0, 'name').getAttribute('title')).toBe(REASON);
		await fire(cell(0, 'name'), 'dblclick');
		expect(toast.info).toHaveBeenLastCalledWith(expect.objectContaining({ description: REASON }));
		await fire(cell(0, 'name'), 'click');
		const paste = new Event('paste', { bubbles: true, cancelable: true });
		Object.defineProperty(paste, 'clipboardData', { value: { getData: () => 'Renamed', setData: () => {} } });
		await act(async () => {
			container.querySelector('[role="grid"]')!.dispatchEvent(paste);
		});
		await waitUntil(() => toast.error.mock.calls.length > 0, 'the refused paste');
		expect(toast.error).toHaveBeenLastCalledWith(expect.objectContaining({ description: REASON }));

		// Search still narrows the rows, and Export view still reads them.
		const before = listRequests(backend).length;
		const search = byLabel('Search rows') as HTMLInputElement;
		const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
		await act(async () => {
			setter.call(search, 'Kernel');
			search.dispatchEvent(new Event('input', { bubbles: true }));
			search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		});
		await waitUntil(() => listRequests(backend).slice(before).some((request) => JSON.stringify(request.variables?.where ?? null).includes('Kernel')), 'a searched list request');
		const exportView = byLabel('Export all rows of this view as CSV') as HTMLButtonElement;
		expect(exportView.disabled).toBe(false);

		expect(backend.mutationRequests()).toEqual([]);
		expect(backend.rows.Project!.map((row) => row.name)).toEqual(['Analytical Engine', 'Compiler', 'Kernel']);
	});

	it('makes the record panel read-only with the reason, and `true` uses the default reason', async () => {
		await mount(REASON);
		await fire(await waitUntil(() => byLabel('Open record'), 'the open-record button'), 'click');
		const reasons = await waitUntil(() => {
			const found = Array.from(document.querySelectorAll('[data-slot="record-field-reason"]'));
			return found.length > 0 ? found : null;
		}, 'the record fields');
		expect(new Set(reasons.map((reason) => reason.textContent?.trim()))).toEqual(new Set([REASON]));
		const deleteRecord = document.querySelector<HTMLButtonElement>('[aria-label="Delete record"]');
		expect(deleteRecord?.disabled).toBe(true);
		expect(deleteRecord?.getAttribute('title')).toBe(REASON);

		await act(async () => root.unmount());
		root = createRoot(container);
		await mount(true);
		expect(cell(0, 'name').getAttribute('title')).toBe('This table is read-only here.');
	});
});
