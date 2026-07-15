/**
 * Hook for deleting a table
 * Tier 4 wrapper: adds table selection handling after deletion
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDeleteTableMutation } from '@/generated/schema-builder';

import { invalidateDatabaseEntities } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder/modules/invalidate-database-entities';
import { useSchemaBuilderSelectors } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder/use-schema-builder-selectors';

export interface DeleteTableInput {
	id: string;
}

export function useDeleteTable() {
	const queryClient = useQueryClient();
	const { currentSchema, selectedTableId, selectTable, selectedSchemaKey, currentDatabase } = useSchemaBuilderSelectors();
	const deleteTableMutation = useDeleteTableMutation({ selection: { fields: { id: true } } });

	return useMutation({
		mutationFn: async (input: DeleteTableInput): Promise<string> => {
			await deleteTableMutation.mutateAsync({
				id: input.id,
			});

			return input.id;
		},
		onSuccess: async (deletedId, variables) => {
			await invalidateDatabaseEntities(queryClient, currentDatabase?.databaseId);

			const isSelectedTable = selectedTableId === deletedId;

			let newSelectedTable: { id: string; name: string } | null = null;

			if (isSelectedTable && selectedSchemaKey) {
				const currentTables = currentSchema?.tables || [];

				if (currentTables.length > 1) {
					const deletedTableIndex = currentTables.findIndex((table) => table.id === deletedId);
					const remainingTables = currentTables.filter((table) => table.id !== deletedId);

					if (deletedTableIndex < remainingTables.length) {
						// Select the table that will be at the same index after deletion
						newSelectedTable = remainingTables[deletedTableIndex];
					} else {
						// Deleted table was the last one, select the previous table
						newSelectedTable = remainingTables[remainingTables.length - 1];
					}
				}
			}

			if (newSelectedTable) {
				selectTable(newSelectedTable.id, newSelectedTable.name);
			} else if (isSelectedTable) {
				selectTable(null);
			}
		},
		onError: (error) => {
			console.error('Failed to delete table:', error);
		},
	});
}
