/**
 * Field-Specific Upload Hook
 * Provides upload functionality that integrates with the existing dynamic mutation system
 * Works with backend's field-specific upload pattern: <fieldName>Upload fields
 *
 * Ported from apps/admin use-image-upload.ts with context injection.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { cleanTable, type CleanTable, type MetaTable } from '@constructive-io/data';
import { useSheetsMeta } from './use-sheets-meta';
import {
	toCamelCaseSingular,
	toPatchFieldName,
	toUpdateInputTypeName,
	toUpdateMutationName,
} from '@constructive-io/data';

import { useSheetsContext } from '../context/sheets-context';
import type { SheetsScopeKey, SheetsConfig } from '../context/sheets-context';
import {
	createSheetsExecute,
	createSheetsUpload,
	type SheetsExecuteFn,
	type SheetsUploadFn,
} from '../context/sheets-execute';
import { sheetsTableQueryKeys } from './use-sheets-table';
import { useSheetsStoreApi } from '../store/sheets-store';

/**
 * Upload progress callback type
 */
export interface UploadProgress {
	loaded: number;
	total: number;
	percentage: number;
}

/**
 * Upload response from backend
 */
export interface UploadResponse {
	url: string;
	filename: string;
	mime: string;
	size: number;
}

/**
 * Field upload options
 */
export interface UseFieldUploadOptions {
	onProgress?: (progress: UploadProgress) => void;
	onSuccess?: (data: UploadResponse) => void;
	onError?: (error: Error) => void;
	showToast?: boolean; // default true
	successMessage?: string; // custom success message
	successToastDelayMs?: number; // optional delay for success toast
}

interface UploadNaming {
	mutationName: string;
	singularName: string;
	patchFieldName: string;
	updateInputTypeName: string;
}

interface ExecuteFieldUploadOptions {
	onAuthError?: () => void;
	/**
	 * Transport seam. When the hooks call this, they thread the context
	 * `execute`/`executeUpload` here so injected/mock implementations intercept
	 * both steps. When omitted (e.g. image-editor's direct retry path), the
	 * functions are built from `endpoint`/`getToken`/`onAuthError` via the same
	 * factories — never a raw fetch.
	 */
	execute?: SheetsExecuteFn;
	executeUpload?: SheetsUploadFn;
	onProgress?: (progress: UploadProgress) => void;
}

function resolveUploadNaming(tableName: string, table?: CleanTable | null): UploadNaming {
	return {
		mutationName: toUpdateMutationName(tableName, table),
		singularName: toCamelCaseSingular(tableName, table),
		patchFieldName: toPatchFieldName(tableName, table),
		updateInputTypeName: toUpdateInputTypeName(tableName),
	};
}

interface PatchMutationResult {
	[mutationName: string]: { [singular: string]: Record<string, unknown> } | undefined;
}

/**
 * Build the transport seam for an upload. When the caller injects
 * `execute`/`executeUpload` (the hooks pass the context functions), those are
 * used verbatim so consumer/mock implementations intercept both steps.
 * Otherwise the same factories that back the provider are used, sourced from
 * `endpoint`/`getToken`/`onAuthError` — guaranteeing DataError normalization
 * and onAuthError without any raw fetch in this module.
 */
function resolveTransport(
	endpoint: string,
	getToken: () => string | null,
	options?: ExecuteFieldUploadOptions,
): { execute: SheetsExecuteFn; executeUpload: SheetsUploadFn } {
	if (options?.execute && options?.executeUpload) {
		return { execute: options.execute, executeUpload: options.executeUpload };
	}
	const config: SheetsConfig = {
		endpoint,
		auth: { mode: 'standalone' },
		onAuthError: options?.onAuthError,
	};
	return {
		execute: createSheetsExecute(config, getToken),
		executeUpload: createSheetsUpload(config, getToken),
	};
}

/**
 * Execute field upload using two sequential requests, both routed through the
 * injectable transport seam:
 * 1. File upload via `executeUpload` → returns file metadata
 * 2. GraphQL mutation via `execute` to patch the row with the upload result
 *
 * Exported for direct use when record ID is known at call time (e.g., after draft submission)
 *
 * @param tableName - Table name
 * @param fieldName - Field name for the upload (the actual DB column, e.g. "photo")
 * @param recordId - Record ID to update
 * @param file - File to upload
 * @param endpoint - GraphQL endpoint URL (used to build the seam when none injected)
 * @param getToken - Function that returns the current auth token (or null)
 * @param naming - Optional pre-resolved naming overrides
 * @param options - Auth callback + optional injected execute/executeUpload + progress
 */
export async function executeFieldUpload(
	tableName: string,
	fieldName: string,
	recordId: string | number,
	file: File,
	endpoint: string,
	getToken: () => string | null,
	naming?: UploadNaming,
	options?: ExecuteFieldUploadOptions,
): Promise<UploadResponse> {
	// Validate endpoint (only meaningful for the factory-built seam path)
	if (!endpoint && !(options?.execute && options?.executeUpload)) {
		throw new Error('No endpoint configured. Select a database API or use Direct Connect.');
	}

	const { execute, executeUpload } = resolveTransport(endpoint, getToken, options);

	// ── Step 1: Upload file through the executeUpload seam ──
	// Field/row metadata + progress flow as the third arg so injected
	// implementations can use them; the default REST transport ignores them.
	const uploadResult = await executeUpload(file, undefined, {
		tableName,
		fieldName,
		recordId,
		onProgress: options?.onProgress,
	});

	// ── Step 2: Patch the row with the upload result via the execute seam ──
	const resolvedNaming = naming ?? resolveUploadNaming(tableName);

	// Sanitize upload result — only pass fields the DB schema expects.
	// For jsonb columns (image/upload domains): { url, filename, mime, size }
	// For text columns (attachment domain): just the URL string.
	const patchValue = {
		...(uploadResult.url != null && { url: uploadResult.url }),
		...(uploadResult.filename != null && { filename: uploadResult.filename }),
		...(uploadResult.mime != null && { mime: uploadResult.mime }),
		...(uploadResult.size != null && { size: uploadResult.size }),
	};

	const mutationString = `
		mutation ${resolvedNaming.mutationName}Mutation($input: ${resolvedNaming.updateInputTypeName}!) {
			${resolvedNaming.mutationName}(input: $input) {
				${resolvedNaming.singularName} {
					id
					${fieldName}
				}
			}
		}
	`.trim();

	// execute() normalizes auth/forbidden/GraphQL errors to DataError and fires
	// onAuthError on 401/UNAUTHENTICATED — no manual equivalent needed here.
	const result = await execute<PatchMutationResult>(mutationString, {
		input: {
			id: recordId,
			[resolvedNaming.patchFieldName]: {
				[fieldName]: patchValue,
			},
		},
	});

	// Extract the updated record from PostGraphile response
	const updatedRecord = result?.[resolvedNaming.mutationName]?.[resolvedNaming.singularName] as
		| Record<string, unknown>
		| undefined;

	if (!updatedRecord) {
		throw new Error('Upload succeeded but no data returned from patch');
	}

	// Extract the uploaded file data from the updated record. jsonb columns
	// (image/upload domains) return an object; text columns (attachment domain)
	// return a plain URL string.
	const uploadedFileData = updatedRecord[fieldName];
	if (!uploadedFileData) {
		throw new Error(`Upload succeeded but ${fieldName} field not found in response`);
	}

	const fileObject =
		typeof uploadedFileData === 'object' ? (uploadedFileData as Record<string, unknown>) : null;

	// Return standardized upload response
	return {
		url: (fileObject?.url as string) || (uploadedFileData as string),
		filename: (fileObject?.filename as string) || file.name,
		mime: (fileObject?.mime as string) || file.type,
		size: (fileObject?.size as number) || file.size,
	};
}

/**
 * Hook for uploading files to specific table fields
 * Integrates with the existing dynamic mutation system
 */
export function useSheetsFieldUpload(
	tableName: string,
	fieldName: string,
	recordId: string | number,
	options: UseFieldUploadOptions = {},
) {
	const queryClient = useQueryClient();
	const { scopeKey, config, execute, executeUpload } = useSheetsContext();
	const storeApi = useSheetsStoreApi();
	const { data: meta } = useSheetsMeta();
	const table = useMemo<CleanTable | null>(() => {
		if (!meta?._meta?.tables) return null;
		const candidate = meta._meta.tables.find((item) => item?.name === tableName) as MetaTable | undefined;
		return candidate ? cleanTable(candidate) : null;
	}, [meta, tableName]);
	const resolvedNaming = useMemo(() => resolveUploadNaming(tableName, table), [tableName, table]);

	// Build a stable getToken from context
	const getToken = useMemo(() => {
		if (config.auth.mode === 'embedded') {
			return config.auth.getToken;
		}
		return () => storeApi.getState().accessToken;
	}, [config.auth, storeApi]);

	// Keep latest params in refs to avoid stale closures
	const tableRef = useRef(tableName);
	const fieldRef = useRef(fieldName);
	const idRef = useRef(recordId);

	useEffect(() => {
		tableRef.current = tableName;
		fieldRef.current = fieldName;
		idRef.current = recordId;
	}, [tableName, fieldName, recordId]);

	return useMutation<UploadResponse, Error, File>({
		mutationKey: ['sheets', scopeKey, 'field-upload', tableName, fieldName, recordId],
		mutationFn: async (file: File) => {
			// Route both steps through the context seam so injected/mock
			// execute/executeUpload intercept the upload.
			return executeFieldUpload(
				tableRef.current,
				fieldRef.current,
				idRef.current,
				file,
				config.endpoint,
				getToken,
				resolvedNaming,
				{ onAuthError: config.onAuthError, execute, executeUpload, onProgress: options.onProgress },
			);
		},
		onSuccess: (data) => {
			// First allow callers to react (e.g., close overlay)
			options.onSuccess?.(data);
			// Invalidate related queries to refresh data
			queryClient.invalidateQueries({ queryKey: sheetsTableQueryKeys.table(scopeKey, tableRef.current) });
			queryClient.invalidateQueries({ queryKey: sheetsTableQueryKeys.tableRow(scopeKey, tableRef.current, idRef.current) });
		},
		onError: (error) => {
			options.onError?.(error);
		},
	});
}

/**
 * Hook for uploading images with validation
 * Convenience wrapper around useSheetsFieldUpload with image-specific validation
 */
export function useSheetsImageUpload(
	tableName: string,
	fieldName: string,
	recordId: string | number,
	options: UseFieldUploadOptions = {},
) {
	const queryClient = useQueryClient();
	const { scopeKey, config, execute, executeUpload } = useSheetsContext();
	const storeApi = useSheetsStoreApi();
	const { data: meta } = useSheetsMeta();
	const table = useMemo<CleanTable | null>(() => {
		if (!meta?._meta?.tables) return null;
		const candidate = meta._meta.tables.find((item) => item?.name === tableName) as MetaTable | undefined;
		return candidate ? cleanTable(candidate) : null;
	}, [meta, tableName]);
	const resolvedNaming = useMemo(() => resolveUploadNaming(tableName, table), [tableName, table]);

	// Build a stable getToken from context
	const getToken = useMemo(() => {
		if (config.auth.mode === 'embedded') {
			return config.auth.getToken;
		}
		return () => storeApi.getState().accessToken;
	}, [config.auth, storeApi]);

	// Keep latest params in refs to avoid stale closures
	const tableRef = useRef(tableName);
	const fieldRef = useRef(fieldName);
	const idRef = useRef(recordId);

	useEffect(() => {
		tableRef.current = tableName;
		fieldRef.current = fieldName;
		idRef.current = recordId;
	}, [tableName, fieldName, recordId]);

	return useMutation<UploadResponse, Error, File>({
		mutationKey: ['sheets', scopeKey, 'image-upload', tableName, fieldName, recordId],
		mutationFn: async (file: File) => {
			// Validate file type
			if (!file.type.startsWith('image/')) {
				throw new Error('Please select an image file');
			}

			// Validate file size (10MB limit)
			const maxSize = 10 * 1024 * 1024; // 10MB
			if (file.size > maxSize) {
				throw new Error('File size must be less than 10MB');
			}

			// Route both steps through the context seam so injected/mock
			// execute/executeUpload intercept the upload.
			return executeFieldUpload(
				tableRef.current,
				fieldRef.current,
				idRef.current,
				file,
				config.endpoint,
				getToken,
				resolvedNaming,
				{ onAuthError: config.onAuthError, execute, executeUpload, onProgress: options.onProgress },
			);
		},
		onSuccess: (data) => {
			// First allow callers to react (e.g., close overlay)
			options.onSuccess?.(data);

			// Invalidate related queries to refresh data
			queryClient.invalidateQueries({ queryKey: sheetsTableQueryKeys.table(scopeKey, tableRef.current) });
			queryClient.invalidateQueries({ queryKey: sheetsTableQueryKeys.tableRow(scopeKey, tableRef.current, idRef.current) });
		},
		onError: (error) => {
			options.onError?.(error);
		},
	});
}
