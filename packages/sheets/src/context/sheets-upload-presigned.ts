/**
 * Presigned-URL upload helpers for the sheets cell-upload seam.
 *
 * Replaces the legacy multipart `<endpoint>/upload` POST. The flow is:
 *   1. SHA-256 hash the file bytes (Web Crypto, zero new deps)
 *   2. Call the presigned upload op (discovered via introspection) to get a
 *      presigned PUT url + fileId
 *   3. PUT the raw bytes to that url (only Content-Type, NO Authorization)
 *   4. Resolve the stable public `downloadUrl` for the fileId
 *
 * `confirmUpload` is intentionally skipped: the backend plugin creates the file
 * row inside the upload op, so `downloadUrl` resolves immediately.
 *
 * The upload op is discovered via runtime introspection, matched by FIELD/TYPE
 * SHAPE (never a hardcoded name): a root mutation `upload<Type>File(input: {...})`
 * whose input + payload carry the upload shape.
 *
 * The downloadUrl-by-id field is likewise shape-discovered. Three read shapes,
 * preferred in order: the inflected singular `appFile(id:)`; a filtered
 * connection `appFiles(where:{id:{equalTo:$id}}){ nodes { downloadUrl } }`
 * (Relay-disabled backends); and the Relay `node(nodeId:)` fallback.
 */

import { getIntrospectionQuery } from 'graphql';

import { createError } from '@constructive-io/data';

import type { SheetsExecuteFn } from './sheets-execute';

// ============================================================================
// Capability discovery types
// ============================================================================

export interface UploadCapability {
	/** Upload mutation field name, discovered by shape, e.g. 'uploadAppFile'. */
	uploadFieldName: string;
	/** The upload input object type name, e.g. 'UploadAppFileInput'. */
	inputTypeName: string;
	/** Query field used to resolve the stable downloadUrl by id, e.g. 'appFile' | 'node' | 'appFiles'. */
	fileByIdField: string;
	/**
	 * Which downloadUrl-by-id resolution shape was discovered:
	 *   - 'id'         inflected singular `appFile(id:)`
	 *   - 'connection' filtered connection `appFiles(where:{id:{equalTo:$id}}){ nodes { downloadUrl } }`
	 *   - 'nodeId'     Relay `node(nodeId:)` (last-resort fallback)
	 */
	fileByIdArgName: 'id' | 'nodeId' | 'connection';
	/** The file object type name (used to spread `... on <Type>` on the Relay node path). */
	fileTypeName: string;
	/** The GraphQL scalar type name for the `$id` variable (e.g. 'UUID'), discovered by shape. */
	idScalarName?: string;
	/** connection kind only — the filter arg name on the connection field, e.g. 'where' | 'filter' | 'condition'. */
	connectionFilterArgName?: string;
	/** connection kind only — the id field name inside the filter input, e.g. 'id'. */
	connectionIdField?: string;
	/** connection kind only — the equality operator field for style (a), e.g. 'equalTo'. Absent for condition style (b). */
	connectionIdOperator?: string;
	/** connection kind only — the field on the connection object holding the file rows, e.g. 'nodes'. */
	connectionNodesField?: string;
}

interface UploadPayload {
	uploadUrl: string | null;
	fileId: string;
	key: string;
	deduplicated: boolean;
}

// ============================================================================
// SHA-256 (Web Crypto)
// ============================================================================

/**
 * SHA-256 hex digest of an already-read ArrayBuffer. Lowercase, 64 chars —
 * matches the server regex `^[a-f0-9]{64}$`. We reuse the same buffer for the
 * PUT body to avoid a second `file.arrayBuffer()` read.
 */
export async function sha256HexFromBuffer(buffer: ArrayBuffer): Promise<string> {
	if (!globalThis.crypto?.subtle) {
		throw createError.badRequest('Web Crypto (crypto.subtle) is unavailable; cannot hash file for upload.');
	}
	const digest = await crypto.subtle.digest('SHA-256', buffer);
	const bytes = new Uint8Array(digest);
	let hex = '';
	for (let i = 0; i < bytes.length; i++) {
		hex += bytes[i].toString(16).padStart(2, '0');
	}
	return hex;
}

// ============================================================================
// Introspection-based capability discovery (cached per endpoint)
// ============================================================================

const capabilityCache = new Map<string, Promise<UploadCapability>>();

/** Test-only: clear the per-endpoint capability cache between cases. */
export function __resetUploadCapabilityCache(): void {
	capabilityCache.clear();
}

/**
 * Discover the upload op + downloadUrl-by-id field for an endpoint, by shape.
 * Cached per `endpoint`; concurrent uploads share one in-flight introspection.
 */
export function discoverUploadCapability(endpoint: string, execute: SheetsExecuteFn): Promise<UploadCapability> {
	const cached = capabilityCache.get(endpoint);
	if (cached) return cached;

	const promise = (async () => {
		const data = await execute<{ __schema: IntrospectionSchema }>(getIntrospectionQuery());
		const schema = data?.__schema;
		if (!schema) {
			throw createError.badRequest('Uploads are not enabled for this endpoint.');
		}
		return resolveUploadCapability(schema);
	})();

	// Don't cache a rejected discovery — let the next attempt retry.
	promise.catch(() => capabilityCache.delete(endpoint));
	capabilityCache.set(endpoint, promise);
	return promise;
}

// --- Minimal introspection shapes (only what discovery reads) ---

// Loose, structural shapes for the slice of introspection that discovery
// reads. `ofType` recurses with `any` so hand-built fixtures and the real
// `IntrospectionQuery['__schema']` (from `graphql`) both satisfy these without
// exact-match friction — discovery validates by runtime shape regardless.
interface IntrospectionTypeRef {
	kind: string;
	name?: string | null;
	ofType?: any;
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

/** Loose structural shape of an introspection `__schema` (accepts fixtures + real). */
export interface IntrospectionSchema {
	queryType?: { name: string } | null;
	mutationType?: { name: string } | null;
	types: ReadonlyArray<IntrospectionType>;
}

/** Unwrap NON_NULL / LIST wrappers down to the named type. */
function namedTypeName(ref: IntrospectionTypeRef | null | undefined): string | null {
	let cur = ref;
	while (cur && (cur.kind === 'NON_NULL' || cur.kind === 'LIST')) {
		cur = cur.ofType ?? null;
	}
	return cur?.name ?? null;
}

/**
 * True if `ref` is a LIST (optionally NON_NULL-wrapped) at the outer level, i.e.
 * the field is plural. Unwraps only leading NON_NULL wrappers (e.g. `[AppFile]!`)
 * before checking for the LIST — distinguishes `nodes: [AppFile]` from a singular
 * `appFile: AppFile`.
 */
function isListTypeRef(ref: IntrospectionTypeRef | null | undefined): boolean {
	let cur = ref;
	while (cur && cur.kind === 'NON_NULL') {
		cur = cur.ofType ?? null;
	}
	return cur?.kind === 'LIST';
}

/**
 * PostGraphile names the primary-key column `id` on every row type, so the
 * filter input field that selects a single file by primary key is `id`. This is
 * the same convention the singular by-id branch (`appFile(id:)`) relies on.
 */
const PK_FIELD_NAME = 'id';

/**
 * Pure resolver over an introspection __schema. Exported for direct unit tests
 * (no fetch). Matches by field/type SHAPE, never by a literal name.
 */
export function resolveUploadCapability(schema: IntrospectionSchema): UploadCapability {
	const typeByName = new Map<string, IntrospectionType>();
	for (const t of schema.types) {
		if (t.name) typeByName.set(t.name, t);
	}

	const objectHasFields = (typeName: string | null, names: string[]): boolean => {
		if (!typeName) return false;
		const t = typeByName.get(typeName);
		if (!t?.fields) return false;
		const present = new Set(t.fields.map((f) => f.name));
		return names.every((n) => present.has(n));
	};

	const inputHasFields = (typeName: string | null, names: string[]): boolean => {
		if (!typeName) return false;
		const t = typeByName.get(typeName);
		if (!t?.inputFields) return false;
		const present = new Set(t.inputFields.map((f) => f.name));
		return names.every((n) => present.has(n));
	};

	const PAYLOAD_FIELDS = ['uploadUrl', 'fileId', 'deduplicated'];
	const INPUT_FIELDS = ['contentHash', 'bucketKey', 'contentType', 'size'];

	const mutationType = schema.mutationType ? typeByName.get(schema.mutationType.name) : null;
	const queryType = schema.queryType ? typeByName.get(schema.queryType.name) : null;

	// rootUpload discovery: a Mutation field with a single `input` arg whose input
	// type carries the upload-input shape and whose payload carries the
	// upload-payload shape. (The legacy bucket-centric `requestUploadUrl` shape was
	// removed from the backend on 2026-05-08; only the root upload mutation exists.)
	let upload: Pick<UploadCapability, 'uploadFieldName' | 'inputTypeName'> | null = null;

	for (const field of mutationType?.fields ?? []) {
		const inputArg = field.args.find((a) => a.name === 'input');
		if (!inputArg) continue;
		const inputTypeName = namedTypeName(inputArg.type);
		const payloadTypeName = namedTypeName(field.type);
		if (
			inputHasFields(inputTypeName, INPUT_FIELDS) &&
			objectHasFields(payloadTypeName, PAYLOAD_FIELDS)
		) {
			upload = { uploadFieldName: field.name, inputTypeName: inputTypeName as string };
			break;
		}
	}

	if (!upload) {
		throw createError.badRequest('Uploads are not enabled for this endpoint.');
	}

	// --- File object type + by-id field for downloadUrl ---
	const downloadById = resolveDownloadByIdField(schema, typeByName, queryType, upload.uploadFieldName);

	return {
		...upload,
		...downloadById,
	};
}

type DownloadByIdResult = Omit<UploadCapability, 'uploadFieldName' | 'inputTypeName'>;

function resolveDownloadByIdField(
	schema: IntrospectionSchema,
	typeByName: Map<string, IntrospectionType>,
	queryType: IntrospectionType | null | undefined,
	uploadFieldName: string,
): DownloadByIdResult {
	// The file object type carries a `downloadUrl` field (grounded on
	// download-url-field.ts which adds `downloadUrl: String` to @storageFiles).
	const fileTypesWithDownloadUrl = new Set<string>();
	for (const t of schema.types) {
		if (t.kind === 'OBJECT' && t.name && t.fields?.some((f) => f.name === 'downloadUrl')) {
			fileTypesWithDownloadUrl.add(t.name);
		}
	}

	// 1. Prefer the inflected by-id form: a Query field whose return type has a
	//    `downloadUrl` field and that takes a single `id` arg. e.g. appFile(id:).
	//    The `$id` variable type is the actual scalar of that id arg (NOT a
	//    hardcoded UUID) — derived by shape.
	for (const field of queryType?.fields ?? []) {
		const returnTypeName = namedTypeName(field.type);
		if (!returnTypeName || !fileTypesWithDownloadUrl.has(returnTypeName)) continue;
		if (field.args.length === 1 && field.args[0].name === PK_FIELD_NAME) {
			return {
				fileByIdField: field.name,
				fileByIdArgName: 'id',
				fileTypeName: returnTypeName,
				idScalarName: namedTypeName(field.args[0].type) ?? undefined,
			};
		}
	}

	// 2. Connection fallback (Relay-disabled backends, incl. the live tenant API):
	//    a Query field returning a connection whose `nodes` element is a
	//    downloadUrl-bearing file type, filtered by id. e.g.
	//      appFiles(where: { id: { equalTo: $id } }, first: 1) { nodes { downloadUrl } }
	//    All names (connection field, filter arg, id field, equality operator,
	//    nodes field, id scalar) are discovered by SHAPE, never hardcoded.
	//    Preferred over the Relay node path: it consumes the raw fileId directly,
	//    so it needs no client-side global-id construction.
	const connection = resolveConnectionDownloadField(typeByName, queryType, fileTypesWithDownloadUrl, uploadFieldName);
	if (connection) return connection;

	// 3. Relay fallback: `node(nodeId: ID!)`. Last resort — only when neither a
	//    singular `id` accessor nor a filtered connection exists. Caller spreads
	//    `... on <FileType> { downloadUrl }` and encodes the global id.
	const nodeField = queryType?.fields?.find(
		(f) => f.name === 'node' && f.args.some((a) => a.name === 'nodeId'),
	);
	if (nodeField && fileTypesWithDownloadUrl.size > 0) {
		// Deterministic file type for the inline fragment: prefer the type named
		// after the upload op (uploadAppFile → AppFile); else the first-declared
		// downloadUrl-bearing type. (Was alphabetical `.sort()[0]`, which could pick
		// the wrong type when several expose downloadUrl, e.g. DataRoomFile.)
		const preferred = uploadFieldName.replace(/^upload/, '');
		const fileTypeName = fileTypesWithDownloadUrl.has(preferred)
			? preferred
			: [...fileTypesWithDownloadUrl][0];
		return { fileByIdField: 'node', fileByIdArgName: 'nodeId', fileTypeName };
	}

	throw createError.badRequest('Uploads are not enabled for this endpoint.');
}

/**
 * Discover a filtered-connection downloadUrl-by-id path. Returns null if the
 * schema exposes no such connection. Supports two filter input styles:
 *   (a) operator filter  — `where: { id: { equalTo: $id } }` (connection-filter
 *       plugin): the id field's input type carries an equality operator.
 *   (b) condition filter — `condition: { id: $id }`: the id field is the scalar
 *       directly.
 */
function resolveConnectionDownloadField(
	typeByName: Map<string, IntrospectionType>,
	queryType: IntrospectionType | null | undefined,
	fileTypesWithDownloadUrl: Set<string>,
	uploadFieldName: string,
): DownloadByIdResult | null {
	// Equality operator names we recognize on a filter-input field, in priority
	// order (exact-match equality first).
	const EQUALITY_OPERATORS = ['equalTo', 'eq'];

	// Collect every matching connection, then pick deterministically — a tenant
	// with multiple @storageFiles tables exposes several file connections
	// (appFiles, dataRoomFiles, …), all carrying downloadUrl-bearing nodes.
	const candidates: DownloadByIdResult[] = [];

	for (const field of queryType?.fields ?? []) {
		const connTypeName = namedTypeName(field.type);
		if (!connTypeName) continue;
		const connType = typeByName.get(connTypeName);
		if (connType?.kind !== 'OBJECT' || !connType.fields) continue;

		// Find the `nodes` field whose element type is a downloadUrl-bearing file.
		// Require it to be a LIST (plural) so a singular `appFile: AppFile` field on
		// some object does NOT false-match as a connection (fetchDownloadUrl indexes
		// [nodesField][0], which only makes sense on an array).
		const nodesField = connType.fields.find((f) => {
			if (!isListTypeRef(f.type)) return false;
			const elem = namedTypeName(f.type);
			return elem != null && fileTypesWithDownloadUrl.has(elem);
		});
		if (!nodesField) continue;
		const fileTypeName = namedTypeName(nodesField.type) as string;

		// Find a filter arg whose input type has an `id` field.
		for (const arg of field.args) {
			const filterTypeName = namedTypeName(arg.type);
			const filterType = filterTypeName ? typeByName.get(filterTypeName) : null;
			if (filterType?.kind !== 'INPUT_OBJECT' || !filterType.inputFields) continue;
			const idField = filterType.inputFields.find((f) => f.name === PK_FIELD_NAME);
			if (!idField) continue;

			const idFieldTypeName = namedTypeName(idField.type);
			const idFieldType = idFieldTypeName ? typeByName.get(idFieldTypeName) : null;

			// Style (a): the id field is itself an input type carrying an equality
			// operator (e.g. UUIDFilter.equalTo). The `$id` scalar is the operator's
			// type.
			if (idFieldType?.kind === 'INPUT_OBJECT' && idFieldType.inputFields) {
				const opField = EQUALITY_OPERATORS.map((op) =>
					idFieldType.inputFields!.find((f) => f.name === op),
				).find((f) => f != null);
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
					});
					break;
				}
				// id field is an input object but with no recognized equality op — skip.
				continue;
			}

			// Style (b): the id field is a scalar directly (condition style). The
			// `$id` scalar is that field's type.
			if (idFieldType?.kind === 'SCALAR' || (!idFieldType && idFieldTypeName)) {
				candidates.push({
					fileByIdField: field.name,
					fileByIdArgName: 'connection',
					fileTypeName,
					idScalarName: idFieldTypeName ?? undefined,
					connectionFilterArgName: arg.name,
					connectionIdField: idField.name,
					connectionNodesField: nodesField.name,
				});
				break;
			}
		}
	}

	if (candidates.length === 0) return null;

	// Deterministic pick: prefer the connection whose file type matches the upload
	// op (uploadAppFile → AppFile), else the first-declared. This is the LIVE
	// production path — the only downloadUrl shape on a Relay-disabled, unique-
	// lookup-disabled tenant API — so resolving the WRONG file connection (e.g.
	// reading a DataRoomFile id through appFiles) yields 0 nodes and fails every
	// upload. Mirrors the node-branch determinism, where it matters far more.
	const preferred = uploadFieldName.replace(/^upload/, '');
	return candidates.find((c) => c.fileTypeName === preferred) ?? candidates[0];
}

// ============================================================================
// Upload op call
// ============================================================================

interface UploadOpInput {
	bucketKey: string;
	contentHash: string;
	contentType: string;
	size: number;
	filename: string;
}

/**
 * Invoke the discovered upload op and normalize its payload.
 * App-scoped buckets have NO owner_id column, so `ownerId` is NEVER sent.
 */
export async function callUploadOp(
	execute: SheetsExecuteFn,
	cap: UploadCapability,
	input: UploadOpInput,
): Promise<UploadPayload> {
	const mutation = `
		mutation SheetsUpload($input: ${cap.inputTypeName}!) {
			${cap.uploadFieldName}(input: $input) {
				uploadUrl
				fileId
				key
				deduplicated
			}
		}
	`.trim();
	const data = await execute<Record<string, UploadPayload | null>>(mutation, {
		input: {
			bucketKey: input.bucketKey,
			contentHash: input.contentHash,
			contentType: input.contentType,
			size: input.size,
			filename: input.filename,
		},
	});
	const payload = data?.[cap.uploadFieldName];
	if (!payload) {
		throw createError.badRequest('Upload failed: no payload returned from upload mutation.');
	}
	return payload;
}

// ============================================================================
// Presigned PUT
// ============================================================================

/**
 * PUT the raw bytes to the presigned url. Sends ONLY the signed `Content-Type`
 * header — NO Authorization (the signature lives in the url query string), no
 * cookies, no Accept override. The browser supplies Content-Length from the body.
 *
 * When `onProgress` is provided and XHR is available, uses XHR for byte
 * progress; otherwise a plain fetch PUT.
 */
export async function presignedPut(
	url: string,
	buffer: ArrayBuffer,
	contentType: string,
	onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void,
): Promise<void> {
	const total = buffer.byteLength;

	if (onProgress && typeof XMLHttpRequest !== 'undefined') {
		await putWithXHR(url, buffer, contentType, total, onProgress);
		return;
	}

	let response: Response;
	try {
		response = await fetch(url, {
			method: 'PUT',
			headers: { 'Content-Type': contentType },
			body: buffer,
		});
	} catch (error) {
		throw createError.network(error instanceof Error ? error : undefined);
	}

	if (!response.ok) {
		const body = await response.text().catch(() => '');
		throw createError.badRequest(`Upload failed: ${response.status} ${response.statusText}${body ? ` — ${body}` : ''}`);
	}
	onProgress?.({ loaded: total, total, percentage: 100 });
}

function putWithXHR(
	url: string,
	buffer: ArrayBuffer,
	contentType: string,
	total: number,
	onProgress: (progress: { loaded: number; total: number; percentage: number }) => void,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open('PUT', url);
		xhr.setRequestHeader('Content-Type', contentType);

		xhr.upload.addEventListener('progress', (event) => {
			if (event.lengthComputable) {
				onProgress({
					loaded: event.loaded,
					total: event.total,
					percentage: Math.round((event.loaded / event.total) * 100),
				});
			}
		});

		xhr.addEventListener('load', () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				onProgress({ loaded: total, total, percentage: 100 });
				resolve();
			} else {
				reject(createError.badRequest(`Upload failed: ${xhr.status} ${xhr.statusText}${xhr.responseText ? ` — ${xhr.responseText}` : ''}`));
			}
		});

		xhr.addEventListener('error', () => reject(createError.network()));

		xhr.send(buffer);
	});
}

// ============================================================================
// downloadUrl resolution
// ============================================================================

/**
 * Encode a PostGraphile global id (Relay `node` id) from a row's primary key,
 * using the default base64JSON codec: `base64(JSON.stringify([typeName, pk]))`.
 */
function toGlobalId(typeName: string, id: string): string {
	if (typeof btoa !== 'function') {
		throw createError.badRequest('Cannot encode the file node id: btoa is unavailable in this environment.');
	}
	return btoa(JSON.stringify([typeName, id]));
}

/**
 * Resolve the stable public download URL for a file id via the discovered
 * by-id field. For public files the backend returns a permanent public URL
 * (its exact path shape is the backend's concern) — stored opaquely in the cell.
 */
export async function fetchDownloadUrl(
	execute: SheetsExecuteFn,
	cap: UploadCapability,
	fileId: string,
): Promise<string> {
	if (cap.fileByIdArgName === 'nodeId') {
		// The upload payload returns the RAW primary key as `fileId`, but
		// `node(nodeId:)` expects the opaque PostGraphile global id. Encode it with
		// the default base64JSON codec (`base64([typeName, pk])`). NOTE: the live
		// tenant API is Relay-disabled and resolves via the connection branch; this
		// path is mock-covered only and assumes the default node-id codec.
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
		const node = data?.[cap.fileByIdField];
		const url = node?.downloadUrl;
		if (!url) {
			throw createError.badRequest('Upload succeeded but no downloadUrl was returned for the file.');
		}
		return url;
	}

	// Connection fallback (Relay-disabled): filter the connection by id and read
	// the first node's downloadUrl. The filter literal is built per the discovered
	// style — operator (`{ id: { equalTo: $id } }`) or condition (`{ id: $id }`).
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
				${cap.fileByIdField}(${filterArg}: ${filterLiteral}, first: 1) {
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
		const conn = data?.[cap.fileByIdField];
		const url = conn?.[nodesField]?.[0]?.downloadUrl;
		if (!url) {
			throw createError.badRequest('Upload succeeded but no downloadUrl was returned for the file.');
		}
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
	const file = data?.[cap.fileByIdField];
	const url = file?.downloadUrl;
	if (!url) {
		throw createError.badRequest('Upload succeeded but no downloadUrl was returned for the file.');
	}
	return url;
}

/**
 * Resolve a file's signed `downloadUrl` by id — the public entry point for callers
 * OUTSIDE the upload flow (e.g. a storage browser fetching the preview/copy link for
 * an already-uploaded file).
 *
 * `downloadUrl` is a Grafast computed field, so it cannot be selected through the
 * runtime query builder (`buildSelect` intersects the select against pg columns and
 * drops computed fields). This discovers the by-id field once per endpoint (cached)
 * and reads it through the SAME resolver the upload path uses. Returns null on any
 * failure — a missing url is not exceptional for the caller (it just disables
 * copy/download), so the throwing internals are swallowed here.
 */
export async function resolveDownloadUrl(
	execute: SheetsExecuteFn,
	endpoint: string,
	fileId: string,
): Promise<string | null> {
	try {
		const cap = await discoverUploadCapability(endpoint, execute);
		return await fetchDownloadUrl(execute, cap, fileId);
	} catch {
		return null;
	}
}
