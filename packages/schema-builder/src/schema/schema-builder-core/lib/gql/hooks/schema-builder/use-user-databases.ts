/**
 * Hook for fetching databases owned by the current authenticated user
 * Tier 4 wrapper: Uses SDK hooks + composition
 */
import { useQuery } from '@tanstack/react-query';
import {
	schemaBuilderQueryKey,
	useAuthSdkClient,
	useSchemaBuilderSdkClient,
	useSchemaBuilderRuntime,
} from '@/blocks/schema/schema-builder-core/context/block-config';

import type { SchemaContext } from '../../../../app-config';
import {
	type Field,
	type Table,
} from '@/generated/schema-builder';

import {
	type DatabaseTableNode,
	type DatabaseFieldNode,
	type DatabaseOwnerNode,
	type DatabaseSchemaNode,
	type DatabaseApiNode,
	buildFieldsByTableMap,
	buildTablesByDatabaseMap,
	extractIds,
} from './database-shared-utils';
import { parseListField } from './parse-list-field';

// Re-export shared types for backwards compatibility
export type { DatabaseFieldNode as DatabaseField, DatabaseTableNode as DatabaseTable };
export type { DatabaseOwnerNode as DatabaseOwner };

// Database type (uses shared sub-types)
export interface UserDatabase {
	id: string;
	label: string | null;
	name: string;
	owner: DatabaseOwnerNode | null;
	tables: {
		edges: Array<{ node: DatabaseTableNode }>;
		totalCount: number;
	} | null;
	schemas: {
		nodes: DatabaseSchemaNode[];
	} | null;
	apis: {
		nodes: DatabaseApiNode[];
	} | null;
}

// Constraint types
export interface PrimaryKeyConstraint {
	databaseId: string;
	fieldIds: string[];
	id: string;
	name: string;
	tableId: string;
	type: string;
}

export interface UniqueConstraint {
	databaseId: string;
	fieldIds: string[];
	id: string;
	name: string;
	tableId: string;
	type: string;
}

export interface ForeignKeyConstraint {
	createdAt: string | null;
	databaseId: string;
	deleteAction: string | null;
	description: string | null;
	fieldIds: string[];
	id: string;
	name: string;
	refFieldIds: string[];
	refTableId: string;
	smartTags: Record<string, unknown> | null;
	tableId: string;
	type: string;
	updateAction: string | null;
}

export interface DatabaseIndex {
	accessMethod: string | null;
	createdAt: string | null;
	databaseId: string;
	fieldIds: string[];
	id: string;
	includeFieldIds: string[] | null;
	indexParams: string | null;
	isUnique: boolean | null;
	name: string;
	tableId: string;
	whereClause: string | null;
}

// Connection types (for backwards compatibility)
export interface DatabasesConnection {
	nodes: UserDatabase[];
	totalCount: number;
	pageInfo: {
		hasNextPage: boolean;
		hasPreviousPage: boolean;
	};
}

// Query result type
interface UserDatabasesQueryResult {
	databases: DatabasesConnection | null;
	primaryKeyConstraints: { nodes: PrimaryKeyConstraint[] } | null;
	uniqueConstraints: { nodes: UniqueConstraint[] } | null;
	foreignKeyConstraints: { nodes: ForeignKeyConstraint[] } | null;
	indices: { nodes: DatabaseIndex[] } | null;
}

export interface UseUserDatabasesOptions {
	/** Enable/disable the query */
	enabled?: boolean;
	/** Override user ID (defaults to current authenticated user) */
	userId?: string;
	/** Override schema context (defaults to schema-builder) */
	context?: SchemaContext;
}

export interface UseUserDatabasesResult {
	/** Array of database objects */
	databases: UserDatabase[];
	/** Primary key constraints across all databases */
	primaryKeyConstraints: PrimaryKeyConstraint[];
	/** Unique constraints across all databases */
	uniqueConstraints: UniqueConstraint[];
	/** Foreign key constraints across all databases */
	foreignKeyConstraints: ForeignKeyConstraint[];
	/** Index definitions across all databases */
	indexes: DatabaseIndex[];
	/** Total count of all databases */
	totalCount: number;
	/** Loading state */
	isLoading: boolean;
	/** Error state */
	error: Error | null;
	/** Pagination info */
	pageInfo: {
		hasNextPage: boolean;
		hasPreviousPage: boolean;
	};
	/** Refetch function */
	refetch: () => Promise<unknown>;
}

/**
 * Hook for fetching databases owned by the current authenticated user
 *
 * @example
 * ```tsx
 * const { databases, totalCount, isLoading } = useUserDatabases();
 *
 * // With specific user ID
 * const { databases } = useUserDatabases({
 *   userId: 'specific-user-id'
 * });
 * ```
 */
export function useUserDatabases(options: UseUserDatabasesOptions = {}): UseUserDatabasesResult {
	const { scope } = useSchemaBuilderRuntime();
	const {
		fetchApiSchemasQuery,
		fetchApisQuery,
		fetchDatabasesQuery,
		fetchFieldsQuery,
		fetchForeignKeyConstraintsQuery,
		fetchIndicesQuery,
		fetchPrimaryKeyConstraintsQuery,
		fetchSchemasQuery,
		fetchTablesQuery,
		fetchUniqueConstraintsQuery,
	} = useSchemaBuilderSdkClient();
	const { fetchUsersQuery } = useAuthSdkClient();
	const { enabled = true, userId, context = 'schema-builder' } = options;
	void context; // Context handled by SDK execute-adapter

	// Determine the owner ID to use
	const ownerId = userId;

	const { data, isLoading, error, refetch } = useQuery<UserDatabasesQueryResult>({
		queryKey: schemaBuilderQueryKey(scope, 'core', 'userDatabases', { context, ownerId: ownerId || '' }),
		queryFn: async (): Promise<UserDatabasesQueryResult> => {
			if (!ownerId) {
				throw new Error('No authenticated user found');
			}

			// Step 1: Fetch databases by owner
			const databasesResult = await fetchDatabasesQuery({
				selection: {
					fields: { id: true, name: true, label: true, ownerId: true },
					where: { ownerId: { equalTo: ownerId } },
					orderBy: ['CREATED_AT_ASC'],
				},
			});

			const rawDatabases = databasesResult.databases?.nodes ?? [];
			if (rawDatabases.length === 0) {
				return {
					databases: { nodes: [], totalCount: 0, pageInfo: { hasNextPage: false, hasPreviousPage: false } },
					primaryKeyConstraints: { nodes: [] },
					uniqueConstraints: { nodes: [] },
					foreignKeyConstraints: { nodes: [] },
					indices: { nodes: [] },
				};
			}

			const databaseIds = extractIds(rawDatabases);
			const ownerIds = [...new Set(rawDatabases.map((d) => d.ownerId).filter((id): id is string => !!id))];

			// Step 2: Fetch all related data in parallel (with proper filtering!)
			const [
				tablesResult,
				schemasResult,
				apisResult,
				ownersResult,
				pkResult,
				uniqueResult,
				fkResult,
				indicesResult,
			] = await Promise.all([
				fetchTablesQuery({
					selection: {
						fields: { id: true, name: true, label: true, description: true, pluralName: true, singularName: true, smartTags: true, timestamps: true, databaseId: true, schemaId: true, category: true },
						where: { databaseId: { in: databaseIds } },
						orderBy: ['NAME_ASC'],
					},
				}),
				fetchSchemasQuery({
					selection: {
						fields: { id: true, name: true, schemaName: true, databaseId: true },
						where: { databaseId: { in: databaseIds } },
						orderBy: ['NAME_ASC'],
					},
				}),
				fetchApisQuery({
					selection: {
						fields: { id: true, name: true, databaseId: true },
						where: { databaseId: { in: databaseIds } },
						orderBy: ['NAME_ASC'],
					},
				}),
				ownerIds.length > 0
					? fetchUsersQuery({
							selection: {
								fields: { id: true, displayName: true, username: true },
								where: { id: { in: ownerIds } },
							},
						})
					: Promise.resolve({ users: { nodes: [] } }),
				// BUG FIX: Previously fetched ALL constraints globally - now filtered by databaseId
				fetchPrimaryKeyConstraintsQuery({
					selection: {
						fields: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true },
						where: { databaseId: { in: databaseIds } },
					},
				}),
				fetchUniqueConstraintsQuery({
					selection: {
						fields: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true },
						where: { databaseId: { in: databaseIds } },
					},
				}),
				fetchForeignKeyConstraintsQuery({
					selection: {
						fields: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true, refFieldIds: true, refTableId: true, deleteAction: true, updateAction: true, description: true, smartTags: true, createdAt: true },
						where: { databaseId: { in: databaseIds } },
						orderBy: ['NAME_ASC'],
					},
				}),
				fetchIndicesQuery({
					selection: {
						fields: { id: true, databaseId: true, tableId: true, name: true, fieldIds: true, includeFieldIds: true, accessMethod: true, indexParams: true, whereClause: true, isUnique: true, createdAt: true },
						where: { databaseId: { in: databaseIds } },
						orderBy: ['CREATED_AT_DESC'],
					},
				}),
			]);

			// Step 3: Fetch fields and apiSchemas
			const tableIds = (tablesResult.tables?.nodes ?? []).map((t) => t.id).filter((id): id is string => !!id);
			const apiIds = (apisResult.apis?.nodes ?? []).map((a) => a.id).filter((id): id is string => !!id);

			const [fieldsResult, apiSchemasResult] = await Promise.all([
				tableIds.length > 0
					? fetchFieldsQuery({
							selection: {
								fields: { id: true, name: true, type: true, chk: true, chkExpr: true, defaultValue: true, description: true, fieldOrder: true, isRequired: true, label: true, max: true, min: true, regexp: true, smartTags: true, tableId: true },
								where: { tableId: { in: tableIds } },
							},
						})
					: Promise.resolve({ fields: { nodes: [] } }),
				apiIds.length > 0
					? fetchApiSchemasQuery({
							selection: {
								fields: { id: true, apiId: true, schemaId: true },
								where: { apiId: { in: apiIds } },
							},
						})
					: Promise.resolve({ apiSchemas: { nodes: [] } }),
			]);

			// Step 4: Build lookup maps using shared utilities
			const ownerMap = new Map<string, DatabaseOwnerNode>();
			for (const u of ownersResult.users?.nodes ?? []) {
				if (u.id) {
					ownerMap.set(u.id, {
						id: u.id,
						displayName: u.displayName ?? null,
						username: u.username ?? null,
					});
				}
			}

			// Use shared utility for fields and tables
			const fieldsByTable = buildFieldsByTableMap((fieldsResult.fields?.nodes ?? []) as Field[]);
			const tablesByDatabase = buildTablesByDatabaseMap((tablesResult.tables?.nodes ?? []) as Table[], fieldsByTable);

			const schemasByDatabase = new Map<string, DatabaseSchemaNode[]>();
			for (const s of schemasResult.schemas?.nodes ?? []) {
				if (s.databaseId) {
					const existing = schemasByDatabase.get(s.databaseId) ?? [];
					existing.push({ id: s.id ?? '', name: s.name ?? '', schemaName: s.schemaName ?? '' });
					schemasByDatabase.set(s.databaseId, existing);
				}
			}

			const apiSchemasByApi = new Map<string, Array<{ schemaId: string }>>();
			for (const as of apiSchemasResult.apiSchemas?.nodes ?? []) {
				if (as.apiId) {
					const existing = apiSchemasByApi.get(as.apiId) ?? [];
					existing.push({ schemaId: as.schemaId ?? '' });
					apiSchemasByApi.set(as.apiId, existing);
				}
			}

			const apisByDatabase = new Map<string, DatabaseApiNode[]>();
			for (const a of apisResult.apis?.nodes ?? []) {
				if (a.databaseId) {
					const existing = apisByDatabase.get(a.databaseId) ?? [];
					existing.push({
						id: a.id ?? '',
						name: a.name ?? '',
						apiSchemas: { nodes: apiSchemasByApi.get(a.id ?? '') ?? [] },
					});
					apisByDatabase.set(a.databaseId, existing);
				}
			}

			// Step 5: Build final databases structure
			const databases: UserDatabase[] = rawDatabases.map((d) => {
				const tables = tablesByDatabase.get(d.id ?? '') ?? [];
				return {
					id: d.id ?? '',
					label: d.label ?? null,
					name: d.name ?? '',
					owner: d.ownerId ? ownerMap.get(d.ownerId) ?? null : null,
					tables: {
						edges: tables.map((t) => ({ node: t })),
						totalCount: tables.length,
					},
					schemas: { nodes: schemasByDatabase.get(d.id ?? '') ?? [] },
					apis: { nodes: apisByDatabase.get(d.id ?? '') ?? [] },
				};
			});

			// Step 6: Build constraints and indices
			const primaryKeyConstraints: PrimaryKeyConstraint[] = (pkResult.primaryKeyConstraints?.nodes ?? []).map((c) => ({
				databaseId: c.databaseId ?? '',
				fieldIds: parseListField(c.fieldIds),
				id: c.id ?? '',
				name: c.name ?? '',
				tableId: c.tableId ?? '',
				type: c.type ?? '',
			}));

			const uniqueConstraints: UniqueConstraint[] = (uniqueResult.uniqueConstraints?.nodes ?? []).map((c) => ({
				databaseId: c.databaseId ?? '',
				fieldIds: parseListField(c.fieldIds),
				id: c.id ?? '',
				name: c.name ?? '',
				tableId: c.tableId ?? '',
				type: c.type ?? '',
			}));

			const foreignKeyConstraints: ForeignKeyConstraint[] = (fkResult.foreignKeyConstraints?.nodes ?? []).map((c) => ({
				createdAt: c.createdAt ?? null,
				databaseId: c.databaseId ?? '',
				deleteAction: c.deleteAction ?? null,
				description: c.description ?? null,
				fieldIds: parseListField(c.fieldIds),
				id: c.id ?? '',
				name: c.name ?? '',
				refFieldIds: parseListField(c.refFieldIds),
				refTableId: c.refTableId ?? '',
				smartTags: (c.smartTags as Record<string, unknown>) ?? null,
				tableId: c.tableId ?? '',
				type: c.type ?? '',
				updateAction: c.updateAction ?? null,
			}));

			const indices: DatabaseIndex[] = (indicesResult.indices?.nodes ?? []).map((i): DatabaseIndex => ({
				accessMethod: i.accessMethod ?? null,
				createdAt: i.createdAt ?? null,
				databaseId: i.databaseId ?? '',
				fieldIds: parseListField(i.fieldIds),
				id: i.id ?? '',
				includeFieldIds: parseListField(i.includeFieldIds) || null,
				indexParams: typeof i.indexParams === 'string' ? i.indexParams : null,
				isUnique: i.isUnique ?? null,
				name: i.name ?? '',
				tableId: i.tableId ?? '',
				whereClause: typeof i.whereClause === 'string' ? i.whereClause : null,
			}));

			return {
				databases: {
					nodes: databases,
					totalCount: databasesResult.databases?.totalCount ?? 0,
					pageInfo: {
						hasNextPage: databasesResult.databases?.pageInfo?.hasNextPage ?? false,
						hasPreviousPage: databasesResult.databases?.pageInfo?.hasPreviousPage ?? false,
					},
				},
				primaryKeyConstraints: { nodes: primaryKeyConstraints },
				uniqueConstraints: { nodes: uniqueConstraints },
				foreignKeyConstraints: { nodes: foreignKeyConstraints },
				indices: { nodes: indices },
			};
		},
		enabled: enabled && !!ownerId,
		staleTime: 5 * 60 * 1000, // 5 minutes
		// CRITICAL: Reduce stale time after workflow completion to ensure fresh data
		// This was previously 5 minutes, but that's too long for post-workflow updates
		refetchOnMount: true,
	});

	// Extract the databases data from the response
	const databases = data?.databases?.nodes || [];
	const primaryKeyConstraints = data?.primaryKeyConstraints?.nodes || [];
	const uniqueConstraints = data?.uniqueConstraints?.nodes || [];
	const foreignKeyConstraints = data?.foreignKeyConstraints?.nodes || [];
	const indexes = data?.indices?.nodes || [];
	const totalCount = data?.databases?.totalCount || 0;
	const pageInfo = data?.databases?.pageInfo || {
		hasNextPage: false,
		hasPreviousPage: false,
	};

	return {
		databases,
		primaryKeyConstraints,
		uniqueConstraints,
		foreignKeyConstraints,
		indexes,
		totalCount,
		isLoading,
		error,
		pageInfo,
		refetch,
	};
}

/**
 * Generate query keys for consistent cache management
 */
export const userDatabasesQueryKeys = {
	all: ['user-databases'] as const,
	byContext: (context: SchemaContext) => [...userDatabasesQueryKeys.all, { context }] as const,
	byUser: (context: SchemaContext, userId: string) =>
		[...userDatabasesQueryKeys.byContext(context), { ownerId: userId }] as const,
};
