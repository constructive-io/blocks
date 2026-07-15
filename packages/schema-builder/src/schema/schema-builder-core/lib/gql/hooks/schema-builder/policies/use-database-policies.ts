/**
 * Hook for fetching database policies
 * Tier 4 wrapper: Uses SDK hooks + composition
 */
import { useQuery } from '@tanstack/react-query';
import {
	schemaBuilderQueryKey,
	useSchemaBuilderSdkClient,
	useSchemaBuilderRuntime,
} from '@/blocks/schema/schema-builder-core/context/block-config';

import { fieldTypeToTypeName } from '../transformers/field-type-mapper';

interface FieldNode {
	id: string;
	name: string;
	type: string;
	fieldOrder: number | null;
	smartTags: unknown;
}

interface SchemaNode {
	id: string;
	schemaName: string;
}

interface PolicyNode {
	createdAt: string | null;
	data: unknown;
	disabled: boolean | null;
	id: string;
	name: string | null;
	permissive: boolean | null;
	privilege: string | null;
	granteeName: string | null;
	policyType: string | null;
	updatedAt: string | null;
}

// Policy types auto-injected by the backend as companions to user-selected
// policies (e.g. AuthzNotReadOnly alongside AuthzEntityMembership). Users don't
// create or manage these, so they're filtered out of all UI reads.
const BACKEND_MANAGED_POLICY_TYPES = new Set(['AuthzNotReadOnly']);

type TableCategory = string | null;

export type DatabasePolicy = PolicyNode;
export type TableField = FieldNode;

export type { TableCategory, SchemaNode };

export interface PolicyTableData {
	id: string;
	name: string;
	useRls: boolean;
	policies: DatabasePolicy[];
	fields: TableField[];
	schema: SchemaNode | null;
	category: TableCategory;
}

export const databasePoliciesQueryKeys = {
	all: ['database-policies'] as const,
	byDatabase: (databaseId: string) => ['database-policies', databaseId] as const,
};

export interface UseDatabasePoliciesOptions {
	enabled?: boolean;
}

export function useDatabasePolicies(databaseId: string, options: UseDatabasePoliciesOptions = {}) {
	const isEnabled = options.enabled !== false && Boolean(databaseId);
	const { scope } = useSchemaBuilderRuntime();
	const { fetchFieldsQuery, fetchPoliciesQuery, fetchSchemasQuery, fetchTablesQuery } = useSchemaBuilderSdkClient();

	return useQuery<PolicyTableData[]>({
		queryKey: schemaBuilderQueryKey(scope, 'core', 'databasePolicies', { databaseId }),
		queryFn: async (): Promise<PolicyTableData[]> => {
			// Step 1: Fetch tables for this database
			const tablesResult = await fetchTablesQuery({
				selection: {
					fields: { id: true, name: true, useRls: true, category: true, schemaId: true },
					where: { databaseId: { equalTo: databaseId } },
					orderBy: ['NAME_ASC'],
				},
			});

			const tables = tablesResult.tables?.nodes ?? [];
			if (tables.length === 0) {
				return [];
			}

			// Build table data map
			const tableIds = tables.map((t) => t.id).filter((id): id is string => !!id);
			const schemaIds = [...new Set(tables.map((t) => t.schemaId).filter((id): id is string => !!id))];

			// Step 2: Fetch schemas, fields, and policies in parallel
			const [schemasResult, fieldsResult, policiesResult] = await Promise.all([
				schemaIds.length > 0
					? fetchSchemasQuery({ selection: { fields: { id: true, schemaName: true }, where: { id: { in: schemaIds } } } })
					: Promise.resolve({ schemas: { nodes: [] } }),
				tableIds.length > 0
					? fetchFieldsQuery({ selection: { fields: { id: true, name: true, type: true, fieldOrder: true, smartTags: true, tableId: true }, where: { tableId: { in: tableIds } } } })
					: Promise.resolve({ fields: { nodes: [] } }),
				tableIds.length > 0
					? fetchPoliciesQuery({
							selection: {
								fields: { id: true, name: true, granteeName: true, privilege: true, permissive: true, disabled: true, policyType: true, data: true, createdAt: true, updatedAt: true, tableId: true },
								where: { tableId: { in: tableIds } },
								orderBy: ['CREATED_AT_DESC'],
							},
						})
					: Promise.resolve({ policies: { nodes: [] } }),
			]);

			// Build lookup maps
			const schemaMap = new Map<string, SchemaNode>();
			for (const schema of schemasResult.schemas?.nodes ?? []) {
				if (schema.id) {
					schemaMap.set(schema.id, {
						id: schema.id,
						schemaName: schema.schemaName ?? '',
					});
				}
			}

			const fieldsByTable = new Map<string, FieldNode[]>();
			for (const field of fieldsResult.fields?.nodes ?? []) {
				if (field.tableId) {
					const existing = fieldsByTable.get(field.tableId) ?? [];
					existing.push({
						id: field.id ?? '',
						name: field.name ?? '',
						// type is now a structured FieldType object; reduce to its type-name string.
						type: fieldTypeToTypeName(field.type),
						fieldOrder: field.fieldOrder ?? null,
						smartTags: field.smartTags ?? null,
					});
					fieldsByTable.set(field.tableId, existing);
				}
			}

			const policiesByTable = new Map<string, PolicyNode[]>();
			for (const policy of policiesResult.policies?.nodes ?? []) {
				if (!policy.tableId) continue;
				if (policy.policyType && BACKEND_MANAGED_POLICY_TYPES.has(policy.policyType)) continue;
				const existing = policiesByTable.get(policy.tableId) ?? [];
				existing.push({
					id: policy.id ?? '',
					name: policy.name ?? null,
					granteeName: policy.granteeName ?? null,
					privilege: policy.privilege ?? null,
					permissive: policy.permissive ?? null,
					disabled: policy.disabled ?? null,
					policyType: policy.policyType ?? null,
					data: policy.data ?? null,
					createdAt: policy.createdAt ?? null,
					updatedAt: policy.updatedAt ?? null,
				});
				policiesByTable.set(policy.tableId, existing);
			}

			// Step 3: Build result
			return tables.map((table): PolicyTableData => ({
				id: table.id ?? '',
				name: table.name ?? '',
				useRls: table.useRls ?? false,
				policies: policiesByTable.get(table.id ?? '') ?? [],
				fields: fieldsByTable.get(table.id ?? '') ?? [],
				schema: table.schemaId ? schemaMap.get(table.schemaId) ?? null : null,
				category: (table.category as TableCategory) ?? null,
			}));
		},
		enabled: isEnabled,
		staleTime: 5 * 60 * 1000,
		refetchOnMount: isEnabled,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
	});
}
