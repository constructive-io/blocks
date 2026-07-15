/**
 * Hook for managing foreign key relationships
 * Tier 4 wrapper: orchestrates FK + M2M relationship creation
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ForeignKeyAction, RelationshipType } from '@/blocks/schema/schema-builder-core/lib/schema';
import { ForeignKeyActions, RelationshipTypes } from '@/blocks/schema/schema-builder-core/lib/schema';

import { asFieldIds } from '@/blocks/schema/schema-builder-core/lib/data';

// SDK hooks for foreign key mutations
import {
	useCreateFieldMutation,
	useCreateForeignKeyConstraintMutation,
	useCreatePrimaryKeyConstraintMutation,
	useCreateTableMutation,
	useCreateUniqueConstraintMutation,
	useDeleteForeignKeyConstraintMutation,
	useUpdateForeignKeyConstraintMutation,
} from '@/generated/schema-builder';
import type { CreateTableInput } from '@/generated/schema-builder';

// SDK hooks for M2M junction table creation

// SDK hook for unique constraints (used for 1:1 and M2M enforcement)

import { invalidateDatabaseEntities } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder/modules/invalidate-database-entities';
import { toFieldDefault, toFieldType } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder/transformers/field-type-mapper';
import { useSchemaBuilderSelectors } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder/use-schema-builder-selectors';
import { useCreateTableGrant } from '@/blocks/schema/schema-builder-policies/lib/gql/hooks/schema-builder/use-table-grants';

// Input types (replacing generated imports)
export interface ForeignKeyConstraintInput {
	tableId: string;
	fieldIds: string[];
	refTableId: string;
	refFieldIds: string[];
	name?: string | null;
	deleteAction?: ForeignKeyAction | null;
	updateAction?: ForeignKeyAction | null;
	databaseId?: string;
	type?: string;
	smartTags?: Record<string, unknown> | null;
}

export interface ForeignKeyConstraintPatch {
	name?: string | null;
	fieldIds?: string[] | null;
	refTableId?: string | null;
	refFieldIds?: string[] | null;
	deleteAction?: ForeignKeyAction | null;
	updateAction?: ForeignKeyAction | null;
}

export type CreateForeignKeyInput = Required<
	Pick<ForeignKeyConstraintInput, 'tableId' | 'fieldIds' | 'refTableId' | 'refFieldIds'>
> &
	Pick<ForeignKeyConstraintInput, 'name' | 'deleteAction' | 'updateAction'> & {
		/** Relationship type - used to enforce 1:1 with unique constraint */
		relationshipType?: RelationshipType;
	};

export type UpdateForeignKeyInput = { id: string } & Partial<
	Pick<ForeignKeyConstraintPatch, 'name' | 'fieldIds' | 'refTableId' | 'refFieldIds' | 'deleteAction' | 'updateAction'>
>;

export interface DeleteForeignKeyInput {
	id: string;
}

export function useCreateForeignKey() {
	const queryClient = useQueryClient();
	const { selectTable, currentDatabase, currentSchema } = useSchemaBuilderSelectors();
	const createFkMutation = useCreateForeignKeyConstraintMutation({ selection: { fields: { id: true, name: true } } });
	const createUniqueMutation = useCreateUniqueConstraintMutation({ selection: { fields: { id: true } } });

	return useMutation({
		mutationFn: async (input: CreateForeignKeyInput) => {
			const databaseId = currentDatabase?.databaseId ?? currentSchema?.metadata?.databaseId;
			if (!databaseId) {
				throw new Error('Database ID not found');
			}

			// Step 1: Create unique constraint on the referenced field (required by PostgreSQL for FK)
			// This ensures the referenced field can be used as a FK target
			const refUniqueConstraintName = `${input.refTableId}_${input.refFieldIds.join('_')}_ref_unique`.slice(0, 63);
			try {
				await createUniqueMutation.mutateAsync({
					tableId: input.refTableId,
					databaseId,
					fieldIds: asFieldIds(input.refFieldIds),
					name: refUniqueConstraintName,
					type: 'u',
				});
			} catch (error) {
				// Ignore if unique constraint already exists (e.g., field is already PK or has unique)
				const errorMessage = error instanceof Error ? error.message : '';
				if (!errorMessage.includes('already exists') && !errorMessage.includes('duplicate')) {
					throw error;
				}
			}

			// Step 2: Create the FK constraint with relationship type stored in smartTags
			const result = await createFkMutation.mutateAsync({
				databaseId,
				tableId: input.tableId,
				fieldIds: asFieldIds(input.fieldIds),
				refTableId: input.refTableId,
				refFieldIds: asFieldIds(input.refFieldIds),
				name: input.name ?? undefined,
				deleteAction: input.deleteAction ?? ('a' as ForeignKeyAction),
				updateAction: input.updateAction ?? ('a' as ForeignKeyAction),
				type: 'f',
				smartTags: input.relationshipType ? ({ relationshipType: input.relationshipType } as Record<string, unknown>) : undefined,
			});

			const createdFk = result.createForeignKeyConstraint?.foreignKeyConstraint;
			if (!createdFk?.id) {
				throw new Error('Failed to create foreign key constraint');
			}

			// Step 3: For one-to-one relationships, add unique constraint on FK field to enforce 1:1
			if (input.relationshipType === RelationshipTypes.ONE_TO_ONE) {
				const fkName = input.name || createdFk.name || 'fk';
				const uniqueName = fkName.replace(/_fkey\d*$/, '_unique');
				await createUniqueMutation.mutateAsync({
					tableId: input.tableId,
					databaseId,
					fieldIds: asFieldIds(input.fieldIds),
					name: uniqueName,
					type: 'u',
				});
			}

			return { id: createdFk.id, name: createdFk.name ?? '' };
		},
		onSuccess: async (_createdForeignKey, variables) => {
			// Invalidate queries - selectors will derive new state automatically
			await invalidateDatabaseEntities(queryClient, currentDatabase?.databaseId ?? currentSchema?.metadata?.databaseId);
			// Re-select the table to ensure UI updates
			selectTable(variables.tableId);
		},
		onError: (error) => {
			console.error('Failed to create foreign key constraint:', error);
		},
	});
}

export function useUpdateForeignKey() {
	const queryClient = useQueryClient();
	const { selectTable, selectedTableId, currentDatabase, currentSchema } = useSchemaBuilderSelectors();
	const updateFkMutation = useUpdateForeignKeyConstraintMutation({ selection: { fields: { id: true, name: true } } });

	return useMutation({
		mutationFn: async (input: UpdateForeignKeyInput) => {
			const patch: Record<string, unknown> = {};
			if (input.name !== undefined) patch.name = input.name;
			if (input.fieldIds !== undefined) patch.fieldIds = input.fieldIds;
			if (input.refTableId !== undefined) patch.refTableId = input.refTableId;
			if (input.refFieldIds !== undefined) patch.refFieldIds = input.refFieldIds;
			if (input.deleteAction !== undefined) patch.deleteAction = input.deleteAction;
			if (input.updateAction !== undefined) patch.updateAction = input.updateAction;

			const result = await updateFkMutation.mutateAsync({ id: input.id, foreignKeyConstraintPatch: patch });

			const updatedFk = result.updateForeignKeyConstraint?.foreignKeyConstraint;
			if (!updatedFk?.id) {
				throw new Error('Failed to update foreign key constraint');
			}
			return { id: updatedFk.id, name: updatedFk.name ?? '' };
		},
		onSuccess: async () => {
			await invalidateDatabaseEntities(queryClient, currentDatabase?.databaseId ?? currentSchema?.metadata?.databaseId);

			// Re-select the current table to ensure UI updates
			if (selectedTableId) {
				selectTable(selectedTableId);
			}
		},
		onError: (error) => {
			console.error('Failed to update foreign key constraint:', error);
		},
	});
}

export function useDeleteForeignKey() {
	const queryClient = useQueryClient();
	const { selectTable, selectedTableId, currentDatabase, currentSchema } = useSchemaBuilderSelectors();
	const deleteFkMutation = useDeleteForeignKeyConstraintMutation({ selection: { fields: { id: true } } });

	return useMutation({
		mutationFn: async (input: DeleteForeignKeyInput) => {
			await deleteFkMutation.mutateAsync({ id: input.id });

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
			console.error('Failed to delete foreign key constraint:', error);
		},
	});
}

// === Many-to-Many Relationship ===

export interface CreateManyToManyInput {
	/** First table ID */
	tableAId: string;
	/** Second table ID */
	tableBId: string;
	/** First table name (for FK field naming) */
	tableAName: string;
	/** Second table name (for FK field naming) */
	tableBName: string;
	/** Junction table name */
	junctionTableName: string;
	/** Primary key field ID of table A */
	tableAPrimaryKeyFieldId: string;
	/** Primary key field ID of table B */
	tableBPrimaryKeyFieldId: string;
	/** FK action on delete (default: CASCADE) */
	deleteAction?: ForeignKeyAction;
	/** FK action on update (default: NO_ACTION) */
	updateAction?: ForeignKeyAction;
}

/**
 * Creates a many-to-many relationship by:
 * 1. Creating a junction table
 * 2. Creating an id field with primary key
 * 3. Creating two FK fields pointing to both related tables
 * 4. Creating two FK constraints
 * 5. Creating a composite unique constraint on (a_id, b_id) to prevent duplicates
 */
export function useCreateManyToMany() {
	const queryClient = useQueryClient();
	const { selectTable, currentDatabase, currentSchema } = useSchemaBuilderSelectors();
	const { mutateAsync: createGrant } = useCreateTableGrant();
	const createTableMutation = useCreateTableMutation({ selection: { fields: { id: true, name: true } } });
	const createFieldMutation = useCreateFieldMutation({ selection: { fields: { id: true } } });
	const createPkMutation = useCreatePrimaryKeyConstraintMutation({ selection: { fields: { id: true } } });
	const createFkMutation = useCreateForeignKeyConstraintMutation({ selection: { fields: { id: true } } });
	const createUniqueMutation = useCreateUniqueConstraintMutation({ selection: { fields: { id: true } } });

	return useMutation({
		mutationFn: async (input: CreateManyToManyInput) => {
			const databaseId = currentDatabase?.databaseId ?? currentSchema?.metadata?.databaseId;
			const schemaId = currentDatabase?.schemaId ?? currentSchema?.metadata?.schemaId;
			if (!databaseId || !schemaId) {
				throw new Error('Database ID or Schema ID not found');
			}

			const deleteAction = input.deleteAction ?? ForeignKeyActions.CASCADE;
			const updateAction = input.updateAction ?? ForeignKeyActions.NO_ACTION;

			// Step 1: Create the junction table
			// inheritsId is required in generated types but optional at GraphQL level
			const tableResult = await createTableMutation.mutateAsync({
				name: input.junctionTableName,
				databaseId,
				schemaId,
			} as CreateTableInput['table']);

			const junctionTable = tableResult.createTable?.table;
			if (!junctionTable?.id || !junctionTable?.name) {
				throw new Error('Failed to create junction table');
			}
			const junctionTableId = junctionTable.id;
			const junctionTableName = junctionTable.name;

			// Steps 2–6: All DDL on the junction table is serialized to avoid
			// PostgreSQL "tuple concurrently updated" errors. Concurrent DDL
			// statements on the same table modify the same pg_class catalog row,
			// which PostgreSQL rejects under MVCC.

			// Step 2: Create id field
			const idFieldResult = await createFieldMutation.mutateAsync({
				name: 'id',
				// type/defaultValue are structured JSONB objects in the metaschema now.
				type: toFieldType('uuid') as unknown as Record<string, unknown>,
				tableId: junctionTableId,
				databaseId,
				isRequired: true,
				defaultValue: toFieldDefault('uuidv7()') as unknown as Record<string, unknown>,
			});

			const idField = idFieldResult.createField?.field;
			if (!idField?.id) {
				throw new Error('Failed to create id field');
			}
			const idFieldId = idField.id;

			// Step 3: Create PK constraint on id field
			await createPkMutation.mutateAsync({
				tableId: junctionTableId,
				databaseId,
				fieldIds: asFieldIds([idFieldId]),
				name: `${input.junctionTableName}_pkey`,
				type: 'p',
			});

			// Step 4: Create FK fields sequentially
			const fieldAName = `${input.tableAName}_id`;
			const fieldBName = `${input.tableBName}_id`;

			const fieldAResult = await createFieldMutation.mutateAsync({
				name: fieldAName,
				// type is a structured JSONB object in the metaschema now.
				type: toFieldType('uuid') as unknown as Record<string, unknown>,
				tableId: junctionTableId,
				databaseId,
				isRequired: true,
			});

			const fieldA = fieldAResult.createField?.field;
			if (!fieldA?.id) {
				throw new Error('Failed to create FK field for table A');
			}
			const fieldAId = fieldA.id;

			const fieldBResult = await createFieldMutation.mutateAsync({
				name: fieldBName,
				// type is a structured JSONB object in the metaschema now.
				type: toFieldType('uuid') as unknown as Record<string, unknown>,
				tableId: junctionTableId,
				databaseId,
				isRequired: true,
			});

			const fieldB = fieldBResult.createField?.field;
			if (!fieldB?.id) {
				throw new Error('Failed to create FK field for table B');
			}
			const fieldBId = fieldB.id;

			// Step 5: Create FK constraints sequentially
			await createFkMutation.mutateAsync({
				databaseId,
				tableId: junctionTableId,
				fieldIds: asFieldIds([fieldAId]),
				refTableId: input.tableAId,
				refFieldIds: asFieldIds([input.tableAPrimaryKeyFieldId]),
				name: `${input.junctionTableName}_${input.tableAName}_fkey`,
				deleteAction,
				updateAction,
				type: 'f',
			});

			await createFkMutation.mutateAsync({
				databaseId,
				tableId: junctionTableId,
				fieldIds: asFieldIds([fieldBId]),
				refTableId: input.tableBId,
				refFieldIds: asFieldIds([input.tableBPrimaryKeyFieldId]),
				name: `${input.junctionTableName}_${input.tableBName}_fkey`,
				deleteAction,
				updateAction,
				type: 'f',
			});

			// Step 6: Create composite unique constraint on (a_id, b_id) to prevent duplicate pairs
			await createUniqueMutation.mutateAsync({
				tableId: junctionTableId,
				databaseId,
				fieldIds: asFieldIds([fieldAId, fieldBId]),
				name: `${input.junctionTableName}_pair_unique`,
				type: 'u',
			});

			// Step 7: Grant permissions (non-fatal, after all DDL is complete)
			await createGrant({
				databaseId,
				tableName: junctionTableName,
				privileges: ['select', 'insert', 'update', 'delete'],
				roleName: 'authenticated',
			}).catch((error) => {
				console.warn(`Failed to grant permissions for junction table: ${error instanceof Error ? error.message : 'Unknown error'}`);
			});

			return {
				junctionTableId,
				junctionTableName,
			};
		},
		onSuccess: async (result) => {
			await invalidateDatabaseEntities(queryClient, currentDatabase?.databaseId ?? currentSchema?.metadata?.databaseId);
			// Select the newly created junction table
			if (result?.junctionTableId && result?.junctionTableName) {
				selectTable(result.junctionTableId, result.junctionTableName);
			}
		},
		onError: (error) => {
			console.error('Failed to create many-to-many relationship:', error);
		},
	});
}
