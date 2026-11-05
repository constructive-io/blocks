import type { DocumentNode } from 'graphql';
import { print } from 'graphql';

import { ConstructiveError, createError, TypedDocumentString } from '@constructive-io/data';

import type { SheetsConfig, SheetsStorageTransport } from './sheets-context';
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

/** Durable file metadata for image and upload columns. */
export interface SheetsFileValue {
	id: string;
	key: string;
	bucket_id: string;
	mime: string;
	size: number;
	filename: string;
	/** Public URL supplied by storage, when available. */
	url?: string;
}

export interface SheetsUploadResult {
	file: SheetsFileValue;
	/** Optional download URL for immediate use. It can expire. */
	url?: string;
}

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

function parseGraphQLResponse(response: GraphQLResponse, onAuthError?: () => void): ConstructiveError | null {
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
				if (e instanceof ConstructiveError) throw e;
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

export function resolveStorageTransport(
	config: SheetsConfig,
	getToken: () => string | null,
): SheetsStorageTransport | undefined {
	const endpoint = config.storage?.endpoint;
	if (!endpoint) return undefined;

	return {
		endpoint,
		execute: config.storage?.execute ?? createSheetsExecute({ ...config, endpoint }, getToken),
	};
}

/** Creates an uploader for storage. Direct callers may use the supplied endpoint as storage. */
export function createSheetsUpload(config: SheetsConfig, getToken: () => string | null): SheetsUploadFn {
	const transport = resolveStorageTransport(config, getToken) ?? {
		endpoint: config.endpoint,
		execute: config.execute ?? createSheetsExecute(config, getToken),
	};
	return createPresignedSheetsUpload(transport, config.upload?.bucketKey);
}

export function createPresignedSheetsUpload(
	{ endpoint, execute }: SheetsStorageTransport,
	bucketKey?: string,
): SheetsUploadFn {
	return async (file, _path, options) => {
		if (!endpoint) {
			throw createError.badRequest('No GraphQL endpoint configured.');
		}

		const cap = await discoverUploadCapability(endpoint, execute);
		if (!cap.hasFileProjection) {
			throw createError.badRequest('Uploads require a storage mutation that returns a file projection.');
		}

		const contentType = file.type || 'application/octet-stream';
		// Read the file once for both hashing and the PUT body.
		const buffer = await file.arrayBuffer();
		const contentHash = await sha256HexFromBuffer(buffer);
		const payload = await callUploadOp(execute, cap, {
			bucketKey,
			contentHash,
			contentType,
			size: file.size,
			filename: file.name,
		});

		if (!payload.deduplicated) {
			if (!payload.uploadUrl) {
				throw createError.badRequest('Upload failed: server returned no uploadUrl for a non-deduplicated file.');
			}
			// The server expires rows whose PUT fails.
			await presignedPut(payload.uploadUrl, buffer, contentType, options?.onProgress);
		} else {
			options?.onProgress?.({ loaded: file.size, total: file.size, percentage: 100 });
		}

		const result: SheetsUploadResult = {
			file: { ...payload.file, filename: payload.file.filename ?? file.name },
		};
		if (!cap.download) return result;

		try {
			return { ...result, url: await fetchDownloadUrl(execute, cap.download, payload.fileId) };
		} catch {
			// The upload succeeded. The download URL can be requested again later.
			return result;
		}
	};
}

export { ConstructiveError } from '@constructive-io/data';
