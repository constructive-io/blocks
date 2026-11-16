// The storage planes a storage service offers, read from that service's own
// `_meta` and checked with targeted introspection on the same service.
//
// Uploads, download URL lookups and bucket reads all run on the storage
// endpoint, so every name they use comes from the storage endpoint too: the
// files table and its upload mutation from `_meta.storage`, the mutation's
// input fields and payload fields from `__type` lookups, the files and buckets
// tables' list fields and keys from their table models.
//
// A storage service whose `_meta` names no upload mutation (a server older than
// `MetaStorage.upload`, or one without `_meta`) falls back to the shape
// discovery in `context/sheets-upload-discovery.ts`. That fallback is the only
// place names are found by shape.

import {
	MetaContractError,
	createSchemaTypeLoader,
	metaTablesOf,
	namedTypeOf,
	printTypeRef,
	tableKeyOf,
	type IntrospectedInputValue,
	type MetaQuery,
	type SchemaTypeLoader,
	type TableModel,
} from '@constructive-io/data';

import type { SheetsBackendAdapter } from '../adapter/sheets-adapter';
import type { SheetsStorageTransport } from '../context/sheets-context';

/** A files table on the storage service and the operation that uploads into it. */
export interface StoragePlane {
	/** GraphQL type name of the files table. */
	filesType: string;
	/** `TableModel.key` of the files table on the storage service. */
	filesTableKey: string;
	/** `TableModel.key` of the paired buckets table, or null when the server does not say. */
	bucketsTableKey: string | null;
	/** Field on the files type that returns a download URL, or null. */
	downloadUrlField: string | null;
	/** Root mutation that uploads one file. */
	uploadMutation: string;
	/** Input type of that mutation, as `_meta` names it, or null. */
	uploadInputType: string | null;
	/** Payload type of that mutation, as `_meta` names it, or null. */
	uploadPayloadType: string | null;
}

export type StorageCatalog =
	| { source: 'meta'; planes: readonly StoragePlane[]; meta: MetaQuery }
	/** The storage `_meta` names no upload mutation; uploads use shape discovery. */
	| { source: 'discovery' };

const catalogs = new WeakMap<SheetsStorageTransport, Promise<StorageCatalog>>();

function planesOf(meta: MetaQuery): StoragePlane[] {
	const tables = metaTablesOf(meta);
	const keyByName = new Map(tables.map((table) => [table.name, tableKeyOf(table)] as const));
	return tables.flatMap((table) => {
		const storage = table.storage;
		const mutation = storage?.upload?.mutation;
		if (!storage?.isFilesTable || !mutation) return [];
		return [{
			filesType: table.name,
			filesTableKey: tableKeyOf(table),
			bucketsTableKey: storage.bucketsType ? keyByName.get(storage.bucketsType) ?? null : null,
			downloadUrlField: storage.downloadUrlField ?? null,
			uploadMutation: mutation,
			uploadInputType: storage.upload?.inputType ?? null,
			uploadPayloadType: storage.upload?.payloadType ?? null,
		}];
	});
}

/**
 * The storage catalog of one storage transport, loaded once. A deterministic
 * answer (planes, or "use discovery") is kept; a failed request is not, so the
 * next caller tries again.
 */
export function loadStorageCatalog(
	storage: SheetsStorageTransport,
	adapter: Pick<SheetsBackendAdapter, 'fetchMeta'>,
): Promise<StorageCatalog> {
	const cached = catalogs.get(storage);
	if (cached) return cached;
	const request = (async (): Promise<StorageCatalog> => {
		try {
			const meta = await adapter.fetchMeta(storage.execute);
			const planes = planesOf(meta);
			return planes.length > 0 ? { source: 'meta', planes, meta } : { source: 'discovery' };
		} catch (error) {
			// An endpoint whose `_meta` contract does not match is answered by discovery.
			if (error instanceof MetaContractError) return { source: 'discovery' };
			throw error;
		}
	})();
	catalogs.set(storage, request);
	request.catch(() => {
		if (catalogs.get(storage) === request) catalogs.delete(storage);
	});
	return request;
}

// ============================================================================
// Plane details: the upload operation as the storage schema declares it
// ============================================================================

/** The upload mutation of a plane, checked against the storage schema. */
export interface UploadOperation {
	/** Root mutation field. */
	field: string;
	/** Argument that carries the input object. */
	argName: string;
	/** Printed type of that argument, for the variable definition. */
	argType: string;
	/** Input fields the mutation really accepts. */
	inputFields: readonly IntrospectedInputValue[];
	/** Payload fields the mutation really returns. */
	payloadFields: ReadonlySet<string>;
}

export interface PlaneDetails {
	plane: StoragePlane;
	/** The upload operation, or null with `uploadReason`. */
	upload: UploadOperation | null;
	uploadReason: string | null;
	/** True when the files type really has `downloadUrlField`. */
	hasDownloadUrl: boolean;
	/** Storage-side model of the files table, or null when it could not be built. */
	files: TableModel | null;
	/** Storage-side model of the buckets table, or null. */
	buckets: TableModel | null;
}

const NO_UPLOAD_REASON = 'The storage service does not offer uploads for this file table.';

const loaders = new WeakMap<SheetsStorageTransport, SchemaTypeLoader>();
const details = new WeakMap<SheetsStorageTransport, Map<string, Promise<PlaneDetails>>>();

function loaderFor(storage: SheetsStorageTransport): SchemaTypeLoader {
	let loader = loaders.get(storage);
	if (!loader) {
		loader = createSchemaTypeLoader();
		loaders.set(storage, loader);
	}
	return loader;
}

async function tableModel(
	storage: SheetsStorageTransport,
	adapter: Pick<SheetsBackendAdapter, 'fetchTableModel'>,
	meta: MetaQuery,
	tableKey: string | null,
): Promise<TableModel | null> {
	if (!tableKey) return null;
	try {
		return await adapter.fetchTableModel(storage.execute, meta, tableKey);
	} catch {
		// Without the model the plane still uploads; previews and limits degrade.
		return null;
	}
}

async function readPlaneDetails(
	storage: SheetsStorageTransport,
	adapter: Pick<SheetsBackendAdapter, 'fetchTableModel'>,
	meta: MetaQuery,
	plane: StoragePlane,
): Promise<PlaneDetails> {
	const loader = loaderFor(storage);
	const { execute } = storage;
	const roots = await loader.loadRoots(execute);
	const field = roots.mutation?.fields?.find((candidate) => candidate.name === plane.uploadMutation) ?? null;
	const arg = field
		? field.args.find((candidate) => namedTypeOf(candidate.type)?.name === plane.uploadInputType) ??
			(field.args.length === 1 ? field.args[0] : undefined)
		: undefined;
	const inputType = arg ? namedTypeOf(arg.type)?.name ?? null : null;
	const payloadType = field ? namedTypeOf(field.type)?.name ?? null : null;
	await loader.loadTypes(execute, [inputType, payloadType, plane.filesType].filter((name): name is string => Boolean(name)));

	const input = inputType ? loader.index.get(inputType) : null;
	const payload = payloadType ? loader.index.get(payloadType) : null;
	const filesType = loader.index.get(plane.filesType);
	const upload: UploadOperation | null = field && arg && input?.inputFields && payload?.fields
		? {
			field: field.name,
			argName: arg.name,
			argType: printTypeRef(arg.type),
			inputFields: input.inputFields,
			payloadFields: new Set(payload.fields.map((candidate) => candidate.name)),
		}
		: null;

	const [files, buckets] = await Promise.all([
		tableModel(storage, adapter, meta, plane.filesTableKey),
		tableModel(storage, adapter, meta, plane.bucketsTableKey),
	]);
	return {
		plane,
		upload,
		uploadReason: upload ? null : NO_UPLOAD_REASON,
		hasDownloadUrl: Boolean(
			plane.downloadUrlField && filesType?.fields?.some((candidate) => candidate.name === plane.downloadUrlField),
		),
		files,
		buckets,
	};
}

/** Details of one plane, loaded once per storage transport. A failed load is retried by the next caller. */
export function loadPlaneDetails(
	storage: SheetsStorageTransport,
	adapter: Pick<SheetsBackendAdapter, 'fetchTableModel'>,
	catalog: Extract<StorageCatalog, { source: 'meta' }>,
	plane: StoragePlane,
): Promise<PlaneDetails> {
	let byPlane = details.get(storage);
	if (!byPlane) {
		byPlane = new Map();
		details.set(storage, byPlane);
	}
	const cached = byPlane.get(plane.filesTableKey);
	if (cached) return cached;
	const request = readPlaneDetails(storage, adapter, catalog.meta, plane);
	byPlane.set(plane.filesTableKey, request);
	request.catch(() => {
		if (byPlane.get(plane.filesTableKey) === request) byPlane.delete(plane.filesTableKey);
	});
	return request;
}

/** The single primary-key field of a files table, or null when the key is composite or unknown. */
export function fileKeyField(files: TableModel | null): string | null {
	return files?.primaryKey.length === 1 ? files.primaryKey[0]! : null;
}
