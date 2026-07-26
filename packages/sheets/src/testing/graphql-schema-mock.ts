/**
 * Schema-driven GraphQL test mocks for the presigned upload seam.
 *
 * Two tiers, both built on the `graphql` lib (already a dep of this package —
 * ZERO new deps):
 *
 *   Tier 1 — `buildIntrospection(sdl)`: derives a real, spec-complete
 *     `{ __schema }` from SDL via `introspectionFromSchema(buildSchema(sdl))`.
 *     Replaces hand-written introspection JSON for the pure
 *     `resolveUploadCapability(schema)` discovery tests.
 *
 *   Tier 2 — `makeSchemaExecute(sdl, rootValue)`: an injectable executor that
 *     runs the seam's dynamically-built query/mutation STRINGS through
 *     graphql-js. graphql-js answers the introspection query natively, so ONE
 *     executor handles introspection + the upload op + the downloadUrl query
 *     uniformly. A malformed field/arg (or a stray input field the schema does
 *     not declare, e.g. `ownerId`) now FAILS the test at coercion/validation,
 *     before any resolver runs — that is the whole point of executing for real.
 *
 *     CAVEAT (covered by `onVariables`): graphql-js coerces variables AGAINST
 *     THE OPERATION'S declared `$vars`, but it does NOT reject an extra,
 *     undeclared key that appears in the `variableValues` OBJECT — it returns
 *     `errors: null` and simply ignores it. (It only errors if the operation
 *     TEXT declares a variable it never uses, e.g. "$input is never used".) So a
 *     regression that smuggles a stray key into the variables object — e.g. a
 *     leftover `input` leaking into the downloadUrl query's `{ id }` variables —
 *     would pass silently. To preserve the old `not.toHaveProperty('input')` /
 *     exact-variables guards, callers pass `onVariables(source, variables)` and
 *     assert on the raw object directly.
 *
 *   Tier 1.5 — `graphqlFetchFromSchema(sdl, rootValue, { onPut })`: a `fetch`
 *     impl that runs GraphQL POSTs through the schema and lets the S3 PUT
 *     through. For the factory-seam path where `execute` is NOT injected (it is
 *     built from endpoint/getToken over real fetch) — so those tests also
 *     validate every GraphQL document's shape.
 *
 * Sent inputs are captured via the `rootValue` resolvers (e.g.
 * `uploadAppFile: (args) => { captured = args.input; ... }`), which both
 * replaces and strengthens spy.mock.calls string-matching.
 *
 * This module is imported DIRECTLY by the *.test.ts files — NOT re-exported
 * from `src/testing/index.ts` — so graphql-js's schema-construction + execution
 * engine never leaks into the published `./testing` bundle.
 */

import {
	buildSchema,
	getIntrospectionQuery,
	graphql,
	introspectionFromSchema,
	print,
	type DocumentNode,
	type IntrospectionQuery,
} from 'graphql';

import { createError } from '@constructive-io/data';

import type { SheetsExecuteFn } from '../context/sheets-execute';

// ============================================================================
// SDL fixtures (grounded on graphile-presigned-url-plugin)
// ============================================================================

/**
 * Current-plugin shape: a root `uploadAppFile(input:)` mutation + `appFile(id:)`
 * by-id field. Upload input is app-scoped (NO `ownerId`) — the linchpin of the
 * no-ownerId guarantee. The payload declares the full spec set even though the
 * seam only selects `uploadUrl fileId key deduplicated` (a superset is fine).
 */
export const ROOT_UPLOAD_SDL = `
	scalar UUID
	type AppFile { id: UUID! key: String downloadUrl: String }
	type UploadAppFilePayload {
		uploadUrl: String
		fileId: String!
		key: String!
		deduplicated: Boolean!
		expiresAt: String
		previousVersionId: String
	}
	input UploadAppFileInput {
		bucketKey: String!
		contentHash: String!
		contentType: String!
		size: Int!
		filename: String
		key: String
	}
	type Query { appFile(id: UUID!): AppFile }
	type Mutation { uploadAppFile(input: UploadAppFileInput!): UploadAppFilePayload }
`;

/**
 * Relay-only file resolution: `node(nodeId:)` + `AppFile.downloadUrl`, and NO
 * `appFile(id:)` field — so discovery picks the Relay node path. Tier-1
 * discovery ONLY (never executed), which sidesteps interface `resolveType`.
 */
export const RELAY_ONLY_SDL = `
	scalar UUID
	interface Node { nodeId: ID! }
	type AppFile implements Node { nodeId: ID! id: UUID! downloadUrl: String }
	type UploadAppFilePayload { uploadUrl: String fileId: String! key: String! deduplicated: Boolean! }
	input UploadAppFileInput { bucketKey: String! contentHash: String! contentType: String! size: Int! filename: String }
	type Query { node(nodeId: ID!): Node }
	type Mutation { uploadAppFile(input: UploadAppFileInput!): UploadAppFilePayload }
`;

/**
 * Relay node EXECUTION fixture: `node(nodeId:)` returning the CONCRETE file type
 * (not the Node interface) so graphql-js can execute the downloadUrl query without
 * an interface `resolveType`. Exercises the node branch end-to-end (asserting the
 * global-id base64 encoding), which RELAY_ONLY_SDL (discovery-only) cannot. No
 * `appFile(id:)`, no connection, so discovery reaches the node fallback.
 */
export const NODE_EXEC_SDL = `
	scalar UUID
	type AppFile { id: UUID! downloadUrl: String }
	type UploadAppFilePayload { uploadUrl: String fileId: String! key: String! deduplicated: Boolean! }
	input UploadAppFileInput { bucketKey: String! contentHash: String! contentType: String! size: Int! filename: String }
	type Query { node(nodeId: ID!): AppFile }
	type Mutation { uploadAppFile(input: UploadAppFileInput!): UploadAppFilePayload }
`;

/**
 * Relay-DISABLED backend: file resolution exposes ONLY a filtered connection —
 * NO `appFile(id:)`, NO `node(nodeId:)`. The downloadUrl is read via
 *   appFiles(where: { id: { equalTo: $id } }, first: 1) { nodes { downloadUrl } }
 * The id filter is the connection-filter operator style (`UUIDFilter.equalTo`).
 * Discovery + the seam's downloadUrl query are shape-driven over exactly this.
 */
export const CONNECTION_ONLY_SDL = `
	scalar UUID
	type AppFile { id: UUID! downloadUrl: String }
	type AppFileConnection { nodes: [AppFile] }
	input UUIDFilter { isNull: Boolean equalTo: UUID notEqualTo: UUID }
	input AppFileFilter { id: UUIDFilter }
	type UploadAppFilePayload {
		uploadUrl: String
		fileId: String!
		key: String!
		deduplicated: Boolean!
	}
	input UploadAppFileInput {
		bucketKey: String!
		contentHash: String!
		contentType: String!
		size: Int!
		filename: String
		key: String
	}
	type Query { appFiles(where: AppFileFilter, first: Int): AppFileConnection }
	type Mutation { uploadAppFile(input: UploadAppFileInput!): UploadAppFilePayload }
`;

/**
 * Relay-DISABLED backend, CONDITION filter style (b): file resolution exposes
 * ONLY a connection filtered by a `condition` arg whose id field is the scalar
 * directly — NO operator wrapper, NO `appFile(id:)`, NO `node(nodeId:)`. The
 * downloadUrl is read via
 *   appFiles(condition: { id: $id }, first: 1) { nodes { downloadUrl } }
 * Exercises the condition branch (`{ id: $id }`, no `{ equalTo }`).
 */
export const CONDITION_ONLY_SDL = `
	scalar UUID
	type AppFile { id: UUID! downloadUrl: String }
	type AppFileConnection { nodes: [AppFile] }
	input AppFileCondition { id: UUID }
	type UploadAppFilePayload {
		uploadUrl: String
		fileId: String!
		key: String!
		deduplicated: Boolean!
	}
	input UploadAppFileInput {
		bucketKey: String!
		contentHash: String!
		contentType: String!
		size: Int!
		filename: String
		key: String
	}
	type Query { appFiles(condition: AppFileCondition, first: Int): AppFileConnection }
	type Mutation { uploadAppFile(input: UploadAppFileInput!): UploadAppFilePayload }
`;

/**
 * Relay-DISABLED backend with TWO @storageFiles tables — appFiles(->AppFile) and
 * dataRoomFiles(->DataRoomFile), both downloadUrl-bearing connections. The wrong
 * connection (dataRoomFiles) is declared FIRST, so first-declared order would pick
 * it. Discovery must instead pick the connection whose type matches the upload op
 * (uploadAppFile -> AppFile). Guards the live multi-storage-table production path.
 */
export const CONNECTION_TWO_FILES_SDL = `
	scalar UUID
	type AppFile { id: UUID! downloadUrl: String }
	type DataRoomFile { id: UUID! downloadUrl: String }
	type AppFileConnection { nodes: [AppFile] }
	type DataRoomFileConnection { nodes: [DataRoomFile] }
	input UUIDFilter { isNull: Boolean equalTo: UUID }
	input AppFileFilter { id: UUIDFilter }
	input DataRoomFileFilter { id: UUIDFilter }
	type UploadAppFilePayload { uploadUrl: String fileId: String! key: String! deduplicated: Boolean! }
	input UploadAppFileInput { bucketKey: String! contentHash: String! contentType: String! size: Int! filename: String }
	type Query {
		dataRoomFiles(where: DataRoomFileFilter, first: Int): DataRoomFileConnection
		appFiles(where: AppFileFilter, first: Int): AppFileConnection
	}
	type Mutation { uploadAppFile(input: UploadAppFileInput!): UploadAppFilePayload }
`;

/**
 * The pruned legacy shape: ONLY the old bucketByKey{ requestUploadUrl } upload
 * path + appFile(id:), and NO root upload<Type>File mutation. Proves the removed
 * bucketField path is no longer discovered — resolveUploadCapability must throw.
 */
export const BUCKET_ONLY_SDL = `
	scalar UUID
	type AppFile { id: UUID! downloadUrl: String }
	type RequestUploadUrlPayload { uploadUrl: String fileId: String! key: String! deduplicated: Boolean! }
	type AppBucket {
		id: UUID!
		requestUploadUrl(contentHash: String!, contentType: String!, size: Int!, filename: String): RequestUploadUrlPayload
	}
	type Query { bucketByKey(key: String!): AppBucket  appFile(id: UUID!): AppFile }
`;

/** No matching upload mutation at all — discovery throws before any op runs. */
export const NO_UPLOADS_SDL = `
	scalar UUID
	type AppFile { id: UUID! downloadUrl: String }
	type Query { appFile(id: UUID!): AppFile }
	type Mutation { noop: Boolean }
`;

/**
 * The factory-path flow runs a FOURTH op beyond the three upload ops — the row
 * patch `updateUser(input: UpdateUserInput!)` (use-sheets-upload.ts). Extends
 * the rootUpload SDL with the patch types so `graphqlFetchFromSchema` resolves
 * (and validates the shape of) the patch document too.
 */
export const FACTORY_FLOW_SDL = `
	scalar UUID
	scalar JSON
	type AppFile { id: UUID! key: String downloadUrl: String }
	type UploadAppFilePayload {
		uploadUrl: String
		fileId: String!
		key: String!
		deduplicated: Boolean!
		expiresAt: String
		previousVersionId: String
	}
	input UploadAppFileInput {
		bucketKey: String!
		contentHash: String!
		contentType: String!
		size: Int!
		filename: String
		key: String
	}
	type User { id: UUID! avatar: JSON }
	input UserPatch { avatar: JSON }
	input UpdateUserInput { id: UUID! userPatch: UserPatch }
	type UpdateUserPayload { user: User }
	type Query { appFile(id: UUID!): AppFile }
	type Mutation {
		uploadAppFile(input: UploadAppFileInput!): UploadAppFilePayload
		updateUser(input: UpdateUserInput!): UpdateUserPayload
	}
`;

// ============================================================================
// Tier 1 — real introspection from SDL
// ============================================================================

/**
 * Derive a real, spec-complete introspection `{ __schema }` from SDL. Callers
 * read `.__schema` (the same slice `resolveUploadCapability` consumes). Replaces
 * the hand-written introspection JSON.
 */
export function buildIntrospection(sdl: string): IntrospectionQuery {
	return introspectionFromSchema(buildSchema(sdl));
}

// ============================================================================
// Tier 2 — execute the seam's real strings through graphql-js
// ============================================================================

const INTROSPECTION_MARKERS = ['IntrospectionQuery', '__schema'];

function sourceOf(document: unknown): string {
	if (typeof document === 'string') return document;
	if (document && typeof document === 'object' && 'kind' in (document as DocumentNode)) {
		return print(document as DocumentNode);
	}
	return String(document);
}

/**
 * `onVariables` is invoked for every executed document with the document SOURCE
 * and the raw `variableValues` object — BEFORE coercion. It restores the
 * old variables-level guards (e.g. `not.toHaveProperty('input')`, exact
 * `toEqual({ id })`) that execution alone cannot enforce, because graphql-js
 * silently ignores extra keys in the variables object (see module caveat).
 */
export type OnVariables = (source: string, variables?: Record<string, unknown>) => void;

/**
 * Like `makeSchemaExecute`, but also exposes how many times the introspection
 * query has run — so the capability-cache test can assert "introspect once"
 * without re-introducing string-routing as the transport. Optional
 * `onVariables` lets callers inspect the raw variables object per document.
 */
export function makeSchemaExecuteWithStats(
	sdl: string,
	rootValue: Record<string, unknown>,
	onVariables?: OnVariables,
): { execute: SheetsExecuteFn; introspectionCount: () => number } {
	const schema = buildSchema(sdl);
	let introspections = 0;

	const execute = (async <T = unknown>(
		document: unknown,
		variableValues?: Record<string, unknown>,
	): Promise<T> => {
		const source = sourceOf(document);
		onVariables?.(source, variableValues);
		if (INTROSPECTION_MARKERS.some((m) => source.includes(m))) {
			introspections += 1;
		}
		const res = await graphql({ schema, source, variableValues, rootValue });
		if (res.errors?.length) {
			// graphql-js validation/coercion errors (unknown field, bad arg type,
			// stray input field) surface here as a thrown DataError — failing the
			// test loudly. This is the "malformed field/arg now fails" guarantee.
			throw createError.graphql(res.errors[0].message);
		}
		return res.data as T;
	}) as SheetsExecuteFn;

	return { execute, introspectionCount: () => introspections };
}

/**
 * An injectable executor (`config.execute`) that runs documents through
 * graphql-js. One executor answers introspection (native), the upload op, and
 * the downloadUrl query. Resolvers in `rootValue` capture sent inputs; optional
 * `onVariables` captures the raw variables object per document (variables-level
 * guards execution cannot enforce — see module caveat).
 */
export function makeSchemaExecute(
	sdl: string,
	rootValue: Record<string, unknown>,
	onVariables?: OnVariables,
): SheetsExecuteFn {
	return makeSchemaExecuteWithStats(sdl, rootValue, onVariables).execute;
}

// ============================================================================
// Tier 1.5 — a `fetch` that runs GraphQL POSTs through the schema
// ============================================================================

function jsonResponse(body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
}

/**
 * A `fetch` impl for the factory-seam path (where `execute` is built from
 * endpoint/getToken, not injected). GraphQL POSTs to `<endpoint>/graphql` are
 * parsed and run through the schema — so introspection, the upload op, the
 * downloadUrl query, AND the row-patch mutation are all shape-validated and
 * resolved. The S3 PUT (any non-`/graphql` url) stays a plain `Response`;
 * `onPut` lets a test inject a 403/network condition (the PUT is not GraphQL,
 * so graphql-js cannot execute it).
 */
export function graphqlFetchFromSchema(
	sdl: string,
	rootValue: Record<string, unknown>,
	opts?: { onPut?: (url: string, init?: RequestInit) => Response | Promise<Response> },
): typeof fetch {
	const schema = buildSchema(sdl);

	const impl = async (url: unknown, init?: RequestInit): Promise<Response> => {
		const u = String(url);
		if (u.endsWith('/graphql')) {
			const raw = typeof init?.body === 'string' ? init.body : '{}';
			const { query, variables } = JSON.parse(raw) as {
				query: string;
				variables?: Record<string, unknown>;
			};
			const res = await graphql({ schema, source: query, variableValues: variables, rootValue });
			return jsonResponse({ data: res.data, ...(res.errors ? { errors: res.errors } : {}) });
		}
		// The presigned S3 PUT — non-GraphQL, stays a plain Response.
		return (await opts?.onPut?.(u, init)) ?? new Response('', { status: 200 });
	};

	return impl as unknown as typeof fetch;
}

export { getIntrospectionQuery };
