import { useMutation, useQueryClient } from '@tanstack/react-query';

import { cleanTable, type MetaTable } from '@constructive-io/data';

import type { SheetsBackendAdapter } from '../adapter/sheets-adapter';
import { useSheetsAdapter } from '../adapter/use-sheets-adapter';
import { useSheetsContext } from '../context/sheets-context';
import type { SheetsExecuteFn, SheetsFileValue, SheetsUploadFn } from '../context/sheets-execute';
import { assertSheetsMutationAllowed, resolveSheetsIdentifier, resolveSheetsRowIdentity } from '../row-identity';
import type { SheetsRowIdentifier } from '../row-identity';
import { sheetsQueryKeys } from './query-keys';
import { useSheetsMeta } from './use-sheets-meta';

export interface UploadProgress {
	loaded: number;
	total: number;
	percentage: number;
}

/** The value confirmed by the row update. Attachments store a public URL as text. */
export type UploadResponse = SheetsFileValue | string | null;

export interface UseFieldUploadOptions {
	onProgress?: (progress: UploadProgress) => void;
	onSuccess?: (data: UploadResponse) => void;
	onError?: (error: Error) => void;
	showToast?: boolean;
	successMessage?: string;
	successToastDelayMs?: number;
}

interface FieldUploadTarget {
	table: MetaTable;
	allTables?: readonly MetaTable[];
	fieldName: string;
	recordId: SheetsRowIdentifier;
}

interface FieldUploadTransport {
	execute: SheetsExecuteFn;
	executeUpload: SheetsUploadFn;
	adapter: Pick<SheetsBackendAdapter, 'updateRow'>;
	onProgress?: (progress: UploadProgress) => void;
}

/** Upload and persist a media value, or pass null to clear the cell. */
export async function executeFieldUpload(
	{ table: meta, allTables, fieldName, recordId }: FieldUploadTarget,
	file: File | null,
	{ execute, executeUpload, adapter, onProgress }: FieldUploadTransport,
): Promise<UploadResponse> {
	assertSheetsMutationAllowed(meta, 'update');
	const identity = resolveSheetsIdentifier(meta, recordId);
	if (identity.status !== 'identified') {
		throw new Error(`Cannot resolve a primary-key identity for table '${meta.name}'.`);
	}

	const table = cleanTable(meta);
	const field = table.fields.find(({ name }) => name === fieldName);
	if (!field) throw new Error(`Field '${fieldName}' not found in table '${meta.name}'.`);
	const isAttachment = field.type.pgAlias?.toLowerCase() === 'attachment' || field.type.pgType?.toLowerCase() === 'attachment';

	let value: UploadResponse = null;
	if (file) {
		const { file: projection } = await executeUpload(file, undefined, {
			tableName: meta.name,
			fieldName,
			recordId: typeof identity.identifier === 'object' ? undefined : identity.identifier,
			onProgress,
		});
		if (isAttachment) {
			if (!projection.url) throw new Error('attachment columns need a public bucket with a public URL prefix');
			value = projection.url;
		} else {
			value = {
				...projection,
				filename: projection.filename ?? file.name,
				mime: projection.mime ?? (file.type || 'application/octet-stream'),
			};
		}
	}

	const updatedRow = await adapter.updateRow(
		{ table, tableName: meta.name, allTables: allTables?.map(cleanTable) ?? [table] },
		identity.identifier,
		{ [fieldName]: value },
		execute,
		{ returning: [fieldName] },
	);
	if (!updatedRow || !Object.hasOwn(updatedRow, fieldName)) {
		throw new Error(`Update did not return '${fieldName}'.`);
	}
	const saved = updatedRow[fieldName];
	if (value === null) {
		if (saved === null) return null;
	} else if (isAttachment) {
		if (typeof saved === 'string' && saved) return saved;
	} else if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
		return saved as SheetsFileValue;
	}
	throw new Error(`Update returned an unexpected value for '${fieldName}'.`);
}

export function useSheetsFieldUpload(
	tableName: string,
	fieldName: string,
	recordId: SheetsRowIdentifier | null,
	options: UseFieldUploadOptions = {},
) {
	const queryClient = useQueryClient();
	const { execute, executeUpload, scopeKey } = useSheetsContext();
	const { data: meta } = useSheetsMeta();
	const adapter = useSheetsAdapter();
	const allTables = meta?._meta?.tables?.filter((entry): entry is MetaTable => entry != null);
	const table = allTables?.find(({ name }) => name === tableName);

	function resolveRowIdentifier(row: Readonly<Record<string, unknown>>): SheetsRowIdentifier | null {
		if (!table) return null;
		const identity = resolveSheetsRowIdentity(table, row);
		return identity.status === 'identified' ? identity.identifier : null;
	}

	async function persist(id: SheetsRowIdentifier, file: File | null) {
		if (!table) throw new Error(`Table '${tableName}' not found.`);
		return executeFieldUpload(
			{ table, allTables, fieldName, recordId: id },
			file,
			{ execute, executeUpload, adapter, onProgress: options.onProgress },
		);
	}

	function invalidate() {
		void queryClient.invalidateQueries({ queryKey: sheetsQueryKeys.table(scopeKey, tableName) });
	}

	async function write(id: SheetsRowIdentifier, file: File | null) {
		const value = await persist(id, file);
		invalidate();
		return value;
	}

	const mutation = useMutation<UploadResponse, Error, File | null>({
		mutationKey: [...sheetsQueryKeys.table(scopeKey, tableName), 'field-upload', fieldName, recordId],
		mutationFn: (file) => {
			if (recordId == null) throw new Error('Missing record context for upload');
			return persist(recordId, file);
		},
		onSuccess: (value) => {
			options.onSuccess?.(value);
			invalidate();
		},
		onError: options.onError,
	});

	return { ...mutation, write, resolveRowIdentifier };
}
