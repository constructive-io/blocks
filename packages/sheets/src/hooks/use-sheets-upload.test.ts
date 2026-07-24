import { afterEach, describe, expect, it, vi } from 'vitest';
import { DataError, DataErrorType, createError } from '@constructive-io/data';

import { executeFieldUpload } from './use-sheets-upload';
import type { SheetsExecuteFn, SheetsUploadFn } from '../context/sheets-execute';
import { __resetUploadCapabilityCache } from '../context/sheets-upload-presigned';
import {
	buildIntrospection,
	graphqlFetchFromSchema,
	FACTORY_FLOW_SDL,
	ROOT_UPLOAD_SDL,
} from '../testing/graphql-schema-mock';

function createTestFile(): File {
	if (typeof File !== 'undefined') {
		return new File(['hello'], 'hello.txt', { type: 'text/plain' });
	}
	return new Blob(['hello'], { type: 'text/plain' }) as unknown as File;
}

/** Realistic PostGraphile naming for a "users" table */
const USERS_NAMING = {
	mutationName: 'updateUser',
	singularName: 'user',
	patchFieldName: 'userPatch',
	updateInputTypeName: 'UpdateUserInput',
};

/** A patch-step `execute` that returns a well-formed updated record. */
function makeOkExecute(record: Record<string, unknown> = {
	url: 'https://cdn.example.com/abc-hello.txt',
	filename: 'hello.txt',
	mime: 'text/plain',
	size: 5,
}): SheetsExecuteFn {
	return (async () => ({
		updateUser: { user: { id: '1', avatar: record } },
	})) as SheetsExecuteFn;
}

/** An `executeUpload` that returns full REST metadata. */
function makeOkUpload(result: Record<string, unknown> = {
	url: 'https://cdn.example.com/abc-hello.txt',
	filename: 'hello.txt',
	mime: 'text/plain',
	size: 5,
}): SheetsUploadFn {
	return (async () => result as { url: string }) as SheetsUploadFn;
}

function jsonResponse(body: unknown, init?: ResponseInit): Response {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
		...init,
	});
}

/**
 * Resolvers for the factory-seam SDL (`FACTORY_FLOW_SDL`): the three presigned
 * upload ops PLUS the row-patch mutation. Capturing happens via the resolver
 * args — and graphql-js validates/coerces every document, so a malformed upload
 * input (e.g. a stray `ownerId`) or a bad patch shape fails the test.
 */
const factoryRootValue: Record<string, unknown> = {
	uploadAppFile: () => ({ uploadUrl: 'https://s3.local/put', fileId: 'file-1', key: 'abc', deduplicated: false }),
	appFile: (args: { id: string }) => ({ id: args.id, downloadUrl: 'https://cdn.example.com/abc-hello.txt' }),
	updateUser: () => ({
		user: {
			id: '1',
			avatar: { url: 'https://cdn.example.com/abc-hello.txt', filename: 'hello.txt', mime: 'text/plain', size: 5 },
		},
	}),
};

/**
 * Wrap `graphqlFetchFromSchema` (GraphQL POSTs run through the real engine; the
 * S3 PUT stays a plain Response) with a call recorder, so factory-seam tests can
 * assert the PUT url/headers + that ≥4 GraphQL ops hit `/graphql`.
 */
function recordingSchemaFetch(opts?: {
	onPut?: (url: string, init?: RequestInit) => Response | Promise<Response>;
}): { spy: ReturnType<typeof vi.fn>; calls: { url: string; init?: RequestInit }[] } {
	const calls: { url: string; init?: RequestInit }[] = [];
	const underlying = graphqlFetchFromSchema(FACTORY_FLOW_SDL, factoryRootValue, opts);
	const spy = vi.fn(async (url: unknown, init?: RequestInit) => {
		calls.push({ url: String(url), init });
		return underlying(url as RequestInfo | URL, init);
	});
	vi.spyOn(globalThis, 'fetch').mockImplementation(spy as unknown as typeof fetch);
	return { spy, calls };
}

/** Stub crypto.subtle.digest to a fixed buffer so hashing is deterministic. */
function stubDigest(): void {
	const bytes = new Uint8Array(32);
	for (let i = 0; i < 32; i++) bytes[i] = i;
	vi.spyOn(crypto.subtle, 'digest').mockResolvedValue(bytes.buffer);
}

afterEach(() => {
	vi.restoreAllMocks();
	__resetUploadCapabilityCache();
});

// ============================================================================
// Injected seam: interception + sanitization (no network)
// ============================================================================

describe('executeFieldUpload through the injected seam', () => {
	it('calls the injected executeUpload for the file step (interception works)', async () => {
		const executeUpload = vi.fn(makeOkUpload());
		const execute = vi.fn(makeOkExecute());

		await executeFieldUpload('users', 'avatar', '1', createTestFile(), 'https://example.com/graphql', () => 'token-123', USERS_NAMING, {
			execute: execute as unknown as SheetsExecuteFn,
			executeUpload: executeUpload as unknown as SheetsUploadFn,
		});

		expect(executeUpload).toHaveBeenCalledTimes(1);
		const [fileArg, , optionsArg] = executeUpload.mock.calls[0];
		expect(fileArg).toBeInstanceOf(File);
		// Field/row metadata flows through the seam's third arg.
		expect(optionsArg).toMatchObject({ tableName: 'users', fieldName: 'avatar', recordId: '1' });
	});

	it('routes the patch step through the injected execute', async () => {
		const executeUpload = vi.fn(makeOkUpload());
		const execute = vi.fn(makeOkExecute());

		const result = await executeFieldUpload(
			'users', 'avatar', '1', createTestFile(), 'https://example.com/graphql', () => 'token-123', USERS_NAMING,
			{ execute: execute as unknown as SheetsExecuteFn, executeUpload: executeUpload as unknown as SheetsUploadFn },
		);

		expect(execute).toHaveBeenCalledTimes(1);
		expect(result.url).toBe('https://cdn.example.com/abc-hello.txt');
		expect(result.mime).toBe('text/plain');
	});

	it('sends fieldName (not fieldNameUpload) in the patch payload', async () => {
		const execute = vi.fn(makeOkExecute());

		await executeFieldUpload(
			'users', 'avatar', '1', createTestFile(), 'https://example.com/graphql', () => 'token-123', USERS_NAMING,
			{ execute: execute as unknown as SheetsExecuteFn, executeUpload: makeOkUpload() },
		);

		const variables = execute.mock.calls[0][1] as { input: { userPatch: Record<string, unknown> } };
		expect(variables.input.userPatch).toHaveProperty('avatar');
		expect(variables.input.userPatch).not.toHaveProperty('avatarUpload');
		expect(variables.input.userPatch.avatar).toMatchObject({ url: 'https://cdn.example.com/abc-hello.txt' });
	});

	it('sanitizes upload result — strips unexpected fields', async () => {
		const execute = vi.fn(makeOkExecute({ url: 'https://cdn.example.com/file.png', filename: 'file.png', mime: 'image/png', size: 1234 }));
		// REST endpoint returns extra server-internal fields.
		const executeUpload = makeOkUpload({
			url: 'https://cdn.example.com/file.png',
			filename: 'file.png',
			mime: 'image/png',
			size: 1234,
			bucket: 'my-bucket',
			key: 'abc123',
			etag: '"deadbeef"',
		});

		await executeFieldUpload(
			'users', 'avatar', '1', createTestFile(), 'https://example.com/graphql', () => 'token-123', USERS_NAMING,
			{ execute: execute as unknown as SheetsExecuteFn, executeUpload },
		);

		const variables = execute.mock.calls[0][1] as { input: { userPatch: { avatar: Record<string, unknown> } } };
		const patchValue = variables.input.userPatch.avatar;
		expect(patchValue).toEqual({ url: 'https://cdn.example.com/file.png', filename: 'file.png', mime: 'image/png', size: 1234 });
		expect(patchValue).not.toHaveProperty('bucket');
		expect(patchValue).not.toHaveProperty('key');
		expect(patchValue).not.toHaveProperty('etag');
	});

	it('sanitized patch excludes width and height (REST never returns them)', async () => {
		const execute = vi.fn(makeOkExecute());

		await executeFieldUpload(
			'users', 'avatar', '1', createTestFile(), 'https://example.com/graphql', () => 'token-123', USERS_NAMING,
			{ execute: execute as unknown as SheetsExecuteFn, executeUpload: makeOkUpload() },
		);

		const variables = execute.mock.calls[0][1] as { input: { userPatch: { avatar: Record<string, unknown> } } };
		const patchValue = variables.input.userPatch.avatar;
		expect(patchValue).not.toHaveProperty('width');
		expect(patchValue).not.toHaveProperty('height');
	});

	it('surfaces a patch-step GraphQL error as a normalized DataError', async () => {
		const execute = (async () => {
			throw createError.graphql('Patch rejected by server', 'INTERNAL_SERVER_ERROR');
		}) as SheetsExecuteFn;

		const error = await executeFieldUpload(
			'users', 'avatar', '1', createTestFile(), 'https://example.com/graphql', () => 'token-123', USERS_NAMING,
			{ execute, executeUpload: makeOkUpload() },
		).catch((e) => e);

		expect(error).toBeInstanceOf(DataError);
		expect((error as DataError).type).toBe(DataErrorType.GRAPHQL_ERROR);
	});
});

// ============================================================================
// Factory-built seam (no injected fns): real presigned transport over fetch
// ============================================================================

describe('executeFieldUpload over the factory seam (presigned)', () => {
	it('runs the full presigned flow then patches the row via /graphql', async () => {
		stubDigest();
		// GraphQL POSTs (introspection, upload op, downloadUrl, patch) all run
		// through the real schema engine — so each document's shape is validated,
		// not just routed by a body-substring. The S3 PUT stays a plain Response.
		const { spy, calls } = recordingSchemaFetch();

		const result = await executeFieldUpload(
			'users', 'avatar', '1', createTestFile(), 'https://example.com/graphql', () => 'token-123', USERS_NAMING,
		);

		// Presigned PUT is issued to the S3 url (not the /graphql endpoint).
		const putCall = calls.find((c) => c.init?.method === 'PUT');
		expect(putCall?.url).toBe('https://s3.local/put');
		// NO Authorization header on the presigned PUT.
		const putHeaders = putCall?.init?.headers as Record<string, string> | undefined;
		expect(putHeaders?.['Authorization']).toBeUndefined();
		// Every GraphQL call (introspection, upload op, downloadUrl, patch) hits /graphql.
		expect(calls.filter((c) => c.url.endsWith('/graphql')).length).toBeGreaterThanOrEqual(4);
		// Stable downloadUrl flows back through the Step-2 patch result.
		expect(result.url).toBe('https://cdn.example.com/abc-hello.txt');
		expect(result.mime).toBe('text/plain');
		expect(spy).toHaveBeenCalled();
	});

	it('fires onAuthError + throws UNAUTHORIZED when the upload op returns UNAUTHENTICATED', async () => {
		// onAuthError fires inside the real createSheetsExecute (the factory seam
		// builds execute from endpoint/getToken). The UNAUTHENTICATED upload result
		// is a transport/runtime condition, so it stays a bespoke fetch stub; the
		// introspection arm is schema-derived (`buildIntrospection(ROOT_UPLOAD_SDL)`).
		stubDigest();
		const onAuthError = vi.fn();
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockImplementation(async (_url: unknown, init?: RequestInit) => {
			const body = typeof init?.body === 'string' ? init.body : '';
			if (body.includes('IntrospectionQuery') || body.includes('__schema')) {
				return jsonResponse({ data: buildIntrospection(ROOT_UPLOAD_SDL) });
			}
			if (body.includes('uploadAppFile')) {
				return jsonResponse({ errors: [{ message: 'Not authenticated', extensions: { code: 'UNAUTHENTICATED' } }] });
			}
			return new Response('', { status: 200 });
		});

		const error = await executeFieldUpload(
			'users', 'avatar', '1', createTestFile(), 'https://example.com/graphql', () => 'token-123', USERS_NAMING,
			{ onAuthError },
		).catch((e) => e);

		expect(error).toBeInstanceOf(DataError);
		expect((error as DataError).type).toBe(DataErrorType.UNAUTHORIZED);
		expect(onAuthError).toHaveBeenCalledTimes(1);
	});

	it('surfaces a presigned PUT failure (S3 403) as a DataError', async () => {
		stubDigest();
		recordingSchemaFetch({
			onPut: () => new Response('<Error><Code>AccessDenied</Code></Error>', { status: 403, statusText: 'Forbidden' }),
		});

		const error = await executeFieldUpload(
			'users', 'avatar', '1', createTestFile(), 'https://example.com/graphql', () => 'token-123', USERS_NAMING,
		).catch((e) => e);

		expect(error).toBeInstanceOf(DataError);
		expect(String((error as DataError).message)).toContain('403');
	});
});
