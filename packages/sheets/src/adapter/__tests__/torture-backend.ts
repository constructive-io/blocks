// Test support: the captured torture schema (see packages/data/src/__tests__/fixtures/torture/README.md)
// served by the model backend, with every request recorded.
// Static JSON imports work under both the node and the jsdom test environments.
import { buildClientSchema, type IntrospectionQuery } from 'graphql';

import introspectionBaseline from '../../../../data/src/__tests__/fixtures/torture/torture-introspection.baseline.json';
import introspectionV2 from '../../../../data/src/__tests__/fixtures/torture/torture-introspection.json';
import metaBaseline from '../../../../data/src/__tests__/fixtures/torture/torture-meta.baseline.json';
import metaV2 from '../../../../data/src/__tests__/fixtures/torture/torture-meta.v2.json';
import capturedRowsJson from '../../../../data/src/__tests__/fixtures/torture/torture-rows.json';

import type { MetaQuery } from '@constructive-io/data';

import type { SheetsExecuteFn } from '../../context/sheets-execute';
import { createModelBackend, type ModelBackend, type ModelBackendOptions, type ModelBackendUploadOptions } from '../../testing/model-backend';

/** The baseline server (before the `_meta` additions) and the v2 server. */
export type TortureServer = 'baseline' | 'v2';

const introspections: Record<TortureServer, unknown> = { baseline: introspectionBaseline, v2: introspectionV2 };
const metas: Record<TortureServer, unknown> = { baseline: metaBaseline, v2: metaV2 };

/** The captured introspection. Shared and read-only: copy it before changing it. */
export const tortureIntrospection = (server: TortureServer = 'baseline'): IntrospectionQuery =>
	(introspections[server] as { data: IntrospectionQuery }).data;
/** A fresh copy of the captured `_meta`, safe to change. */
export const tortureMeta = (server: TortureServer = 'baseline'): MetaQuery =>
	structuredClone((metas[server] as { data: MetaQuery }).data);

/** Captured rows per GraphQL type name. */
export function tortureRows(meta: MetaQuery): Record<string, Record<string, unknown>[]> {
	const captured = capturedRowsJson as unknown as Array<{
		table: string;
		data: Record<string, { nodes?: Record<string, unknown>[] } | null> | null;
	}>;
	return Object.fromEntries(
		captured.map((entry) => {
			const list = meta._meta?.tables?.find((table) => table?.name === entry.table)?.query?.all;
			return [entry.table, structuredClone((list ? entry.data?.[list]?.nodes : null) ?? [])];
		}),
	);
}

export interface RecordedRequest {
	source: string;
	variables: Record<string, unknown> | undefined;
}

export interface TortureBackend extends ModelBackend {
	meta: MetaQuery;
	requests: RecordedRequest[];
	/** Recorded mutation requests, in order. */
	mutationRequests(): RecordedRequest[];
}

export function createTortureBackend(
	options: {
		server?: TortureServer;
		introspection?: IntrospectionQuery;
		meta?: MetaQuery;
		uploads?: ModelBackendUploadOptions;
		writeHidden?: ModelBackendOptions['writeHidden'];
	} = {},
): TortureBackend {
	const server = options.server ?? 'baseline';
	const meta = options.meta ?? tortureMeta(server);
	const backend = createModelBackend({
		schema: buildClientSchema(options.introspection ?? tortureIntrospection(server)),
		meta,
		rows: tortureRows(meta),
		uploads: options.uploads,
		writeHidden: options.writeHidden,
	});
	const requests: RecordedRequest[] = [];
	const execute: SheetsExecuteFn = async <T>(document: unknown, variables?: Record<string, unknown>) => {
		requests.push({ source: String(document), variables });
		return backend.execute<T>(document, variables);
	};
	return {
		...backend,
		execute,
		meta,
		requests,
		mutationRequests: () => requests.filter((request) => /^\s*mutation\b/.test(request.source)),
	};
}
