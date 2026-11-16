import type { DocumentNode } from 'graphql';
import { print } from 'graphql';

import { ConstructiveError, createError, isAuthenticationCode, parseGraphQLError, TypedDocumentString } from '@constructive-io/data';

import type { SheetsConfig, SheetsStorageTransport } from './sheets-context';
import { createPresignedSheetsUpload } from './sheets-upload-presigned';

// The presigned uploader lives with the upload protocol; it stays importable from here.
export { createPresignedSheetsUpload };

// ============================================================================
// Types
// ============================================================================

type ExecutableDocument = TypedDocumentString<any, any> | DocumentNode | string | unknown;

/** Per-request options. An executor that does not support one ignores it. */
export interface SheetsExecuteOptions {
	/** Aborts the request, for example when the filter or sort it was for has changed. */
	signal?: AbortSignal;
}

export type SheetsExecuteFn = <T = unknown>(
	document: ExecutableDocument,
	variables?: Record<string, unknown>,
	options?: SheetsExecuteOptions,
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

/** One error of a GraphQL response. */
export interface SheetsResponseError {
	message: string;
	path?: ReadonlyArray<string | number>;
	extensions?: { code?: string; context?: Record<string, unknown> };
}

interface GraphQLResponse {
	data?: unknown;
	errors?: SheetsResponseError[];
}

/** The data a response carried beside its errors. */
export interface SheetsPartialResult {
	data: unknown;
	errors: readonly SheetsResponseError[];
}

const PARTIAL_RESULT = 'partialResult';
const RESPONSE_ERRORS = 'responseErrors';

/**
 * Keep a response's errors, and its data when it has some, on the error thrown
 * for it. Every error of the response stays readable (`responseErrorsOf`), and
 * a read whose rows came back with field errors (a float NaN cell) can keep
 * the rows (`partialResultOf`). Callers that only look at the thrown error see
 * it as before.
 */
export function withResponseErrors<E extends Error>(error: E, data: unknown, errors: readonly SheetsResponseError[]): E {
	Object.defineProperty(error, RESPONSE_ERRORS, { value: errors, enumerable: false, configurable: true });
	if (data != null) {
		Object.defineProperty(error, PARTIAL_RESULT, {
			value: { data, errors } satisfies SheetsPartialResult,
			enumerable: false,
			configurable: true,
		});
	}
	return error;
}

/** Every error of the response an error was thrown for, or null when it did not come from a GraphQL response. */
export function responseErrorsOf(error: unknown): readonly SheetsResponseError[] | null {
	const errors = error && typeof error === 'object' ? (error as Record<string, unknown>)[RESPONSE_ERRORS] : null;
	return Array.isArray(errors) ? (errors as SheetsResponseError[]) : null;
}

/** The data an error's response carried, or null. */
export function partialResultOf(error: unknown): SheetsPartialResult | null {
	const partial = error && typeof error === 'object' ? (error as Record<string, unknown>)[PARTIAL_RESULT] : null;
	return partial && typeof partial === 'object' ? (partial as SheetsPartialResult) : null;
}

function parseGraphQLResponse(response: GraphQLResponse, onAuthError?: () => void): ConstructiveError | null {
	if (!response.errors?.length) return null;

	// Only an explicit code (the shared list in @constructive-io/data) means the session is
	// gone. A permission error that mentions "unauthorized" in its text must not log the user out.
	if (response.errors.some((candidate) => isAuthenticationCode(candidate.extensions?.code))) {
		onAuthError?.();
		return createError.unauthorized('Authentication required. Please log in again.');
	}

	const error = response.errors[0];
	const code = error.extensions?.code;
	const message = error.message || 'GraphQL query failed';

	// A suspended database keeps its `context.reason` (billing or admin) for the paused screen.
	if (code === 'ACCESS_SUSPENDED') return parseGraphQLError(error);

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
		options?: SheetsExecuteOptions,
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
				...(options?.signal ? { signal: options.signal } : {}),
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
				const body = (await response.json().catch((): null => null)) as GraphQLResponse | null;
				const refusal = body?.errors?.[0];
				const forbidden = refusal?.extensions?.code === 'ACCESS_SUSPENDED'
					? parseGraphQLError(refusal)
					: createError.forbidden('You do not have permission to perform this action.');
				throw body?.errors?.length ? withResponseErrors(forbidden, null, body.errors) : forbidden;
			}
			if (status === 404) {
				throw createError.notFound('The requested endpoint does not exist.');
			}
			try {
				const body = (await response.json()) as GraphQLResponse;
				if (body.errors?.length) {
					throw withResponseErrors(
						createError.graphql(body.errors[0]!.message || `Request failed: ${status}`, body.errors[0]!.extensions?.code),
						null,
						body.errors,
					);
				}
			} catch (e) {
				if (e instanceof ConstructiveError) throw e;
			}
			throw createError.badRequest(`Request failed: ${status} ${statusText}`);
		}

		const result: GraphQLResponse = await response.json();
		const graphqlError = parseGraphQLResponse(result, config.onAuthError);
		if (graphqlError) {
			// A lost session or a suspended database never hands back partial rows.
			const keepsData = !['UNAUTHENTICATED', 'ACCESS_SUSPENDED'].includes(graphqlError.code);
			throw withResponseErrors(graphqlError, keepsData ? result.data : null, result.errors ?? []);
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

export { ConstructiveError } from '@constructive-io/data';
