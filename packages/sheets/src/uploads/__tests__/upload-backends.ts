// Test support: a data API and a storage API over the captured torture schema,
// with the storage service's upload protocol played by a fake.
//
// Both APIs are the model backend (graphql-js against the captured schema),
// each with its own rows, so every document the grid sends is validated the
// way the server would; the model backend also serves the files table's
// download URL (`https://storage.mock/download/<key>`, once a row is live).
// On top of that:
//   • the storage API answers `uploadAppFile` like the presigned upload plugin:
//     it records a files row as `requested`, returns `uploadHeaders`, a file
//     projection (with `url` for a public bucket), or `deduplicated: true` for
//     bytes it already holds live;
//   • `XMLHttpRequest` is replaced by a recording fake that plays the PUT;
//   • a managed file column refuses a write naming a files row that is not live
//     with FILE_REF_FILE_NOT_LIVE, like the server's file reference guard, and
//     the confirm job can be played after a number of refusals.

import { buildClientSchema, graphql, type GraphQLSchema } from 'graphql';

import { createError, type MetaQuery } from '@constructive-io/data';

import { tortureIntrospection, tortureMeta, tortureRows } from '../../adapter/__tests__/torture-backend';
import { withResponseErrors, type SheetsExecuteFn } from '../../context/sheets-execute';
import { createModelBackend, type ModelBackend } from '../../testing/model-backend';

type Row = Record<string, unknown>;

export const tortureMetaOf = (server: 'v2' | 'baseline'): MetaQuery => tortureMeta(server);

export interface RecordedRequest {
	source: string;
	variables: Record<string, unknown> | undefined;
}

export interface RecordedPut {
	url: string;
	headers: Record<string, string>;
	body: unknown;
}

export interface PutAnswer {
	status: number;
	body?: string;
}

export interface UploadBackendsOptions {
	/** `_meta` of the data API. Default: the v2 capture. */
	dataMeta?: MetaQuery;
	/** `_meta` of the storage API. Default: the data API's. */
	storageMeta?: MetaQuery;
	/** Columns (`Table.column`) whose writes check that each file is live. */
	managedColumns?: readonly string[];
	/** The confirm job runs after this many refused writes of a file. Default never. */
	confirmAfterRefusals?: number;
	/** Answer for each PUT. Default 200. `hang` never answers (until aborted). */
	put?: (put: RecordedPut, index: number) => PutAnswer | 'network-error' | 'hang';
	/** The captured server to model: its introspection and `_meta`. Default v2. */
	server?: 'v2' | 'baseline';
	/** Public buckets have a public address, so projections carry `url`. Default true. */
	publicUrls?: boolean;
	/** `expiresAt` of each issued upload URL, by issue order. Default an hour from now. */
	expiresAt?: (index: number) => string;
}

export interface UploadBackends {
	schema: GraphQLSchema;
	data: ModelBackend & { requests: RecordedRequest[] };
	storage: ModelBackend & { requests: RecordedRequest[] };
	puts: RecordedPut[];
	/** PUTs the client aborted. */
	aborted: RecordedPut[];
	/** Every `uploadAppFile` input, in order. */
	uploadInputs: Row[];
	/** Every `uploadAppFile` answer, in order. */
	uploadPayloads: Row[];
	/** Writes refused because a file was not live. */
	refusals: number;
	/** Mark a stored file live, as the confirm job does. */
	confirm(fileId: string): void;
	/** Mark a stored file rejected, as the confirm job does when the bytes do not match. */
	reject(fileId: string): void;
	/** Data-API update mutations, in order. */
	updates(): RecordedRequest[];
}

const LIVE = new Set(['uploaded', 'processed']);

function fileIdsIn(value: unknown, known: (id: string) => boolean): string[] {
	if (Array.isArray(value)) return value.flatMap((item) => fileIdsIn(item, known));
	if (!value || typeof value !== 'object') return [];
	const id = (value as Row).id;
	if (typeof id === 'string' && known(id)) return [id];
	return Object.values(value as Row).flatMap((item) => fileIdsIn(item, known));
}

let nextFile = 1;

/** A recording `XMLHttpRequest` stand-in for presigned PUTs. */
function createFakeXhr(backends: { puts: RecordedPut[]; aborted: RecordedPut[]; answer: (put: RecordedPut, index: number) => PutAnswer | 'network-error' | 'hang' }) {
	return class FakeXhr {
		status = 0;
		statusText = '';
		responseText = '';
		readonly upload = new EventTarget();
		private readonly events = new EventTarget();
		private request: RecordedPut = { url: '', headers: {}, body: null };
		private aborted = false;

		addEventListener(type: string, listener: EventListener) {
			this.events.addEventListener(type, listener);
		}

		open(_method: string, url: string) {
			this.request = { url, headers: {}, body: null };
		}

		setRequestHeader(name: string, value: string) {
			this.request.headers[name] = value;
		}

		send(body: unknown) {
			this.request.body = body;
			const index = backends.puts.length;
			backends.puts.push(this.request);
			const size = body instanceof Blob ? body.size : 0;
			setTimeout(() => {
				if (this.aborted) return;
				this.upload.dispatchEvent(Object.assign(new Event('progress'), { lengthComputable: true, loaded: size / 2, total: size }));
				const answer = backends.answer(this.request, index);
				if (answer === 'hang') return;
				if (answer === 'network-error') {
					this.events.dispatchEvent(new Event('error'));
					return;
				}
				this.status = answer.status;
				this.statusText = answer.status === 200 ? 'OK' : 'Forbidden';
				this.responseText = answer.body ?? '';
				this.events.dispatchEvent(new Event('load'));
			}, 5);
		}

		abort() {
			this.aborted = true;
			backends.aborted.push(this.request);
			this.events.dispatchEvent(new Event('abort'));
		}
	};
}

export function createUploadBackends(options: UploadBackendsOptions = {}): UploadBackends & { FakeXhr: unknown } {
	const server = options.server ?? 'v2';
	const schema = buildClientSchema(tortureIntrospection(server));
	const dataMeta = options.dataMeta ?? tortureMetaOf(server);
	const storageMeta = options.storageMeta ?? dataMeta;
	const dataRows = tortureRows(dataMeta);
	const storageRows = tortureRows(storageMeta);
	const storageFiles = (storageRows.AppFile ??= []);
	const buckets = storageRows.AppBucket ?? [];
	const fileById = (id: string) => storageFiles.find((file) => file.id === id) ?? null;
	const refusalsByFile = new Map<string, number>();

	const dataBackend = createModelBackend({ schema, meta: dataMeta, rows: dataRows });
	const storageBackend = createModelBackend({ schema, meta: storageMeta, rows: storageRows });
	const dataRequests: RecordedRequest[] = [];
	const storageRequests: RecordedRequest[] = [];
	const uploadInputs: Row[] = [];
	const uploadPayloads: Row[] = [];
	const puts: RecordedPut[] = [];
	const aborted: RecordedPut[] = [];
	const state = { refusals: 0 };
	const managed = new Set(options.managedColumns ?? []);

	function reject(fileId: string) {
		const file = fileById(fileId);
		if (file) file.status = 'rejected';
	}

	function confirm(fileId: string) {
		const file = fileById(fileId);
		if (file) file.status = 'uploaded';
	}

	function upload(input: Row): Row {
		uploadInputs.push(input);
		const hash = String(input.contentHash);
		if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error('INVALID_CONTENT_HASH_FORMAT');
		const bucket = typeof input.bucketKey === 'string'
			? buckets.find((candidate) => candidate.key === input.bucketKey)
			: buckets.find((candidate) => candidate.isPublic === (input.isPublic === true));
		if (!bucket) throw new Error('BUCKET_NOT_FOUND');
		const projection = (file: Row) => ({
			id: file.id,
			key: file.key,
			bucket_id: bucket.id,
			mime: file.mimeType,
			size: Number(file.size),
			...(file.filename ? { filename: file.filename } : {}),
			...(bucket.isPublic && options.publicUrls !== false ? { url: `https://cdn.test/${String(file.key)}` } : {}),
		});
		const existing = storageFiles.find((file) => file.key === hash && file.bucketId === bucket.id);
		if (existing && LIVE.has(String(existing.status))) {
			const payload = { uploadUrl: null, uploadHeaders: null, fileId: existing.id, key: hash, deduplicated: true, expiresAt: null, file: projection(existing) };
			uploadPayloads.push(payload);
			return payload;
		}
		if (existing) storageFiles.splice(storageFiles.indexOf(existing), 1);
		const id = `00000000-0000-4000-8000-${String(900 + nextFile++).padStart(12, '0')}`;
		const file: Row = {
			id,
			bucketId: bucket.id,
			key: hash,
			contentHash: hash,
			mimeType: input.contentType,
			size: String(input.size),
			filename: input.filename ?? null,
			status: 'requested',
			isPublic: bucket.isPublic,
		};
		storageFiles.push(file);
		const index = uploadPayloads.length;
		const payload = {
			uploadUrl: `https://s3.test/${hash}?upload=${index}`,
			uploadHeaders: {
				'Content-Type': String(input.contentType),
				'x-amz-checksum-sha256': `checksum-of-${hash.slice(0, 8)}`,
				'x-amz-meta-upload-id': id,
			},
			fileId: id,
			key: hash,
			deduplicated: false,
			expiresAt: options.expiresAt?.(index) ?? new Date(Date.now() + 3_600_000).toISOString(),
			file: projection(file),
		};
		uploadPayloads.push(payload);
		return payload;
	}

	const storageExecute: SheetsExecuteFn = async <T,>(document: unknown, variables?: Record<string, unknown>) => {
		const source = String(document);
		storageRequests.push({ source, variables });
		if (/\buploadAppFile\s*\(/.test(source)) {
			const result = await graphql({
				schema,
				source,
				variableValues: variables,
				rootValue: { uploadAppFile: (args: { input: Row }) => upload(args.input) },
			});
			if (result.errors?.length) throw createError.graphql(result.errors[0]!.message);
			return result.data as T;
		}
		return storageBackend.execute<T>(document, variables);
	};

	function guard(source: string, variables: Record<string, unknown> | undefined) {
		if (!/^\s*mutation\b/.test(source) || managed.size === 0) return;
		const input = (variables?.input ?? {}) as Row;
		for (const [field, payload] of Object.entries(input)) {
			if (!payload || typeof payload !== 'object' || Array.isArray(payload)) continue;
			for (const [column, value] of Object.entries(payload as Row)) {
				const table = [...managed].find((name) => name.endsWith(`.${column}`) && field.toLowerCase().startsWith(name.split('.')[0]!.toLowerCase()));
				if (!table) continue;
				const notLive = fileIdsIn(value, (id) => fileById(id) !== null).find((id) => !LIVE.has(String(fileById(id)!.status)));
				if (!notLive) continue;
				const status = String(fileById(notLive)!.status);
				state.refusals += 1;
				const refused = (refusalsByFile.get(notLive) ?? 0) + 1;
				refusalsByFile.set(notLive, refused);
				// The confirm job lands while this write is refused; the next attempt sees a live file.
				if (options.confirmAfterRefusals !== undefined && refused >= options.confirmAfterRefusals) confirm(notLive);
				const error = { message: 'FILE_REF_FILE_NOT_LIVE', path: ['update'], extensions: { code: 'FILE_REF_FILE_NOT_LIVE', class: 'public', context: { field: column, file_id: notLive, status } } };
				throw withResponseErrors(createError.graphql(error.message, error.extensions.code), { update: null }, [error]);
			}
		}
	}

	const dataExecute: SheetsExecuteFn = async <T,>(document: unknown, variables?: Record<string, unknown>) => {
		const source = String(document);
		dataRequests.push({ source, variables });
		guard(source, variables);
		return dataBackend.execute<T>(document, variables);
	};

	const FakeXhr = createFakeXhr({ puts, aborted, answer: options.put ?? (() => ({ status: 200 })) });

	return {
		schema,
		data: { ...dataBackend, execute: dataExecute, requests: dataRequests },
		storage: { ...storageBackend, execute: storageExecute, requests: storageRequests },
		puts,
		aborted,
		uploadInputs,
		uploadPayloads,
		get refusals() {
			return state.refusals;
		},
		confirm,
		reject,
		updates: () => dataRequests.filter((request) => /^\s*mutation\b/.test(request.source) && /\bupdate[A-Z]\w*\s*\(/.test(request.source)),
		FakeXhr,
	};
}
