/**
 * The FALLBACK upload path: shape discovery over the full introspection.
 *
 * Used only for a storage service whose `_meta` names no upload mutation (an
 * older server), and by hosts that call `createSheetsUpload` directly. It reads
 * the full introspection once per endpoint and finds root mutations with the
 * upload input and payload shape, and the fields that resolve a download URL by
 * file id. The model-driven path in `uploads/` replaces all of this when the
 * storage `_meta` names the upload mutation.
 */

import { getIntrospectionQuery } from 'graphql';

import { createError } from '@constructive-io/data';

import type { SheetsStorageTransport } from './sheets-context';
import type { SheetsExecuteFn, SheetsFileValue, SheetsUploadFn, SheetsUploadResult } from './sheets-execute';
import {
	UPLOAD_PAYLOAD_FIELDS,
	readUploadPayload,
	transferFile,
	withUnfinishedUpload,
	type FileProjection,
	type UploadPayload,
} from './sheets-upload-presigned';

// ============================================================================
// Shape discovery over the full introspection (cached per endpoint)
// ============================================================================

export interface UploadCapability {
	/** Upload mutation field name, discovered by shape. */
	uploadFieldName: string;
	/** The upload input object type name. */
	inputTypeName: string;
	hasFileProjection: boolean;
	/** Payload fields the mutation returns. Discovery sets it; a capability built by hand may leave it out. */
	payloadFieldNames?: readonly string[];
	/** Input fields the mutation accepts. Discovery sets it; a capability built by hand may leave it out. */
	inputFieldNames?: readonly string[];
	download: DownloadByIdResult | null;
}

interface DownloadByIdResult {
	/** Query field used to resolve downloadUrl by id. */
	fileByIdField: string;
	/** 'id' singular accessor, 'connection' filtered connection, 'nodeId' Relay node. */
	fileByIdArgName: 'id' | 'nodeId' | 'connection';
	/** The file object type name. */
	fileTypeName: string;
	idScalarName?: string;
	connectionFilterArgName?: string;
	connectionIdField?: string;
	connectionIdOperator?: string;
	connectionNodesField?: string;
	connectionHasFirst?: boolean;
}

interface StorageCapabilities {
	/** The op `discoverUploadCapability(endpoint, execute)` returns: `uploadAppFile`, else the first op that takes a `bucketKey`. */
	upload: UploadCapability | null;
	/** Every root upload op the endpoint exposes, one per storage plane. */
	uploads: Omit<UploadCapability, 'download'>[];
	/** The endpoint's only upload op, with its download lookup; null when it has none or several. */
	sole: UploadCapability | null;
	download: DownloadByIdResult | null;
	batch: DownloadByIdResult | null;
}

let capabilityCache = new WeakMap<SheetsExecuteFn, Map<string, Promise<StorageCapabilities>>>();

/** Test-only: clear cached storage capabilities between cases. */
export function __resetUploadCapabilityCache(): void {
	capabilityCache = new WeakMap();
}

async function discoverStorageCapabilities(endpoint: string, execute: SheetsExecuteFn): Promise<StorageCapabilities> {
	let endpoints = capabilityCache.get(execute);
	if (!endpoints) {
		endpoints = new Map();
		capabilityCache.set(execute, endpoints);
	}
	const cached = endpoints.get(endpoint);
	if (cached) return cached;

	const promise = (async () => {
		const data = await execute<{ __schema: IntrospectionSchema }>(getIntrospectionQuery());
		const schema = data?.__schema;
		if (!schema) throw createError.badRequest('Uploads are not enabled for this endpoint.');
		return resolveStorageCapabilities(schema);
	})();
	// Don't cache a rejected discovery: let the next attempt retry.
	promise.catch(() => endpoints.delete(endpoint));
	endpoints.set(endpoint, promise);
	return promise;
}

/**
 * The endpoint's upload op. Name it when the endpoint serves several storage
 * planes; the named op must still carry the upload shape.
 */
export async function discoverUploadCapability(
	endpoint: string,
	execute: SheetsExecuteFn,
	uploadFieldName?: string,
): Promise<UploadCapability> {
	const { upload, uploads } = await discoverStorageCapabilities(endpoint, execute);
	if (uploadFieldName) {
		const named = uploads.find((candidate) => candidate.uploadFieldName === uploadFieldName);
		if (!named) throw createError.badRequest(`Uploads are not enabled for this endpoint: it has no ${uploadFieldName}.`);
		return { ...named, download: null };
	}
	if (!upload) capabilityCache.get(execute)?.delete(endpoint);
	return requireUploadCapability(upload);
}

/**
 * The fallback's upload op for the grid: exactly one plane, or a reason. The
 * grid never picks between several planes by name.
 */
export async function discoverSoleUploadCapability(storage: SheetsStorageTransport): Promise<UploadCapability> {
	const { uploads, sole } = await discoverStorageCapabilities(storage.endpoint, storage.execute);
	if (uploads.length > 1) {
		throw createError.badRequest('The storage service has several file stores, and none is chosen for this column.');
	}
	if (!sole) {
		capabilityCache.get(storage.execute)?.delete(storage.endpoint);
		throw createError.badRequest('Uploads are not enabled for this storage service.');
	}
	return sole;
}

function requireUploadCapability(upload: UploadCapability | null): UploadCapability {
	if (!upload) throw createError.badRequest('Uploads are not enabled for this endpoint.');
	return upload;
}

// --- Minimal introspection shapes (only what discovery reads) ---

interface IntrospectionTypeRef {
	kind: string;
	name?: string | null;
	ofType?: IntrospectionTypeRef | null;
}

interface IntrospectionInputValue {
	name: string;
	type: IntrospectionTypeRef;
}

interface IntrospectionField {
	name: string;
	args: ReadonlyArray<IntrospectionInputValue>;
	type: IntrospectionTypeRef;
}

interface IntrospectionType {
	kind: string;
	name?: string | null;
	fields?: ReadonlyArray<IntrospectionField> | null;
	inputFields?: ReadonlyArray<IntrospectionInputValue> | null;
}

/** Loose structural shape of an introspection `__schema` (accepts fixtures and real results). */
export interface IntrospectionSchema {
	queryType?: { name: string } | null;
	mutationType?: { name: string } | null;
	types: ReadonlyArray<IntrospectionType>;
}

function namedTypeName(ref: IntrospectionTypeRef | null | undefined): string | null {
	let cur = ref;
	while (cur && (cur.kind === 'NON_NULL' || cur.kind === 'LIST')) cur = cur.ofType ?? null;
	return cur?.name ?? null;
}

/** True when the outer wrapper (after NON_NULL) is a LIST. */
function isListTypeRef(ref: IntrospectionTypeRef | null | undefined): boolean {
	let cur = ref;
	while (cur && cur.kind === 'NON_NULL') cur = cur.ofType ?? null;
	return cur?.kind === 'LIST';
}

/**
 * The fallback reads the file row by an `id` field, as the projection names it.
 * The model-driven path reads the files table's real key instead.
 */
const PK_FIELD_NAME = 'id';

/** Pure resolver over an introspection `__schema`, for direct tests. */
export function resolveUploadCapability(schema: IntrospectionSchema): UploadCapability {
	return requireUploadCapability(resolveStorageCapabilities(schema).upload);
}

function resolveStorageCapabilities(schema: IntrospectionSchema): StorageCapabilities {
	const typeByName = new Map<string, IntrospectionType>();
	for (const t of schema.types) {
		if (t.name) typeByName.set(t.name, t);
	}

	const objectHasFields = (typeName: string | null, names: string[]): boolean => {
		const t = typeName ? typeByName.get(typeName) : undefined;
		if (!t?.fields) return false;
		const present = new Set(t.fields.map((f) => f.name));
		return names.every((n) => present.has(n));
	};

	const inputHasFields = (typeName: string | null, names: string[]): boolean => {
		const t = typeName ? typeByName.get(typeName) : undefined;
		if (!t?.inputFields) return false;
		const present = new Set(t.inputFields.map((f) => f.name));
		return names.every((n) => present.has(n));
	};

	const PAYLOAD_FIELDS = ['uploadUrl', 'fileId', 'key', 'deduplicated'];
	const INPUT_FIELDS = ['contentHash', 'contentType', 'size'];
	// The earlier API only knew ops that take a `bucketKey`; its pick keeps that rule.
	const LEGACY_INPUT_FIELDS = [...INPUT_FIELDS, 'bucketKey'];

	const mutationType = schema.mutationType ? typeByName.get(schema.mutationType.name) : null;
	const queryType = schema.queryType ? typeByName.get(schema.queryType.name) : null;

	let upload: Omit<UploadCapability, 'download'> | null = null;
	const uploads: Omit<UploadCapability, 'download'>[] = [];

	for (const field of mutationType?.fields ?? []) {
		const inputArg = field.args.find((a) => a.name === 'input');
		if (!inputArg) continue;
		const inputTypeName = namedTypeName(inputArg.type);
		const payloadTypeName = namedTypeName(field.type);
		if (inputTypeName && inputHasFields(inputTypeName, INPUT_FIELDS) && objectHasFields(payloadTypeName, PAYLOAD_FIELDS)) {
			const payloadFields = typeByName.get(payloadTypeName ?? '')?.fields ?? [];
			const candidate = {
				uploadFieldName: field.name,
				inputTypeName,
				hasFileProjection: payloadFields.some(
					(f) => f.name === 'file' && !isListTypeRef(f.type) && namedTypeName(f.type) === 'JSON',
				),
				payloadFieldNames: payloadFields.map((f) => f.name),
				inputFieldNames: (typeByName.get(inputTypeName)?.inputFields ?? []).map((f) => f.name),
			};
			uploads.push(candidate);
			// The pick of the earlier API (`discoverUploadCapability` without a name, and
			// `createSheetsUpload`). The grid's fallback (`discoverSoleUploadCapability`)
			// refuses to choose between planes.
			if (!inputHasFields(inputTypeName, LEGACY_INPUT_FIELDS) || (upload?.uploadFieldName === 'uploadAppFile')) continue;
			if (field.name === 'uploadAppFile') upload = candidate;
			else upload ??= candidate;
		}
	}

	const fileTypes = new Set<string>();
	for (const t of schema.types) {
		if (t.kind === 'OBJECT' && t.name && t.fields?.some((f) => f.name === 'downloadUrl')) fileTypes.add(t.name);
	}

	// Legacy: the file type is read from the upload op's name (uploadAppFile → AppFile).
	// Only this fallback does so; the model-driven path reads it from `_meta`.
	const uploadType = upload?.uploadFieldName.replace(/^upload/, '') ?? 'AppFile';
	const uploadDownload = resolveDownloadByIdField(typeByName, queryType, fileTypes, uploadType);
	const preferredPreviewType = fileTypes.has('AppFile') ? 'AppFile' : uploadType;
	const previewType = fileTypes.has(preferredPreviewType)
		? preferredPreviewType
		: uploadDownload?.fileTypeName ?? preferredPreviewType;
	const download = previewType === uploadType
		? uploadDownload
		: resolveDownloadByIdField(typeByName, queryType, fileTypes, previewType);
	const batch = resolveConnectionDownloadField(typeByName, queryType, fileTypes, previewType, true);

	const only = uploads.length === 1 ? uploads[0]! : null;
	const sole = only
		? {
			...only,
			download: only === upload
				? uploadDownload
				: resolveDownloadByIdField(typeByName, queryType, fileTypes, only.uploadFieldName.replace(/^upload/, '')),
		}
		: null;

	return {
		upload: upload ? { ...upload, download: uploadDownload } : null,
		uploads,
		sole,
		download,
		batch,
	};
}

function resolveDownloadByIdField(
	typeByName: Map<string, IntrospectionType>,
	queryType: IntrospectionType | null | undefined,
	fileTypesWithDownloadUrl: Set<string>,
	preferred: string,
): DownloadByIdResult | null {
	// 1. A singular by-id accessor, e.g. appFile(id:).
	let singular: DownloadByIdResult | null = null;
	for (const field of queryType?.fields ?? []) {
		const returnTypeName = namedTypeName(field.type);
		if (!returnTypeName || !fileTypesWithDownloadUrl.has(returnTypeName)) continue;
		if (field.args.length === 1 && field.args[0]!.name === PK_FIELD_NAME) {
			const candidate: DownloadByIdResult = {
				fileByIdField: field.name,
				fileByIdArgName: 'id',
				fileTypeName: returnTypeName,
				idScalarName: namedTypeName(field.args[0]!.type) ?? undefined,
			};
			if (returnTypeName === preferred) return candidate;
			singular ??= candidate;
		}
	}

	// 2. A connection filtered by id (Relay-disabled backends).
	const connection = resolveConnectionDownloadField(typeByName, queryType, fileTypesWithDownloadUrl, preferred);
	if (connection?.fileTypeName === preferred) return connection;
	if (singular || connection) return singular ?? connection;

	// 3. Relay `node(nodeId:)`, last resort.
	const nodeField = queryType?.fields?.find((f) => f.name === 'node' && f.args.some((a) => a.name === 'nodeId'));
	if (nodeField && fileTypesWithDownloadUrl.size > 0) {
		const fileTypeName = fileTypesWithDownloadUrl.has(preferred) ? preferred : [...fileTypesWithDownloadUrl][0]!;
		return { fileByIdField: 'node', fileByIdArgName: 'nodeId', fileTypeName };
	}
	return null;
}

function resolveConnectionDownloadField(
	typeByName: Map<string, IntrospectionType>,
	queryType: IntrospectionType | null | undefined,
	fileTypesWithDownloadUrl: Set<string>,
	preferred: string,
	batch = false,
): DownloadByIdResult | null {
	const EQUALITY_OPERATORS = ['equalTo', 'eq'];
	const candidates: DownloadByIdResult[] = [];

	for (const field of queryType?.fields ?? []) {
		const connTypeName = namedTypeName(field.type);
		if (!connTypeName) continue;
		const connType = typeByName.get(connTypeName);
		if (connType?.kind !== 'OBJECT' || !connType.fields) continue;

		const nodesField = connType.fields.find((f) => {
			if (!isListTypeRef(f.type)) return false;
			const elem = namedTypeName(f.type);
			return elem != null && fileTypesWithDownloadUrl.has(elem);
		});
		if (!nodesField) continue;
		const fileTypeName = namedTypeName(nodesField.type) as string;
		if (batch && (fileTypeName !== preferred ||
			!typeByName.get(fileTypeName)?.fields?.some((candidate) => candidate.name === PK_FIELD_NAME))) continue;
		const connectionHasFirst = field.args.some((arg) => arg.name === 'first');

		for (const arg of field.args) {
			const filterTypeName = namedTypeName(arg.type);
			const filterType = filterTypeName ? typeByName.get(filterTypeName) : null;
			if (filterType?.kind !== 'INPUT_OBJECT' || !filterType.inputFields) continue;
			const idField = filterType.inputFields.find((f) => f.name === PK_FIELD_NAME);
			if (!idField) continue;

			const idFieldTypeName = namedTypeName(idField.type);
			const idFieldType = idFieldTypeName ? typeByName.get(idFieldTypeName) : null;

			if (idFieldType?.kind === 'INPUT_OBJECT' && idFieldType.inputFields) {
				const inputFields = idFieldType.inputFields;
				const opField = batch
					? inputFields.find((f) => f.name === 'in' && isListTypeRef(f.type))
					: EQUALITY_OPERATORS.map((op) => inputFields.find((f) => f.name === op)).find((f) => f != null);
				if (opField) {
					candidates.push({
						fileByIdField: field.name,
						fileByIdArgName: 'connection',
						fileTypeName,
						idScalarName: namedTypeName(opField.type) ?? undefined,
						connectionFilterArgName: arg.name,
						connectionIdField: idField.name,
						connectionIdOperator: opField.name,
						connectionNodesField: nodesField.name,
						connectionHasFirst,
					});
					break;
				}
				continue;
			}

			if (!batch && (idFieldType?.kind === 'SCALAR' || (!idFieldType && idFieldTypeName))) {
				candidates.push({
					fileByIdField: field.name,
					fileByIdArgName: 'connection',
					fileTypeName,
					idScalarName: idFieldTypeName ?? undefined,
					connectionFilterArgName: arg.name,
					connectionIdField: idField.name,
					connectionNodesField: nodesField.name,
					connectionHasFirst,
				});
				break;
			}
		}
	}

	if (candidates.length === 0) return null;
	return candidates.find((c) => c.fileTypeName === preferred) ?? candidates[0]!;
}

// ============================================================================
// Fallback: upload op call
// ============================================================================

interface UploadOpInput {
	bucketKey?: string;
	isPublic?: boolean;
	databaseId?: string;
	contentHash: string;
	contentType: string;
	size: number;
	filename: string;
}

/**
 * The upload input for a discovered op. Only input fields the op really has are
 * sent (all of them when the capability lists none); `ownerId` never is (the
 * fallback cannot know an owner, so an entity-scoped plane fails there with the
 * server's message).
 */
function uploadInputOf(cap: UploadCapability, input: UploadOpInput): Record<string, unknown> {
	const inputFields = new Set(cap.inputFieldNames ?? []);
	const has = (name: string) => inputFields.size === 0 || inputFields.has(name);
	const bucket = input.bucketKey !== undefined
		? (has('bucketKey') ? { bucketKey: input.bucketKey } : {})
		: (has('isPublic') ? { isPublic: input.isPublic ?? true } : {});
	return {
		...bucket,
		...(input.databaseId !== undefined && inputFields.has('databaseId') ? { databaseId: input.databaseId } : {}),
		contentHash: input.contentHash,
		contentType: input.contentType,
		size: input.size,
		...(has('filename') ? { filename: input.filename } : {}),
	};
}

function uploadMutation(cap: UploadCapability, payloadFields: readonly string[]): string {
	return `
		mutation SheetsUpload($input: ${cap.inputTypeName}!) {
			${cap.uploadFieldName}(input: $input) {
				${payloadFields.join('\n\t\t\t\t')}
			}
		}
	`.trim();
}

/** Payload fields of the earlier API, selected when the op's payload fields are not known. */
const LEGACY_PAYLOAD_FIELDS = ['uploadUrl', 'fileId', 'key', 'deduplicated', 'file'] as const;

/** Invoke a discovered upload op and normalize its payload (strict: see `readUploadPayload`). */
export async function requestDiscoveredUpload(
	execute: SheetsExecuteFn,
	cap: UploadCapability,
	input: UploadOpInput,
	signal?: AbortSignal,
): Promise<UploadPayload> {
	const payloadFields = cap.payloadFieldNames?.length
		? UPLOAD_PAYLOAD_FIELDS.filter((name) => cap.payloadFieldNames!.includes(name))
		: LEGACY_PAYLOAD_FIELDS;
	const data = await execute<Record<string, unknown>>(uploadMutation(cap, payloadFields), { input: uploadInputOf(cap, input) }, { signal });
	return readUploadPayload(data?.[cap.uploadFieldName]);
}

/** The payload of the earlier API: the server's answer as it was sent. */
export interface LegacyUploadPayload {
	uploadUrl: string | null;
	fileId: string;
	key: string;
	deduplicated: boolean;
	file: Omit<SheetsFileValue, 'filename'> & { filename?: string | null };
}

/**
 * Earlier API: send the discovered upload op and return its payload as the
 * server sent it. The file projection must carry an id, key, bucket, type and
 * size, and nothing is added to it. A new file without an `uploadUrl` is left
 * to the caller, which knows the `fileId` and can remove the row.
 */
export async function callUploadOp(
	execute: SheetsExecuteFn,
	cap: UploadCapability,
	input: UploadOpInput,
): Promise<LegacyUploadPayload> {
	const data = await execute<Record<string, LegacyUploadPayload | null>>(uploadMutation(cap, LEGACY_PAYLOAD_FIELDS), {
		input: uploadInputOf(cap, input),
	});
	const payload = data?.[cap.uploadFieldName];
	if (!payload) {
		throw createError.badRequest('Upload failed: no payload returned from upload mutation.');
	}
	const file = payload.file;
	if (
		!file || typeof file.id !== 'string' || typeof file.key !== 'string' ||
		typeof file.bucket_id !== 'string' || typeof file.mime !== 'string' || typeof file.size !== 'number'
	) {
		throw createError.badRequest('Upload failed: server returned an invalid file projection.');
	}
	return payload;
}

function projectionToFileValue(file: FileProjection, fallbackName: string, fallbackMime: string): SheetsFileValue {
	return {
		...file,
		bucket_id: typeof file.bucket_id === 'string' ? file.bucket_id : '',
		mime: typeof file.mime === 'string' ? file.mime : fallbackMime,
		size: typeof file.size === 'number' ? file.size : 0,
		filename: typeof file.filename === 'string' ? file.filename : fallbackName,
	};
}

/**
 * An uploader over the fallback discovery, for hosts that call
 * `createSheetsUpload` directly. The grid uses the model-driven path instead.
 */
export function createPresignedSheetsUpload(
	{ endpoint, execute }: SheetsStorageTransport,
	bucketKey?: string,
): SheetsUploadFn {
	return async (file, _path, options) => {
		if (!endpoint) throw createError.badRequest('No GraphQL endpoint configured.');
		const cap = await discoverUploadCapability(endpoint, execute);
		if (!cap.hasFileProjection) {
			throw createError.badRequest('Uploads require a storage mutation that returns a file projection.');
		}
		let payload: UploadPayload;
		try {
			payload = await transferFile(
				file,
				(input) => requestDiscoveredUpload(execute, cap, { ...input, bucketKey }),
				{ onProgress: options?.onProgress },
			);
		} catch (error) {
			throw withUnfinishedUpload(error, { filesType: cap.download?.fileTypeName ?? null });
		}
		const result: SheetsUploadResult = {
			file: projectionToFileValue(payload.file, file.name, file.type || 'application/octet-stream'),
		};
		if (!cap.download) return result;
		try {
			return { ...result, url: await fetchDownloadUrl(execute, cap.download, payload.fileId) };
		} catch {
			// The upload succeeded. The download URL can be requested again later.
			return result;
		}
	};
}

// ============================================================================
// Fallback: downloadUrl resolution
// ============================================================================

/** Encode a PostGraphile global id with the default base64JSON codec. */
function toGlobalId(typeName: string, id: string): string {
	if (typeof btoa !== 'function') {
		throw createError.badRequest('Cannot encode the file node id: btoa is unavailable in this environment.');
	}
	return btoa(JSON.stringify([typeName, id]));
}

/** Resolve one file's download URL through a discovered accessor. The URL can expire. */
export async function fetchDownloadUrl(execute: SheetsExecuteFn, cap: DownloadByIdResult, fileId: string): Promise<string> {
	const missing = () => createError.badRequest('Upload succeeded but no downloadUrl was returned for the file.');
	if (cap.fileByIdArgName === 'nodeId') {
		const nodeId = toGlobalId(cap.fileTypeName, fileId);
		const query = `
			query SheetsDownloadUrl($nodeId: ID!) {
				${cap.fileByIdField}(nodeId: $nodeId) {
					... on ${cap.fileTypeName} {
						downloadUrl
					}
				}
			}
		`.trim();
		const data = await execute<Record<string, { downloadUrl?: string | null } | null>>(query, { nodeId });
		const url = data?.[cap.fileByIdField]?.downloadUrl;
		if (!url) throw missing();
		return url;
	}

	if (cap.fileByIdArgName === 'connection') {
		const idScalar = cap.idScalarName ?? 'ID';
		const filterArg = cap.connectionFilterArgName as string;
		const idField = cap.connectionIdField as string;
		const nodesField = cap.connectionNodesField as string;
		const filterLiteral = cap.connectionIdOperator
			? `{ ${idField}: { ${cap.connectionIdOperator}: $id } }`
			: `{ ${idField}: $id }`;
		const query = `
			query SheetsDownloadUrl($id: ${idScalar}!) {
				${cap.fileByIdField}(${filterArg}: ${filterLiteral}${cap.connectionHasFirst ? ', first: 1' : ''}) {
					${nodesField} {
						downloadUrl
					}
				}
			}
		`.trim();
		const data = await execute<Record<string, Record<string, Array<{ downloadUrl?: string | null }> | null> | null>>(
			query,
			{ id: fileId },
		);
		const url = data?.[cap.fileByIdField]?.[nodesField]?.[0]?.downloadUrl;
		if (!url) throw missing();
		return url;
	}

	const idScalar = cap.idScalarName ?? 'ID';
	const query = `
		query SheetsDownloadUrl($id: ${idScalar}!) {
			${cap.fileByIdField}(id: $id) {
				id
				downloadUrl
			}
		}
	`.trim();
	const data = await execute<Record<string, { downloadUrl?: string | null } | null>>(query, { id: fileId });
	const url = data?.[cap.fileByIdField]?.downloadUrl;
	if (!url) throw missing();
	return url;
}

/** Resolve URLs for one batch of visible files through the fallback discovery. Missing IDs have no entry. */
export async function fetchMediaDownloadUrls(
	{ endpoint, execute }: SheetsStorageTransport,
	getActiveIds: () => readonly string[],
): Promise<Map<string, string>> {
	const { batch, download } = await discoverStorageCapabilities(endpoint, execute);
	const ids = getActiveIds();
	const urls = new Map<string, string>();
	if (ids.length === 0) return urls;
	if (batch) {
		const first = batch.connectionHasFirst ? `, first: ${ids.length}` : '';
		const query = `query SheetsMediaDownloadUrls($ids: [${batch.idScalarName ?? 'ID'}!]!) {
			${batch.fileByIdField}(${batch.connectionFilterArgName}: {
				${batch.connectionIdField}: { in: $ids }
			}${first}) { ${batch.connectionNodesField} { id downloadUrl } }
		}`;
		type FileNode = { id: string; downloadUrl: string | null };
		const data = await execute<Record<string, Record<string, (FileNode | null)[] | null> | null>>(query, { ids });
		for (const row of data?.[batch.fileByIdField]?.[batch.connectionNodesField!] ?? []) {
			if (row?.downloadUrl) urls.set(row.id, row.downloadUrl);
		}
	} else if (download) {
		const results = await Promise.allSettled(ids.map((id) => fetchDownloadUrl(execute, download, id)));
		results.forEach((result, index) => {
			if (result.status === 'fulfilled') urls.set(ids[index]!, result.value);
		});
	}
	return urls;
}

/**
 * Resolve a file's signed `downloadUrl` by id, for callers outside the grid
 * (a storage browser's copy link). Returns null on any failure.
 */
export async function resolveDownloadUrl(execute: SheetsExecuteFn, endpoint: string, fileId: string): Promise<string | null> {
	try {
		const { download } = await discoverStorageCapabilities(endpoint, execute);
		return download ? await fetchDownloadUrl(execute, download, fileId) : null;
	} catch {
		return null;
	}
}
