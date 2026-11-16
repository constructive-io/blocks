/* @vitest-environment jsdom */
//
// File columns through the public surface: the real <Sheets> grid over the
// captured torture schema (`DomainKind`: avatar image, document upload,
// gallery upload[], attachmentLink), a data API and a separate storage API,
// and a user who picks files in the cell editor. Assertions are on the
// requests the APIs receive (the upload input, the PUT headers, the cell
// write) and on what the grid shows.
//
// Ways the upload sequence can fail, each covered below:
//   1. the bucket would refuse the file (size, type): refused before any request;
//   2. the storage service has several file stores and none is chosen: read-only;
//   3. the PUT is refused or blocked: nothing is written, the file stays for a retry,
//      nothing is deleted (the server expires the row);
//   4. the upload URL expired: requested again once;
//   5. the bytes already exist: no PUT, the existing file is written;
//   6. the file is not confirmed yet when the cell is written: retried with backoff,
//      then a manual retry on the cell;
//   7. a draft row must be created first, and its key read from the created row.

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MetaQuery } from '@constructive-io/data';

import type { SheetsConfig } from '../../context/sheets-context';
import { SheetsProvider } from '../../context/sheets-provider';
import { unfinishedUploadOf } from '../../context/sheets-upload-presigned';
import { Sheets } from '../../grid/sheets';
import type { SheetsUploadConfig } from '../upload-config';
import { createUploadBackends, tortureMetaOf, type UploadBackends, type UploadBackendsOptions } from './upload-backends';

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() }));
/** `SheetsConfig.onError` of the host. */
const hostErrors = vi.fn();
vi.mock('@constructive-io/ui/toast', () => ({ toast }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const D1 = '00000000-0000-4000-8000-0000000000d1';
const D2 = '00000000-0000-4000-8000-0000000000d2';
const FAST_PROCESSING: SheetsUploadConfig['processing'] = { initialDelayMs: 10, maxDelayMs: 20, timeoutMs: 2_000 };

async function settle(ms = 20) {
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, ms));
	});
}

async function waitUntil<T>(read: () => T | null | undefined | false, what: string): Promise<T> {
	for (let attempt = 0; attempt < 150; attempt++) {
		const found = read();
		if (found) return found;
		await settle();
	}
	throw new Error(`Timed out waiting for ${what}`);
}

async function fire(element: Element, type: string) {
	await act(async () => {
		element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
	});
}

function button(label: string, parent: ParentNode = document.body): HTMLButtonElement | undefined {
	return Array.from(parent.querySelectorAll('button')).find((item) => item.textContent?.trim() === label || item.getAttribute('aria-label') === label);
}

function png(name: string, bytes = 'png-bytes'): File {
	return new File([bytes], name, { type: 'image/png' });
}

function bytesOf(file: Blob): Promise<ArrayBuffer> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as ArrayBuffer);
		reader.onerror = () => reject(reader.error);
		reader.readAsArrayBuffer(file);
	});
}

async function sha256(file: File): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', await bytesOf(file));
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** The patch an update mutation sent. */
function patchOf(request: { variables: Record<string, unknown> | undefined } | undefined): Record<string, unknown> {
	const input = (request?.variables?.input ?? {}) as Record<string, unknown>;
	return (input.domainKindPatch ?? {}) as Record<string, unknown>;
}

describe('Sheets file columns over the torture schema', () => {
	let root: Root;
	let container: HTMLDivElement;
	let queryClient: QueryClient;
	let backends: UploadBackends;

	beforeEach(() => {
		vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(20000);
		vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(800);
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 20000, 33));
		Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: () => 'blob:preview' });
		Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => {} });
		queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
	});

	afterEach(async () => {
		await act(async () => root.unmount());
		queryClient.clear();
		container.remove();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		vi.clearAllMocks();
	});

	async function mount(
		options: UploadBackendsOptions = {},
		upload: SheetsUploadConfig = {},
		tableName = 'DomainKind',
		prepare?: (backends: UploadBackends) => void,
		withStorage = true,
	) {
		backends = createUploadBackends(options);
		prepare?.(backends);
		vi.stubGlobal('XMLHttpRequest', (backends as UploadBackends & { FakeXhr: unknown }).FakeXhr);
		const config: SheetsConfig = {
			endpoint: 'https://data.test/graphql',
			auth: { mode: 'embedded', getToken: () => null, getIdentityKey: () => 'user-1' },
			execute: backends.data.execute,
			storage: withStorage ? { endpoint: 'https://storage.test/graphql', execute: backends.storage.execute } : undefined,
			upload: { processing: FAST_PROCESSING, ...upload },
			queryClient,
			onError: hostErrors,
		};
		await act(async () =>
			root.render(
				<div style={{ height: 800, width: 20000 }}>
					<SheetsProvider config={config}>
						<Sheets tableName={tableName} />
					</SheetsProvider>
				</div>,
			),
		);
		await waitUntil(() => container.querySelector('[id^="sheets-cell-1-"]'), `${tableName} rows`);
	}

	function columnKeys(): string[] {
		return Array.from(container.querySelectorAll<HTMLElement>('[data-part-id="sheets-header-cell"]')).map((header) => header.dataset.colKey ?? '');
	}

	function cell(rowIndex: number, key: string): HTMLElement {
		const col = columnKeys().indexOf(key);
		const element = container.querySelector<HTMLElement>(`#sheets-cell-${rowIndex}-${col}`);
		if (col < 0 || !element) throw new Error(`No cell for ${key} in row ${rowIndex}`);
		return element;
	}

	async function openEditor(rowIndex: number, key: string): Promise<HTMLElement> {
		await fire(cell(rowIndex, key), 'dblclick');
		const editor = await waitUntil(() => document.querySelector<HTMLElement>('[data-slot="image-editor"]'), `editor for ${key}`);
		// The column's storage resolves first: until then the dropzone is disabled.
		await waitUntil(() => editor.querySelector('[data-upload-state="ready"], [data-upload-state="unavailable"]'), 'editor ready');
		return editor;
	}

	async function pick(editor: HTMLElement, ...files: File[]) {
		const input = editor.querySelector<HTMLInputElement>('input[type="file"]')!;
		Object.defineProperty(input, 'files', { configurable: true, value: files });
		await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
	}

	async function press(label: string) {
		const target = await waitUntil(() => {
			const found = button(label);
			return found && !found.disabled ? found : null;
		}, `button "${label}"`);
		await fire(target, 'click');
	}

	it('uploads an image into an existing row: the upload input, the signed PUT headers, the projection written', async () => {
		await mount();
		const file = png('cat.png');
		const editor = await openEditor(1, 'avatar');
		await pick(editor, file);
		// Ctrl+Enter saves, like the other editors.
		await act(async () => {
			editor.querySelector('[data-slot="file-entry"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
		});
		await waitUntil(() => backends.updates().length === 1, 'the cell write');

		expect(backends.uploadInputs).toEqual([{
			isPublic: true,
			contentHash: await sha256(file),
			contentType: 'image/png',
			size: file.size,
			filename: 'cat.png',
		}]);
		const payload = backends.uploadPayloads[0]!;
		expect(backends.puts).toHaveLength(1);
		expect(backends.puts[0]!.url).toBe(payload.uploadUrl);
		expect(backends.puts[0]!.headers).toEqual(payload.uploadHeaders);
		expect(backends.puts[0]!.body).toBe(file);
		expect(backends.updates()[0]!.variables).toEqual({ input: { id: D2, domainKindPatch: { avatar: payload.file } } });

		const thumbnail = await waitUntil(() => cell(1, 'avatar').querySelector('img'), 'the new thumbnail');
		expect(thumbnail.getAttribute('src')).toBe((payload.file as { url: string }).url);
	});

	it('creates a draft row first and uploads into the row the create returned', async () => {
		await mount();
		await press('Add row');
		const draftRow = 2;
		await waitUntil(() => container.querySelector(`[id^="sheets-cell-${draftRow}-"]`), 'the draft row');
		const editor = await openEditor(draftRow, 'avatar');
		await pick(editor, png('draft.png'));
		await press('Create Row & Upload');
		await waitUntil(() => backends.updates().length === 1, 'the cell write');

		const created = backends.data.mutations.find((mutation) => mutation.op === 'create');
		expect(created).toBeDefined();
		const createdRow = backends.data.rows.DomainKind!.at(-1)!;
		expect(backends.data.mutations.map((mutation) => mutation.op)).toEqual(['create', 'update']);
		expect(backends.updates()[0]!.variables).toMatchObject({ input: { id: createdRow.id } });
		expect(patchOf(backends.updates()[0]).avatar).toEqual(backends.uploadPayloads[0]!.file);
	});

	it('adds, reorders and removes files of a list column and writes the list in the order shown', async () => {
		await mount();
		const editor = await openEditor(0, 'gallery');
		const stored = backends.data.rows.DomainKind!.find((row) => row.id === D1)!.gallery as unknown[];
		expect(editor.querySelectorAll('[data-slot="file-entry"]')).toHaveLength(2);

		await fire(button('Remove 1.jpg', editor)!, 'click');
		await pick(editor, png('three.png', 'three'));
		const paste = new Event('paste', { bubbles: true, cancelable: true });
		Object.defineProperty(paste, 'clipboardData', { value: { files: [png('four.png', 'four')], getData: () => '' } });
		await act(async () => {
			editor.querySelector('[data-slot="file-dropzone"]')!.dispatchEvent(paste);
		});
		expect(editor.querySelectorAll('[data-slot="file-entry"]')).toHaveLength(3);
		await fire(button('Move four.png up', editor)!, 'click');
		await press('Upload & Save');
		await waitUntil(() => backends.updates().length === 1, 'the list write');

		expect(backends.uploadInputs.map((input) => input.filename).sort()).toEqual(['four.png', 'three.png']);
		const byName = (name: string) => backends.uploadPayloads.find((payload) => (payload.file as { filename?: string }).filename === name)!.file;
		expect(patchOf(backends.updates()[0]).gallery).toEqual([stored[1], byName('four.png'), byName('three.png')]);
		await waitUntil(() => cell(0, 'gallery').textContent?.includes('3 files'), 'the file count');
	});

	it('writes the public URL into a link column, uploading into the bucket the column is bound to', async () => {
		await mount({}, { columns: { DomainKind: { attachmentLink: { bucketKey: 'docs' } } } });
		backends.storage.rows.AppBucket!.push({
			id: '00000000-0000-4000-8000-0000000000b3', key: 'docs', type: 'public', isPublic: true,
			allowedMimeTypes: null, maxFileSize: null, allowCustomKeys: false,
		});
		const editor = await openEditor(1, 'attachmentLink');
		await pick(editor, new File(['%PDF'], 'report.pdf', { type: 'application/pdf' }));
		await press('Upload & Save');
		await waitUntil(() => backends.updates().length === 1, 'the link write');

		expect(backends.uploadInputs[0]).toMatchObject({ bucketKey: 'docs', contentType: 'application/pdf', filename: 'report.pdf' });
		expect(backends.uploadInputs[0]).not.toHaveProperty('isPublic');
		const url = (backends.uploadPayloads[0]!.file as { url: string }).url;
		expect(patchOf(backends.updates()[0])).toEqual({ attachmentLink: url });
		// A link carries no file name, so the chip shows the link's last segment and the title the whole link.
		const chip = await waitUntil(() => cell(1, 'attachmentLink').querySelector('[data-slot="file-cell"]'), 'the link chip');
		expect(chip.textContent).toBe(url.slice(url.lastIndexOf('/') + 1));
		expect(chip.querySelector('[title]')?.getAttribute('title')).toContain(url);
	});

	it('skips the PUT for bytes the storage service already holds and writes the existing file', async () => {
		await mount();
		const file = png('again.png', 'same-bytes');
		backends.storage.rows.AppFile!.push({
			id: '00000000-0000-4000-8000-0000000000f9', bucketId: '00000000-0000-4000-8000-0000000000b1', key: await sha256(file),
			contentHash: await sha256(file), mimeType: 'image/png', size: String(file.size), filename: 'first.png', status: 'uploaded',
		});
		const editor = await openEditor(1, 'avatar');
		await pick(editor, file);
		await press('Upload & Save');
		await waitUntil(() => backends.updates().length === 1, 'the cell write');

		expect(backends.uploadPayloads[0]).toMatchObject({ deduplicated: true, fileId: '00000000-0000-4000-8000-0000000000f9' });
		expect(backends.puts).toEqual([]);
		expect(patchOf(backends.updates()[0]).avatar).toMatchObject({ id: '00000000-0000-4000-8000-0000000000f9' });
	});

	it('waits while the server confirms a new file, retries the write and then saves it', async () => {
		await mount({ managedColumns: ['DomainKind.avatar'], confirmAfterRefusals: 2 });
		const editor = await openEditor(1, 'avatar');
		await pick(editor, png('slow.png'));
		await press('Upload & Save');
		await waitUntil(() => document.body.textContent?.includes('Processing file…'), 'the processing state');
		await waitUntil(() => backends.data.mutations.some((mutation) => mutation.op === 'update'), 'the accepted write');

		expect(backends.refusals).toBe(2);
		expect(backends.updates()).toHaveLength(3);
		expect(patchOf(backends.updates()[2]).avatar).toEqual(backends.uploadPayloads[0]!.file);
		await waitUntil(() => !document.querySelector('[data-slot="image-editor"]'), 'the editor to close');
	});

	it('stops at once when the server rejected the uploaded file, and says so', async () => {
		// The confirm job rejects the file right after its PUT (its bytes did not match).
		let rejectFile: (fileId: string) => void = () => {};
		await mount({
			managedColumns: ['DomainKind.avatar'],
			put: (put) => {
				rejectFile(put.headers['x-amz-meta-upload-id']!);
				return { status: 200 };
			},
		});
		rejectFile = backends.reject;
		const editor = await openEditor(1, 'avatar');
		await pick(editor, png('tampered.png'));
		await press('Upload & Save');
		await waitUntil(() => editor.querySelector('[role="alert"]')?.textContent?.includes('rejected this file'), 'the rejection message');

		expect(backends.refusals).toBe(1);
		expect(backends.updates()).toHaveLength(1);
		expect(backends.data.mutations.filter((mutation) => mutation.op === 'update')).toEqual([]);
	});

	it('offers a retry on the cell when the file is still processing after the wait, and saves on retry', async () => {
		await mount({ managedColumns: ['DomainKind.avatar'] }, { processing: { initialDelayMs: 10, maxDelayMs: 10, timeoutMs: 60 } });
		const editor = await openEditor(1, 'avatar');
		await pick(editor, png('stuck.png'));
		await press('Upload & Save');
		await waitUntil(() => editor.querySelector('[role="alert"]')?.textContent?.includes('still being processed'), 'the timeout message');
		await press('Cancel');

		const retry = await waitUntil(() => cell(1, 'avatar').querySelector<HTMLButtonElement>('button[aria-label="Retry saving the file"]'), 'the retry on the cell');
		expect(cell(1, 'avatar').textContent).toContain('Not saved');
		expect(backends.data.mutations.filter((mutation) => mutation.op === 'update')).toEqual([]);

		backends.confirm(String(backends.uploadPayloads[0]!.fileId));
		await fire(retry, 'click');
		await waitUntil(() => backends.data.mutations.some((mutation) => mutation.op === 'update'), 'the retried write');
		expect(patchOf(backends.updates().at(-1)).avatar).toEqual(backends.uploadPayloads[0]!.file);
		await waitUntil(() => !cell(1, 'avatar').textContent?.includes('Not saved'), 'the cell to clear its pending state');
	});

	it('refuses a file over the bucket limit before any upload request', async () => {
		await mount();
		const editor = await openEditor(1, 'avatar');
		await pick(editor, new File([new Uint8Array(11 * 1024 * 1024)], 'big.png', { type: 'image/png' }));
		await press('Upload & Save');
		const entry = await waitUntil(() => editor.querySelector('[data-slot="file-entry"][data-status="failed"]'), 'the refused file');

		expect(entry.textContent).toContain('"big.png" is 11 MB. This bucket accepts files up to 10 MB.');
		expect(backends.uploadInputs).toEqual([]);
		expect(backends.puts).toEqual([]);
		expect(backends.updates()).toEqual([]);
	});

	it('is read-only with a reason when the storage service has two file stores and none is chosen', async () => {
		const dataMeta = tortureMetaOf('v2');
		for (const table of dataMeta._meta?.tables ?? []) {
			for (const field of table?.fields ?? []) {
				const file = (field as { file?: { filesType: string | null } | null } | null)?.file;
				if (file) file.filesType = null;
			}
		}
		const storageMeta = structuredClone(dataMeta) as MetaQuery;
		const files = storageMeta._meta!.tables!.find((table) => table?.name === 'AppFile')!;
		storageMeta._meta!.tables!.push({
			...structuredClone(files),
			name: 'ArchiveFile',
			storage: { ...files.storage!, filesType: 'ArchiveFile', upload: { ...files.storage!.upload!, mutation: 'uploadArchiveFile' } },
		});
		await mount({ dataMeta, storageMeta });
		const editor = await openEditor(1, 'avatar');

		expect(editor.querySelector('[role="note"]')?.textContent).toBe('The storage service has several file stores, and none is chosen for this column.');
		expect(editor.querySelector('[data-slot="file-dropzone"]')).toBeNull();
		// The cell host carries only the model's read-only reason; the view's title names this one.
		expect(cell(1, 'avatar').querySelector('[data-slot="image-cell"]')?.getAttribute('title'))
			.toBe('The storage service has several file stores, and none is chosen for this column.');
	});

	it('keeps the file for a retry when the PUT is refused, writes nothing and deletes nothing', async () => {
		await mount({ put: () => ({ status: 403, body: '<Error><Code>AccessDenied</Code></Error>' }) });
		const editor = await openEditor(1, 'avatar');
		await pick(editor, png('denied.png'));
		await press('Upload & Save');
		const entry = await waitUntil(() => editor.querySelector('[data-slot="file-entry"][data-status="failed"]'), 'the failed upload');

		expect(entry.textContent).toContain('403');
		expect(toast.error).toHaveBeenCalledWith({ message: expect.stringContaining('403') });
		expect(backends.updates()).toEqual([]);
		expect(backends.storage.mutations).toEqual([]);
		expect(button('Upload & Save')).toBeDefined();
		// The host hears the failure, with the file row the server issued and its files table.
		const [error, context] = hostErrors.mock.calls.find(([, ctx]) => ctx?.source === 'upload') ?? [];
		expect(context).toEqual({ source: 'upload', tableName: 'DomainKind' });
		expect(unfinishedUploadOf(error)).toEqual({
			fileId: (backends.uploadPayloads[0] as { fileId: string }).fileId,
			filesType: 'AppFile',
			filesTableKey: expect.stringContaining('AppFile'),
		});
	});

	it('opens with focus on the dropzone; Escape closes without a write and gives focus back to the grid', async () => {
		await mount();
		// The keyboard path: the grid holds focus with the cell active, and Enter opens the editor.
		await fire(cell(1, 'avatar'), 'click');
		const grid = container.querySelector<HTMLElement>('[aria-activedescendant]')!;
		await act(async () => grid.focus());
		expect(grid.getAttribute('aria-activedescendant')).toBe(cell(1, 'avatar').id);
		await act(async () => {
			grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
		});
		const editor = await waitUntil(() => document.querySelector<HTMLElement>('[data-slot="image-editor"]'), 'the editor');
		// The shared frame's title: the field's readable name, the raw name in the tooltip, the kind as a chip.
		const header = editor.querySelector('[data-slot="editor-header"]')!;
		expect(header.querySelector('h3')?.textContent).toBe('Avatar');
		expect(header.querySelector('h3')?.getAttribute('title')).toBe('avatar');
		expect(header.textContent).toContain('Image');

		// Storage resolves after the editor opens; focus then moves from Cancel to the dropzone.
		await waitUntil(() => document.activeElement?.getAttribute('data-slot') === 'file-dropzone', 'focus on the dropzone');
		expect(editor.contains(document.activeElement)).toBe(true);

		await act(async () => {
			document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
		});
		await waitUntil(() => !document.querySelector('[data-slot="image-editor"]'), 'the editor to close');
		expect(document.activeElement).toBe(grid);
		expect(grid.getAttribute('aria-activedescendant')).toBe(cell(1, 'avatar').id);
		expect(backends.uploadInputs).toEqual([]);
		expect(backends.updates()).toEqual([]);
	});

	it('Escape during an upload cancels the PUT and writes nothing', async () => {
		await mount({ put: () => 'hang' });
		const editor = await openEditor(1, 'avatar');
		await pick(editor, png('slow.png'));
		await press('Upload & Save');
		await waitUntil(() => backends.puts.length === 1 && editor.querySelector('[role="progressbar"]'), 'the running upload');

		await act(async () => {
			editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
		});
		await waitUntil(() => !document.querySelector('[data-slot="image-editor"]'), 'the editor to close');
		expect(backends.aborted).toHaveLength(1);
		await settle(50);
		expect(backends.updates()).toEqual([]);
		expect(cell(1, 'avatar').querySelector('[data-slot="file-cell-pending"], [data-slot="file-cell-failed"]')).toBeNull();
	});

	it('requests a new upload URL once when the first one has expired', async () => {
		await mount({ expiresAt: (index) => (index === 0 ? new Date(Date.now() - 1_000).toISOString() : new Date(Date.now() + 3_600_000).toISOString()) });
		const editor = await openEditor(1, 'avatar');
		await pick(editor, png('late.png'));
		await press('Upload & Save');
		await waitUntil(() => backends.updates().length === 1, 'the cell write');

		expect(backends.uploadInputs).toHaveLength(2);
		expect(backends.puts.map((put) => put.url)).toEqual([backends.uploadPayloads[1]!.uploadUrl]);
	});

	it('shows signed thumbnails resolved in one batch, and the name of a file whose URL cannot be resolved', async () => {
		await mount({}, {}, 'DomainKind', ({ data }) => {
			data.rows.DomainKind!.find((row) => row.id === D2)!.avatar = {
				id: '00000000-0000-4000-8000-0000000000ff', key: 'avatars/lost.png', mime: 'image/png', filename: 'lost.png',
			};
		});
		const thumbnail = await waitUntil(() => cell(0, 'avatar').querySelector('img'), 'the signed thumbnail');
		expect(thumbnail.getAttribute('src')).toBe('https://storage.mock/download/avatars/a.png');
		await waitUntil(() => cell(1, 'avatar').querySelector('[data-slot="file-cell"]'), 'the unresolved file chip');
		expect(cell(1, 'avatar').textContent).toBe('lost.png');

		const lookups = backends.storage.requests.filter((request) => /\bdownloadUrl\b/.test(request.source));
		expect(lookups).toHaveLength(1);
		expect(lookups[0]!.source).toContain('appFiles(where: $where');
		expect((lookups[0]!.variables?.where as { id: { in: string[] } }).id.in.sort()).toEqual([
			'00000000-0000-4000-8000-0000000000f1',
			'00000000-0000-4000-8000-0000000000ff',
		]);
	});

	it('gives a storage files table a preview column with a download link for each live file', async () => {
		await mount({}, {}, 'AppFile');
		expect(columnKeys()).toContain('__file_preview__');
		const preview = await waitUntil(() => cell(0, '__file_preview__').querySelector('img'), 'the file preview');
		expect(preview.getAttribute('src')).toBe('https://storage.mock/download/avatars/a.png');
		expect(cell(0, '__file_preview__').querySelector('a[aria-label="Download a.png"]')?.getAttribute('href'))
			.toBe('https://storage.mock/download/avatars/a.png');
		// The second file is still `requested`: no URL yet, so no download link.
		expect(cell(1, '__file_preview__').querySelector('a')).toBeNull();
		expect(cell(1, '__file_preview__').textContent).toContain('1.jpg');
	});

	it('uploads on a server whose _meta predates file bindings, through its only file store', async () => {
		await mount({ server: 'baseline' });
		const editor = await openEditor(1, 'document');
		await pick(editor, png('scan.png'));
		await press('Upload & Save');
		await waitUntil(() => backends.updates().length === 1, 'the cell write');

		expect(backends.uploadInputs[0]).toMatchObject({ isPublic: true, filename: 'scan.png' });
		expect(patchOf(backends.updates()[0]).document).toEqual(backends.uploadPayloads[0]!.file);
	});

	it('shows upload progress and cancels an upload without writing the cell', async () => {
		await mount({ put: () => 'hang' });
		const editor = await openEditor(1, 'avatar');
		await pick(editor, png('slow.png'));
		await press('Upload & Save');
		const progress = await waitUntil(() => editor.querySelector('[role="progressbar"][aria-valuenow="50"]'), 'the upload progress');
		expect(progress.getAttribute('aria-label')).toBe('Uploading slow.png');

		await fire(button('Cancel upload of slow.png', editor)!, 'click');
		await settle(40);
		expect(backends.aborted).toHaveLength(1);
		expect(backends.updates()).toEqual([]);
		expect(editor.querySelector('[data-slot="file-entry"]')).toBeNull();
	});

	it('clears a single file cell by writing null, without uploading or deleting anything', async () => {
		await mount();
		const editor = await openEditor(0, 'document');
		await fire(button('Remove file', editor)!, 'click');
		await press('Save');
		await waitUntil(() => backends.updates().length === 1, 'the clearing write');

		expect(backends.updates()[0]!.variables).toEqual({ input: { id: D1, domainKindPatch: { document: null } } });
		expect(backends.uploadInputs).toEqual([]);
		expect(backends.storage.mutations).toEqual([]);
	});

	it('writes nothing into a link column when the stored file has no public address', async () => {
		await mount({ publicUrls: false });
		const editor = await openEditor(1, 'attachmentLink');
		await pick(editor, png('diagram.png'));
		await press('Upload & Save');
		await waitUntil(() => toast.error.mock.calls.length > 0, 'the error');

		expect(toast.error).toHaveBeenCalledWith({ message: expect.stringContaining('needs a public bucket') });
		expect(backends.uploadInputs).toHaveLength(1);
		expect(backends.updates()).toEqual([]);
	});

	it('is read-only for a link column bound to a private bucket, before any upload', async () => {
		await mount({}, { columns: { DomainKind: { attachmentLink: { isPublic: false } } } });
		const editor = await openEditor(1, 'attachmentLink');

		expect(editor.querySelector('[role="note"]')?.textContent).toBe('This column stores a link to each file, so it needs a public bucket.');
		expect(editor.querySelector('[data-slot="file-dropzone"]')).toBeNull();
		expect(backends.uploadInputs).toEqual([]);
	});

	it('falls back to shape discovery on a storage service whose _meta names no upload mutation', async () => {
		const storageMeta = structuredClone(tortureMetaOf('v2')) as MetaQuery;
		for (const table of storageMeta._meta?.tables ?? []) {
			if (table?.storage) table.storage = { ...table.storage, upload: null };
		}
		await mount({ storageMeta });
		const editor = await openEditor(1, 'avatar');
		await pick(editor, png('old-server.png'));
		await press('Upload & Save');
		await waitUntil(() => backends.updates().length === 1, 'the cell write');

		expect(backends.storage.requests.some((request) => request.source.includes('IntrospectionQuery'))).toBe(true);
		expect(backends.uploadInputs[0]).toMatchObject({ isPublic: true, filename: 'old-server.png' });
		expect(backends.puts[0]!.headers).toEqual(backends.uploadPayloads[0]!.uploadHeaders);
		expect(patchOf(backends.updates()[0]).avatar).toEqual(backends.uploadPayloads[0]!.file);
	});

	it('opens a file cell without storage to view and open its file, with the reason and no upload or remove', async () => {
		await mount({}, {}, 'DomainKind', undefined, false);
		const editor = await openEditor(0, 'document');

		expect(editor.querySelector('[role="note"]')?.textContent).toBe('Uploads need a storage endpoint');
		expect(editor.querySelector('a[aria-label="Open doc.pdf"]')?.getAttribute('href')).toBe('https://cdn.example.com/doc.pdf');
		expect(editor.querySelector('[data-slot="file-dropzone"]')).toBeNull();
		expect(button('Remove file', editor)).toBeUndefined();
		expect(button('Close', editor)).toBeDefined();
		expect(button('Save', editor)).toBeUndefined();
	});
});
