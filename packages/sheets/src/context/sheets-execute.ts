import type { DocumentNode } from 'graphql';
import { print } from 'graphql';

import { createError, DataError, TypedDocumentString } from '@constructive-io/data';

import type { SheetsConfig } from './sheets-context';
import {
	callUploadOp,
	discoverUploadCapability,
	fetchDownloadUrl,
	presignedPut,
	sha256HexFromBuffer,
} from './sheets-upload-presigned';

// ============================================================================
// Types
// ============================================================================

type ExecutableDocument = TypedDocumentString<any, any> | DocumentNode | string | unknown;

export type SheetsExecuteFn = <T = unknown>(
	document: ExecutableDocument,
	variables?: Record<string, unknown>,
) => Promise<T>;

/**
 * Result of an upload through the seam. `url` is the only guaranteed field;
 * the REST upload endpoint also returns `{ filename, mime, size }` (and may
 * return server-internal extras). Keeping it open-ended lets callers read the
 * richer metadata while a bare `{ url }` (e.g. the mock) still satisfies it.
 */
export type SheetsUploadResult = { url: string } & Record<string, unknown>;

/**
 * Optional upload metadata carried through the seam (third arg). Lets an
 * injected `executeUpload` see the destination field/row and report progress.
 * All fields optional, so existing `(file, path?)` callers stay valid.
 */
export interface SheetsUploadOptions {
	tableName?: string;
	fieldName?: string;
	recordId?: string | number;
	onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void;
}

export type SheetsUploadFn = (
	file: File,
	path?: string,
	options?: SheetsUploadOptions,
) => Promise<SheetsUploadResult>;

// ============================================================================
// Helpers
// ============================================================================

function documentToString(document: ExecutableDocument): string {
	if (typeof document === 'string') return document;
	if (document instanceof String) return document.toString();
	if (document && typeof document === 'object' && 'kind' in (document as DocumentNode)) {
		return print(document as DocumentNode);
	}
	if (document === null || document === undefined) {
		throw createError.badRequest('Invalid GraphQL document: null or undefined');
	}
	return String(document);
}

// ============================================================================
// GraphQL Response Parsing
// ============================================================================

interface GraphQLResponseError {
	message: string;
	extensions?: { code?: string };
}

interface GraphQLResponse {
	data?: unknown;
	errors?: GraphQLResponseError[];
}

function hasAuthMessage(message: string | undefined): boolean {
	const normalized = String(message ?? '').toLowerCase();
	return (
		normalized.includes('unauthenticated') ||
		normalized.includes('unauthorized') ||
		normalized.includes('authentication')
	);
}

function parseGraphQLResponse(response: GraphQLResponse, onAuthError?: () => void): DataError | null {
	if (!response.errors?.length) return null;

	const error = response.errors[0];
	const code = error.extensions?.code;
	const message = error.message || 'GraphQL query failed';

	if (code === 'UNAUTHENTICATED' || hasAuthMessage(message)) {
		onAuthError?.();
		return createError.unauthorized('Authentication required. Please log in again.');
	}

	if (code === 'FORBIDDEN') {
		return createError.forbidden('You do not have permission to perform this action.');
	}

	return createError.graphql(message, code);
}

// ============================================================================
// Factory
// ============================================================================

export function createSheetsExecute(
	config: SheetsConfig,
	getToken: () => string | null,
): SheetsExecuteFn {
	return async <T = unknown>(
		document: ExecutableDocument,
		variables?: Record<string, unknown>,
	): Promise<T> => {
		const url = config.endpoint;
		if (!url) {
			throw createError.badRequest('No GraphQL endpoint configured.');
		}

		const token = getToken();
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			Accept: 'application/graphql-response+json',
		};
		if (token) {
			headers['Authorization'] = `Bearer ${token}`;
		}

		let response: Response;
		try {
			response = await fetch(url, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					query: documentToString(document),
					...(variables !== undefined && { variables }),
				}),
			});
		} catch (error) {
			throw createError.network(error instanceof Error ? error : undefined);
		}

		if (!response.ok) {
			const { status, statusText } = response;
			if (status === 401) {
				config.onAuthError?.();
				throw createError.unauthorized('Authentication required. Please log in again.');
			}
			if (status === 403) {
				throw createError.forbidden('You do not have permission to perform this action.');
			}
			if (status === 404) {
				throw createError.notFound('The requested endpoint does not exist.');
			}
			try {
				const body = await response.json();
				if (body.errors?.length) {
					throw createError.graphql(body.errors[0].message || `Request failed: ${status}`, body.errors[0].extensions?.code);
				}
			} catch (e) {
				if (e instanceof DataError) throw e;
			}
			throw createError.badRequest(`Request failed: ${status} ${statusText}`);
		}

		const result: GraphQLResponse = await response.json();
		const graphqlError = parseGraphQLResponse(result, config.onAuthError);
		if (graphqlError) {
			throw graphqlError;
		}

		return result.data as T;
	};
}

/**
 * Presigned-URL cell-upload seam.
 *
 * Replaces the legacy multipart `<endpoint>/upload` POST entirely. The flow:
 *   1. Read + SHA-256 hash the file bytes (Web Crypto)
 *   2. Discover (cached per endpoint) the upload op + downloadUrl-by-id field
 *      via GraphQL introspection — the root `upload<Type>File` mutation, matched
 *      by FIELD/TYPE SHAPE (LOCKED: no hardcoded names)
 *   3. Call the upload op with input `{ bucketKey, contentHash, contentType,
 *      size, filename }` — NO `ownerId` (app-scoped buckets have no owner_id)
 *   4. If `uploadUrl` is non-null, PUT the raw bytes to it with ONLY the signed
 *      `Content-Type` header (NO Authorization). Skipped when `deduplicated`.
 *   5. Resolve the stable public `downloadUrl` for the returned fileId.
 *
 * Returns `{ url, filename, mime, size, key, fileId }` where `url` is the stable
 * download URL — the same cell value shape callers/Step-2 already consume.
 *
 * `path` is ignored (content-addressed buckets key on `contentHash`).
 */
export function createSheetsUpload(config: SheetsConfig, getToken: () => string | null): SheetsUploadFn {
	// Reuse the kept GraphQL executor so DataError normalization + onAuthError
	// (401/UNAUTHENTICATED) apply to introspection, the upload op, and the
	// downloadUrl query alike.
	const execute = config.execute ?? createSheetsExecute(config, getToken);

	return async (file: File, _path?: string, options?: SheetsUploadOptions): Promise<SheetsUploadResult> => {
		if (!config.endpoint) {
			throw createError.badRequest('No GraphQL endpoint configured.');
		}

		const bucketKey = config.upload?.bucketKey ?? 'public';
		const contentType = file.type || 'application/octet-stream';

		// Single read of the bytes — reused for both hashing and the PUT body.
		const buffer = await file.arrayBuffer();
		const contentHash = await sha256HexFromBuffer(buffer);

		const cap = await discoverUploadCapability(config.endpoint, execute);

		const payload = await callUploadOp(execute, cap, {
			bucketKey,
			contentHash,
			contentType,
			size: file.size,
			filename: file.name,
		});

		// Dedup (deduplicated ⇒ uploadUrl === null) means the row + S3 object already
		// exist; skip the PUT. A non-deduplicated payload MUST carry an uploadUrl — a
		// null there is a server-contract violation, so fail loudly rather than
		// resolving a downloadUrl for an object that was never uploaded.
		if (!payload.deduplicated) {
			if (!payload.uploadUrl) {
				throw createError.badRequest('Upload failed: server returned no uploadUrl for a non-deduplicated file.');
			}
			await presignedPut(payload.uploadUrl, buffer, contentType, options?.onProgress);
		} else {
			options?.onProgress?.({ loaded: file.size, total: file.size, percentage: 100 });
		}

		const url = await fetchDownloadUrl(execute, cap, payload.fileId);

		return {
			url,
			filename: file.name,
			mime: file.type,
			size: file.size,
			key: payload.key,
			fileId: payload.fileId,
		};
	};
}

export { DataError } from '@constructive-io/data';
