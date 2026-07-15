/**
 * Hook for managing indexes
 * Tier 4 wrapper: adds cache invalidation and table selection
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { asFieldIds } from '@/blocks/schema/schema-builder-core/lib/data';

import {
	useCreateIndexMutation,
	useDeleteIndexMutation,
	useUpdateIndexMutation,
} from '@/generated/schema-builder';

import { invalidateDatabaseEntities } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder/modules/invalidate-database-entities';
import { useSchemaBuilderSelectors } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder/use-schema-builder-selectors';

export interface CreateIndexInput {
	tableId: string;
	name: string;
	fieldIds: string[];
	isUnique?: boolean | null;
	accessMethod?: string | null;
}

export interface UpdateIndexInput {
	id: string;
	name?: string | null;
	fieldIds?: string[] | null;
	isUnique?: boolean | null;
	accessMethod?: string | null;
}

export interface DeleteIndexInput {
	id: string;
}

export function useCreateIndex() {
	const queryClient = useQueryClient();
	const { selectTable, currentDatabase, currentSchema } = useSchemaBuilderSelectors();
	const createIndexMutation = useCreateIndexMutation({ selection: { fields: { id: true, name: true } } });

	return useMutation({
		mutationFn: async (input: CreateIndexInput) => {
			const databaseId = currentDatabase?.databaseId ?? currentSchema?.metadata?.databaseId;
			if (!databaseId) {
				throw new Error('Database ID not found');
			}

			const result = await createIndexMutation.mutateAsync({
				databaseId,
				tableId: input.tableId,
				name: input.name,
				fieldIds: asFieldIds(input.fieldIds),
				isUnique: input.isUnique ?? false,
				accessMethod: input.accessMethod || 'btree',
			});

			const createdIndex = result.createIndex?.index;
			if (!createdIndex?.id) {
				throw new Error('Failed to create index');
			}
			return { id: createdIndex.id, name: createdIndex.name ?? '' };
		},
		onSuccess: async (_createdIndex, variables) => {
			await invalidateDatabaseEntities(queryClient, currentDatabase?.databaseId ?? currentSchema?.metadata?.databaseId);

			// Re-select the table to ensure UI updates
			selectTable(variables.tableId);
		},
		onError: (error) => {
			console.error('Failed to create index:', error);
		},
	});
}

export function useUpdateIndex() {
	const queryClient = useQueryClient();
	const { selectTable, selectedTableId, currentDatabase, currentSchema } = useSchemaBuilderSelectors();
	const updateIndexMutation = useUpdateIndexMutation({ selection: { fields: { id: true, name: true } } });

	return useMutation({
		mutationFn: async (input: UpdateIndexInput) => {
			const patch: Record<string, unknown> = {};
			if (input.name !== undefined) patch.name = input.name;
			if (input.fieldIds !== undefined) patch.fieldIds = input.fieldIds;
			if (input.isUnique !== undefined) patch.isUnique = input.isUnique;
			if (input.accessMethod !== undefined) patch.accessMethod = input.accessMethod;

			const result = await updateIndexMutation.mutateAsync({ id: input.id, indexPatch: patch });

			const updatedIndex = result.updateIndex?.index;
			if (!updatedIndex?.id) {
				throw new Error('Failed to update index');
			}
			return { id: updatedIndex.id, name: updatedIndex.name ?? '' };
		},
		onSuccess: async () => {
			await invalidateDatabaseEntities(queryClient, currentDatabase?.databaseId ?? currentSchema?.metadata?.databaseId);

			// Re-select the current table to ensure UI updates
			if (selectedTableId) {
				selectTable(selectedTableId);
			}
		},
		onError: (error) => {
			console.error('Failed to update index:', error);
		},
	});
}

export function useDeleteIndex() {
	const queryClient = useQueryClient();
	const { selectTable, selectedTableId, currentDatabase, currentSchema } = useSchemaBuilderSelectors();
	const deleteIndexMutation = useDeleteIndexMutation({ selection: { fields: { id: true } } });

	return useMutation({
		mutationFn: async (input: DeleteIndexInput) => {
			await deleteIndexMutation.mutateAsync({ id: input.id });

			return { id: input.id };
		},
		onSuccess: async () => {
			await invalidateDatabaseEntities(queryClient, currentDatabase?.databaseId ?? currentSchema?.metadata?.databaseId);

			// Re-select the current table to ensure UI updates
			if (selectedTableId) {
				selectTable(selectedTableId);
			}
		},
		onError: (error) => {
			console.error('Failed to delete index:', error);
		},
	});
}
