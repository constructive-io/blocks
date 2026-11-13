/* @vitest-environment jsdom */
//
// Uploads a host starts outside a cell, over the captured torture schema with the
// storage service's upload protocol played by the fake of the upload tests:
//   • `uploadToFilesTable` puts a file into a files table through the model;
//   • `useSheetsFieldUpload` keeps its mutation under the 'sheets' key prefix, so a
//     host's global mutation handlers can skip Sheets' own errors.

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MutationCache, QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SheetsStorageTransport } from '../../context/sheets-context';
import type { SheetsExecuteFn } from '../../context/sheets-execute';
import { SheetsProvider } from '../../context/sheets-provider';
import { unfinishedUploadOf } from '../../context/sheets-upload-presigned';
import { useSheetsFieldUpload } from '../../hooks/use-sheets-upload';
import { uploadToFilesTable } from '../upload-to-files-table';
import { createUploadBackends, type UploadBackends, type UploadBackendsOptions } from './upload-backends';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function png(name: string, bytes = 'png-bytes'): File {
	return new File([bytes], name, { type: 'image/png' });
}

/** A progress listener sends the PUT through XMLHttpRequest, which the fake plays. */
const viaXhr = { onProgress: () => {} };

let backends: UploadBackends;

function mountBackends(options: UploadBackendsOptions = {}): UploadBackends {
	backends = createUploadBackends(options);
	vi.stubGlobal('XMLHttpRequest', (backends as UploadBackends & { FakeXhr: unknown }).FakeXhr);
	return backends;
}

/** A storage transport whose own object keys the catalog cache, so each case starts fresh. */
function storageOf(execute: SheetsExecuteFn = backends.storage.execute): SheetsStorageTransport {
	return { endpoint: 'https://storage.test/graphql', execute };
}

const OWNER_ID = {
	name: 'ownerId',
	description: null,
	defaultValue: null,
	type: { kind: 'NON_NULL', name: null, ofType: { kind: 'SCALAR', name: 'UUID', ofType: null } },
};

/**
 * The storage service of an entity-scoped files table: its upload input requires
 * `ownerId`. Schema lookups report the field; the upload records the owner and
 * hands the rest to the fake, which does not know the field.
 */
function withRequiredOwner(execute: SheetsExecuteFn, owners: unknown[]): SheetsExecuteFn {
	const addOwner = (value: unknown): unknown => {
		if (Array.isArray(value)) return value.map(addOwner);
		if (!value || typeof value !== 'object') return value;
		const record = Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, addOwner(entry)]));
		if (record.name === 'UploadAppFileInput' && Array.isArray(record.inputFields)) {
			record.inputFields = [...(record.inputFields as unknown[]), OWNER_ID];
		}
		return record;
	};
	return (async (document: unknown, variables?: Record<string, unknown>, options?: { signal?: AbortSignal }) => {
		if (/\buploadAppFile\s*\(/.test(String(document))) {
			const { ownerId, ...input } = (variables?.input ?? {}) as Record<string, unknown>;
			owners.push(ownerId);
			return execute(document, { ...variables, input }, options);
		}
		return addOwner(await execute(document, variables, options));
	}) as SheetsExecuteFn;
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('uploadToFilesTable', () => {
	it('uploads through the mutation the storage service names, PUTs with its headers, and returns the stored file', async () => {
		mountBackends();
		const progress = vi.fn();

		const uploaded = await uploadToFilesTable({
			storage: storageOf(),
			filesTable: 'AppFile',
			file: png('logo.png'),
			bucketKey: 'public',
			ownerId: 'not-taken-by-this-mutation',
			onProgress: progress,
		});

		const [input] = backends.uploadInputs;
		expect(input).toMatchObject({ bucketKey: 'public', contentType: 'image/png', size: 9, filename: 'logo.png' });
		expect(input).not.toHaveProperty('isPublic');
		expect(input).not.toHaveProperty('ownerId');
		const [payload] = backends.uploadPayloads as Array<{ fileId: string; uploadHeaders: Record<string, string>; file: unknown }>;
		expect(backends.puts).toHaveLength(1);
		expect(backends.puts[0]!.headers).toStrictEqual(payload!.uploadHeaders);
		expect(uploaded).toStrictEqual({ fileId: payload!.fileId, file: payload!.file, deduplicated: false });
		expect(progress).toHaveBeenLastCalledWith(expect.objectContaining({ percentage: 100 }));
	});

	it('sends no bytes the storage service already holds and returns the existing file', async () => {
		mountBackends();
		const storage = storageOf();
		const first = await uploadToFilesTable({ storage, filesTable: 'AppFile', file: png('a.png', 'same'), ...viaXhr });
		backends.confirm(first.fileId);

		const second = await uploadToFilesTable({ storage, filesTable: 'AppFile', file: png('b.png', 'same'), ...viaXhr });

		expect(backends.puts).toHaveLength(1);
		expect(second).toMatchObject({ fileId: first.fileId, deduplicated: true });
	});

	it('sends the owner a files table requires, and refuses before any request without one', async () => {
		mountBackends();
		const owners: unknown[] = [];
		const storage = storageOf(withRequiredOwner(backends.storage.execute, owners));

		await expect(uploadToFilesTable({ storage, filesTable: 'AppFile', file: png('a.png') })).rejects.toThrow('need an owner');
		expect(backends.uploadInputs).toHaveLength(0);

		const uploaded = await uploadToFilesTable({ storage, filesTable: 'AppFile', file: png('a.png'), ownerId: 'owner-1', ...viaXhr });
		expect(owners).toEqual(['owner-1']);
		expect(uploaded.deduplicated).toBe(false);
	});

	it('names a table that is not a files table of the storage service', async () => {
		mountBackends();

		await expect(uploadToFilesTable({ storage: storageOf(), filesTable: 'DomainKind', file: png('a.png') })).rejects.toThrow(
			'"DomainKind" is not a files table of this storage service.',
		);
		expect(backends.uploadInputs).toHaveLength(0);
	});

	it('rejects a refused PUT with the file row it left, and deletes nothing', async () => {
		mountBackends({ put: () => ({ status: 403, body: 'denied' }) });

		const error = await uploadToFilesTable({ storage: storageOf(), filesTable: 'AppFile', file: png('a.png'), ...viaXhr }).catch((reason: unknown) => reason);

		expect(error).toMatchObject({ message: expect.stringContaining('Upload failed: 403') });
		expect(unfinishedUploadOf(error)).toEqual({
			fileId: (backends.uploadPayloads[0] as { fileId: string }).fileId,
			filesType: 'AppFile',
			filesTableKey: expect.stringContaining('AppFile'),
		});
		expect(backends.storage.mutations).toEqual([]);
	});

	it('rejects an answer without an upload URL, naming the file row the server created, and deletes nothing', async () => {
		mountBackends();
		const withoutUrl: SheetsExecuteFn = (async (document: unknown, variables?: Record<string, unknown>, options?: { signal?: AbortSignal }) => {
			const data = await backends.storage.execute<Record<string, Record<string, unknown>>>(document, variables, options);
			return /\buploadAppFile\s*\(/.test(String(document)) ? { uploadAppFile: { ...data.uploadAppFile, uploadUrl: null } } : data;
		}) as SheetsExecuteFn;

		const error = await uploadToFilesTable({ storage: storageOf(withoutUrl), filesTable: 'AppFile', file: png('a.png'), ...viaXhr }).catch((reason: unknown) => reason);

		expect(error).toMatchObject({ message: expect.stringContaining('no uploadUrl') });
		expect(unfinishedUploadOf(error)).toMatchObject({ fileId: (backends.uploadPayloads[0] as { fileId: string }).fileId, filesType: 'AppFile' });
		expect(backends.puts).toHaveLength(0);
		expect(backends.storage.mutations).toEqual([]);
	});
});

describe('useSheetsFieldUpload', () => {
	let root: Root;
	let container: HTMLDivElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
	});

	afterEach(async () => {
		await act(async () => root.unmount());
		container.remove();
	});

	it("keeps its mutation under the 'sheets' key prefix, where a host's global error handler can skip it", async () => {
		mountBackends();
		const failed: Array<readonly unknown[] | undefined> = [];
		const queryClient = new QueryClient({
			mutationCache: new MutationCache({ onError: (_error, _variables, _context, mutation) => failed.push(mutation.options.mutationKey) }),
			defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
		});
		let upload: ReturnType<typeof useSheetsFieldUpload> | null = null;
		function Probe() {
			upload = useSheetsFieldUpload('DomainKind', 'avatar', null);
			return null;
		}

		await act(async () =>
			root.render(
				<SheetsProvider
					config={{
						endpoint: 'https://data.test/graphql',
						auth: { mode: 'embedded', getToken: () => null, getIdentityKey: () => 'user-1' },
						execute: backends.data.execute,
						storage: storageOf(),
						queryClient,
					}}
				>
					<Probe />
				</SheetsProvider>,
			),
		);
		// No record: the mutation fails at once with "Missing record context for upload".
		await act(async () => {
			await upload!.mutateAsync(null).catch(() => undefined);
		});

		expect(failed).toHaveLength(1);
		expect(failed[0]?.[0]).toBe('sheets');
		expect(failed[0]).toEqual(expect.arrayContaining(['mutation', 'field-upload', 'avatar']));
	});
});
