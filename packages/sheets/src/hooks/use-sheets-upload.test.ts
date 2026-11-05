import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MetaTable } from '@constructive-io/data';
import { createPostGraphileAdapter } from '../adapter/postgraphile-adapter';
import { createSheetsUpload, type SheetsUploadFn } from '../context/sheets-execute';
import { __resetUploadCapabilityCache } from '../context/sheets-upload-presigned';
import { makeSchemaExecute, ROOT_UPLOAD_SDL, uploadPayload } from '../testing/graphql-schema-mock';
import { executeFieldUpload } from './use-sheets-upload';

const ASSET_SCHEMA = /* GraphQL */ `
	scalar JSON
	type Query { photoEntryByAssetKey(assetKey: String!): PhotoEntry }
	type Mutation { updatePhotoEntryByAssetKeyAndRevision(input: UpdatePhotoEntryByAssetKeyAndRevisionInput!): UpdatePhotoEntryPayload }
	type PhotoEntry { assetKey: String!, revision: Int!, photo: JSON, link: String }
	input PhotoEntryPatch { photo: JSON, link: String }
	input UpdatePhotoEntryByAssetKeyAndRevisionInput {
		assetKey: String!
		revision: Int!
		photoEntryPatch: PhotoEntryPatch!
	}
	type UpdatePhotoEntryPayload { photoEntry: PhotoEntry }
`;

const table: MetaTable = {
	name: 'PhotoEntry',
	query: { all: 'photoEntries', one: 'photoEntryByAssetKey', update: 'updatePhotoEntryByAssetKeyAndRevision' },
	fields: [
		{ name: 'assetKey', isPrimaryKey: true, type: { gqlType: 'String', pgType: 'text', isArray: false } },
		{ name: 'revision', isPrimaryKey: true, type: { gqlType: 'Int', pgType: 'int4', isArray: false } },
		{ name: 'photo', type: { gqlType: 'JSON', pgType: 'image', isArray: false } },
		{ name: 'link', type: { gqlType: 'String', pgType: 'attachment', isArray: false } },
	],
};
const recordId = { assetKey: 'asset-1', revision: 0 };
const target = { table, recordId, fieldName: 'photo' };
const projection = {
	id: 'file-1',
	key: 'object-1',
	bucket_id: 'bucket-1',
	mime: 'image/png',
	size: 5,
	filename: 'asset.png',
};
const signedUrl = 'https://s3.local/file?X-Amz-Signature=example';
const publicUrl = 'https://cdn.local/file';
const file = new File(['hello'], 'asset.png', { type: 'image/png' });

function makeDataTransport() {
	const update = vi.fn((args: { input: typeof recordId & { photoEntryPatch: Record<string, unknown> } }) => {
		const { assetKey, revision, photoEntryPatch } = args.input;
		return { photoEntry: { assetKey, revision, ...photoEntryPatch } };
	});
	const execute = makeSchemaExecute(ASSET_SCHEMA, { updatePhotoEntryByAssetKeyAndRevision: update });
	return { execute, update };
}

afterEach(() => {
	vi.restoreAllMocks();
	__resetUploadCapabilityCache();
});

describe('executeFieldUpload', () => {
	it('uploads through storage and patches the composite key on the data executor with the full projection', async () => {
		const { execute, update } = makeDataTransport();
		const put = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
		const storage = makeSchemaExecute(ROOT_UPLOAD_SDL, {
			uploadAppFile: () => ({
				...uploadPayload({ uploadUrl: 'https://s3.local/put', fileId: 'file-1', key: 'object-1', deduplicated: false }),
				file: projection,
			}),
			appFile: () => ({ id: 'file-1', downloadUrl: signedUrl }),
		});
		const executeUpload = createSheetsUpload({
			endpoint: 'https://data.example.com/graphql',
			execute,
			auth: { mode: 'standalone' },
			storage: { endpoint: 'https://storage.example.com/graphql', execute: storage },
		}, () => null);

		await expect(executeFieldUpload(target, file, { execute, executeUpload, adapter: createPostGraphileAdapter() }))
			.resolves.toEqual(projection);
		expect(put).toHaveBeenCalledWith('https://s3.local/put', expect.objectContaining({ method: 'PUT' }));
		expect(update).toHaveBeenCalledTimes(1);
		expect(update.mock.calls[0][0].input).toEqual({ ...recordId, photoEntryPatch: { photo: projection } });
	});

	it('stores an attachment as its public projection URL', async () => {
		const { execute, update } = makeDataTransport();
		const executeUpload = vi.fn<SheetsUploadFn>().mockResolvedValue({
			file: { ...projection, url: publicUrl },
			url: signedUrl,
		});
		await expect(executeFieldUpload({ ...target, fieldName: 'link' }, file, {
			execute, executeUpload, adapter: createPostGraphileAdapter(),
		})).resolves.toBe(publicUrl);
		expect(update.mock.calls[0][0].input.photoEntryPatch).toEqual({ link: publicUrl });
	});

	it('leaves an attachment unchanged when storage provides only a signed URL', async () => {
		const { execute, update } = makeDataTransport();
		const executeUpload = vi.fn<SheetsUploadFn>().mockResolvedValue({ file: projection, url: signedUrl });
		await expect(executeFieldUpload({ ...target, fieldName: 'link' }, file, {
			execute, executeUpload, adapter: createPostGraphileAdapter(),
		})).rejects.toThrow('attachment columns need a public bucket with a public URL prefix');
		expect(update).not.toHaveBeenCalled();
	});

	it('clears just the target cell by writing null through the adapter', async () => {
		const { execute, update } = makeDataTransport();
		const executeUpload = vi.fn<SheetsUploadFn>();
		await expect(executeFieldUpload(target, null, { execute, executeUpload, adapter: createPostGraphileAdapter() }))
			.resolves.toBeNull();
		expect(update.mock.calls[0][0].input).toEqual({ ...recordId, photoEntryPatch: { photo: null } });
		expect(executeUpload).not.toHaveBeenCalled();
	});

	it('validates the row identity before requesting storage', async () => {
		const { execute, update } = makeDataTransport();
		const executeUpload = vi.fn<SheetsUploadFn>();
		await expect(executeFieldUpload({ ...target, recordId: { assetKey: 'asset-1' } }, file, {
			execute, executeUpload, adapter: createPostGraphileAdapter(),
		})).rejects.toThrow('primary-key identity');
		expect(executeUpload).not.toHaveBeenCalled();
		expect(update).not.toHaveBeenCalled();
	});

	it('reports when the update returns no target field', async () => {
		const { execute } = makeDataTransport();
		const executeUpload = vi.fn<SheetsUploadFn>().mockResolvedValue({ file: projection });
		const adapter = createPostGraphileAdapter();
		vi.spyOn(adapter, 'updateRow').mockResolvedValue(recordId);

		await expect(executeFieldUpload(target, file, { execute, executeUpload, adapter }))
			.rejects.toThrow("did not return 'photo'");
	});

	it('preserves the storage error and skips the update on upload failure', async () => {
		const { execute, update } = makeDataTransport();
		const error = new Error('Storage unavailable');
		const executeUpload = vi.fn<SheetsUploadFn>().mockRejectedValue(error);

		await expect(executeFieldUpload(target, file, { execute, executeUpload, adapter: createPostGraphileAdapter() }))
			.rejects.toBe(error);
		expect(update).not.toHaveBeenCalled();
	});
});
