/* @vitest-environment node */
// The earlier upload API, kept for hosts that call it directly (the dashboard's
// branding upload does). Each case pins what the earlier version did, not only its
// signature: a host test that compares a stored file value, an execute call or a PUT
// request must see the same thing as before.
import { buildSchema, introspectionFromSchema } from 'graphql';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SheetsExecuteFn } from './sheets-execute';
import {
	__resetUploadCapabilityCache,
	callUploadOp,
	discoverSoleUploadCapability,
	discoverUploadCapability,
	fetchDownloadUrl,
	presignedPut,
	sha256HexFromBuffer,
	STORAGE_UPLOAD_BLOCKED_MESSAGE,
	type UploadCapability,
} from './sheets-upload-presigned';

const PAYLOAD = 'type UploadPayload { uploadUrl: String fileId: UUID key: String deduplicated: Boolean file: JSON uploadHeaders: JSON expiresAt: String }';
/** The database plane: no `bucketKey`, a `databaseId`. */
const DATABASE_PLANE = `
	input UploadFileInput { isPublic: Boolean databaseId: UUID contentHash: String! contentType: String! size: Int! filename: String }
`;
const APP_PLANE = `
	input UploadAppFileInput { bucketKey: String isPublic: Boolean contentHash: String! contentType: String! size: Int! filename: String }
`;

function introspection(mutations: string, inputs: string) {
	const schema = buildSchema(`
		scalar JSON
		scalar UUID
		type AppFile { id: UUID! downloadUrl: String }
		type Query { appFile(id: UUID!): AppFile }
		${PAYLOAD}
		${inputs}
		type Mutation { ${mutations} }
	`);
	return { __schema: introspectionFromSchema(schema).__schema };
}

const BOTH_PLANES = introspection(
	'uploadFile(input: UploadFileInput!): UploadPayload uploadAppFile(input: UploadAppFileInput!): UploadPayload',
	DATABASE_PLANE + APP_PLANE,
);
const DATABASE_ONLY = introspection('uploadFile(input: UploadFileInput!): UploadPayload', DATABASE_PLANE);

/** An executor that answers introspection with `schema` and everything else with `answer`. */
function executor(schema: unknown, answer: (document: string, variables?: Record<string, unknown>) => unknown = () => ({})) {
	return vi.fn(async (document: unknown, variables?: Record<string, unknown>) =>
		String(document).includes('__schema') ? schema : answer(String(document), variables),
	);
}

const asExecute = (fn: ReturnType<typeof executor>) => fn as unknown as SheetsExecuteFn;

const INPUT = { contentHash: 'a'.repeat(64), contentType: 'image/png', size: 3, filename: 'logo.png' };
const PROJECTION = { id: 'file-1', key: 'k/file-1.png', bucket_id: 'bucket-public', mime: 'image/png', size: 3 };

afterEach(() => {
	__resetUploadCapabilityCache();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('discoverUploadCapability (earlier API)', () => {
	it('picks uploadAppFile and caches the discovery per endpoint', async () => {
		const execute = executor(BOTH_PLANES);
		const first = await discoverUploadCapability('https://storage.test/graphql', asExecute(execute));
		const second = await discoverUploadCapability('https://storage.test/graphql', asExecute(execute));

		expect(first.uploadFieldName).toBe('uploadAppFile');
		expect(first.inputTypeName).toBe('UploadAppFileInput');
		expect(first.hasFileProjection).toBe(true);
		expect(first.download).toMatchObject({ fileByIdField: 'appFile', fileByIdArgName: 'id' });
		expect(second).toBe(first);
		expect(execute).toHaveBeenCalledTimes(1);
	});

	it('without a name, does not take an op that has no bucketKey, as before', async () => {
		const execute = executor(DATABASE_ONLY);

		await expect(discoverUploadCapability('https://storage.test/graphql', asExecute(execute))).rejects.toThrow(
			'Uploads are not enabled for this endpoint.',
		);
	});

	it('finds a named op of any shape, and the grid takes a sole op without bucketKey', async () => {
		const execute = executor(DATABASE_ONLY);

		await expect(discoverUploadCapability('https://storage.test/graphql', asExecute(execute), 'uploadFile')).resolves.toMatchObject({
			uploadFieldName: 'uploadFile',
		});
		await expect(discoverSoleUploadCapability({ endpoint: 'https://storage.test/graphql', execute: asExecute(execute) })).resolves.toMatchObject({
			uploadFieldName: 'uploadFile',
		});
	});
});

describe('callUploadOp (earlier API)', () => {
	async function appCap(execute: ReturnType<typeof executor>) {
		return discoverUploadCapability('https://storage.test/graphql', asExecute(execute));
	}

	it('returns the payload exactly as the server sent it, with no filename added to the file', async () => {
		const answer = { uploadUrl: 'https://s3.test/put?sig=1', fileId: 'file-1', key: 'k/file-1.png', deduplicated: false, file: PROJECTION };
		const execute = executor(BOTH_PLANES, () => ({ uploadAppFile: answer }));

		const payload = await callUploadOp(asExecute(execute), await appCap(execute), INPUT);

		expect(payload).toStrictEqual(answer);
		expect('filename' in payload.file).toBe(false);
	});

	it('sends the earlier request: two arguments, the five payload fields, isPublic by default or the bucket key', async () => {
		const answer = { uploadUrl: 'https://s3.test/put', fileId: 'file-1', key: 'k', deduplicated: false, file: PROJECTION };
		const execute = executor(BOTH_PLANES, () => ({ uploadAppFile: answer }));
		const cap = await appCap(execute);

		await callUploadOp(asExecute(execute), cap, INPUT);
		await callUploadOp(asExecute(execute), cap, { ...INPUT, bucketKey: 'documents' });

		const [, publicCall, bucketCall] = execute.mock.calls;
		expect(publicCall).toHaveLength(2);
		const document = String(publicCall![0]);
		expect(document).toContain('uploadAppFile(input: $input)');
		for (const field of ['uploadUrl', 'fileId', 'key', 'deduplicated', 'file']) expect(document).toContain(field);
		expect(document).not.toContain('uploadHeaders');
		expect(publicCall![1]).toStrictEqual({ input: { isPublic: true, ...INPUT } });
		expect(bucketCall![1]).toStrictEqual({ input: { bucketKey: 'documents', ...INPUT } });
	});

	it("sends the database id to the database plane's named op", async () => {
		const answer = { uploadUrl: 'https://s3.test/put', fileId: 'file-1', key: 'k', deduplicated: false, file: PROJECTION };
		const execute = executor(BOTH_PLANES, () => ({ uploadFile: answer }));
		const cap = await discoverUploadCapability('https://storage.test/graphql', asExecute(execute), 'uploadFile');

		await callUploadOp(asExecute(execute), cap, { ...INPUT, databaseId: 'db-1' });

		expect(execute.mock.calls[1]![1]).toStrictEqual({ input: { isPublic: true, databaseId: 'db-1', ...INPUT } });
	});

	it('returns a new file without an uploadUrl, so the caller knows the fileId and can remove the row', async () => {
		const answer = { uploadUrl: null, fileId: 'file-orphan', key: 'k', deduplicated: false, file: PROJECTION };
		const execute = executor(BOTH_PLANES, () => ({ uploadAppFile: answer }));

		await expect(callUploadOp(asExecute(execute), await appCap(execute), INPUT)).resolves.toStrictEqual(answer);
	});

	it('works with a capability built by hand in the earlier shape', async () => {
		const cap: UploadCapability = { uploadFieldName: 'uploadAppFile', inputTypeName: 'UploadAppFileInput', hasFileProjection: true, download: null };
		const answer = { uploadUrl: 'https://s3.test/put', fileId: 'file-1', key: 'k', deduplicated: false, file: PROJECTION };
		const execute = vi.fn(async () => ({ uploadAppFile: answer }));

		await expect(callUploadOp(execute as unknown as SheetsExecuteFn, cap, INPUT)).resolves.toStrictEqual(answer);
		expect((execute.mock.calls[0] as unknown[])[1]).toStrictEqual({ input: { isPublic: true, ...INPUT } });
	});

	it('rejects a missing payload and an incomplete file projection with the earlier messages', async () => {
		const missing = executor(BOTH_PLANES, () => ({ uploadAppFile: null }));
		await expect(callUploadOp(asExecute(missing), await appCap(missing), INPUT)).rejects.toThrow(
			'Upload failed: no payload returned from upload mutation.',
		);

		__resetUploadCapabilityCache();
		const { size: _size, ...withoutSize } = PROJECTION;
		const incomplete = executor(BOTH_PLANES, () => ({
			uploadAppFile: { uploadUrl: 'https://s3.test/put', fileId: 'file-1', key: 'k', deduplicated: false, file: withoutSize },
		}));
		await expect(callUploadOp(asExecute(incomplete), await appCap(incomplete), INPUT)).rejects.toThrow(
			'Upload failed: server returned an invalid file projection.',
		);
	});
});

describe('fetchDownloadUrl (earlier API)', () => {
	it('reads the URL through the by-id accessor, or the filtered connection', async () => {
		const byId = vi.fn(async () => ({ appFile: { id: 'file-1', downloadUrl: 'https://cdn.test/a.png' } }));
		await expect(
			fetchDownloadUrl(byId as unknown as SheetsExecuteFn, { fileByIdField: 'appFile', fileByIdArgName: 'id', fileTypeName: 'AppFile', idScalarName: 'UUID' }, 'file-1'),
		).resolves.toBe('https://cdn.test/a.png');
		expect(String((byId.mock.calls[0] as unknown[])[0])).toContain('appFile(id: $id)');
		expect((byId.mock.calls[0] as unknown[])[1]).toStrictEqual({ id: 'file-1' });

		const connection = vi.fn(async () => ({ appFiles: { nodes: [{ downloadUrl: 'https://cdn.test/b.png' }] } }));
		await expect(
			fetchDownloadUrl(
				connection as unknown as SheetsExecuteFn,
				{
					fileByIdField: 'appFiles',
					fileByIdArgName: 'connection',
					fileTypeName: 'AppFile',
					idScalarName: 'UUID',
					connectionFilterArgName: 'where',
					connectionIdField: 'id',
					connectionIdOperator: 'equalTo',
					connectionNodesField: 'nodes',
					connectionHasFirst: true,
				},
				'file-1',
			),
		).resolves.toBe('https://cdn.test/b.png');
		expect(String((connection.mock.calls[0] as unknown[])[0])).toContain('appFiles(where: { id: { equalTo: $id } }, first: 1)');
	});

	it('throws the earlier message when the file has no URL', async () => {
		const execute = vi.fn(async () => ({ appFile: { id: 'file-1', downloadUrl: null } }));

		await expect(
			fetchDownloadUrl(execute as unknown as SheetsExecuteFn, { fileByIdField: 'appFile', fileByIdArgName: 'id', fileTypeName: 'AppFile' }, 'file-1'),
		).rejects.toThrow('Upload succeeded but no downloadUrl was returned for the file.');
	});
});

describe('presignedPut (earlier API)', () => {
	it('PUTs the buffer with only the Content-Type header, and nothing else in the request', async () => {
		const put = vi.fn(async () => new Response(null, { status: 200 }));
		vi.stubGlobal('fetch', put);
		const buffer = new TextEncoder().encode('png').buffer as ArrayBuffer;
		const onProgress = vi.fn();

		await presignedPut('https://s3.test/put?sig=1', buffer, 'image/png', onProgress);

		expect(put.mock.calls).toStrictEqual([['https://s3.test/put?sig=1', { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: buffer }]]);
		expect(onProgress).toHaveBeenLastCalledWith({ loaded: 3, total: 3, percentage: 100 });
	});

	it('rejects a refused PUT with its status and body, and an unreachable store with the CORS message', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => new Response('denied', { status: 403, statusText: 'Forbidden' })));
		await expect(presignedPut('https://s3.test/put', new ArrayBuffer(1), 'image/png')).rejects.toThrow('Upload failed: 403 Forbidden — denied');

		vi.stubGlobal('fetch', vi.fn(async () => {
			throw new TypeError('Failed to fetch');
		}));
		await expect(presignedPut('https://s3.test/put', new ArrayBuffer(1), 'image/png')).rejects.toMatchObject({
			code: 'STORAGE_UPLOAD_BLOCKED',
			message: STORAGE_UPLOAD_BLOCKED_MESSAGE,
		});
	});
});

describe('sha256HexFromBuffer (earlier API)', () => {
	it('returns the lowercase 64-character hex digest', async () => {
		const buffer = new TextEncoder().encode('abc').buffer as ArrayBuffer;

		await expect(sha256HexFromBuffer(buffer)).resolves.toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
	});

	it('refuses to hash without Web Crypto', async () => {
		vi.stubGlobal('crypto', {});

		await expect(sha256HexFromBuffer(new ArrayBuffer(1))).rejects.toThrow('Web Crypto');
	});
});
