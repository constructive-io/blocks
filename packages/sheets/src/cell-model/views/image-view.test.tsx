/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SheetsConfig } from '../../context/sheets-context';
import { SheetsProvider } from '../../context/sheets-provider';
import { __resetUploadCapabilityCache } from '../../context/sheets-upload-presigned';
import { makeSchemaExecute } from '../../testing/graphql-schema-mock';
import type { CellColumnDescriptor } from '../cell-props';
import { imageSheetsCellFactory } from '../factories/image';
import { ImageCellView } from './image-view';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const READ_SCHEMA = /* GraphQL */ `
	scalar UUID
	type AppFile { id: UUID!, downloadUrl: String }
	type AppFileConnection { nodes: [AppFile] }
	input UUIDFilter { equalTo: UUID, in: [UUID!] }
	input AppFileFilter { id: UUIDFilter }
	type Query {
		appFile(id: UUID!): AppFile
		appFiles(where: AppFileFilter, first: Int): AppFileConnection
	}
`;
const storageEndpoint = 'https://storage.local/graphql';
const cdnUrl = 'https://cdn.local/photo.png';
const signedUrl = (id: string, revision = 1) => `https://s3.local/${id}?signature=${revision}`;
const fileId = (number: number) => `a9240826-717c-4e79-bfc5-${String(number).padStart(12, '0')}`;
const projection = (number: number, mime = 'image/png') => ({
	id: fileId(number),
	key: `file-${number}`,
	bucket_id: 'bucket-1',
	filename: `file-${number}`,
	size: 1024,
	mime,
});

interface FileFilter {
	where: { id: { in?: string[]; equalTo?: string } };
	first?: number;
}

function mediaCell(value: unknown, cellType: CellColumnDescriptor['cellType'], index: number) {
	const column = { key: 'photo', name: 'Photo', cellType };
	const cell = imageSheetsCellFactory.create(value, {
		cellType, fieldName: column.key, canEdit: true, isReadonly: false, activationBehavior: 'double-click',
	});
	return (
		<ImageCellView key={index} cell={cell} column={column} value={value}
			rowId={String(index)} rowIndex={index} colKey={column.key}
			isEditing={false} onStartEdit={() => {}} disabled={false}
		/>
	);
}

describe('Sheets media previews', () => {
	let container: HTMLDivElement;
	let root: ReturnType<typeof createRoot>;
	let queryClient: QueryClient;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
		queryClient = new QueryClient();
	});

	afterEach(async () => {
		await act(async () => root.unmount());
		container.remove();
		queryClient.clear();
		__resetUploadCapabilityCache();
	});

	async function render(
		values: unknown[],
		storage?: SheetsConfig['storage'],
		identityKey = 'user-1',
		cellType: CellColumnDescriptor['cellType'] = 'image',
	) {
		await act(async () => {
			root.render(
				<SheetsProvider config={{
					endpoint: 'https://data.local/graphql',
					databaseId: 'tenant-1',
					auth: { mode: 'embedded', getToken: () => null, getIdentityKey: () => identityKey },
					queryClient,
					storage,
				}}>
					{values.map((value, index) => mediaCell(value, cellType, index))}
				</SheetsProvider>,
			);
		});
	}

	async function expectPreviews(urls: string[]) {
		await act(async () => {
			await vi.waitFor(() => {
				const signedLookups = queryClient.isFetching();
				expect(signedLookups).toBe(0);
			});
		});
		// React Query delivers observer updates on the next task.
		await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
		expect(Array.from(container.querySelectorAll('img'), (img) => img.getAttribute('src'))).toEqual(urls);
	}

	it('renders a durable URL without looking up storage and preserves the copied value', async () => {
		const storage = vi.fn();
		const value = { ...projection(1), url: cdnUrl };
		expect(mediaCell(value, 'image', 0).props.cell.data).toEqual([cdnUrl]);
		await render([value], { endpoint: storageEndpoint, execute: storage });
		await expectPreviews([cdnUrl]);
		expect(storage).not.toHaveBeenCalled();
	});

	it('loads visible image IDs in batches of 100 even when singular reads are available', async () => {
		const appFile = vi.fn();
		const appFiles = vi.fn(({ where, first }: FileFilter) => ({
			nodes: where.id.in?.slice(0, first).reverse().map((id) => ({ id, downloadUrl: signedUrl(id) })),
		}));
		const storage = { endpoint: storageEndpoint, execute: makeSchemaExecute(READ_SCHEMA, { appFile, appFiles }) };
		const images = Array.from({ length: 101 }, (_, index) => projection(index + 1));

		await render(images, storage);
		await expectPreviews(images.map(({ id }) => signedUrl(id)));
		expect(appFile).not.toHaveBeenCalled();
		const batches = appFiles.mock.calls.map(([{ where, first }]) => ({ size: where.id.in?.length, first }));
		expect(batches).toEqual([{ size: 100, first: 100 }, { size: 1, first: 1 }]);
	});

	it('falls back to equality reads when the connection lacks an in operator', async () => {
		const appFiles = vi.fn(({ where }: FileFilter) => {
			const id = where.id.equalTo;
			return { nodes: id ? [{ id, downloadUrl: signedUrl(id) }] : [] };
		});
		const sdl = READ_SCHEMA.replace(', in: [UUID!]', '').replace('appFile(id: UUID!): AppFile', '');
		const storage = { endpoint: storageEndpoint, execute: makeSchemaExecute(sdl, { appFiles }) };

		await render([projection(1), projection(2)], storage);
		await expectPreviews([signedUrl(fileId(1)), signedUrl(fileId(2))]);
		expect(appFiles.mock.calls.map(([{ where }]) => where.id)).toEqual([
			{ equalTo: fileId(1) }, { equalTo: fileId(2) },
		]);
	});

	it('uses the existing chip when storage is absent or a file is not an image', async () => {
		await render([projection(1)]);
		await expectPreviews([]);
		const chip = container.querySelector('[data-slot="file-cell"]');
		expect(chip?.textContent).toContain('file-1');
		expect(chip?.querySelector('[title]')?.getAttribute('title')).toContain('1 KB');

		const execute = vi.fn();
		await render([projection(2, 'application/pdf')], { endpoint: storageEndpoint, execute }, 'user-1', 'upload');
		await expectPreviews([]);
		expect(container.querySelector('[data-slot="file-cell"]')?.textContent).toContain('file-2');
		expect(execute).not.toHaveBeenCalled();
	});

	it('reauthorizes a file under the new identity on the same endpoint', async () => {
		const allowed = makeSchemaExecute(READ_SCHEMA, {
			appFiles: () => ({ nodes: [{ id: fileId(1), downloadUrl: signedUrl(fileId(1)) }] }),
		});
		const denied = vi.fn(() => ({ nodes: [] }));
		await render([projection(1)], { endpoint: storageEndpoint, execute: allowed });
		await expectPreviews([signedUrl(fileId(1))]);

		await render([projection(1)], { endpoint: storageEndpoint, execute: makeSchemaExecute(READ_SCHEMA, { appFiles: denied }) }, 'user-2');
		await expectPreviews([]);
		expect(denied).toHaveBeenCalledTimes(1);
		expect(container.querySelector('[data-slot="file-cell"]')?.textContent).toContain('file-1');
	});

	it('refreshes a failed signed image once and uses the chip if the replacement also fails', async () => {
		let revision = 0;
		const appFiles = vi.fn(() => ({
			nodes: [{ id: fileId(1), downloadUrl: signedUrl(fileId(1), ++revision) }],
		}));
		const storage = { endpoint: storageEndpoint, execute: makeSchemaExecute(READ_SCHEMA, { appFiles }) };

		await render([projection(1)], storage);
		await expectPreviews([signedUrl(fileId(1))]);
		await act(async () => { container.querySelector('img')?.dispatchEvent(new Event('error')); });
		await expectPreviews([signedUrl(fileId(1), 2)]);
		await act(async () => { container.querySelector('img')?.dispatchEvent(new Event('error')); });
		await expectPreviews([]);
		expect(appFiles).toHaveBeenCalledTimes(2);
		expect(container.querySelector('[data-slot="file-cell"]')?.textContent).toContain('file-1');
	});
});
