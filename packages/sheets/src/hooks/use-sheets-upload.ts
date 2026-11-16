// React bindings for file columns: where a column uploads to (and why it
// cannot), and the cell write that waits out the server's file confirmation.
//
// The logic lives in `uploads/`; this file only wires it to the provider
// (storage transport, adapter, host upload config, query cache).

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ColumnModel, TableModel } from '@constructive-io/data';

import type { SheetsBackendAdapter } from '../adapter/sheets-adapter';
import { useSheetsAdapter } from '../adapter/use-sheets-adapter';
import { useSheetsContext, type SheetsStorageTransport } from '../context/sheets-context';
import type { SheetsExecuteFn } from '../context/sheets-execute';
import { isAbortError, type FileProjection, type UploadProgressEvent } from '../context/sheets-upload-presigned';
import { sheetsIdentifierToRowKey, type SheetsRowIdentifier } from '../row-identity';
import { loadColumnStorage, type ColumnStorage, type SendFile } from '../uploads/column-storage';
import { FILE_NOT_LIVE_CODE, fileWriteMessage, writeFileCell } from '../uploads/file-cell-write';
import { pendingWriteKey, setPendingFileWrite } from '../uploads/pending-file-writes';
import { processingPolicyOf, type ProcessingPolicy } from '../uploads/upload-config';
import { sheetsMutationKeys, sheetsQueryKeys } from './query-keys';
import { useTableModel } from './use-table-model';
import type { MediaUrlResolver } from './use-sheets-media-url';

export type UploadProgress = UploadProgressEvent;

/** The value a file cell stores after a write: a projection, a link, a list, or null. */
export type UploadResponse = unknown;

// ============================================================================
// Cell values
// ============================================================================

const LINK_WITHOUT_PUBLIC_URL =
	'This column stores a link to each file, so it needs a public bucket. The file was stored without a public address.';

/** The row key of a row, read with the table model's primary key; null when a key field is missing. */
export function rowKeyOfRow(table: TableModel, row: Readonly<Record<string, unknown>>): SheetsRowIdentifier | null {
	if (table.primaryKey.length === 0) return null;
	const values = table.primaryKey.map((field) => row[field]);
	if (values.some((value) => value === undefined || value === null)) return null;
	if (table.primaryKey.length === 1) {
		const [value] = values;
		return typeof value === 'string' || typeof value === 'number' ? value : null;
	}
	return Object.fromEntries(table.primaryKey.map((field, index) => [field, values[index]])) as SheetsRowIdentifier;
}

/** The element a column stores for one uploaded file. Throws when the column cannot hold it. */
export function cellElementFor(column: Pick<ColumnModel, 'value'>, projection: FileProjection, file?: File): unknown {
	if (column.value.file?.kind === 'attachment') {
		if (!projection.url) throw new Error(LINK_WITHOUT_PUBLIC_URL);
		return projection.url;
	}
	return projection.filename || !file ? projection : { ...projection, filename: file.name };
}

// ============================================================================
// Column storage
// ============================================================================

const transportIds = new WeakMap<SheetsStorageTransport, number>();
let nextTransportId = 1;

function transportId(storage: SheetsStorageTransport | undefined): number {
	if (!storage) return 0;
	let id = transportIds.get(storage);
	if (id === undefined) {
		id = nextTransportId;
		nextTransportId += 1;
		transportIds.set(storage, id);
	}
	return id;
}

export interface UseColumnStorageResult {
	storage: ColumnStorage | null;
	isLoading: boolean;
	error: Error | null;
}

/** Where a file column uploads to and how its previews are signed. Resolved once per column. */
export function useColumnStorage(table: TableModel | null | undefined, column: ColumnModel | null | undefined): UseColumnStorageResult {
	const { storage, scopeKey, config, executeUpload } = useSheetsContext();
	const adapter = useSheetsAdapter();
	const injected = config.executeUpload ? executeUpload : undefined;
	const enabled = Boolean(table && column?.value.file);
	const query = useQuery<ColumnStorage, Error>({
		queryKey: [
			...sheetsQueryKeys.scope(scopeKey),
			'column-storage',
			transportId(storage),
			table?.key ?? '',
			column?.name ?? '',
			JSON.stringify(column?.value.file ?? null),
			JSON.stringify(config.upload ?? null),
			Boolean(injected),
		],
		queryFn: () => loadColumnStorage({
			storage,
			adapter,
			table: table!,
			column: column!,
			config: config.upload,
			databaseId: config.databaseId ?? null,
			executeUpload: injected,
		}),
		enabled,
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: 30 * 60 * 1000,
		retry: 1,
		structuralSharing: false,
	});
	const loaded = query.data;
	const onError = config.onError;
	const tableName = table?.name;
	// Every failed upload (not a cancel) reaches the host's `onError` with source 'upload'.
	// The error names a file row the upload left, if any (`unfinishedUploadOf`).
	const reported = useMemo((): ColumnStorage | undefined => {
		if (!loaded || loaded.upload.status !== 'ready' || !onError) return loaded;
		const { send } = loaded.upload;
		const reportingSend: SendFile = async (file, options) => {
			try {
				return await send(file, options);
			} catch (error) {
				if (!isAbortError(error)) onError(error, { source: 'upload', tableName });
				throw error;
			}
		};
		return { ...loaded, upload: { status: 'ready', send: reportingSend } };
	}, [loaded, onError, tableName]);
	return { storage: enabled ? reported ?? null : null, isLoading: enabled && query.isPending, error: query.error ?? null };
}

export interface ColumnMediaResolver {
	/** The resolver for `useSheetsMediaUrl`: null when previews cannot be signed, undefined for the fallback discovery. */
	resolver: MediaUrlResolver | null | undefined;
	/** True while the column's storage is still resolving. */
	isLoading: boolean;
}

/** How a column's previews are signed. A cell without a column model uses the fallback discovery. */
export function useColumnMediaResolver(
	table: TableModel | null | undefined,
	column: ColumnModel | null | undefined,
): ColumnMediaResolver {
	const { storage, isLoading } = useColumnStorage(table, column);
	return useMemo((): ColumnMediaResolver => {
		if (!table || !column?.value.file) return { resolver: undefined, isLoading: false };
		if (!storage) return { resolver: null, isLoading };
		const resolve = storage.resolveUrls;
		return { resolver: resolve && storage.previewKey ? { key: storage.previewKey, resolve } : null, isLoading: false };
	}, [table, column, storage, isLoading]);
}

export type FileUploadState =
	| { status: 'loading' }
	| { status: 'ready'; send: SendFile }
	| { status: 'unavailable'; reason: string };

/** Why the cell cannot be written, from the table model, or null. */
export function fileWriteReason(table: TableModel | null | undefined, column: ColumnModel | null | undefined): string | null {
	if (table && !table.operations.update) {
		return table.issues.find((issue) => issue.scope === 'operation' && issue.target === 'update')?.message
			?? 'Records in this table cannot be changed.';
	}
	if (column && !column.write.update) return column.write.updateReason ?? 'This column cannot be changed.';
	return null;
}

/** Whether the column can take a new file now, and the uploader when it can. */
export function useFileUploadState(
	table: TableModel | null | undefined,
	column: ColumnModel | null | undefined,
	readOnlyReason?: string | null,
): FileUploadState {
	const { storage, isLoading, error } = useColumnStorage(table, column);
	const reason = readOnlyReason ?? fileWriteReason(table, column);
	if (reason) return { status: 'unavailable', reason };
	if (error) return { status: 'unavailable', reason: error.message || 'The storage service could not be reached.' };
	if (isLoading || !storage) return { status: 'loading' };
	return storage.upload;
}

// ============================================================================
// Cell writes
// ============================================================================

export interface FileCellWriteJob {
	table: TableModel;
	column: ColumnModel;
	/** Primary-key identity of the row. */
	rowKey: SheetsRowIdentifier;
	/** Grid row id, which keys the cell's pending state. */
	rowId: string;
	value: unknown;
	/** Called when the server first answers that the file is still processing. */
	onProcessing?: () => void;
	signal?: AbortSignal;
}

/**
 * Write a file cell. While the server confirms the file the cell shows
 * "Processing file…"; a failure stays on the cell with a retry, even when the
 * editor has closed, so an uploaded file is never dropped silently.
 */
export function useFileCellWriter(): (job: FileCellWriteJob) => Promise<unknown> {
	const { execute, scopeKey, config } = useSheetsContext();
	const adapter = useSheetsAdapter();
	const queryClient = useQueryClient();
	const policy = processingPolicyOf(config.upload);

	return useCallback((job: FileCellWriteJob) => {
		const key = pendingWriteKey(job.table.key, job.rowId, job.column.name);
		const run = async (): Promise<unknown> => {
			setPendingFileWrite(scopeKey, key, null);
			try {
				const saved = await writeFileCell({
					adapter,
					execute,
					model: job.table,
					column: job.column,
					rowKey: job.rowKey,
					value: job.value,
					policy,
					signal: job.signal,
					onProcessing: () => {
						setPendingFileWrite(scopeKey, key, { status: 'processing' });
						job.onProcessing?.();
					},
				});
				setPendingFileWrite(scopeKey, key, null);
				void queryClient.invalidateQueries({ queryKey: sheetsQueryKeys.table(scopeKey, job.table.name) });
				void queryClient.invalidateQueries({ queryKey: sheetsQueryKeys.infiniteTable(scopeKey, job.table.name) });
				return saved;
			} catch (error) {
				if (job.signal?.aborted) {
					setPendingFileWrite(scopeKey, key, null);
					throw error;
				}
				setPendingFileWrite(scopeKey, key, {
					status: 'failed',
					message: fileWriteMessage(error),
					retry: () => void run().catch((): undefined => undefined),
					dismiss: () => setPendingFileWrite(scopeKey, key, null),
				});
				throw error;
			}
		};
		return run();
	}, [adapter, execute, policy, queryClient, scopeKey]);
}

// ============================================================================
// One-call upload for single-file columns
// ============================================================================

export interface FieldUploadTarget {
	table: TableModel;
	/** Column name. */
	column: string;
	rowKey: SheetsRowIdentifier;
}

export interface FieldUploadTransport {
	/** Data executor for the cell write. */
	execute: SheetsExecuteFn;
	adapter: Pick<SheetsBackendAdapter, 'updateRow'>;
	/** Sends the file to storage (from `useColumnStorage(...).storage.upload`). */
	send: SendFile;
	policy?: ProcessingPolicy;
	onProgress?: (progress: UploadProgress) => void;
	onProcessing?: () => void;
	signal?: AbortSignal;
}

/**
 * Upload one file into a single-file column, or clear it with null, and write
 * the cell. A list column takes its whole list: write it with
 * {@link useFileCellWriter}.
 */
export async function executeFieldUpload(
	target: FieldUploadTarget,
	file: File | null,
	transport: FieldUploadTransport,
): Promise<UploadResponse> {
	const column = target.table.columns.find((candidate) => candidate.name === target.column);
	if (!column?.value.file) throw new Error(`"${target.column}" is not a file column of this table.`);
	if (column.value.file.multiple) throw new Error(`"${target.column}" holds several files; write the whole list.`);
	// A key that cannot address the row fails here, before anything is uploaded.
	const rowKey = sheetsIdentifierToRowKey(target.table, target.rowKey);
	const missing = target.table.primaryKey.filter((field) => rowKey[field] === undefined || rowKey[field] === null);
	if (missing.length > 0) throw new Error(`The row key has no value for ${missing.join(', ')}.`);
	const value = file
		? cellElementFor(column, await transport.send(file, { onProgress: transport.onProgress, signal: transport.signal }), file)
		: null;
	return writeFileCell({
		adapter: transport.adapter,
		execute: transport.execute,
		model: target.table,
		column,
		rowKey: target.rowKey,
		value,
		policy: transport.policy ?? processingPolicyOf(undefined),
		onProcessing: transport.onProcessing,
		signal: transport.signal,
	});
}

// ============================================================================
// Earlier hook, kept as a thin wrapper
// ============================================================================

/** @deprecated Options of {@link useSheetsFieldUpload}. */
export interface UseFieldUploadOptions {
	onProgress?: (progress: UploadProgress) => void;
	onSuccess?: (data: UploadResponse) => void;
	onError?: (error: Error) => void;
	/** Ignored, as before. */
	showToast?: boolean;
	/** Ignored, as before. */
	successMessage?: string;
	/** Ignored, as before. */
	successToastDelayMs?: number;
}

/**
 * @deprecated Use {@link useFileUploadState} with {@link useFileCellWriter}, or
 * {@link executeFieldUpload}. Uploads one file into a single-file column (or
 * clears it with null) through the model-driven path.
 */
export function useSheetsFieldUpload(
	tableName: string,
	fieldName: string,
	recordId: SheetsRowIdentifier | null,
	options: UseFieldUploadOptions = {},
) {
	const { scopeKey } = useSheetsContext();
	const { model: table } = useTableModel(tableName);
	const column = table?.columns.find((candidate) => candidate.name === fieldName) ?? null;
	const upload = useFileUploadState(table, column);
	const writeCell = useFileCellWriter();

	async function write(id: SheetsRowIdentifier, file: File | null): Promise<UploadResponse> {
		if (!table || !column) throw new Error(`Field '${fieldName}' not found in table '${tableName}'.`);
		let value: unknown = null;
		if (file) {
			if (upload.status !== 'ready') throw new Error(upload.status === 'unavailable' ? upload.reason : 'Storage is not ready yet.');
			const projection = await upload.send(file, { onProgress: options.onProgress, recordId: typeof id === 'object' ? undefined : id });
			value = cellElementFor(column, projection, file);
		}
		return writeCell({ table, column, rowKey: id, rowId: typeof id === 'object' ? JSON.stringify(id) : String(id), value });
	}

	const mutation = useMutation<UploadResponse, Error, File | null>({
		// Under the 'sheets' prefix and the table's entries, like every Sheets query and
		// mutation, so a host's global mutation handlers can tell Sheets' own writes apart.
		mutationKey: sheetsMutationKeys.table(scopeKey, table?.key ?? tableName, 'field-upload', fieldName),
		mutationFn: (file) => {
			if (recordId == null) throw new Error('Missing record context for upload');
			return write(recordId, file);
		},
		onSuccess: options.onSuccess,
		onError: options.onError,
	});

	const resolveRowIdentifier = (row: Readonly<Record<string, unknown>>) => (table ? rowKeyOfRow(table, row) : null);
	return { ...mutation, write, resolveRowIdentifier };
}

export { FILE_NOT_LIVE_CODE };
