// Storage uploads for the model backend.
//
// Serves the upload mutations a files table's model names (`storage.upload`),
// with the server's rules: the bucket is the named one or the public/private
// default, the content hash must be a SHA-256 hex, the bucket's MIME types and
// size limit apply, a live row at the same key is a dedup hit, and a new upload
// creates a files row that list reads see. A write that references a file row
// that is not live fails like the server's file-reference guard: the message is
// the bare code `FILE_REF_FILE_NOT_LIVE`, and `extensions` carry `class: 'public'`
// and `context: { field, file_id, status }`, where `status` is `requested` (the
// confirm job has not run yet) or `rejected` (it refused the bytes; the row never
// becomes live). The PUT to the upload URL is not served: tests mock `fetch`/XHR
// and call `confirmUpload`.
import { GraphQLError } from 'graphql';

import type { TableModel } from '@constructive-io/data';

type Row = Record<string, unknown>;

export interface ModelBackendUploadOptions {
	/** Answer every upload as already stored: no upload URL, the existing file row or a new live one. */
	deduplicated?: boolean;
	/** A new file row stays not live for this many writes that reference it; each of those writes fails. */
	notLiveForWrites?: number;
	/**
	 * The confirm job rejects this upload (its bytes did not match): the new files row is
	 * `rejected`, `confirmUpload` leaves it so, and every write that references it fails.
	 */
	rejectUpload?: (input: Readonly<Row>) => boolean;
	/** Fail an upload request: return a message (and optional code), or null to let it through. */
	failure?: (input: Readonly<Row>) => { message: string; code?: string } | null;
	/** Address of public buckets, for the projection `url`. Default `https://cdn.mock`. */
	publicUrlPrefix?: string;
	/** Address of upload URLs. Default `https://storage.mock/upload`. */
	uploadUrlPrefix?: string;
}

export interface RecordedUpload {
	/** Root mutation field that was called. */
	mutation: string;
	/** GraphQL type name of the files table. */
	filesTable: string;
	/** The per-file input, after defaults from a bulk input. */
	input: Readonly<Row>;
	outcome: 'requested' | 'deduplicated' | 'failed';
	fileId: string | null;
	error: string | null;
	at: number;
}

export interface UploadService {
	/** Every upload request, in order. */
	readonly uploads: RecordedUpload[];
	/** Root resolvers for the upload mutations. `onRequest` records the mutation. */
	rootResolvers(onRequest: (files: TableModel) => void): Record<string, (args: Row) => unknown>;
	/** Throw the server's error when a write references a file row that is not live. */
	assertFileRefsLive(model: TableModel, values: Readonly<Row>): void;
	/** The value of a computed files field (the download URL), or null when the field is not one. */
	resolveField(model: TableModel, row: Row, fieldName: string): { value: unknown } | null;
	/** Mark a file row live, as the confirm step does after the PUT. */
	confirm(fileId: string): void;
}

interface StorageSurface {
	files: TableModel;
	buckets: TableModel | null;
	/** Files field that points at the bucket, and the bucket field it references. */
	bucketLink: { local: string; remote: string } | null;
	mutation: string;
	bulkMutation: string | null;
	downloadUrlField: string | null;
}

const LIVE_STATUSES = new Set(['uploaded', 'processed']);
const UPLOAD_URL_LIFETIME_MS = 15 * 60 * 1000;

function fail(message: string, code: string, extensions: Record<string, unknown> = {}): GraphQLError {
	return new GraphQLError(message, { extensions: { code, ...extensions } });
}

function hexToBase64(hex: string): string {
	let binary = '';
	for (let index = 0; index < hex.length; index += 2) binary += String.fromCharCode(Number.parseInt(hex.slice(index, index + 2), 16));
	return btoa(binary);
}

function mimeAllowed(allowed: unknown, contentType: string): boolean {
	if (!Array.isArray(allowed) || allowed.length === 0) return true;
	return allowed.some((pattern) => {
		if (typeof pattern !== 'string') return false;
		if (pattern === '*/*') return true;
		if (pattern.endsWith('/*')) return contentType.startsWith(pattern.slice(0, -1));
		return contentType === pattern;
	});
}

let fileIds = 0;

function nextFileId(): string {
	fileIds += 1;
	return `00000000-0000-4000-9000-${String(fileIds).padStart(12, '0')}`;
}

function surfacesOf(models: readonly TableModel[]): StorageSurface[] {
	return models.flatMap((files) => {
		const storage = files.storage;
		if (storage?.role !== 'files' || !storage.upload?.mutation) return [];
		const buckets = models.find((candidate) => candidate.name === storage.bucketsType) ?? null;
		const link = files.relations.find(
			(relation) => relation.kind === 'belongsTo' && relation.targetName === storage.bucketsType && relation.keys.length === 1,
		);
		return [{
			files,
			buckets,
			bucketLink: link?.keys[0] ?? null,
			mutation: storage.upload.mutation,
			bulkMutation: storage.upload.bulkMutation,
			downloadUrlField: storage.downloadUrlField,
		}];
	});
}

export function createUploadService(
	models: readonly TableModel[],
	tableRows: (model: TableModel) => Row[],
	options: ModelBackendUploadOptions = {},
	uploads: RecordedUpload[] = [],
): UploadService {
	const surfaces = surfacesOf(models);
	const refusalsLeft = new Map<string, number>();
	const publicUrlPrefix = (options.publicUrlPrefix ?? 'https://cdn.mock').replace(/\/$/, '');
	const uploadUrlPrefix = (options.uploadUrlPrefix ?? 'https://storage.mock/upload').replace(/\/$/, '');

	const fileRow = (fileId: string): { surface: StorageSurface; row: Row } | null => {
		for (const surface of surfaces) {
			const row = tableRows(surface.files).find((candidate) => candidate.id === fileId);
			if (row) return { surface, row };
		}
		return null;
	};

	/** Set a files field only when the files table has it. */
	const assign = (surface: StorageSurface, row: Row, field: string, value: unknown) => {
		if (surface.files.columns.some((column) => column.name === field)) row[field] = value;
	};

	function resolveBucket(surface: StorageSurface, input: Readonly<Row>): Row {
		const buckets = surface.buckets ? tableRows(surface.buckets) : [];
		const bucket = typeof input.bucketKey === 'string'
			? buckets.find((candidate) => candidate.key === input.bucketKey)
			: buckets.find((candidate) => (candidate.isPublic === true) === (input.isPublic === true));
		if (!bucket) throw fail('BUCKET_NOT_FOUND', 'BUCKET_NOT_FOUND');
		return bucket;
	}

	function projection(fileId: string, key: string, bucket: Row, input: Readonly<Row>): Row {
		return {
			id: fileId,
			key,
			bucket_id: bucket.id,
			mime: input.contentType,
			size: input.size,
			...(typeof input.filename === 'string' && input.filename ? { filename: input.filename } : {}),
			...(bucket.isPublic === true ? { url: `${publicUrlPrefix}/${key}` } : {}),
		};
	}

	function uploadOne(surface: StorageSurface, mutation: string, input: Readonly<Row>): Row {
		const entry: RecordedUpload = {
			mutation, filesTable: surface.files.name, input, outcome: 'failed', fileId: null, error: null, at: Date.now(),
		};
		uploads.push(entry);
		try {
			const refused = options.failure?.(input);
			if (refused) throw fail(refused.message, refused.code ?? 'UPLOAD_FAILED');
			const contentHash = String(input.contentHash ?? '');
			const contentType = String(input.contentType ?? '');
			if (!/^[0-9a-f]{64}$/i.test(contentHash)) {
				throw fail('INVALID_CONTENT_HASH_FORMAT: must be a 64-char lowercase hex SHA-256', 'INVALID_CONTENT_HASH_FORMAT');
			}
			const bucket = resolveBucket(surface, input);
			if (!mimeAllowed(bucket.allowedMimeTypes, contentType)) {
				throw fail(`CONTENT_TYPE_NOT_ALLOWED: ${contentType} not in bucket allowed types`, 'CONTENT_TYPE_NOT_ALLOWED');
			}
			const maxFileSize = bucket.maxFileSize == null ? null : Number(bucket.maxFileSize);
			if (maxFileSize && Number(input.size) > maxFileSize) {
				throw fail(`FILE_TOO_LARGE: exceeds bucket max of ${maxFileSize} bytes`, 'FILE_TOO_LARGE');
			}

			const key = typeof input.key === 'string' && input.key ? input.key : contentHash;
			const rows = tableRows(surface.files);
			const link = surface.bucketLink;
			const inBucket = (row: Row) => !link || row[link.local] === bucket[link.remote];
			const existing = rows.find((row) => row.key === key && inBucket(row));
			const live = existing && LIVE_STATUSES.has(String(existing.status));

			if (live || options.deduplicated) {
				const fileId = existing && live ? String(existing.id) : createRow(surface, bucket, key, input, 'uploaded');
				Object.assign(entry, { outcome: 'deduplicated', fileId });
				return {
					uploadUrl: null, uploadHeaders: null, fileId, key, deduplicated: true, expiresAt: null,
					file: projection(fileId, key, bucket, input),
				};
			}
			// A row whose bytes never landed is dropped, and the upload starts again.
			if (existing) rows.splice(rows.indexOf(existing), 1);
			const rejected = options.rejectUpload?.(input) ?? false;
			const refusals = rejected ? 0 : options.notLiveForWrites ?? 0;
			const fileId = createRow(surface, bucket, key, input, rejected ? 'rejected' : refusals > 0 ? 'requested' : 'uploaded');
			if (refusals > 0) refusalsLeft.set(fileId, refusals);
			Object.assign(entry, { outcome: 'requested', fileId });
			return {
				uploadUrl: `${uploadUrlPrefix}/${fileId}`,
				uploadHeaders: {
					'Content-Type': contentType,
					'x-amz-checksum-sha256': hexToBase64(contentHash),
					'x-amz-meta-upload-id': fileId,
				},
				fileId,
				key,
				deduplicated: false,
				expiresAt: new Date(Date.now() + UPLOAD_URL_LIFETIME_MS).toISOString(),
				file: projection(fileId, key, bucket, input),
			};
		} catch (error) {
			entry.error = error instanceof Error ? error.message : String(error);
			throw error;
		}
	}

	function createRow(surface: StorageSurface, bucket: Row, key: string, input: Readonly<Row>, status: string): string {
		const fileId = nextFileId();
		const now = new Date().toISOString();
		const row: Row = {};
		for (const column of surface.files.columns) row[column.name] = null;
		assign(surface, row, 'id', fileId);
		if (surface.bucketLink) row[surface.bucketLink.local] = bucket[surface.bucketLink.remote];
		assign(surface, row, 'key', key);
		assign(surface, row, 'contentHash', input.contentHash);
		assign(surface, row, 'mimeType', input.contentType);
		assign(surface, row, 'size', String(input.size));
		assign(surface, row, 'filename', input.filename ?? null);
		assign(surface, row, 'isPublic', bucket.isPublic === true);
		assign(surface, row, 'status', status);
		assign(surface, row, 'createdAt', now);
		assign(surface, row, 'updatedAt', now);
		tableRows(surface.files).push(row);
		return fileId;
	}

	return {
		uploads,
		rootResolvers(onRequest) {
			const root: Record<string, (args: Row) => unknown> = {};
			for (const surface of surfaces) {
				root[surface.mutation] = (args) => {
					onRequest(surface.files);
					return uploadOne(surface, surface.mutation, (args.input ?? {}) as Row);
				};
				if (surface.bulkMutation) {
					const bulk = surface.bulkMutation;
					root[bulk] = (args) => {
						onRequest(surface.files);
						const { files = [], ...shared } = (args.input ?? {}) as Row & { files?: Row[] };
						return { files: files.map((file) => uploadOne(surface, bulk, { ...shared, ...file })) };
					};
				}
			}
			return root;
		},
		assertFileRefsLive(model, values) {
			for (const column of model.columns) {
				if (!column.value.file || column.value.file.kind === 'attachment') continue;
				const value = values[column.name];
				const references = (Array.isArray(value) ? value : [value]).filter(
					(entry): entry is { id: string } => Boolean(entry) && typeof (entry as Row).id === 'string',
				);
				for (const { id } of references) {
					const found = fileRow(id);
					if (!found || LIVE_STATUSES.has(String(found.row.status))) continue;
					const status = String(found.row.status);
					const left = refusalsLeft.get(id) ?? 0;
					if (left > 0) {
						refusalsLeft.set(id, left - 1);
						// The confirm step catches up after the configured number of refused writes.
						if (left === 1) found.row.status = 'uploaded';
					}
					throw fail('FILE_REF_FILE_NOT_LIVE', 'FILE_REF_FILE_NOT_LIVE', {
						class: 'public',
						context: { field: column.name, file_id: id, status },
					});
				}
			}
		},
		resolveField(model, row, fieldName) {
			const surface = surfaces.find((candidate) => candidate.files.key === model.key);
			if (!surface || fieldName !== surface.downloadUrlField) return null;
			return { value: LIVE_STATUSES.has(String(row.status)) ? `https://storage.mock/download/${String(row.key)}` : null };
		},
		confirm(fileId) {
			const found = fileRow(fileId);
			// A rejected upload stays rejected: the job refused its bytes.
			if (found && found.row.status !== 'rejected') found.row.status = 'uploaded';
			refusalsLeft.delete(fileId);
		},
	};
}
