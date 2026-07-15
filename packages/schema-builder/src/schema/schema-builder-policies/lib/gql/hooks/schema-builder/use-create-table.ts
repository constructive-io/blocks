/**
 * Hook for creating a table
 * Tier 4 wrapper: adds auto-grant permissions and table selection
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCreateTableMutation } from '@/generated/schema-builder';
import type { CreateTableInput } from '@/generated/schema-builder';

import { stripEmpty } from '@/blocks/schema/schema-builder-core/lib/data';

import { invalidateDatabaseEntities } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder/modules/invalidate-database-entities';
import { useSchemaBuilderSelectors } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder/use-schema-builder-selectors';
import { useCreateTableGrant } from './use-table-grants';

export interface CreateTableData {
	name: string;
	schemaId: string;
	databaseId: string;
	description?: string | null;
	label?: string | null;
	smartTags?: Record<string, unknown> | null;
	useRls?: boolean | null;
}

// Return type with non-nullable id for consumer safety
export interface CreatedTable {
	id: string;
	name: string;
	databaseId: string | null;
	schemaId: string | null;
	label: string | null;
	description: string | null;
}

export function useCreateTable() {
	const queryClient = useQueryClient();
	const { selectTable } = useSchemaBuilderSelectors();
	const { mutateAsync: createGrant } = useCreateTableGrant();
	const createTableMutation = useCreateTableMutation({ selection: { fields: { id: true, name: true, databaseId: true, schemaId: true, label: true, description: true } } });

	return useMutation({
		mutationFn: async (input: CreateTableData): Promise<CreatedTable> => {
			// Step 1: Create the table using SDK
			// inheritsId is required in generated types but optional at GraphQL level
			const result = await createTableMutation.mutateAsync({
				name: input.name,
				schemaId: input.schemaId,
				databaseId: input.databaseId,
				description: stripEmpty(input.description),
				label: stripEmpty(input.label),
				smartTags: stripEmpty(input.smartTags),
				useRls: stripEmpty(input.useRls),
			} as CreateTableInput['table']);

			const table = result.createTable?.table;
			if (!table?.id || !table?.name) {
				throw new Error('Failed to create table');
			}

			// Step 2: Auto-grant basic permissions to make table immediately usable
			// Default strategy: Grant all CRUD operations to authenticated users (no RLS)
			// This ensures the table is accessible via the application GraphQL endpoint
			if (input.databaseId && table.name) {
				try {
					await createGrant({
						databaseId: input.databaseId,
						tableName: table.name,
						privileges: ['select', 'insert', 'update', 'delete'],
						roleName: 'authenticated',
					});
				} catch (error) {
					// Log warning but don't fail table creation
					console.warn(
						`⚠️ Table created successfully but failed to grant permissions: ${error instanceof Error ? error.message : 'Unknown error'}`,
					);
					console.warn(`You may need to manually grant permissions for table: ${table.name}`);
				}
			}

			// Return with guaranteed non-null id/name after validation
			return {
				id: table.id,
				name: table.name,
				databaseId: table.databaseId ?? null,
				schemaId: table.schemaId ?? null,
				label: table.label ?? null,
				description: table.description ?? null,
			};
		},
		onSuccess: async (createdTable, variables) => {
			await invalidateDatabaseEntities(queryClient, variables?.databaseId);

			if (createdTable?.id && createdTable?.name) {
				selectTable(createdTable.id, createdTable.name);
			}
		},
		onError: (error) => {
			console.error(error);
		},
	});
}
