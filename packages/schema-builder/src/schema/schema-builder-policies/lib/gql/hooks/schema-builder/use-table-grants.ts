/**
 * Hook for managing table grants (permissions)
 * Tier 4 wrapper: orchestrates table lookup + grant creation using SDK hooks
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
	useCreateTableGrantMutation,
} from '@/generated/schema-builder';
import { useSchemaBuilderSdkClient } from '@/blocks/schema/schema-builder-core/context/block-config';

import { invalidateDatabaseEntities } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder/modules/invalidate-database-entities';

// ============================================================================
// Types
// ============================================================================

export interface CreateTableGrantInput {
	databaseId: string;
	tableName: string;
	privileges: string[]; // ['select', 'insert', 'update', 'delete']
	fieldNames?: string[]; // Optional: for field-level grants
	roleName?: string; // Default: 'authenticated'
}

interface TableWithFields {
	id: string;
	name: string;
	useRls: boolean;
	fields: Array<{
		id: string;
		name: string;
	}>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Fetches table metadata including fields by database ID and table name.
 * Required for grant operations to get table ID and field IDs.
 * Uses SDK hooks via composition.
 */
async function getTableByName(
	databaseId: string,
	tableName: string,
	client: Pick<ReturnType<typeof useSchemaBuilderSdkClient>, 'fetchFieldsQuery' | 'fetchTablesQuery'>,
): Promise<TableWithFields | null> {
	try {
		// Step 1: Fetch table by database ID and name
		const tableResult = await client.fetchTablesQuery({
			selection: {
				fields: { id: true, name: true, useRls: true },
				where: { databaseId: { equalTo: databaseId }, name: { equalTo: tableName } },
				first: 1,
			},
		});
		const table = tableResult?.tables?.nodes?.[0];
		if (!table?.id) {
			return null;
		}

		// Step 2: Fetch fields for this table
		const fieldsResult = await client.fetchFieldsQuery({
			selection: {
				fields: { id: true, name: true },
				where: { tableId: { equalTo: table.id } },
			},
		});
		const fields = fieldsResult?.fields?.nodes ?? [];

		return {
			id: table.id,
			name: table.name ?? tableName,
			useRls: table.useRls ?? false,
			fields: fields.map((f) => ({
				id: f.id ?? '',
				name: f.name ?? '',
			})).filter((f) => f.id && f.name),
		};
	} catch (error) {
		console.error(`Failed to fetch table ${tableName}:`, error);
		return null;
	}
}

/**
 * Resolves field names to field IDs using table metadata.
 */
function resolveFieldIds(table: TableWithFields, fieldNames: string[]): string[] {
	const fieldIds: string[] = [];
	for (const fieldName of fieldNames) {
		const field = table.fields.find((f) => f.name === fieldName);
		if (field) {
			fieldIds.push(field.id);
		} else {
			console.warn(`Field ${fieldName} not found in table ${table.name}, skipping from grant`);
		}
	}
	return fieldIds;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook for creating table grants (permissions).
 * Supports both table-level grants (all fields) and field-level grants (specific fields).
 *
 * @example
 * // Table-level grant (all fields)
 * createGrant({
 *   databaseId: 'xxx',
 *   tableName: 'products',
 *   privileges: ['select', 'delete']
 * })
 *
 * @example
 * // Field-level grant (specific fields only)
 * createGrant({
 *   databaseId: 'xxx',
 *   tableName: 'products',
 *   privileges: ['insert'],
 *   fieldNames: ['name', 'description', 'price']
 * })
 */
export function useCreateTableGrant() {
	const queryClient = useQueryClient();
	const sdkClient = useSchemaBuilderSdkClient();
	const createGrantMutation = useCreateTableGrantMutation({ selection: { fields: { id: true } } });

	return useMutation({
		mutationFn: async (input: CreateTableGrantInput) => {
			const { databaseId, tableName, privileges, fieldNames, roleName = 'authenticated' } = input;

			// Step 1: Fetch table metadata
			const table = await getTableByName(databaseId, tableName, sdkClient);
			if (!table) {
				throw new Error(`Table ${tableName} not found`);
			}

			// Step 2: Resolve field names to field IDs (if specified)
			let fieldIds: string[] | undefined;
			if (fieldNames && fieldNames.length > 0) {
				fieldIds = resolveFieldIds(table, fieldNames);
				if (fieldIds.length === 0) {
					throw new Error(`No valid fields found for grant on table ${tableName}`);
				}
			}

			// Step 3: Create a grant for each privilege
			const results = [];
			for (const privilege of privileges) {
				try {
					const grantInput: Record<string, unknown> = {
						tableId: table.id,
						privilege,
						granteeName: roleName,
						...(fieldIds && fieldIds.length > 0 && { fieldIds }),
					};

					const result = await createGrantMutation.mutateAsync(
						grantInput as any,
					);
					results.push(result);
				} catch (error: any) {
					// Check if it's a duplicate error (grant already exists)
					const isDuplicate =
						error?.message?.includes('already exists') ||
						error?.message?.includes('duplicate key') ||
						error?.message?.includes('unique constraint') ||
						error?.message?.includes('unique violation');

					if (isDuplicate) {
						// Grant already exists; continue with next privilege
						continue;
					}

					// Re-throw non-duplicate errors
					throw new Error(`Failed to create ${privilege} grant on ${tableName}: ${error.message}`);
				}
			}

			return results;
		},
		onSuccess: async (_result, variables: CreateTableGrantInput) => {
			await invalidateDatabaseEntities(queryClient, variables.databaseId);
		},
		onError: (error) => {
			console.error('Failed to create table grant:', error);
		},
	});
}

/**
 * Hook for creating multiple table grants in batch.
 * Useful when setting up a new table with standard permissions.
 *
 * @example
 * batchCreateGrants({
 *   databaseId: 'xxx',
 *   tableName: 'products',
 *   grants: [
 *     { privileges: ['select', 'delete'] }, // All fields
 *     { privileges: ['insert'], fieldNames: ['name', 'price'] }, // Specific fields
 *     { privileges: ['update'], fieldNames: ['name', 'description'] },
 *   ]
 * })
 */
export function useBatchCreateTableGrants() {
	const { mutateAsync: createGrant } = useCreateTableGrant();

	return useMutation({
		mutationFn: async (input: {
			databaseId: string;
			tableName: string;
			grants: Array<{
				privileges: string[];
				fieldNames?: string[];
				roleName?: string;
			}>;
		}) => {
			const { databaseId, tableName, grants } = input;

			// Execute grants sequentially to maintain order
			const results = [];
			for (const grant of grants) {
				try {
					const result = await createGrant({
						databaseId,
						tableName,
						...grant,
					});
					results.push(result);
				} catch (error) {
					console.error(`Failed to create grant for ${tableName}:`, error);
					// Continue with remaining grants even if one fails
				}
			}

			return results;
		},
		onError: (error) => {
			console.error('Failed to create batch grants:', error);
		},
	});
}

/**
 * Export helper function for use in other hooks
 */
export { getTableByName };
