// Consumer test harness for @constructive-io/sheets.
//
// Shipped at the '/testing' subpath — NOT part of the core graph. Lets a
// consumer mount a <Sheets> grid in jsdom/vitest with zero network: an
// in-memory backend that serves `_meta`, schema introspection, list
// connections, and create/update/delete mutations, while recording every
// mutation for assertions.
//
// The tables are described as `MockTable`s. They become a `_meta` response and
// a PostGraphile-shaped schema (see `meta-schema.ts`), and every document the
// grid sends runs through graphql-js against that schema (see
// `model-backend.ts`), so a document the schema would reject fails the test.
import { useMemo } from 'react';
import { buildSchema } from 'graphql';
import { QueryClient } from '@tanstack/react-query';

import {
	toCamelCasePlural,
	toCreateMutationName,
	toUpdateMutationName,
	toDeleteMutationName,
} from '@constructive-io/data';
import type { MetaQuery, MetaschemaTable } from '@constructive-io/data';

import { SheetsProvider } from '../context/sheets-provider';
import type { SheetsExecuteFn, SheetsUploadFn, SheetsUploadOptions, SheetsUploadResult } from '../context/sheets-execute';
import { buildMetaSchemaSdl } from './meta-schema';
import { createModelBackend, type RecordedMutation } from './model-backend';

export type { RecordedMutation } from './model-backend';

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
// Meta response synthesis
// ============================================================================

function buildMetaField(field: MockTableField, primaryKeyFields: ReadonlySet<string>) {
	return {
		name: field.name,
		isPrimaryKey: primaryKeyFields.has(field.name),
		isForeignKey: false,
		isNotNull: false,
		hasDefault: false,
		description: null,
		enumValues: null,
		type: {
			gqlType: field.gqlType,
			isArray: field.isArray ?? false,
			pgType: field.pgType ?? 'text',
			isNotNull: false,
			hasDefault: false,
			subtype: field.subtype ?? null,
			encoding: null,
		},
	};
}

function buildMetaTable(table: MockTable): MetaschemaTable {
	const primaryKeyFields = table.primaryKeyFields ?? (
		table.fields.some((field) => field.name === 'id') ? ['id'] : []
	);
	const primaryKeySet = new Set(primaryKeyFields);
	const primaryKeyMetaFields = table.fields
		.filter((field) => primaryKeySet.has(field.name))
		.map((field) => buildMetaField(field, primaryKeySet));
	const hasKey = primaryKeyMetaFields.length > 0;
	return {
		name: table.name,
		schemaName: 'public',
		query: {
			all: toCamelCasePlural(table.name),
			one: null,
			create: toCreateMutationName(table.name),
			update: hasKey ? toUpdateMutationName(table.name) : null,
			delete: hasKey ? toDeleteMutationName(table.name) : null,
		},
		fields: table.fields.map((field) => buildMetaField(field, primaryKeySet)),
		inflection: {
			tableType: table.name,
			allRows: toCamelCasePlural(table.name),
			connection: `${table.name}Connection`,
			filterType: `${table.name}Filter`,
			orderByType: `${table.name}OrderBy`,
		},
		indexes: [],
		constraints: {
			primaryKey: hasKey ? { name: `${table.name}_pkey`, fields: primaryKeyMetaFields } : null,
			unique: [],
			foreignKey: [],
		},
		foreignKeyConstraints: [],
		primaryKeyConstraints: hasKey ? [{ name: `${table.name}_pkey`, fields: primaryKeyMetaFields }] : [],
		uniqueConstraints: [],
		relations: { belongsTo: [], has: [], hasOne: [], hasMany: [], manyToMany: [] },
		storage: null,
		search: null,
		i18n: null,
		realtime: null,
		scope: null,
	};
}

function buildMetaResponse(tables: MockTable[]): MetaQuery {
	return { _meta: { tables: tables.map(buildMetaTable) } };
}

// ============================================================================
// Factory
// ============================================================================

export function createMockExecute(opts: MockSheetsOptions): MockExecuteHandle {
	const meta = buildMetaResponse(opts.tables);
	const metaTables = (meta._meta?.tables ?? []).filter((table): table is MetaschemaTable => table != null);
	const backend = createModelBackend({
		schema: buildSchema(buildMetaSchemaSdl(metaTables)),
		meta,
		// The row arrays are shared with the caller's MockTables, so tests see writes in place.
		rows: Object.fromEntries(opts.tables.map((table) => [table.name, table.rows])),
		onMutation: opts.onMutation,
	});
	const { mutations } = backend;

	const executeUpload: SheetsUploadFn = async (
		file: File,
		path?: string,
		options?: SheetsUploadOptions,
	): Promise<SheetsUploadResult> => {
		const name = (file as File)?.name ?? 'file';
		const upload: RecordedMutation = {
			op: 'upload',
			tableName: options?.tableName ?? '',
			variables: {
				name,
				...(path !== undefined && { path }),
				...(options?.fieldName !== undefined && { fieldName: options.fieldName }),
				...(options?.recordId !== undefined && { recordId: options.recordId }),
			},
			at: Date.now(),
		};
		mutations.push(upload);
		opts.onMutation?.(upload);
		const url = 'mock://uploaded/' + name;
		return {
			file: {
				id: 'mock-file-' + mutations.length,
				key: name,
				bucket_id: 'mock-bucket',
				filename: name,
				mime: file.type || 'application/octet-stream',
				size: file.size,
				url,
			},
			url,
		};
	};

	function reset() {
		mutations.length = 0;
	}

	return { execute: backend.execute, executeUpload, mutations, reset };
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
