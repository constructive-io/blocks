import { describe, expect, it, vi, afterEach } from 'vitest';

import type { SheetsConfig } from './sheets-context';
import { createSheetsExecute, createSheetsUpload, partialResultOf, responseErrorsOf } from './sheets-execute';
import {
	resolveUploadCapability,
	resolveDownloadUrl,
	unfinishedUploadOf,
	__resetUploadCapabilityCache,
} from './sheets-upload-presigned';
import {
	buildIntrospection,
	graphqlFetchFromSchema,
	uploadPayload,
	makeSchemaExecute,
	makeSchemaExecuteWithStats,
	BUCKET_ONLY_SDL,
	CONDITION_ONLY_SDL,
	CONNECTION_ONLY_SDL,
	CONNECTION_TWO_FILES_SDL,
	NO_UPLOADS_SDL,
	NODE_EXEC_SDL,
	RELAY_ONLY_SDL,
	ROOT_UPLOAD_SDL,
} from '../testing/graphql-schema-mock';

/** ROOT_UPLOAD_SDL plus the file table's update and delete mutations (both take `id`). */
const UPLOAD_WITH_WRITES_SDL = ROOT_UPLOAD_SDL.replace(
	'type Mutation { uploadAppFile(input: UploadAppFileInput!): UploadAppFilePayload }',
	`input AppFilePatch { filename: String }
	input UpdateAppFileInput { clientMutationId: String id: UUID! appFilePatch: AppFilePatch! }
	type UpdateAppFilePayload { appFile: AppFile }
	input DeleteAppFileInput { clientMutationId: String id: UUID! }
	type DeleteAppFilePayload { appFile: AppFile }
	type Mutation {
		uploadAppFile(input: UploadAppFileInput!): UploadAppFilePayload
		updateAppFile(input: UpdateAppFileInput!): UpdateAppFilePayload
		deleteAppFile(input: DeleteAppFileInput!): DeleteAppFilePayload
	}`,
);

function createEmbeddedConfig(onAuthError?: () => void): SheetsConfig {
	return {
		endpoint: 'https://example.com/graphql',
		auth: { mode: 'embedded', getToken: () => 'token-123' },
		onAuthError,
	};
}

function createJsonResponse(body: unknown, init?: ResponseInit): Response {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
		...init,
	});
}

function createTestFile(): File {
	if (typeof File !== 'undefined') {
		return new File(['hello'], 'hello.txt', { type: 'text/plain' });
	}
	return new Blob(['hello'], { type: 'text/plain' }) as unknown as File;
}

afterEach(() => {
	vi.restoreAllMocks();
	__resetUploadCapabilityCache();
});

describe('createSheetsExecute auth callbacks', () => {
	it('calls onAuthError for HTTP 401 responses', async () => {
		const onAuthError = vi.fn();
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response('', { status: 401, statusText: 'Unauthorized' }),
		);

		const execute = createSheetsExecute(createEmbeddedConfig(onAuthError), () => 'token-123');

		await expect(execute('{ viewer { id } }')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
		expect(onAuthError).toHaveBeenCalledTimes(1);
	});

	it('calls onAuthError for GraphQL UNAUTHENTICATED errors', async () => {
		const onAuthError = vi.fn();
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			createJsonResponse({
				errors: [{ message: 'Not authenticated', extensions: { code: 'UNAUTHENTICATED' } }],
			}),
		);

		const execute = createSheetsExecute(createEmbeddedConfig(onAuthError), () => 'token-123');

		await expect(execute('{ viewer { id } }')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
		expect(onAuthError).toHaveBeenCalledTimes(1);
	});

	it('treats a rejected token (BAD_TOKEN_DEFINITION) as an ended session, by its code only', async () => {
		const onAuthError = vi.fn();
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			createJsonResponse({ errors: [{ message: 'Invalid token', extensions: { code: 'BAD_TOKEN_DEFINITION' } }] }),
		);

		const execute = createSheetsExecute(createEmbeddedConfig(onAuthError), () => 'token-123');

		await expect(execute('{ viewer { id } }')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
		expect(onAuthError).toHaveBeenCalledTimes(1);
		// The same word in the message text is not a code.
		vi.mocked(globalThis.fetch).mockResolvedValue(createJsonResponse({ errors: [{ message: 'BAD_TOKEN_DEFINITION', extensions: { code: 'FORBIDDEN' } }] }));
		await expect(execute('{ viewer { id } }')).rejects.toMatchObject({ code: 'FORBIDDEN' });
		expect(onAuthError).toHaveBeenCalledTimes(1);
	});

	it('keeps the session when an error only mentions authorization in its text', async () => {
		const onAuthError = vi.fn();
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			createJsonResponse({
				errors: [{ message: 'Unauthorized access to the project table', extensions: { code: 'FORBIDDEN' } }],
			}),
		);

		const execute = createSheetsExecute(createEmbeddedConfig(onAuthError), () => 'token-123');

		await expect(execute('{ viewer { id } }')).rejects.toMatchObject({ code: 'FORBIDDEN' });
		vi.mocked(globalThis.fetch).mockResolvedValue(createJsonResponse({ errors: [{ message: 'Authentication of the webhook failed' }] }));
		await expect(execute('{ viewer { id } }')).rejects.not.toMatchObject({ code: 'UNAUTHENTICATED' });
		expect(onAuthError).not.toHaveBeenCalled();
	});

	it('keeps the data of a response with field errors, but never for a lost session', async () => {
		const onAuthError = vi.fn();
		const data = { specialValues: { nodes: [{ id: 1, realValue: null }] } };
		const cellError = { message: 'Float cannot represent non numeric value: NaN', path: ['specialValues', 'nodes', 0, 'realValue'] };
		vi.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce(createJsonResponse({ data, errors: [cellError] }))
			.mockResolvedValueOnce(createJsonResponse({
				data,
				errors: [cellError, { message: 'Session expired', extensions: { code: 'UNAUTHENTICATED' } }],
			}));

		const execute = createSheetsExecute(createEmbeddedConfig(onAuthError), () => 'token-123');

		const partial = await execute('{ specialValues { nodes { id realValue } } }').catch((error: unknown) => error);
		expect(partialResultOf(partial)).toEqual({ data, errors: [cellError] });
		const expired = await execute('{ specialValues { nodes { id realValue } } }').catch((error: unknown) => error);
		expect(expired).toMatchObject({ code: 'UNAUTHENTICATED' });
		expect(partialResultOf(expired)).toBeNull();
		expect(responseErrorsOf(expired)).toHaveLength(2);
		expect(onAuthError).toHaveBeenCalledTimes(1);
	});

	it('keeps every error of a failed write, not only the first', async () => {
		const errors = [
			{ message: 'title is required', path: ['createTask'], extensions: { code: 'NOT_NULL_VIOLATION' } },
			{ message: 'status is not a choice', path: ['createTask'] },
		];
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({ data: null, errors }));

		const execute = createSheetsExecute(createEmbeddedConfig(), () => 'token-123');
		const failure = await execute('mutation { createTask(input: {}) { clientMutationId } }').catch((error: unknown) => error);

		expect(failure).toMatchObject({ code: 'NOT_NULL_VIOLATION' });
		expect(responseErrorsOf(failure)).toEqual(errors);
		expect(partialResultOf(failure)).toBeNull();
	});

	it('keeps the suspension reason, from an error result and from a 403 refusal', async () => {
		const onAuthError = vi.fn();
		const suspended = {
			errors: [{ message: 'This database is paused', extensions: { code: 'ACCESS_SUSPENDED', context: { reason: 'billing' } } }],
		};
		vi.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce(createJsonResponse(suspended))
			.mockResolvedValueOnce(new Response(JSON.stringify(suspended), { status: 403, statusText: 'Forbidden' }));

		const execute = createSheetsExecute(createEmbeddedConfig(onAuthError), () => 'token-123');

		for (let attempt = 0; attempt < 2; attempt += 1) {
			await expect(execute('{ viewer { id } }')).rejects.toMatchObject({
				code: 'ACCESS_SUSPENDED',
				context: expect.objectContaining({ reason: 'billing' }),
			});
		}
		expect(onAuthError).not.toHaveBeenCalled();
	});
});

// ============================================================================
// Presigned upload seam
// ============================================================================
//
// Schema-driven mocks (helper: ../testing/graphql-schema-mock):
//   - The seam's introspection + upload op + downloadUrl query run through a
//     REAL graphql-js engine via `makeSchemaExecute(SDL, rootValue)` injected as
//     `config.execute`. A malformed selected field, a bad arg, or a stray input
//     field (e.g. `ownerId`) now FAILS the test at coercion/validation — the
//     hand-built introspection JSON + string-routed executor are gone.
//   - Sent inputs are captured via the `rootValue` resolvers (e.g.
//     `uploadAppFile: (args) => { captured = args.input; ... }`), which replaces
//     AND strengthens spy.mock.calls string-matching.
//   - The S3 PUT stays a `fetch` mock (it is NOT GraphQL).

/** Stub crypto.subtle.digest to a fixed 32-byte buffer ⇒ deterministic hex. */
function stubDigest(): string {
	const bytes = new Uint8Array(32);
	for (let i = 0; i < 32; i++) bytes[i] = i; // 00,01,02,...,1f
	vi.spyOn(crypto.subtle, 'digest').mockResolvedValue(bytes.buffer);
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

describe('createSheetsUpload — presigned seam', () => {
	it('rootUpload happy path: hash → uploadAppFile → PUT → downloadUrl', async () => {
		const expectedHash = stubDigest();
		const putCalls: { url: string; init?: RequestInit }[] = [];
		vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
			putCalls.push({ url: String(url), init: init as RequestInit });
			return new Response('', { status: 200 });
		});

		// Capture the coerced upload input + downloadUrl id via the resolvers.
		// graphql-js validates/coerces these args, so a stray `ownerId` (or any
		// undeclared field) would throw before the resolver ran. ALSO capture the
		// raw downloadUrl variables object: graphql-js ignores extra keys in the
		// variables object, so an exact `toEqual({ id })` guard (against a stray
		// var leaking into the downloadUrl call) must inspect the object directly.
		let capturedInput: Record<string, unknown> | undefined;
		let capturedDownloadId: unknown;
		let downloadVars: Record<string, unknown> | undefined;
		const execute = makeSchemaExecute(
			ROOT_UPLOAD_SDL,
			{
				uploadAppFile: (args: { input: Record<string, unknown> }) => {
					capturedInput = args.input;
					return uploadPayload({ uploadUrl: 'https://s3.local/put?sig=abc', fileId: 'file-1', key: 'abc', deduplicated: false }, { mime: 'image/png' });
				},
				appFile: (args: { id: string }) => {
					capturedDownloadId = args.id;
					return { id: args.id, downloadUrl: 'https://cdn.local/public/abc' };
				},
			},
			(source, vars) => {
				if (source.includes('SheetsDownloadUrl')) downloadVars = vars;
			},
		);

		const config: SheetsConfig = { endpoint: 'https://example.com/graphql', auth: { mode: 'standalone' }, execute };
		const upload = createSheetsUpload(config, () => 'token-123');
		const file = new File(['hello'], 'hello.txt', { type: 'image/png' });
		const result = await upload(file);

		// (a) mutation variables — input shape, hash, and NO ownerId
		expect(capturedInput).toEqual({
			isPublic: true,
			contentHash: expectedHash,
			contentType: 'image/png',
			size: file.size,
			filename: 'hello.txt',
		});
		expect(capturedInput).not.toHaveProperty('ownerId');
		expect(expectedHash).toMatch(/^[a-f0-9]{64}$/);

		// (b) exactly one PUT to uploadUrl, Content-Type matches, NO Authorization
		expect(putCalls).toHaveLength(1);
		expect(putCalls[0].url).toBe('https://s3.local/put?sig=abc');
		expect(putCalls[0].init?.method).toBe('PUT');
		const headers = putCalls[0].init?.headers as Record<string, string>;
		expect(headers['Content-Type']).toBe('image/png');
		expect(headers['Authorization']).toBeUndefined();
		expect(headers['authorization']).toBeUndefined();

		// (c)+(d) downloadUrl query issued with exactly { id: 'file-1' } (no stray
		// vars), the id flows into the resolver, and the result carries the stable url
		expect(capturedDownloadId).toBe('file-1');
		expect(downloadVars).toEqual({ id: 'file-1' });
		expect(result).toMatchObject({
			url: 'https://cdn.local/public/abc',
			file: {
				bucket_id: 'bucket-1',
				filename: 'hello.txt',
				mime: 'image/png',
				size: file.size,
			},
		});
		expect(result.file.url).toBeUndefined();
	});

	it('relay node fallback: downloadUrl via node(nodeId:) with a base64 global id (not the raw pk)', async () => {
		stubDigest();
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 200 }));

		// NODE_EXEC_SDL exposes ONLY node(nodeId:) (no appFile(id:), no connection),
		// so discovery reaches the Relay node fallback. The upload payload returns the
		// RAW pk as fileId; node(nodeId:) needs the opaque global id, so the seam must
		// base64-encode it (base64JSON: `[typeName, pk]`) — NOT pass the raw pk through.
		let capturedNodeId: unknown;
		let downloadSource: string | undefined;
		const execute = makeSchemaExecute(
			NODE_EXEC_SDL,
			{
				uploadAppFile: () => uploadPayload({ uploadUrl: 'https://s3.local/put?sig=n', fileId: 'file-n', key: 'x', deduplicated: false }),
				node: (args: { nodeId: string }) => {
					capturedNodeId = args.nodeId;
					return { downloadUrl: 'https://cdn/node.png' };
				},
			},
			(source) => {
				if (source.includes('SheetsDownloadUrl')) downloadSource = source;
			},
		);

		const config: SheetsConfig = { endpoint: 'https://node.example.com/graphql', auth: { mode: 'standalone' }, execute };
		const upload = createSheetsUpload(config, () => 'token-123');
		const result = await upload(new File(['hello'], 'hello.txt', { type: 'image/png' }));

		// resolved via node(nodeId:), NOT appFile(id:)/appFiles(
		expect(downloadSource).toContain('node(nodeId:');
		expect(downloadSource).not.toContain('appFile(id:');
		// the node id is the base64JSON global id, NOT the raw pk 'file-n'
		expect(capturedNodeId).toBe(btoa(JSON.stringify(['AppFile', 'file-n'])));
		expect(capturedNodeId).not.toBe('file-n');
		expect(result.url).toBe('https://cdn/node.png');
	});

	it('dedup: uploadUrl null ⇒ NO PUT, still resolves downloadUrl', async () => {
		stubDigest();
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 200 }));

		const execute = makeSchemaExecute(ROOT_UPLOAD_SDL, {
			uploadAppFile: () => uploadPayload({ uploadUrl: null, fileId: 'file-dup', key: 'abc', deduplicated: true }),
			appFile: (args: { id: string }) => ({ id: args.id, downloadUrl: 'https://cdn.local/public/abc' }),
		});

		const config: SheetsConfig = { endpoint: 'https://dedup.example.com/graphql', auth: { mode: 'standalone' }, execute };
		const upload = createSheetsUpload(config, () => 'token-123');
		const result = await upload(new File(['hello'], 'hello.txt', { type: 'image/png' }));

		// No PUT to S3 — fetch is never used for the upload (execute is injected).
		expect(fetchSpy).not.toHaveBeenCalled();
		expect(result.url).toBe('https://cdn.local/public/abc');
	});

	it('signed-header fidelity: PUT Content-Type === mutation contentType', async () => {
		stubDigest();
		let putContentType: string | undefined;
		vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
			putContentType = (init?.headers as Record<string, string>)?.['Content-Type'];
			return new Response('', { status: 200 });
		});

		let mutationContentType: unknown;
		const execute = makeSchemaExecute(ROOT_UPLOAD_SDL, {
			uploadAppFile: (args: { input: Record<string, unknown> }) => {
				mutationContentType = args.input.contentType;
				return uploadPayload({ uploadUrl: 'https://s3.local/put', fileId: 'f', key: 'k', deduplicated: false });
			},
			appFile: (args: { id: string }) => ({ id: args.id, downloadUrl: 'https://cdn.local/public/k' }),
		});

		const config: SheetsConfig = { endpoint: 'https://fidelity.example.com/graphql', auth: { mode: 'standalone' }, execute };
		const upload = createSheetsUpload(config, () => null);
		await upload(new File(['x'], 'a.webp', { type: 'image/webp' }));

		expect(mutationContentType).toBe('image/webp');
		expect(putContentType).toBe('image/webp');
	});

	it('auth normalization: UNAUTHENTICATED on the upload step rejects + fires onAuthError', async () => {
		// onAuthError fires INSIDE createSheetsExecute (parseGraphQLResponse), which
		// an injected `execute` bypasses — so this case keeps the REAL executor over
		// a mocked fetch. The schema-driven upgrade is the introspection arm:
		// `{ data: buildIntrospection(ROOT_UPLOAD_SDL) }` (no hand-built JSON). The
		// upload op returns the GraphQL auth error as a transport/runtime condition.
		stubDigest();
		const onAuthError = vi.fn();
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(createJsonResponse({ data: buildIntrospection(ROOT_UPLOAD_SDL) })); // introspection
		fetchSpy.mockResolvedValueOnce(
			createJsonResponse({ errors: [{ message: 'Not authenticated', extensions: { code: 'UNAUTHENTICATED' } }] }),
		);

		const config: SheetsConfig = {
			endpoint: 'https://auth.example.com/graphql',
			auth: { mode: 'embedded', getToken: () => 'token-123' },
			onAuthError,
		};
		const upload = createSheetsUpload(config, () => 'token-123');

		await expect(upload(createTestFile())).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
		expect(onAuthError).toHaveBeenCalledTimes(1);
	});

	it('PUT failure: S3 403 ⇒ a canonical error with a non-empty message', async () => {
		stubDigest();
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response('<Error><Code>AccessDenied</Code></Error>', { status: 403, statusText: 'Forbidden' }),
		);

		const execute = makeSchemaExecute(ROOT_UPLOAD_SDL, {
			uploadAppFile: () => uploadPayload({ uploadUrl: 'https://s3.local/put', fileId: 'f', key: 'k', deduplicated: false }),
			appFile: (args: { id: string }) => ({ id: args.id, downloadUrl: 'https://cdn.local/public/k' }),
		});

		const config: SheetsConfig = { endpoint: 'https://put-fail.example.com/graphql', auth: { mode: 'standalone' }, execute };
		const upload = createSheetsUpload(config, () => null);

		const error = await upload(createTestFile()).catch((e) => e);
		expect(error).toMatchObject({ code: 'BAD_USER_INPUT' });
		expect(String((error as Error).message)).toContain('403');
		expect((error as Error).message.length).toBeGreaterThan(0);
	});

	it('PUT body is the raw file bytes', async () => {
		stubDigest();
		let putBody: unknown;
		vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
			putBody = init?.body;
			return new Response('', { status: 200 });
		});

		const execute = makeSchemaExecute(ROOT_UPLOAD_SDL, {
			uploadAppFile: () => uploadPayload({ uploadUrl: 'https://s3.local/put', fileId: 'f', key: 'k', deduplicated: false }),
			appFile: (args: { id: string }) => ({ id: args.id, downloadUrl: 'https://cdn.local/public/k' }),
		});

		const config: SheetsConfig = { endpoint: 'https://body.example.com/graphql', auth: { mode: 'standalone' }, execute };
		const upload = createSheetsUpload(config, () => null);
		const file = new File(['hello world'], 'h.bin', { type: 'application/octet-stream' });
		await upload(file);

		// Regression guard: a presignedPut that dropped `body: buffer` would still
		// pass the url/header/method assertions — so assert the bytes themselves.
		// The PUT sends the File itself, so the browser streams it and no second copy is kept.
		expect(putBody).toBeInstanceOf(Blob);
		expect((putBody as Blob).size).toBe(file.size);
		expect(await (putBody as Blob).text()).toBe('hello world');
	});

	it('hashes the real file bytes (un-stubbed): contentHash = canonical SHA-256', async () => {
		// No stubDigest() — exercise the REAL Web Crypto digest over the file bytes,
		// proving the seam hashes the actual content (not a wrong/empty buffer).
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 200 }));

		let sentHash: unknown;
		const execute = makeSchemaExecute(ROOT_UPLOAD_SDL, {
			uploadAppFile: (args: { input: Record<string, unknown> }) => {
				sentHash = args.input.contentHash;
				return uploadPayload({ uploadUrl: 'https://s3.local/put', fileId: 'f', key: 'k', deduplicated: false });
			},
			appFile: (args: { id: string }) => ({ id: args.id, downloadUrl: 'https://cdn.local/public/k' }),
		});

		const config: SheetsConfig = { endpoint: 'https://realhash.example.com/graphql', auth: { mode: 'standalone' }, execute };
		const upload = createSheetsUpload(config, () => null);
		await upload(new File(['hello'], 'hello.txt', { type: 'text/plain' }));

		// canonical SHA-256('hello')
		expect(sentHash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
	});

	it('PUT network failure (fetch rejects) ⇒ a STORAGE_UPLOAD_BLOCKED error that says how to fix it', async () => {
		stubDigest();
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

		const execute = makeSchemaExecute(ROOT_UPLOAD_SDL, {
			uploadAppFile: () => uploadPayload({ uploadUrl: 'https://s3.local/put', fileId: 'f', key: 'k', deduplicated: false }),
			appFile: (args: { id: string }) => ({ id: args.id, downloadUrl: 'https://cdn.local/public/k' }),
		});

		const config: SheetsConfig = { endpoint: 'https://neterr.example.com/graphql', auth: { mode: 'standalone' }, execute };
		const upload = createSheetsUpload(config, () => null);

		await expect(upload(createTestFile())).rejects.toMatchObject({
			code: 'STORAGE_UPLOAD_BLOCKED',
			message: expect.stringContaining('allow this site in the storage settings'),
		});
	});

	it('PUT failure ⇒ leaves the row for server expiry and preserves the PUT error', async () => {
		stubDigest();
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('denied', { status: 403, statusText: 'Forbidden' }));

		const deleted: unknown[] = [];
		const execute = makeSchemaExecute(UPLOAD_WITH_WRITES_SDL, {
			uploadAppFile: () => uploadPayload({ uploadUrl: 'https://s3.local/put', fileId: 'file-orphan', key: 'k', deduplicated: false }),
			deleteAppFile: (args: { input: { id: string } }) => {
				deleted.push(args.input.id);
				return { appFile: { id: args.input.id } };
			},
			appFile: (args: { id: string }) => ({ id: args.id, downloadUrl: 'https://cdn.local/public/k' }),
		});

		const config: SheetsConfig = { endpoint: 'https://cleanup.example.com/graphql', auth: { mode: 'standalone' }, execute };
		const upload = createSheetsUpload(config, () => null);

		const error = await upload(createTestFile()).catch((reason: unknown) => reason);
		expect(error).toMatchObject({ message: expect.stringContaining('Upload failed: 403 Forbidden') });
		// The row is left for the server to expire; the error names it for a host with its own cleanup.
		expect(unfinishedUploadOf(error)).toEqual({ fileId: 'file-orphan', filesType: 'AppFile', filesTableKey: null });
		expect(deleted).toEqual([]);
	});

	it('non-deduplicated payload with null uploadUrl ⇒ badRequest, no PUT', async () => {
		stubDigest();
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 200 }));

		const execute = makeSchemaExecute(ROOT_UPLOAD_SDL, {
			uploadAppFile: () => uploadPayload({ uploadUrl: null, fileId: 'f', key: 'k', deduplicated: false }),
			appFile: (args: { id: string }) => ({ id: args.id, downloadUrl: 'https://cdn.local/public/k' }),
		});

		const config: SheetsConfig = { endpoint: 'https://badpayload.example.com/graphql', auth: { mode: 'standalone' }, execute };
		const upload = createSheetsUpload(config, () => null);

		const error = await upload(createTestFile()).catch((reason: unknown) => reason);
		expect(error).toMatchObject({ message: expect.stringContaining('no uploadUrl') });
		expect(unfinishedUploadOf(error)).toMatchObject({ fileId: 'f' });
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('rejects a schema without the file projection before creating a row', async () => {
		const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 200 }));
		const uploadAppFile = vi.fn();
		const execute = makeSchemaExecute(ROOT_UPLOAD_SDL.replace('file: JSON', ''), { uploadAppFile });
		const upload = createSheetsUpload({ ...createEmbeddedConfig(), execute }, () => null);

		await expect(upload(createTestFile())).rejects.toThrow('file projection');
		expect(uploadAppFile).not.toHaveBeenCalled();
		expect(fetch).not.toHaveBeenCalled();
	});

	it('still resolves an existing file on a schema without an upload projection', async () => {
		const execute = makeSchemaExecute(ROOT_UPLOAD_SDL.replace('file: JSON', ''), {
			appFile: () => ({ id: 'existing', downloadUrl: 'https://cdn.local/existing' }),
		});

		await expect(resolveDownloadUrl(execute, 'https://older.example.com/graphql', 'existing'))
			.resolves.toBe('https://cdn.local/existing');
	});

	it('resolves an existing file on a read-only storage endpoint with no upload mutation', async () => {
		const execute = makeSchemaExecute(NO_UPLOADS_SDL, {
			appFile: () => ({ id: 'existing', downloadUrl: 'https://cdn.local/read-only' }),
		});

		await expect(resolveDownloadUrl(execute, 'https://read-only.example.com/graphql', 'existing'))
			.resolves.toBe('https://cdn.local/read-only');
	});

	it('rejects an empty projection before PUT', async () => {
		const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 200 }));
		const execute = makeSchemaExecute(ROOT_UPLOAD_SDL, {
			uploadAppFile: () => ({ uploadUrl: 'https://s3.local/put', fileId: 'f', key: 'k', deduplicated: false, file: null }),
		});
		const upload = createSheetsUpload({ ...createEmbeddedConfig(), execute }, () => null);

		await expect(upload(createTestFile())).rejects.toThrow('file projection');
		expect(fetch).not.toHaveBeenCalled();
	});

	it.each([false, true])('returns the projection when lookup fails after upload (dedup=%s)', async (deduplicated) => {
		const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 200 }));
		const payload = uploadPayload({ uploadUrl: deduplicated ? null : 'https://s3.local/put', fileId: 'f', key: 'k', deduplicated });
		const appFile = vi.fn(() => {
			throw new Error('File lookup failed');
		});
		const execute = makeSchemaExecute(ROOT_UPLOAD_SDL, { uploadAppFile: () => payload, appFile });
		const upload = createSheetsUpload({ ...createEmbeddedConfig(), execute }, () => null);

		expect(await upload(createTestFile())).toEqual({ file: payload.file });
		expect(fetch).toHaveBeenCalledTimes(deduplicated ? 0 : 1);
		expect(appFile).toHaveBeenCalledTimes(1);
	});

	it('uploads to the selected bucket on a storage endpoint with no download lookup', async () => {
		const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 200 }));
		const payload = uploadPayload({ uploadUrl: 'https://s3.local/put', fileId: 'f', key: 'k', deduplicated: false });
		const uploadAppFile = vi.fn((_args: { input: Record<string, unknown> }) => payload);
		const sdl = ROOT_UPLOAD_SDL.replace('type Query { appFile(id: UUID!): AppFile }', 'type Query { ready: Boolean }');
		const onOperation = vi.fn();
		const execute = makeSchemaExecute(sdl, { uploadAppFile }, onOperation);
		const dataExecute = vi.fn(async (): Promise<never> => {
			throw new Error('Upload used the data endpoint');
		});
		const upload = createSheetsUpload({
			...createEmbeddedConfig(),
			execute: dataExecute,
			storage: { endpoint: 'https://storage.example.com/graphql', execute },
			upload: { bucketKey: 'selected-bucket' },
		}, () => null);

		expect(await upload(createTestFile())).toEqual({ file: payload.file });
		expect(uploadAppFile.mock.calls[0]?.[0]).toMatchObject({ input: { bucketKey: 'selected-bucket' } });
		expect(uploadAppFile.mock.calls[0]?.[0]).not.toHaveProperty('input.isPublic');
		expect(dataExecute).not.toHaveBeenCalled();
		expect(onOperation).toHaveBeenCalledTimes(2);
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it('uses the storage URL and current host auth when no storage executor is injected', async () => {
		const endpoint = 'https://storage.example.com/graphql';
		const payload = uploadPayload({ uploadUrl: null, fileId: 'f', key: 'k', deduplicated: true }, { url: 'https://cdn.local/k' });
		const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(graphqlFetchFromSchema(ROOT_UPLOAD_SDL, {
			uploadAppFile: () => ({ ...payload, file: { ...payload.file, filename: null } }),
			appFile: () => ({ id: 'f', downloadUrl: 'https://cdn.local/k' }),
		}));
		const upload = createSheetsUpload({ ...createEmbeddedConfig(), storage: { endpoint } }, () => 'host-token');

		expect(await upload(createTestFile())).toEqual({ file: payload.file, url: 'https://cdn.local/k' });
		expect(fetch).toHaveBeenCalled();
		for (const [url, init] of fetch.mock.calls) {
			expect(url).toBe(endpoint);
			expect(new Headers(init?.headers).get('authorization')).toBe('Bearer host-token');
		}
	});

	it('capability cache: two uploads to the same endpoint introspect once', async () => {
		stubDigest();
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 200 }));

		const { execute, introspectionCount } = makeSchemaExecuteWithStats(ROOT_UPLOAD_SDL, {
			uploadAppFile: () => uploadPayload({ uploadUrl: 'https://s3.local/put', fileId: 'f', key: 'k', deduplicated: false }),
			appFile: (args: { id: string }) => ({ id: args.id, downloadUrl: 'https://cdn.local/public/k' }),
		});

		const config: SheetsConfig = { endpoint: 'https://cache.example.com/graphql', auth: { mode: 'standalone' }, execute };
		const upload = createSheetsUpload(config, () => null);
		await upload(createTestFile());
		await upload(createTestFile());

		expect(introspectionCount()).toBe(1);
	});

	it('connection-only (Relay-disabled): uploadAppFile → PUT → appFiles(where:{id:{equalTo:}}) downloadUrl', async () => {
		const expectedHash = stubDigest();
		const putCalls: string[] = [];
		vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
			putCalls.push(String(url));
			return new Response('', { status: 200 });
		});

		// Capture the coerced upload input, the connection filter arg, and the raw
		// downloadUrl document source — to assert the CONNECTION query (not
		// appFile(id:)) was used to resolve the url.
		let capturedInput: Record<string, unknown> | undefined;
		let capturedWhere: Record<string, unknown> | undefined;
		let downloadSource: string | undefined;
		const execute = makeSchemaExecute(
			CONNECTION_ONLY_SDL,
			{
				uploadAppFile: (args: { input: Record<string, unknown> }) => {
					capturedInput = args.input;
					return uploadPayload({ uploadUrl: 'https://s3.local/put?sig=z', fileId: 'file-c', key: 'x', deduplicated: false }, { mime: 'image/png' });
				},
				appFiles: (args: { where?: Record<string, unknown> }) => {
					capturedWhere = args.where;
					return { nodes: [{ downloadUrl: 'https://cdn/x.png' }] };
				},
			},
			(source) => {
				if (source.includes('SheetsDownloadUrl')) downloadSource = source;
			},
		);

		const config: SheetsConfig = { endpoint: 'https://conn.example.com/graphql', auth: { mode: 'standalone' }, execute };
		const upload = createSheetsUpload(config, () => 'token-123');
		const file = new File(['hello'], 'hello.txt', { type: 'image/png' });
		const result = await upload(file);

		// upload input shape (NO ownerId), real hash
		expect(capturedInput).toEqual({
			isPublic: true,
			contentHash: expectedHash,
			contentType: 'image/png',
			size: file.size,
			filename: 'hello.txt',
		});

		// exactly one PUT to the presigned url
		expect(putCalls).toEqual(['https://s3.local/put?sig=z']);

		// downloadUrl resolved via the CONNECTION (appFiles + where), NOT appFile(id:)
		expect(downloadSource).toContain('appFiles(');
		expect(downloadSource).not.toContain('appFile(id:');
		expect(capturedWhere).toEqual({ id: { equalTo: 'file-c' } });

		expect(result).toMatchObject({
			url: 'https://cdn/x.png',
			file: {
				bucket_id: 'bucket-1',
				filename: 'hello.txt',
				mime: 'image/png',
				size: file.size,
			},
		});
		expect(result.file.url).toBeUndefined();
	});

	it('connection condition-style (b): downloadUrl via appFiles(condition:{id:$id}), no operator wrapper', async () => {
		stubDigest();
		const putCalls: string[] = [];
		vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
			putCalls.push(String(url));
			return new Response('', { status: 200 });
		});

		// Capture the connection condition arg + the raw downloadUrl document source —
		// to assert the CONDITION filter literal `{ id: $id }` (no `{ equalTo }`).
		let capturedCondition: Record<string, unknown> | undefined;
		let downloadSource: string | undefined;
		const execute = makeSchemaExecute(
			CONDITION_ONLY_SDL,
			{
				uploadAppFile: () => uploadPayload({ uploadUrl: 'https://s3.local/put?sig=c', fileId: 'file-cond', key: 'x', deduplicated: false }),
				appFiles: (args: { condition?: Record<string, unknown> }) => {
					capturedCondition = args.condition;
					return { nodes: [{ downloadUrl: 'https://cdn/cond.png' }] };
				},
			},
			(source) => {
				if (source.includes('SheetsDownloadUrl')) downloadSource = source;
			},
		);

		const config: SheetsConfig = { endpoint: 'https://cond.example.com/graphql', auth: { mode: 'standalone' }, execute };
		const upload = createSheetsUpload(config, () => 'token-123');
		const result = await upload(new File(['hello'], 'hello.txt', { type: 'image/png' }));

		expect(putCalls).toEqual(['https://s3.local/put?sig=c']);
		// resolved via the CONDITION connection (no operator wrapper), NOT appFile(id:)
		expect(downloadSource).toContain('appFiles(');
		expect(downloadSource).not.toContain('appFile(id:');
		expect(downloadSource).not.toContain('equalTo');
		expect(capturedCondition).toEqual({ id: 'file-cond' });
		expect(result.url).toBe('https://cdn/cond.png');
	});

	it('multi-storage-table connection: uploadAppFile resolves via appFiles, NOT the first-declared dataRoomFiles', async () => {
		stubDigest();
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 200 }));

		// CONNECTION_TWO_FILES_SDL declares dataRoomFiles BEFORE appFiles, so a
		// first-declared pick resolves the WRONG connection. The upload op is
		// uploadAppFile, so discovery must prefer the appFiles connection (-> AppFile).
		// This is the live production path; the wrong connection -> 0 nodes -> fail.
		let appFilesWhere: Record<string, unknown> | undefined;
		const uploadDataRoomFile = vi.fn();
		let dataRoomCalled = false;
		let downloadSource: string | undefined;
		const execute = makeSchemaExecute(
			CONNECTION_TWO_FILES_SDL,
			{
				uploadDataRoomFile,
				uploadAppFile: () => uploadPayload({ uploadUrl: 'https://s3.local/put?sig=m', fileId: 'file-m', key: 'x', deduplicated: false }),
				appFiles: (args: { where?: Record<string, unknown> }) => {
					appFilesWhere = args.where;
					return { nodes: [{ downloadUrl: 'https://cdn/app.png' }] };
				},
				dataRoomFiles: () => {
					dataRoomCalled = true;
					return { nodes: [{ downloadUrl: 'https://cdn/WRONG.png' }] };
				},
			},
			(source) => {
				if (source.includes('SheetsDownloadUrl')) downloadSource = source;
			},
		);

		const config: SheetsConfig = { endpoint: 'https://multi.example.com/graphql', auth: { mode: 'standalone' }, execute };
		const upload = createSheetsUpload(config, () => 'token-123');
		const result = await upload(new File(['hello'], 'hello.txt', { type: 'image/png' }));

		// resolved via appFiles (matching the upload op), NOT the first-declared dataRoomFiles
		expect(downloadSource).toContain('appFiles(');
		expect(downloadSource).not.toContain('dataRoomFiles(');
		expect(dataRoomCalled).toBe(false);
		expect(uploadDataRoomFile).not.toHaveBeenCalled();
		expect(appFilesWhere).toEqual({ id: { equalTo: 'file-m' } });
		expect(result.url).toBe('https://cdn/app.png');
	});

	it('no-uploads endpoint: introspection lacks the upload mutation ⇒ badRequest', async () => {
		stubDigest();
		// Real introspection over a schema with no upload mutation — discovery
		// throws badRequest before any upload-op resolver is reached (there is no
		// uploadAppFile field to resolve at all).
		const execute = makeSchemaExecute(NO_UPLOADS_SDL, {
			appFile: (args: { id: string }) => ({ id: args.id, downloadUrl: 'https://cdn.local/public/k' }),
		});

		const config: SheetsConfig = { endpoint: 'https://no-uploads.example.com/graphql', auth: { mode: 'standalone' }, execute };
		const upload = createSheetsUpload(config, () => null);

		await expect(upload(createTestFile())).rejects.toMatchObject({ code: 'BAD_USER_INPUT' });
	});
});

// ============================================================================
// resolveUploadCapability — pure discovery (Tier 1: real introspection, no fetch)
// ============================================================================

describe('resolveUploadCapability', () => {
	it('discovers the rootUpload shape (uploadAppFile + appFile by id)', () => {
		const cap = resolveUploadCapability(buildIntrospection(ROOT_UPLOAD_SDL).__schema);
		expect(cap).toMatchObject({
			uploadFieldName: 'uploadAppFile',
			inputTypeName: 'UploadAppFileInput',
			download: {
				fileByIdField: 'appFile',
				fileByIdArgName: 'id',
				fileTypeName: 'AppFile',
			},
		});
	});

	it('falls back to Relay node(nodeId:) when no id-arg/connection field exists', () => {
		const cap = resolveUploadCapability(buildIntrospection(RELAY_ONLY_SDL).__schema);
		expect(cap).toMatchObject({
			uploadFieldName: 'uploadAppFile',
			download: {
				fileByIdField: 'node',
				fileByIdArgName: 'nodeId',
				fileTypeName: 'AppFile',
			},
		});
	});

	it('falls back to a filtered connection when no id-arg/node field exists', () => {
		const cap = resolveUploadCapability(buildIntrospection(CONNECTION_ONLY_SDL).__schema);
		expect(cap).toMatchObject({
			uploadFieldName: 'uploadAppFile',
			download: {
				fileByIdField: 'appFiles',
				fileByIdArgName: 'connection',
				fileTypeName: 'AppFile',
				idScalarName: 'UUID',
				connectionFilterArgName: 'where',
				connectionIdField: 'id',
				connectionIdOperator: 'equalTo',
				connectionNodesField: 'nodes',
			},
		});
	});

	it('discovers a condition-style connection (condition:{id:$id}, no operator)', () => {
		const cap = resolveUploadCapability(buildIntrospection(CONDITION_ONLY_SDL).__schema);
		expect(cap).toMatchObject({
			uploadFieldName: 'uploadAppFile',
			download: {
				fileByIdField: 'appFiles',
				fileByIdArgName: 'connection',
				fileTypeName: 'AppFile',
				idScalarName: 'UUID',
				connectionFilterArgName: 'condition',
				connectionIdField: 'id',
				connectionNodesField: 'nodes',
			},
		});
		// condition style carries NO equality operator
		expect(cap.download?.connectionIdOperator).toBeUndefined();
	});

	it('multi-storage-table connection: prefers the upload-op-matched connection (appFiles over dataRoomFiles)', () => {
		// dataRoomFiles is declared first; determinism must still pick appFiles for uploadAppFile.
		const cap = resolveUploadCapability(buildIntrospection(CONNECTION_TWO_FILES_SDL).__schema);
		expect(cap).toMatchObject({
			uploadFieldName: 'uploadAppFile',
			download: {
				fileByIdField: 'appFiles',
				fileByIdArgName: 'connection',
				fileTypeName: 'AppFile',
				connectionFilterArgName: 'where',
				connectionIdOperator: 'equalTo',
			},
		});
	});

	it('does NOT discover the pruned bucketByKey.requestUploadUrl shape (no root upload mutation ⇒ throws)', () => {
		expect(() => resolveUploadCapability(buildIntrospection(BUCKET_ONLY_SDL).__schema)).toThrow();
	});

	it('throws when neither upload form is present', () => {
		expect(() => resolveUploadCapability(buildIntrospection(NO_UPLOADS_SDL).__schema)).toThrow();
	});
});
