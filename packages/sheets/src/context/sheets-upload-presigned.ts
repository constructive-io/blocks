/**
 * The presigned upload protocol, shared by every upload path.
 *
 *   1. Hash the file (SHA-256, Web Crypto). The server needs the hash before it
 *      issues the URL: it names the object and is signed into the PUT.
 *   2. Ask the upload mutation for a presigned PUT URL. A `deduplicated` answer
 *      means the bytes are already stored: no PUT.
 *   3. PUT the bytes with the payload's `uploadHeaders`, unchanged (the URL is
 *      signed over them: Content-Type, the checksum, the file row id). No
 *      Authorization header; the signature is in the URL.
 *   4. An expired URL is requested again once.
 *
 * The server confirms the PUT later (a background job) and expires rows that
 * never received one, so a cancelled or failed PUT leaves nothing behind.
 *
 * The model-driven path (`uploads/`) names the upload mutation from the storage
 * service's `_meta`. The shape discovery in `sheets-upload-discovery.ts` is the
 * FALLBACK for a storage service whose `_meta` names no upload mutation.
 */

import { createError } from '@constructive-io/data';

// ============================================================================
// Upload payload
// ============================================================================

/**
 * The file projection the upload mutation returns: what an image or upload
 * column stores. The server may add keys (image `versions`); they are kept as returned.
 */
export interface FileProjection {
	id: string;
	key: string;
	bucket_id?: string;
	mime?: string;
	size?: number;
	filename?: string;
	/** Durable public URL; set only for a public bucket. */
	url?: string;
}

/** The upload mutation's answer, normalized. */
export interface UploadPayload {
	uploadUrl: string | null;
	/** Headers the PUT must send unchanged, or null on a server that does not return them. */
	uploadHeaders: Record<string, string> | null;
	fileId: string;
	key: string;
	deduplicated: boolean;
	/** When the upload URL expires (ISO time), or null. */
	expiresAt: string | null;
	file: FileProjection;
}

/** Payload fields the client selects when the payload type has them. */
export const UPLOAD_PAYLOAD_FIELDS = ['uploadUrl', 'uploadHeaders', 'fileId', 'key', 'deduplicated', 'expiresAt', 'file'] as const;

function headersOf(value: unknown): Record<string, string> | null {
	let parsed = value;
	if (typeof parsed === 'string') {
		try {
			parsed = JSON.parse(parsed) as unknown;
		} catch {
			return null;
		}
	}
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
	const entries = Object.entries(parsed as Record<string, unknown>);
	if (!entries.every(([, header]) => typeof header === 'string')) return null;
	return Object.fromEntries(entries) as Record<string, string>;
}

function projectionOf(value: unknown): FileProjection | null {
	let parsed = value;
	if (typeof parsed === 'string') {
		try {
			parsed = JSON.parse(parsed) as unknown;
		} catch {
			return null;
		}
	}
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
	const projection = parsed as Record<string, unknown>;
	return isFileProjection(projection) ? projection : null;
}

/** A projection names its file by `id` and `key`; the server may add more keys, which are kept. */
function isFileProjection(value: Record<string, unknown>): value is Record<string, unknown> & FileProjection {
	return typeof value.id === 'string' && typeof value.key === 'string';
}

// ============================================================================
// Unfinished uploads: the file row an upload left behind
// ============================================================================

/**
 * The file row the storage service created for an upload that did not finish
 * (a refused or blocked PUT, a cancel, an answer without an upload URL). Sheets
 * never deletes it: the storage service expires a row that never received its
 * bytes. A host with its own cleanup rule reads it from the error.
 */
export interface UnfinishedUpload {
	/** Id of the files table row. */
	fileId: string;
	/** GraphQL type name of the files table, or null when the upload path does not know it. */
	filesType: string | null;
	/** `TableModel.key` of the files table, or null when the upload path does not know it. */
	filesTableKey: string | null;
}

const UNFINISHED_UPLOAD = 'unfinishedUpload';

/** The file row an upload error left on the storage service, or null when the server issued none. */
export function unfinishedUploadOf(error: unknown): UnfinishedUpload | null {
	const value = error && typeof error === 'object' ? (error as Record<string, unknown>)[UNFINISHED_UPLOAD] : null;
	return value && typeof value === 'object' ? (value as UnfinishedUpload) : null;
}

/**
 * Record on `error` the file row its upload left. An id already recorded is kept
 * (it is the newest one); a files table is filled in when the error has none. An
 * error without a file id is returned unchanged.
 */
export function withUnfinishedUpload(error: unknown, upload: Partial<UnfinishedUpload>): unknown {
	if (!error || typeof error !== 'object') return error;
	const recorded = unfinishedUploadOf(error);
	const fileId = recorded?.fileId ?? upload.fileId;
	if (!fileId) return error;
	const value: UnfinishedUpload = {
		fileId,
		filesType: recorded?.filesType ?? upload.filesType ?? null,
		filesTableKey: recorded?.filesTableKey ?? upload.filesTableKey ?? null,
	};
	Object.defineProperty(error, UNFINISHED_UPLOAD, { value, enumerable: false, configurable: true, writable: true });
	return error;
}

/** Normalize a raw upload payload. Throws when it cannot be used. */
export function readUploadPayload(raw: unknown): UploadPayload {
	if (!raw || typeof raw !== 'object') {
		throw createError.badRequest('Upload failed: the storage service returned no answer.');
	}
	const payload = raw as Record<string, unknown>;
	const file = projectionOf(payload.file);
	if (!file) {
		throw createError.badRequest('Upload failed: the server returned an invalid file projection.');
	}
	const deduplicated = payload.deduplicated === true;
	const uploadUrl = typeof payload.uploadUrl === 'string' && payload.uploadUrl ? payload.uploadUrl : null;
	if (!deduplicated && !uploadUrl) {
		// The server created the row; it is left to expire, and the error names it.
		throw withUnfinishedUpload(createError.badRequest('Upload failed: the server returned no uploadUrl for a new file.'), {
			fileId: typeof payload.fileId === 'string' ? payload.fileId : file.id,
		});
	}
	return {
		uploadUrl,
		uploadHeaders: headersOf(payload.uploadHeaders),
		fileId: typeof payload.fileId === 'string' ? payload.fileId : file.id,
		key: typeof payload.key === 'string' ? payload.key : file.key,
		deduplicated,
		expiresAt: typeof payload.expiresAt === 'string' ? payload.expiresAt : null,
		file,
	};
}

// ============================================================================
// SHA-256 (Web Crypto)
// ============================================================================

/**
 * Largest file the browser hashes. Web Crypto has no streaming digest, so the
 * whole file is read into memory once to hash it (the digest may copy it once
 * more). The PUT then sends the `File` itself, which the browser streams from
 * disk, so no second copy is kept for the upload. A streaming digest would need
 * a JavaScript SHA-256 implementation; until one is worth a dependency, files
 * above this size are refused with a clear message.
 */
export const MAX_HASHED_FILE_BYTES = 512 * 1024 * 1024;

function hex(digest: ArrayBuffer): string {
	const bytes = new Uint8Array(digest);
	let out = '';
	for (let i = 0; i < bytes.length; i++) out += bytes[i]!.toString(16).padStart(2, '0');
	return out;
}

function requireSubtle(): SubtleCrypto {
	if (!globalThis.crypto?.subtle) {
		throw createError.badRequest('This browser cannot hash files (Web Crypto is unavailable), so it cannot upload them.');
	}
	return globalThis.crypto.subtle;
}

/** Lowercase hex SHA-256 of an already-read buffer (64 chars, as the server expects). */
export async function sha256HexFromBuffer(buffer: ArrayBuffer): Promise<string> {
	return hex(await requireSubtle().digest('SHA-256', buffer));
}

/** The bytes of a blob. `Blob.arrayBuffer` where the browser has it, else a FileReader. */
function readBytes(file: Blob): Promise<ArrayBuffer> {
	if (typeof file.arrayBuffer === 'function') return file.arrayBuffer();
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as ArrayBuffer);
		reader.onerror = () => reject(reader.error ?? new Error('The file could not be read.'));
		reader.readAsArrayBuffer(file);
	});
}

/** Lowercase hex SHA-256 of a file. Refuses files above {@link MAX_HASHED_FILE_BYTES}. */
export async function sha256HexOfFile(file: Blob): Promise<string> {
	if (file.size > MAX_HASHED_FILE_BYTES) {
		throw createError.badRequest(
			`This file is too large to upload from the browser (the limit is ${MAX_HASHED_FILE_BYTES / (1024 * 1024)} MB).`,
		);
	}
	const subtle = requireSubtle();
	return hex(await subtle.digest('SHA-256', await readBytes(file)));
}

// ============================================================================
// Presigned PUT
// ============================================================================

/** Header a checksum-bound presigned PUT carries (base64 of the raw digest). */
export const CHECKSUM_SHA256_HEADER = 'x-amz-checksum-sha256';
/** Header a row-bound presigned PUT carries (the file row id). */
export const UPLOAD_ID_HEADER = 'x-amz-meta-upload-id';

/** Hex SHA-256 to base64 of the raw digest, the encoding `x-amz-checksum-sha256` carries. */
export function sha256HexToBase64(contentHash: string): string {
	const pairs = contentHash.match(/.{2}/g) ?? [];
	let binary = '';
	for (const pair of pairs) binary += String.fromCharCode(parseInt(pair, 16));
	return btoa(binary);
}

/**
 * Headers for a server that signs the checksum and the row id but does not
 * return `uploadHeaders` yet. A current server returns them, and they are sent
 * as returned.
 */
export function fallbackPutHeaders(contentType: string, contentHash?: string, uploadId?: string): Record<string, string> {
	return {
		'Content-Type': contentType,
		...(contentHash ? { [CHECKSUM_SHA256_HEADER]: sha256HexToBase64(contentHash) } : {}),
		...(uploadId ? { [UPLOAD_ID_HEADER]: uploadId } : {}),
	};
}

/**
 * A PUT the browser could not complete. The API answered moments ago, so the
 * usual cause is the bucket's CORS rule (no allowed origin for this site);
 * browsers do not say which. The words are for the person uploading; the code
 * `STORAGE_UPLOAD_BLOCKED` is for hosts and logs.
 */
export const STORAGE_UPLOAD_BLOCKED_MESSAGE =
	"Upload failed: file storage didn't accept uploads from this site, or the connection dropped. If it keeps failing, ask an admin to allow this site in the storage settings.";

const PUT_RESPONSE = 'putResponse';

/** The storage server answered the PUT with an error status. The response is kept on the error. */
function putRejected(status: number, statusText: string, body: string) {
	const error = createError.badRequest(`Upload failed: ${status} ${statusText}${body ? ` — ${body}` : ''}`);
	Object.defineProperty(error, PUT_RESPONSE, { value: { status, body }, enumerable: false });
	return error;
}

/** The status and body of a rejected PUT, or null for any other error. */
export function putResponseOf(error: unknown): { status: number; body: string } | null {
	const response = error && typeof error === 'object' ? (error as Record<string, unknown>)[PUT_RESPONSE] : null;
	return response && typeof response === 'object' ? (response as { status: number; body: string }) : null;
}

export interface UploadProgressEvent {
	loaded: number;
	total: number;
	percentage: number;
}

export interface PutFileOptions {
	headers: Record<string, string>;
	onProgress?: (progress: UploadProgressEvent) => void;
	signal?: AbortSignal;
}

function abortError(): Error {
	return typeof DOMException === 'function'
		? new DOMException('The upload was cancelled.', 'AbortError')
		: Object.assign(new Error('The upload was cancelled.'), { name: 'AbortError' });
}

/** True for the error a cancelled upload rejects with. */
export function isAbortError(error: unknown): boolean {
	return Boolean(error && typeof error === 'object' && (error as { name?: unknown }).name === 'AbortError');
}

function blockedError() {
	return createError.graphql(STORAGE_UPLOAD_BLOCKED_MESSAGE, 'STORAGE_UPLOAD_BLOCKED');
}

function putWithXhr(url: string, body: Blob | ArrayBuffer, options: PutFileOptions, total: number): Promise<void> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		const onAbort = () => xhr.abort();
		const done = () => options.signal?.removeEventListener('abort', onAbort);
		xhr.open('PUT', url);
		for (const [name, value] of Object.entries(options.headers)) xhr.setRequestHeader(name, value);
		xhr.upload.addEventListener('progress', (event) => {
			if (!event.lengthComputable || event.total === 0) return;
			options.onProgress?.({ loaded: event.loaded, total: event.total, percentage: Math.round((event.loaded / event.total) * 100) });
		});
		xhr.addEventListener('load', () => {
			done();
			if (xhr.status >= 200 && xhr.status < 300) {
				options.onProgress?.({ loaded: total, total, percentage: 100 });
				resolve();
			} else {
				reject(putRejected(xhr.status, xhr.statusText, xhr.responseText ?? ''));
			}
		});
		xhr.addEventListener('error', () => {
			done();
			reject(blockedError());
		});
		xhr.addEventListener('abort', () => {
			done();
			reject(abortError());
		});
		options.signal?.addEventListener('abort', onAbort, { once: true });
		xhr.send(body);
	});
}

/** PUT bytes to a presigned URL with exactly the given headers. Uses XHR when progress is wanted and XHR exists. */
export async function putFile(url: string, body: Blob | ArrayBuffer, options: PutFileOptions): Promise<void> {
	if (options.signal?.aborted) throw abortError();
	const total = body instanceof ArrayBuffer ? body.byteLength : body.size;
	if (options.onProgress && typeof XMLHttpRequest !== 'undefined') {
		await putWithXhr(url, body, options, total);
		return;
	}
	let response: Response;
	try {
		response = await fetch(url, {
			method: 'PUT',
			headers: options.headers,
			body,
			...(options.signal ? { signal: options.signal } : {}),
		});
	} catch (error) {
		if (isAbortError(error)) throw abortError();
		throw blockedError();
	}
	if (!response.ok) {
		throw putRejected(response.status, response.statusText, await response.text().catch(() => ''));
	}
	options.onProgress?.({ loaded: total, total, percentage: 100 });
}

/**
 * PUT an already-read buffer. Kept for callers of the earlier API; new code
 * uses {@link putFile} with the payload's `uploadHeaders`.
 */
export async function presignedPut(
	url: string,
	buffer: ArrayBuffer,
	contentType: string,
	onProgress?: (progress: UploadProgressEvent) => void,
	contentHash?: string,
	uploadId?: string,
): Promise<void> {
	await putFile(url, buffer, { headers: fallbackPutHeaders(contentType, contentHash, uploadId), onProgress });
}

// ============================================================================
// Transfer: hash, request, PUT, one renewal of an expired URL
// ============================================================================

export interface UploadRequestInput {
	contentHash: string;
	contentType: string;
	size: number;
	filename: string;
}

/** Sends the upload mutation for one file. The signal aborts the request when the user cancels. */
export type UploadRequester = (input: UploadRequestInput, signal?: AbortSignal) => Promise<UploadPayload>;

function isExpired(payload: UploadPayload, now = Date.now()): boolean {
	if (!payload.expiresAt) return false;
	const expiry = Date.parse(payload.expiresAt);
	return Number.isFinite(expiry) && expiry <= now;
}

/** S3 answers an expired presigned URL with 403 ("Request has expired"). */
function looksExpired(error: unknown, payload: UploadPayload): boolean {
	const response = putResponseOf(error);
	if (response?.status !== 403) return false;
	return isExpired(payload) || /expired/i.test(response.body);
}

export interface TransferOptions {
	onProgress?: (progress: UploadProgressEvent) => void;
	signal?: AbortSignal;
}

/**
 * Upload one file through a requester: hash, request, PUT with the returned
 * headers. A URL that expired before or during the PUT is requested again once.
 * Any error after the server issued a file id carries it (`unfinishedUploadOf`);
 * the row itself is left for the storage service to expire.
 */
export async function transferFile(file: File, request: UploadRequester, options: TransferOptions = {}): Promise<UploadPayload> {
	const contentType = file.type || 'application/octet-stream';
	const contentHash = await sha256HexOfFile(file);
	if (options.signal?.aborted) throw abortError();
	const input: UploadRequestInput = { contentHash, contentType, size: file.size, filename: file.name };

	let payload = await request(input, options.signal);
	// From here on the server has issued a file id: the newest `payload` names it.
	const putOrRenew = async (): Promise<UploadPayload> => {
		for (let renewals = 0; ; renewals += 1) {
			if (payload.deduplicated) {
				options.onProgress?.({ loaded: file.size, total: file.size, percentage: 100 });
				return payload;
			}
			if (options.signal?.aborted) throw abortError();
			if (isExpired(payload) && renewals === 0) {
				payload = await request(input, options.signal);
				continue;
			}
			try {
				await putFile(payload.uploadUrl!, file, {
					headers: payload.uploadHeaders ?? fallbackPutHeaders(contentType, contentHash, payload.fileId),
					onProgress: options.onProgress,
					signal: options.signal,
				});
				return payload;
			} catch (error) {
				if (renewals > 0 || !looksExpired(error, payload)) throw error;
				payload = await request(input, options.signal);
			}
		}
	};
	try {
		return await putOrRenew();
	} catch (error) {
		throw withUnfinishedUpload(error, { fileId: payload.fileId });
	}
}

// ============================================================================
// The fallback discovery, re-exported for callers of the earlier API
// ============================================================================

export {
	__resetUploadCapabilityCache,
	callUploadOp,
	createPresignedSheetsUpload,
	discoverSoleUploadCapability,
	discoverUploadCapability,
	fetchDownloadUrl,
	fetchMediaDownloadUrls,
	requestDiscoveredUpload,
	resolveDownloadUrl,
	resolveUploadCapability,
} from './sheets-upload-discovery';
export type { IntrospectionSchema, LegacyUploadPayload, UploadCapability } from './sheets-upload-discovery';
