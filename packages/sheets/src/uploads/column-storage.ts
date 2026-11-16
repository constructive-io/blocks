// Everything a file column needs from storage, resolved once per column:
// whether it can upload (and how), and how its previews are signed.
//
// Order of authority:
//   1. A host-injected uploader (`SheetsConfig.executeUpload`) owns uploads.
//   2. Otherwise the storage service's `_meta` names the upload mutation of
//      the column's files table (see `upload-binding.ts`).
//   3. A storage service whose `_meta` names none falls back to shape
//      discovery, and only when it finds exactly one upload mutation.

import { createError, type ColumnModel } from '@constructive-io/data';

import type { SheetsBackendAdapter } from '../adapter/sheets-adapter';
import type { SheetsStorageTransport } from '../context/sheets-context';
import type { SheetsUploadFn } from '../context/sheets-execute';
import {
	discoverSoleUploadCapability,
	fetchMediaDownloadUrls,
	requestDiscoveredUpload,
} from '../context/sheets-upload-discovery';
import { transferFile, withUnfinishedUpload, type FileProjection, type TransferOptions } from '../context/sheets-upload-presigned';
import { downloadUrlSourceOf, fetchDownloadUrls } from './download-urls';
import { planeUpload } from './plane-upload';
import { loadPlaneDetails, loadStorageCatalog } from './storage-catalog';
import { resolveUploadBinding } from './upload-binding';
import { uploadChoicesFor, type ResolvedUploadChoices, type SheetsUploadConfig } from './upload-config';

export interface SendFileOptions extends TransferOptions {
	/** The row the file is for, passed to a host-injected uploader. */
	recordId?: string | number;
}

/** Sends one file to storage and resolves to its projection. */
export type SendFile = (file: File, options?: SendFileOptions) => Promise<FileProjection>;

export type ColumnUploadState =
	| { status: 'ready'; send: SendFile }
	| { status: 'unavailable'; reason: string };

export interface ColumnStorage {
	choices: ResolvedUploadChoices;
	upload: ColumnUploadState;
	/** Resolves download URLs by file id, or null when this column's previews cannot be signed. */
	resolveUrls: ((ids: readonly string[]) => Promise<Map<string, string>>) | null;
	/** Identity of the URL resolver, for batching and caching. */
	previewKey: string | null;
}

export interface ColumnStorageTarget {
	storage: SheetsStorageTransport | undefined;
	adapter: Pick<SheetsBackendAdapter, 'fetchMeta' | 'fetchTableModel' | 'listRows'>;
	/** The data table that holds the column. */
	table: { key: string; name: string };
	column: Pick<ColumnModel, 'name' | 'value'>;
	config: SheetsUploadConfig | undefined;
	databaseId: string | null;
	/** Host-injected uploader, when the host supplies one. */
	executeUpload?: SheetsUploadFn;
}

export const NO_STORAGE_REASON = 'Uploads need a storage endpoint';

const LINK_NEEDS_PUBLIC_REASON = 'This column stores a link to each file, so it needs a public bucket.';

function hostUpload(executeUpload: SheetsUploadFn, target: ColumnStorageTarget): SendFile {
	return async (file, options) => {
		const { file: projection } = await executeUpload(file, undefined, {
			tableName: target.table.name,
			fieldName: target.column.name,
			recordId: options?.recordId,
			onProgress: options?.onProgress,
		});
		return projection;
	};
}

function discoveryStorage(storage: SheetsStorageTransport, choices: ResolvedUploadChoices, databaseId: string | null): ColumnStorage {
	const send: SendFile = async (file, options) => {
		const cap = await discoverSoleUploadCapability(storage);
		if (!cap.hasFileProjection) throw createError.badRequest('The storage service does not return the file details an upload needs.');
		try {
			const payload = await transferFile(file, (input, signal) => requestDiscoveredUpload(storage.execute, cap, {
				...input,
				...(choices.bucketKey ? { bucketKey: choices.bucketKey } : { isPublic: choices.isPublic }),
				...(databaseId ? { databaseId } : {}),
			}, signal), options);
			return payload.file;
		} catch (error) {
			throw withUnfinishedUpload(error, { filesType: cap.download?.fileTypeName ?? null });
		}
	};
	return {
		choices,
		upload: { status: 'ready', send },
		resolveUrls: (ids) => fetchMediaDownloadUrls(storage, () => ids),
		previewKey: `${storage.endpoint}|discovery`,
	};
}

/** Resolve the column's storage. Never throws for a deterministic "cannot": that is an unavailable state. */
export async function loadColumnStorage(target: ColumnStorageTarget): Promise<ColumnStorage> {
	const { storage, adapter, table, column, config, databaseId, executeUpload } = target;
	const choices = uploadChoicesFor(config, table, column.name);
	const file = column.value.file;
	const unavailable = (reason: string, resolveUrls: ColumnStorage['resolveUrls'] = null, previewKey: string | null = null): ColumnStorage =>
		({ choices, upload: { status: 'unavailable', reason }, resolveUrls, previewKey });

	if (file?.kind === 'attachment' && !choices.bucketKey && !choices.isPublic) return unavailable(LINK_NEEDS_PUBLIC_REASON);
	if (!storage) {
		return executeUpload
			? { choices, upload: { status: 'ready', send: hostUpload(executeUpload, target) }, resolveUrls: null, previewKey: null }
			: unavailable(NO_STORAGE_REASON);
	}

	const catalog = await loadStorageCatalog(storage, adapter);
	const binding = resolveUploadBinding(column, catalog, choices);
	if (binding.status === 'discovery') {
		const discovered = discoveryStorage(storage, choices, databaseId);
		return executeUpload ? { ...discovered, upload: { status: 'ready', send: hostUpload(executeUpload, target) } } : discovered;
	}
	if (binding.status === 'unavailable' || catalog.source !== 'meta') {
		// A host uploader decides where the file goes itself; only previews need the binding.
		if (executeUpload) return { choices, upload: { status: 'ready', send: hostUpload(executeUpload, target) }, resolveUrls: null, previewKey: null };
		return unavailable(binding.status === 'unavailable' ? binding.reason : 'Uploads are not enabled for this storage service.');
	}

	const details = await loadPlaneDetails(storage, adapter, catalog, binding.plane);
	const previewKey = `${storage.endpoint}|${details.plane.filesTableKey}`;
	const urlSource = downloadUrlSourceOf(storage, details);
	const resolveUrls = urlSource ? (ids: readonly string[]) => fetchDownloadUrls(urlSource, ids) : null;
	if (executeUpload) return { choices, upload: { status: 'ready', send: hostUpload(executeUpload, target) }, resolveUrls, previewKey };

	const upload = planeUpload(storage, adapter, details, { choices, databaseId });
	if (upload.status === 'unavailable') return unavailable(upload.reason, resolveUrls, previewKey);
	const send: SendFile = async (file, options) => (await upload.send(file, options)).file;
	return { choices, upload: { status: 'ready', send }, resolveUrls, previewKey };
}
