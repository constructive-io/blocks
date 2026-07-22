// Consumer test harness for @constructive-io/sheets.
//
// Shipped at the '/testing' subpath — NOT part of the core graph. Lets a
// consumer mount a <Sheets> grid in jsdom/vitest with zero network: a tiny
// in-memory PostGraphile-shaped backend that serves the `_meta` introspection,
// list connections, and create/update/delete mutations, while recording every
// mutation for assertions.
//
// This file intentionally uses a few test-grade casts on the mock GraphQL
// responses (see the `as unknown as MetaQuery` in `buildMetaResponse` and the
// `as File` narrowing in `executeUpload`). It is a deliberately partial
// PostGraphile emulator — just enough to render a grid and assert mutations —
// so the casts are scoped, documented, and never leak into the core graph.
import { useMemo } from 'react';
import { print } from 'graphql';
import type { DocumentNode } from 'graphql';
import { QueryClient } from '@tanstack/react-query';

import {
	toCamelCasePlural,
	toCamelCaseSingular,
	toCreateMutationName,
	toUpdateMutationName,
	toDeleteMutationName,
} from '@constructive-io/data';
import type { MetaQuery } from '@constructive-io/data';

import { SheetsProvider } from '../context/sheets-provider';
import type { SheetsExecuteFn, SheetsUploadFn, SheetsUploadOptions } from '../context/sheets-execute';
import { createMetaContractFixture } from './meta-contract-fixture';

// ============================================================================
// Types
// ============================================================================

export interface MockTableField {
	name: string;
	gqlType: string;
	isArray?: boolean;
	pgType?: string;
	subtype?: string;
}

export interface MockTable {
	name: string;
	fields: MockTableField[];
	rows: Record<string, unknown>[];
	/** GraphQL field names in PK order. Defaults to `['id']` when an id field exists. */
	primaryKeyFields?: string[];
}

export interface RecordedMutation {
	op: 'create' | 'update' | 'delete' | 'upload';
	tableName: string;
	variables: Record<string, unknown>;
	at: number;
}

export interface MockSheetsOptions {
	tables: MockTable[];
	onMutation?: (m: RecordedMutation) => void;
}

export interface MockExecuteHandle {
	execute: SheetsExecuteFn;
	executeUpload: SheetsUploadFn;
	mutations: RecordedMutation[];
	reset(): void;
}

// ============================================================================
// Document stringification (mirrors context/sheets-execute.ts)
// ============================================================================

type ExecutableDocument = DocumentNode | string | unknown;

function documentToString(document: ExecutableDocument): string {
	if (typeof document === 'string') return document;
	if (document instanceof String) return document.toString();
	if (document && typeof document === 'object' && 'kind' in (document as DocumentNode)) {
		return print(document as DocumentNode);
	}
	return String(document ?? '');
}

// ============================================================================
// Meta response synthesis
// ============================================================================

function buildMetaField(field: MockTableField, primaryKeyFields: ReadonlySet<string>) {
	return {
		name: field.name,
		isPrimaryKey: primaryKeyFields.has(field.name),
		isNotNull: false,
		hasDefault: false,
		type: {
			gqlType: field.gqlType,
			isArray: field.isArray ?? false,
			pgType: field.pgType ?? 'text',
			isNotNull: false,
			hasDefault: false,
			subtype: field.subtype ?? null,
		},
	};
}

function buildMetaTable(table: MockTable) {
	const primaryKeyFields = table.primaryKeyFields ?? (
		table.fields.some((field) => field.name === 'id') ? ['id'] : []
	);
	const primaryKeySet = new Set(primaryKeyFields);
	const primaryKeyMetaFields = table.fields
		.filter((field) => primaryKeySet.has(field.name))
		.map((field) => buildMetaField(field, primaryKeySet));
	return {
		name: table.name,
		schemaName: 'public',
		query: {
			all: toCamelCasePlural(table.name),
			create: toCreateMutationName(table.name),
			delete: toDeleteMutationName(table.name),
			one: toCamelCaseSingular(table.name),
			update: toUpdateMutationName(table.name),
		},
		fields: table.fields.map((field) => buildMetaField(field, primaryKeySet)),
		inflection: {
			allRows: toCamelCasePlural(table.name),
			connection: toCamelCasePlural(table.name),
			tableType: table.name,
		},
		indexes: [],
		constraints: {
			primaryKey: primaryKeyMetaFields.length > 0
				? { name: `${table.name}_pkey`, fields: primaryKeyMetaFields }
				: null,
			unique: [],
			foreignKey: [],
		},
		foreignKeyConstraints: [],
		primaryKeyConstraints: primaryKeyMetaFields.length > 0
			? [{ name: `${table.name}_pkey`, fields: primaryKeyMetaFields }]
			: [],
		uniqueConstraints: [],
		relations: { belongsTo: [], has: [], hasOne: [], hasMany: [], manyToMany: [] },
	};
}

// Pragmatic test-grade cast: we synthesize a loose subset of the `_meta`
// introspection shape (enough for cleanTable + the grid render path). The full
// MetaschemaTable union has many optional v4/v5 fields we don't populate, so a
// single structural cast keeps this fixture readable without re-declaring the
// entire schema. This is test-only code on a separate subpath.
function buildMetaResponse(tables: MockTable[]): MetaQuery {
	return {
		_meta: {
			tables: tables.map(buildMetaTable),
		},
	} as unknown as MetaQuery;
}

// ============================================================================
// List response synthesis
// ============================================================================

function buildListResponse(table: MockTable): Record<string, unknown> {
	const field = toCamelCasePlural(table.name);
	return {
		[field]: {
			nodes: table.rows,
			totalCount: table.rows.length,
			pageInfo: {
				hasNextPage: false,
				hasPreviousPage: false,
				endCursor: null,
				startCursor: null,
			},
		},
	};
}

// ============================================================================
// Mutation row synthesis
// ============================================================================

let mockIdCounter = 0;

function synthesizeId(): string {
	mockIdCounter += 1;
	return `mock-${mockIdCounter}`;
}

function extractMutationInput(variables: Record<string, unknown> | undefined): Record<string, unknown> {
	const input = variables?.input;
	return input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
}

function synthesizeCreatedRow(
	table: MockTable,
	singular: string,
	variables: Record<string, unknown> | undefined,
): Record<string, unknown> {
	const input = extractMutationInput(variables);
	const data = (input[singular] as Record<string, unknown>) ?? {};
	const row: Record<string, unknown> = { id: synthesizeId(), ...data };
	table.rows.push(row);
	return row;
}

function synthesizeUpdatedRow(
	table: MockTable,
	variables: Record<string, unknown> | undefined,
): Record<string, unknown> {
	const input = extractMutationInput(variables);
	const id = input.id;
	// Patch field name varies by entity (e.g. `userPatch`); take the first
	// object-valued non-id key as the patch payload.
	let patch: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(input)) {
		if (key === 'id') continue;
		if (value && typeof value === 'object') {
			patch = value as Record<string, unknown>;
			break;
		}
	}
	const existing = table.rows.find((r) => r.id === id);
	const merged: Record<string, unknown> = { ...(existing ?? { id }), ...patch };
	if (existing) {
		Object.assign(existing, patch);
	} else {
		table.rows.push(merged);
	}
	return merged;
}

// ============================================================================
// Detection helpers
// ============================================================================

function isMetaQuery(query: string): boolean {
	return query.includes('_meta');
}

function isMutationDocument(query: string): boolean {
	// PostGraphile mutation docs are `mutation Xxx(...) { ... }`; a leading
	// `mutation` keyword disambiguates them from list queries that may select a
	// relation field whose name collides with a mutation name as a substring.
	return /(^|\s)mutation(\s|\{)/.test(query);
}

function findMutationTable(
	query: string,
	tables: MockTable[],
): { table: MockTable; op: 'create' | 'update' | 'delete'; mutationName: string; singular: string } | null {
	// Longest-match: a table whose mutation name is a substring of another's
	// (e.g. createUser vs createUserProfile) must not win over the exact one.
	let best: { table: MockTable; op: 'create' | 'update' | 'delete'; mutationName: string; singular: string } | null = null;
	for (const table of tables) {
		const candidates: Array<{ op: 'create' | 'update' | 'delete'; mutationName: string }> = [
			{ op: 'create', mutationName: toCreateMutationName(table.name) },
			{ op: 'update', mutationName: toUpdateMutationName(table.name) },
			{ op: 'delete', mutationName: toDeleteMutationName(table.name) },
		];
		for (const c of candidates) {
			if (query.includes(c.mutationName) && (!best || c.mutationName.length > best.mutationName.length)) {
				best = { table, op: c.op, mutationName: c.mutationName, singular: toCamelCaseSingular(table.name) };
			}
		}
	}
	return best;
}

function findListTable(query: string, tables: MockTable[]): MockTable | null {
	// Longest-match for the same substring-collision reason.
	let best: MockTable | null = null;
	let bestLen = 0;
	for (const table of tables) {
		const plural = toCamelCasePlural(table.name);
		if (query.includes(plural) && plural.length > bestLen) {
			best = table;
			bestLen = plural.length;
		}
	}
	return best;
}

// ============================================================================
// Factory
// ============================================================================

export function createMockExecute(opts: MockSheetsOptions): MockExecuteHandle {
	const mutations: RecordedMutation[] = [];

	function record(m: RecordedMutation) {
		mutations.push(m);
		opts.onMutation?.(m);
	}

	const execute: SheetsExecuteFn = async <T = unknown>(
		document: ExecutableDocument,
		variables?: Record<string, unknown>,
	): Promise<T> => {
		const query = documentToString(document);

		// 1. Contract preflight, then `_meta` data.
		if (query.includes('ConstructiveMetaContract')) {
			return createMetaContractFixture() as T;
		}

		if (isMetaQuery(query)) {
			return buildMetaResponse(opts.tables) as T;
		}

		// 2. Mutations — detected by a create/update/delete mutation name.
		const mutationMatch = isMutationDocument(query) ? findMutationTable(query, opts.tables) : null;
		if (mutationMatch) {
			const { table, op, mutationName, singular } = mutationMatch;
			record({ op, tableName: table.name, variables: variables ?? {}, at: Date.now() });

			if (op === 'delete') {
				const input = extractMutationInput(variables);
				const id = input.id ?? null;
				table.rows = table.rows.filter((r) => r.id !== id);
				return { [mutationName]: { deletedNodeId: id, clientMutationId: null } } as T;
			}

			const row =
				op === 'create'
					? synthesizeCreatedRow(table, singular, variables)
					: synthesizeUpdatedRow(table, variables);
			return { [mutationName]: { [singular]: row } } as T;
		}

		// 3. List query (table connection) — detected by the camelPlural field.
		const listTable = findListTable(query, opts.tables);
		if (listTable) {
			return buildListResponse(listTable) as T;
		}

		// Unknown operation: return an empty object so callers degrade gracefully.
		return {} as T;
	};

	const executeUpload: SheetsUploadFn = async (
		file: File,
		path?: string,
		options?: SheetsUploadOptions,
	): Promise<{ url: string }> => {
		const name = (file as File)?.name ?? 'file';
		record({
			op: 'upload',
			tableName: options?.tableName ?? '',
			variables: {
				name,
				...(path !== undefined && { path }),
				...(options?.fieldName !== undefined && { fieldName: options.fieldName }),
				...(options?.recordId !== undefined && { recordId: options.recordId }),
			},
			at: Date.now(),
		});
		return { url: 'mock://uploaded/' + name };
	};

	function reset() {
		mutations.length = 0;
	}

	return { execute, executeUpload, mutations, reset };
}

// ============================================================================
// Provider
// ============================================================================

export interface MockSheetsProviderProps {
	options: MockSheetsOptions;
	children: React.ReactNode;
}

export function MockSheetsProvider({ options, children }: MockSheetsProviderProps) {
	// Build the mock backend + an isolated QueryClient ONCE per mount. Tests that
	// need a fresh harness should remount (e.g. via `key`), so an empty dep array
	// is correct — `options` is treated as mount-time configuration.
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const { execute, executeUpload } = useMemo(() => createMockExecute(options), []);

	// eslint-disable-next-line react-hooks/exhaustive-deps
	const queryClient = useMemo(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: { retry: false, gcTime: 0 },
					mutations: { retry: false },
				},
			}),
		[],
	);

	return (
		<SheetsProvider
			config={{
				endpoint: 'mock://sheets',
				auth: { mode: 'embedded', getToken: () => 'test' },
				execute,
				executeUpload,
				queryClient,
			}}
		>
			{children}
		</SheetsProvider>
	);
}

// ============================================================================
// Ready fixture
// ============================================================================

export const usersFixture: MockTable = {
	name: 'users',
	fields: [
		{ name: 'id', gqlType: 'UUID', pgType: 'uuid' },
		{ name: 'name', gqlType: 'String', pgType: 'text' },
		{ name: 'email', gqlType: 'String', pgType: 'text' },
		{ name: 'isActive', gqlType: 'Boolean', pgType: 'boolean' },
		{ name: 'createdAt', gqlType: 'Datetime', pgType: 'timestamptz' },
	],
	rows: [
		{
			id: '00000000-0000-0000-0000-000000000001',
			name: 'Ada Lovelace',
			email: 'ada@example.com',
			isActive: true,
			createdAt: '2024-01-01T00:00:00Z',
		},
		{
			id: '00000000-0000-0000-0000-000000000002',
			name: 'Alan Turing',
			email: 'alan@example.com',
			isActive: false,
			createdAt: '2024-01-02T00:00:00Z',
		},
	],
};
