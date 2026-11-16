// Bucket limits checked before an upload, so a file the bucket would refuse is
// refused in the browser with a precise message and no request.
//
// The limits are columns of the storage module's buckets table, read through
// the storage-side table model. The storage module generates these columns
// with fixed names (`key`, `is_public`, `max_file_size`, `allowed_mime_types`;
// the upload mutation reads them by the same names), so they are looked up by
// their API field names. A missing column skips that check; the server still
// enforces every limit, so a skipped check only costs a round trip.
//
// The bucket rows are read once per storage plane and cached. Which row applies:
//   1. the configured bucket key;
//   2. the bucket an earlier upload of this plane and access landed in;
//   3. the only visible bucket with the requested access (the server resolves
//      the default bucket under the caller's visibility, so with one visible
//      candidate it is that one).
// Otherwise nothing is checked before the upload.

import type { ColumnModel, TableModel } from '@constructive-io/data';

import type { SheetsBackendAdapter } from '../adapter/sheets-adapter';
import type { SheetsStorageTransport } from '../context/sheets-context';
import { formatFileSize } from '../utils/file.utils';
import type { PlaneDetails } from './storage-catalog';
import type { ResolvedUploadChoices } from './upload-config';

const BUCKET_COLUMNS = {
	key: 'key',
	isPublic: 'isPublic',
	maxFileSize: 'maxFileSize',
	allowedMimeTypes: 'allowedMimeTypes',
} as const;

/** Most bucket rows read for one plane. */
const BUCKET_PAGE_SIZE = 100;

export interface BucketLimits {
	/** Bucket key, for messages. */
	key: string | null;
	maxFileSize: number | null;
	allowedMimeTypes: readonly string[] | null;
}

interface BucketRow extends BucketLimits {
	id: unknown;
	isPublic: boolean | null;
}

const bucketRows = new WeakMap<SheetsStorageTransport, Map<string, Promise<BucketRow[] | null>>>();
/** Bucket id of the last upload per storage plane and access. */
const landedBuckets = new WeakMap<SheetsStorageTransport, Map<string, unknown>>();

function column(model: TableModel, name: string): ColumnModel | null {
	return model.columns.find((candidate) => candidate.name === name && candidate.readable) ?? null;
}

function numberOf(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
	return null;
}

async function readBucketRows(
	storage: SheetsStorageTransport,
	adapter: Pick<SheetsBackendAdapter, 'listRows'>,
	buckets: TableModel,
): Promise<BucketRow[] | null> {
	const keyField = buckets.primaryKey.length === 1 ? buckets.primaryKey[0]! : null;
	const hasLimits = column(buckets, BUCKET_COLUMNS.maxFileSize) || column(buckets, BUCKET_COLUMNS.allowedMimeTypes);
	if (!keyField || !hasLimits || !buckets.operations.list) return null;
	const { rows } = await adapter.listRows<Record<string, unknown>>(
		{ model: buckets, tableName: buckets.key },
		{ limit: BUCKET_PAGE_SIZE, includeTotalCount: false },
		storage.execute,
	);
	return rows.map((row) => ({
		id: row[keyField],
		key: typeof row[BUCKET_COLUMNS.key] === 'string' ? (row[BUCKET_COLUMNS.key] as string) : null,
		isPublic: typeof row[BUCKET_COLUMNS.isPublic] === 'boolean' ? (row[BUCKET_COLUMNS.isPublic] as boolean) : null,
		maxFileSize: numberOf(row[BUCKET_COLUMNS.maxFileSize]),
		allowedMimeTypes: Array.isArray(row[BUCKET_COLUMNS.allowedMimeTypes])
			? (row[BUCKET_COLUMNS.allowedMimeTypes] as unknown[]).filter((type): type is string => typeof type === 'string')
			: null,
	}));
}

function rowsFor(
	storage: SheetsStorageTransport,
	adapter: Pick<SheetsBackendAdapter, 'listRows'>,
	details: PlaneDetails,
): Promise<BucketRow[] | null> {
	if (!details.buckets) return Promise.resolve(null);
	let byPlane = bucketRows.get(storage);
	if (!byPlane) {
		byPlane = new Map();
		bucketRows.set(storage, byPlane);
	}
	const planeKey = details.plane.filesTableKey;
	const cached = byPlane.get(planeKey);
	if (cached) return cached;
	const request = readBucketRows(storage, adapter, details.buckets).catch((): null => {
		// Unreadable limits skip the pre-check; the next upload tries again.
		byPlane.delete(planeKey);
		return null;
	});
	byPlane.set(planeKey, request);
	return request;
}

function accessKey(details: PlaneDetails, choices: ResolvedUploadChoices): string {
	return `${details.plane.filesTableKey}|${choices.bucketKey ?? (choices.isPublic ? 'public' : 'private')}`;
}

/** Remember which bucket an upload landed in, so the next one is checked against it. */
export function rememberLandedBucket(
	storage: SheetsStorageTransport,
	details: PlaneDetails,
	choices: ResolvedUploadChoices,
	bucketId: unknown,
): void {
	if (bucketId == null) return;
	let byAccess = landedBuckets.get(storage);
	if (!byAccess) {
		byAccess = new Map();
		landedBuckets.set(storage, byAccess);
	}
	byAccess.set(accessKey(details, choices), bucketId);
}

/** The limits of the bucket an upload will land in, or null when that bucket is not known. */
export async function bucketLimitsFor(
	storage: SheetsStorageTransport,
	adapter: Pick<SheetsBackendAdapter, 'listRows'>,
	details: PlaneDetails,
	choices: ResolvedUploadChoices,
	requiresOwner: boolean,
): Promise<BucketLimits | null> {
	const rows = await rowsFor(storage, adapter, details);
	if (!rows) return null;
	if (choices.bucketKey) return rows.find((row) => row.key === choices.bucketKey) ?? null;
	const landed = landedBuckets.get(storage)?.get(accessKey(details, choices));
	if (landed != null) {
		const row = rows.find((candidate) => candidate.id === landed);
		if (row) return row;
	}
	// Owner-scoped buckets repeat per owner, so "the only one" proves nothing there.
	if (requiresOwner) return null;
	const candidates = rows.filter((row) => row.isPublic === choices.isPublic);
	return candidates.length === 1 ? candidates[0]! : null;
}

function typeAllowed(contentType: string, allowed: readonly string[]): boolean {
	return allowed.some((pattern) => {
		if (pattern === '*/*') return true;
		if (pattern.endsWith('/*')) return contentType.startsWith(pattern.slice(0, -1));
		return contentType === pattern;
	});
}

/** Why the bucket would refuse this file, in the server's own terms, or null when it would accept it. */
export function bucketRefusal(file: File, limits: BucketLimits | null): string | null {
	if (!limits) return null;
	if (limits.maxFileSize != null && file.size > limits.maxFileSize) {
		return `"${file.name}" is ${formatFileSize(file.size)}. This bucket accepts files up to ${formatFileSize(limits.maxFileSize)}.`;
	}
	const contentType = file.type || 'application/octet-stream';
	if (limits.allowedMimeTypes && limits.allowedMimeTypes.length > 0 && !typeAllowed(contentType, limits.allowedMimeTypes)) {
		return `"${file.name}" is a ${contentType} file. This bucket accepts ${limits.allowedMimeTypes.join(', ')}.`;
	}
	return null;
}
