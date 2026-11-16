/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SheetsConfig } from '../../context/sheets-context';
import type { SheetsExecuteFn, SheetsUploadFn } from '../../context/sheets-execute';
import { SheetsProvider } from '../../context/sheets-provider';
import { Sheets } from '../../grid/sheets';
import { createMockExecute } from '../../testing/mock-sheets-provider';

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }));
vi.mock('@constructive-io/ui/toast', () => ({ toast }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const projection = {
	id: 'file-1', key: 'cat', bucket_id: 'bucket-1', filename: 'cat.png', mime: 'image/png', size: 5,
};
const attachmentUrl = 'https://cdn.local/attachment.pdf';

function mockBackend(rows: Record<string, unknown>[] = []) {
	return createMockExecute({ tables: [{
		name: 'MediaItem',
		fields: [
			{ name: 'id', gqlType: 'UUID', pgType: 'uuid' },
			{ name: 'photo', gqlType: 'JSON', pgType: 'image' },
			{ name: 'link', gqlType: 'String', pgType: 'attachment' },
		],
		rows,
	}] });
}

function button(label: string, parent: ParentNode = document.body) {
	return Array.from(parent.querySelectorAll('button')).find((item) => item.textContent?.trim() === label);
}

async function waitUntil<T>(read: () => T | null | undefined | false): Promise<T> {
	for (let attempt = 0; attempt < 50; attempt++) {
		await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
		const found = read();
		if (found) return found;
	}
	throw new Error('Expected media editor state did not appear');
}

async function click(element: HTMLElement, event = 'click') {
	await act(async () => element.dispatchEvent(new MouseEvent(event, { bubbles: true })));
}

async function pickFile(file: File) {
	const input = await waitUntil(() => document.querySelector<HTMLInputElement>('[data-slot="image-editor"] input[type="file"]'));
	Object.defineProperty(input, 'files', { configurable: true, value: [file] });
	await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
}

describe('Sheets media editor flows', () => {
	let root: Root;
	let container: HTMLDivElement;
	let queryClient: QueryClient;
	const createObjectUrl = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
	const revokeObjectUrl = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');

	beforeEach(() => {
		vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(1200);
		vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(800);
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 1200, 33));
		Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: () => 'blob:media-preview' });
		Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => {} });
		queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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
		if (createObjectUrl) Object.defineProperty(URL, 'createObjectURL', createObjectUrl);
		else Reflect.deleteProperty(URL, 'createObjectURL');
		if (revokeObjectUrl) Object.defineProperty(URL, 'revokeObjectURL', revokeObjectUrl);
		else Reflect.deleteProperty(URL, 'revokeObjectURL');
	});

	async function render(execute: SheetsExecuteFn, executeUpload?: SheetsUploadFn) {
		const config: SheetsConfig = {
			endpoint: 'https://data.local/graphql',
			auth: { mode: 'embedded', getToken: () => null, getIdentityKey: () => 'user-1' },
			execute,
			executeUpload,
			queryClient,
		};
		await act(async () => root.render(
			<div style={{ height: 800, width: 1200 }}>
				<SheetsProvider config={config}>
					<Sheets tableName="MediaItem" />
				</SheetsProvider>
			</div>,
		));
	}

	it('keeps the draft editor and file available after create removes the only draft and upload fails', async () => {
		const backend = mockBackend();
		let holdList = true;
		const execute: SheetsExecuteFn = async <T,>(document: unknown, variables?: Record<string, unknown>) => {
			if (holdList && backend.mutations.some(({ op }) => op === 'create') && String(document).includes('mediaItems(')) {
				return { mediaItems: { nodes: [], totalCount: 0, pageInfo: { hasNextPage: false } } } as T;
			}
			return backend.execute<T>(document, variables);
		};
		const executeUpload = vi.fn<SheetsUploadFn>()
			.mockRejectedValueOnce(new Error('PUT blocked'))
			.mockImplementationOnce(async () => {
				holdList = false;
				return { file: projection };
			});

		await render(execute, executeUpload);
		await click(await waitUntil(() => button('Add row', container)));
		const imageCell = await waitUntil(() => container.querySelector<HTMLElement>('[data-slot="image-cell"]'));
		await click(imageCell, 'dblclick');
		const file = new File(['hello'], 'cat.png', { type: 'image/png' });
		await pickFile(file);
		await click(await waitUntil(() => button('Create Row & Upload')));

		await waitUntil(() => toast.error.mock.calls.some(([message]) => message.message === 'PUT blocked'));
		const created = backend.mutations.filter(({ op }) => op === 'create');
		expect(created).toHaveLength(1);
		const retry = await waitUntil(() => button('Upload & Save'));
		await click(retry);

		await waitUntil(() => backend.mutations.find(({ op }) => op === 'update'));
		expect(executeUpload.mock.calls.map(([upload]) => upload)).toEqual([file, file]);
		expect(backend.mutations.map(({ op }) => op)).toEqual(['create', 'update']);
		expect(backend.mutations[1].variables).toEqual({
			input: { id: executeUpload.mock.calls[0][2]?.recordId, mediaItemPatch: { photo: projection } },
		});
	});

	it('clears a saved file through the row writer without uploading or deleting a file', async () => {
		const backend = mockBackend([{ id: 'row-1', photo: projection }]);
		const executeUpload = vi.fn<SheetsUploadFn>();
		await render(backend.execute, executeUpload);
		await click(await waitUntil(() => container.querySelector<HTMLElement>('[data-slot="file-cell"]')), 'dblclick');
		await click(await waitUntil(() => document.querySelector<HTMLElement>('button[aria-label="Remove file"]')));
		await click(await waitUntil(() => button('Save')));

		await waitUntil(() => backend.mutations.find(({ op }) => op === 'update'));
		expect(backend.mutations.map(({ op }) => op)).toEqual(['update']);
		expect(backend.mutations[0].variables).toEqual({ input: { id: 'row-1', mediaItemPatch: { photo: null } } });
		expect(executeUpload).not.toHaveBeenCalled();
	});

	it('makes media read-only without storage, including the grid Delete action', async () => {
		const backend = mockBackend([{ id: 'row-1', photo: projection, link: attachmentUrl }]);
		await render(backend.execute);
		const fileCell = await waitUntil(() => container.querySelector<HTMLElement>('[data-slot="file-cell"]'));
		expect(fileCell.querySelector('[title]')?.getAttribute('title')).toContain('Uploads need a storage endpoint');
		await click(fileCell);
		const grid = await waitUntil(() => container.querySelector<HTMLElement>('[role="grid"]'));
		await act(async () => grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true })));
		// A file cell always opens its editor, view-only here: the reason, the file, and Close.
		await click(fileCell, 'dblclick');
		const editor = await waitUntil(() => document.querySelector<HTMLElement>('[data-slot="image-editor"] [data-upload-state="unavailable"]'));
		expect(editor.querySelector('[role="note"]')?.textContent).toBe('Uploads need a storage endpoint');
		expect(editor.querySelector('[data-slot="file-dropzone"]')).toBeNull();
		expect(editor.querySelector('button[aria-label^="Remove"]')).toBeNull();
		expect(button('Save', editor)).toBeUndefined();
		expect(button('Close', editor)).toBeDefined();
		expect(backend.mutations).toEqual([]);
	});

	it('opens a stored attachment link from its file chip and keeps the cell unchanged when a new file has no public URL', async () => {
		const backend = mockBackend([{ id: 'row-1', link: attachmentUrl }]);
		const executeUpload = vi.fn<SheetsUploadFn>().mockResolvedValue({ file: projection });
		await render(backend.execute, executeUpload);
		// A link cell is a file chip: the link's file name, with the whole link in its title.
		const attachmentCell = await waitUntil(() => Array.from(container.querySelectorAll<HTMLElement>('[data-slot="file-cell"]'))
			.find((cell) => cell.querySelector('[title]')?.getAttribute('title')?.includes(attachmentUrl)));
		await click(attachmentCell, 'dblclick');
		await pickFile(new File(['hello'], 'attachment.pdf', { type: 'application/pdf' }));
		await click(await waitUntil(() => button('Upload & Save')));

		await waitUntil(() => toast.error.mock.calls.some(([message]) => message.message.includes('needs a public bucket')));
		expect(backend.mutations).toEqual([]);
		expect(attachmentCell.textContent).toBe('attachment.pdf');
	});
});
