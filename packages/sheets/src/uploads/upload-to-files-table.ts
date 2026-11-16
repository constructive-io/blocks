// Upload one file into a files table of the storage service, outside any cell:
// for a host screen that stores a file somewhere other than a grid column (an
// entity's attachment, a record created around an uploaded file).
//
// The same path as a file column: the upload mutation is the one the storage
// service's `_meta` names for that files table, its input and payload fields
// come from the storage schema, the bucket's limits are checked first, the PUT
// sends the returned `uploadHeaders` unchanged, and bytes the service already
// holds are not sent again.

import { createError, type TableModel } from '@constructive-io/data';

import { createPostGraphileAdapter } from '../adapter/postgraphile-adapter';
import type { SheetsBackendAdapter } from '../adapter/sheets-adapter';
import type { SheetsStorageTransport } from '../context/sheets-context';
import type { FileProjection, UploadProgressEvent } from '../context/sheets-upload-presigned';
import { planeUpload } from './plane-upload';
import { loadPlaneDetails, loadStorageCatalog, type StoragePlane } from './storage-catalog';

export interface UploadToFilesTableOptions {
	/**
	 * The storage service: its GraphQL endpoint and an executor bound to it. Pass the
	 * same object on every call; the storage catalog and schema lookups are cached on it.
	 */
	storage: SheetsStorageTransport;
	/** The files table: its `TableModel.key`, its GraphQL type name, or its model. */
	filesTable: string | Pick<TableModel, 'key' | 'name'>;
	file: File;
	/** Owner of the file, for a files table whose uploads need one. Sent only when the mutation takes `ownerId`. */
	ownerId?: string;
	/** Bucket to upload into. Sent only when the mutation takes `bucketKey`. */
	bucketKey?: string;
	/** Without a bucket key, the public (true, the default) or private default bucket. Sent only when the mutation takes `isPublic`. */
	isPublic?: boolean;
	/** Sent only when the mutation takes `databaseId`. */
	databaseId?: string;
	/** Cancels the request and the PUT. The promise then rejects with an `AbortError`. */
	signal?: AbortSignal;
	onProgress?: (progress: UploadProgressEvent) => void;
	/** Reads `_meta`, table models and bucket rows. Default: the built-in adapter. */
	adapter?: Pick<SheetsBackendAdapter, 'fetchMeta' | 'fetchTableModel' | 'listRows'>;
}

export interface UploadedFile {
	/** Id of the files table row. */
	fileId: string;
	/** The stored file as the storage service returned it: the value a file column stores. */
	file: FileProjection;
	/** True when the service already held these bytes; no PUT was sent and `file` is the existing file. */
	deduplicated: boolean;
}

const defaultAdapter = createPostGraphileAdapter();

function matchesPlane(plane: StoragePlane, filesTable: UploadToFilesTableOptions['filesTable']): boolean {
	if (typeof filesTable === 'string') return plane.filesTableKey === filesTable || plane.filesType === filesTable;
	return plane.filesTableKey === filesTable.key;
}

function tableLabel(filesTable: UploadToFilesTableOptions['filesTable']): string {
	return typeof filesTable === 'string' ? filesTable : filesTable.name;
}

/**
 * Upload `file` into `filesTable` and return the stored file and its id. Rejects
 * with the reason when the storage service does not offer uploads for that
 * table, when a required input (an owner id) is missing, when the bucket would
 * refuse the file, or when the request or the PUT fails.
 */
export async function uploadToFilesTable(options: UploadToFilesTableOptions): Promise<UploadedFile> {
	const { storage, filesTable, file, signal, onProgress } = options;
	const adapter = options.adapter ?? defaultAdapter;
	const catalog = await loadStorageCatalog(storage, adapter);
	if (catalog.source !== 'meta') {
		throw createError.badRequest('This storage service does not say which mutation uploads its files, so the file cannot be uploaded.');
	}
	const plane = catalog.planes.find((candidate) => matchesPlane(candidate, filesTable));
	if (!plane) {
		throw createError.badRequest(`"${tableLabel(filesTable)}" is not a files table of this storage service.`);
	}
	const details = await loadPlaneDetails(storage, adapter, catalog, plane);
	const upload = planeUpload(storage, adapter, details, {
		choices: {
			filesType: plane.filesType,
			bucketKey: options.bucketKey ?? null,
			isPublic: options.isPublic ?? true,
			ownerId: options.ownerId ?? null,
		},
		databaseId: options.databaseId ?? null,
	});
	if (upload.status === 'unavailable') throw createError.badRequest(upload.reason);
	const payload = await upload.send(file, { signal, onProgress });
	return { fileId: payload.fileId, file: payload.file, deduplicated: payload.deduplicated };
}
