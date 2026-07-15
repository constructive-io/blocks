/**
 * Hook for field mutations (create, update, delete)
 * Tier 4 wrapper: orchestrates field + constraint mutations
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { asFieldIds, stripEmpty } from '@/blocks/schema/schema-builder-core/lib/data';

import { cellTypeToBackendType, mapConstraintsToFieldPatch } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder/transformers/field-constraints-mapper';
import { fieldTypeToTypeName, toFieldDefault, toFieldType } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder/transformers/field-type-mapper';
import type { FieldDefinition } from '@/blocks/schema/schema-builder-core/lib/schema';

// SDK hooks for field mutations
import {
	useCreateFieldMutation,
	useCreatePrimaryKeyConstraintMutation,
	useCreateUniqueConstraintMutation,
	useDeleteFieldMutation,
	useDeletePrimaryKeyConstraintMutation,
	useDeleteUniqueConstraintMutation,
	useUpdateFieldMutation,
	useUpdatePrimaryKeyConstraintMutation,
} from '@/generated/schema-builder';

// SDK hooks for constraint mutations

import { invalidateDatabaseEntities } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder/modules/invalidate-database-entities';
import { useSchemaBuilderSelectors } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder/use-schema-builder-selectors';

// Input types for hook consumers
export interface CreateFieldData {
	field: FieldDefinition;
	tableId: string;
	databaseId: string;
	tableName: string;
	existingPrimaryKeyConstraintId?: string;
	allPrimaryKeyFieldIds?: string[];
}

export interface UpdateFieldData {
	id: string;
	field: FieldDefinition;
	tableId: string;
	databaseId: string;
	tableName: string;
	existingPrimaryKeyConstraintId?: string;
	existingUniqueConstraintId?: string;
	allPrimaryKeyFieldIds?: string[];
	wasPartOfPrimaryKey?: boolean;
}

export interface DeleteFieldData {
	id: string;
	primaryKeyConstraintId?: string;
	uniqueConstraintId?: string;
	allPrimaryKeyFieldIds?: string[];
	wasPartOfPrimaryKey?: boolean;
}

export interface FieldOrderUpdate {
	id: string;
	fieldOrder: number;
}

// Return type for created field
interface CreatedField {
	id: string;
	name: string;
	type: string;
}

function fieldDefinitionToCreateInput(field: FieldDefinition, tableId: string, databaseId: string) {
	// CRITICAL: Auto-set UUID default value for primary keys to prevent "permission denied" errors
	let defaultValue = field.constraints.defaultValue?.toString() || undefined;

	const backendType = cellTypeToBackendType(field.type);
	if (backendType === 'uuid' && field.constraints.primaryKey && !defaultValue) {
		defaultValue = 'uuidv7()';
	}

	const { smartTags, chk, chkExpr, ...constraintFields } = mapConstraintsToFieldPatch(field);
	return {
		name: field.name,
		// type/defaultValue are structured JSONB objects in the metaschema now.
		type: toFieldType(backendType) as unknown as Record<string, unknown>,
		tableId,
		databaseId,
		description: stripEmpty(field.description),
		label: stripEmpty(field.label),
		defaultValue: toFieldDefault(defaultValue) as unknown as Record<string, unknown> | undefined,
		isRequired: field.isRequired ?? !field.constraints.nullable,
		fieldOrder: field.fieldOrder,
		...constraintFields,
		smartTags: smartTags as Record<string, unknown> | undefined,
		chk: chk as Record<string, unknown> | undefined,
		chkExpr: chkExpr as Record<string, unknown> | undefined,
	};
}

function fieldDefinitionToPatch(field: FieldDefinition) {
	let defaultValue = field.constraints.defaultValue?.toString() || undefined;

	const backendType = cellTypeToBackendType(field.type);
	if (backendType === 'uuid' && field.constraints.primaryKey && !defaultValue) {
		defaultValue = 'uuidv7()';
	}

	const { smartTags, chk, chkExpr, ...constraintFields } = mapConstraintsToFieldPatch(field);
	return {
		name: field.name,
		// type/defaultValue are structured JSONB objects in the metaschema FieldPatch now.
		type: toFieldType(backendType) as unknown as Record<string, unknown>,
		description: stripEmpty(field.description),
		label: stripEmpty(field.label),
		defaultValue: toFieldDefault(defaultValue) as unknown as Record<string, unknown> | undefined,
		isRequired: field.isRequired ?? !field.constraints.nullable,
		fieldOrder: field.fieldOrder,
		...constraintFields,
		smartTags: smartTags as Record<string, unknown> | undefined,
		chk: chk as Record<string, unknown> | undefined,
		chkExpr: chkExpr as Record<string, unknown> | undefined,
	};
}

export function useCreateField() {
	const queryClient = useQueryClient();
	const { selectTable, selectedTableId, currentDatabase } = useSchemaBuilderSelectors();
	const createFieldMutation = useCreateFieldMutation({ selection: { fields: { id: true, name: true, type: true } } });
	const createPkMutation = useCreatePrimaryKeyConstraintMutation({ selection: { fields: { id: true } } });
	const updatePkMutation = useUpdatePrimaryKeyConstraintMutation({ selection: { fields: { id: true } } });
	const createUniqueMutation = useCreateUniqueConstraintMutation({ selection: { fields: { id: true } } });

	return useMutation({
		mutationFn: async (input: CreateFieldData): Promise<CreatedField> => {
			const fieldInput = fieldDefinitionToCreateInput(input.field, input.tableId, input.databaseId);

			// Step 1: Create the field
			const result = await createFieldMutation.mutateAsync(fieldInput);

			const createdField = result.createField?.field;
			if (!createdField?.id || !createdField?.name) {
				throw new Error('Failed to create field');
			}

			const errors: string[] = [];

			// Step 2: Handle primary key constraint
			if (input.field.constraints.primaryKey) {
				if (input.existingPrimaryKeyConstraintId && input.allPrimaryKeyFieldIds) {
					const updatedFieldIds = [...input.allPrimaryKeyFieldIds, createdField.id];
					try {
						await updatePkMutation.mutateAsync({
							id: input.existingPrimaryKeyConstraintId, primaryKeyConstraintPatch: { fieldIds: asFieldIds(updatedFieldIds) },
						});
					} catch (error) {
						errors.push(`Failed to update primary key constraint: ${error instanceof Error ? error.message : 'Unknown error'}`);
						throw new Error(errors.join('; '));
					}
				} else {
					try {
						await createPkMutation.mutateAsync({
							tableId: input.tableId,
							databaseId: input.databaseId,
							fieldIds: asFieldIds([createdField.id]),
							name: `${input.tableName}_pkey`,
							type: 'p',
						});
					} catch (error) {
						errors.push(`Failed to create primary key constraint: ${error instanceof Error ? error.message : 'Unknown error'}`);
						throw new Error(errors.join('; '));
					}
				}
			}

			// Step 3: Create unique constraint if needed
			if (input.field.constraints.unique) {
				try {
					await createUniqueMutation.mutateAsync({
						tableId: input.tableId,
						databaseId: input.databaseId,
						fieldIds: asFieldIds([createdField.id]),
						name: `${input.field.name}_key`,
						type: 'u',
					});
				} catch (error) {
					errors.push(`Failed to create unique constraint: ${error instanceof Error ? error.message : 'Unknown error'}`);
					throw new Error(errors.join('; '));
				}
			}

			// createdField.type is now a structured FieldType object; reduce to the
			// type-name string this return shape expects.
			return { id: createdField.id, name: createdField.name, type: fieldTypeToTypeName(createdField.type) };
		},
		onSuccess: async (_result, variables) => {
			await invalidateDatabaseEntities(queryClient, variables.databaseId ?? currentDatabase?.databaseId);
			if (selectedTableId) {
				selectTable(selectedTableId);
			}
		},
		onError: (error) => {
			console.error('Failed to create field:', error);
		},
	});
}

export function useUpdateField() {
	const queryClient = useQueryClient();
	const { selectTable, selectedTableId, currentDatabase } = useSchemaBuilderSelectors();
	const updateFieldMutation = useUpdateFieldMutation({ selection: { fields: { id: true, name: true, type: true } } });
	const createPkMutation = useCreatePrimaryKeyConstraintMutation({ selection: { fields: { id: true } } });
	const updatePkMutation = useUpdatePrimaryKeyConstraintMutation({ selection: { fields: { id: true } } });
	const deletePkMutation = useDeletePrimaryKeyConstraintMutation({ selection: { fields: { id: true } } });
	const createUniqueMutation = useCreateUniqueConstraintMutation({ selection: { fields: { id: true } } });
	const deleteUniqueMutation = useDeleteUniqueConstraintMutation({ selection: { fields: { id: true } } });

	return useMutation({
		mutationFn: async (input: UpdateFieldData) => {
			const patch = fieldDefinitionToPatch(input.field);
			const errors: string[] = [];

			// Step 1: Update the field
			const result = await updateFieldMutation.mutateAsync({ id: input.id, fieldPatch: patch });

			const updatedField = result.updateField?.field;
			if (!updatedField?.id) {
				throw new Error('Failed to update field');
			}

			// Step 2: Handle primary key constraint changes
			const hasPrimaryKey = input.field.constraints.primaryKey;
			const hadPrimaryKey = input.wasPartOfPrimaryKey || false;

			if (hasPrimaryKey && !hadPrimaryKey) {
				if (input.existingPrimaryKeyConstraintId && input.allPrimaryKeyFieldIds) {
					const updatedFieldIds = [...input.allPrimaryKeyFieldIds, input.id];
					try {
						await updatePkMutation.mutateAsync({
							id: input.existingPrimaryKeyConstraintId, primaryKeyConstraintPatch: { fieldIds: asFieldIds(updatedFieldIds) },
						});
					} catch (error) {
						errors.push(`Failed to update primary key constraint: ${error instanceof Error ? error.message : 'Unknown error'}`);
					}
				} else {
					try {
						await createPkMutation.mutateAsync({
							tableId: input.tableId,
							databaseId: input.databaseId,
							fieldIds: asFieldIds([input.id]),
							name: `${input.tableName}_pkey`,
							type: 'p',
						});
					} catch (error) {
						errors.push(`Failed to create primary key constraint: ${error instanceof Error ? error.message : 'Unknown error'}`);
					}
				}
			} else if (!hasPrimaryKey && hadPrimaryKey) {
				if (input.existingPrimaryKeyConstraintId && input.allPrimaryKeyFieldIds) {
					const remainingFieldIds = input.allPrimaryKeyFieldIds.filter((id) => id !== input.id);
					if (remainingFieldIds.length > 0) {
						try {
							await updatePkMutation.mutateAsync({
								id: input.existingPrimaryKeyConstraintId, primaryKeyConstraintPatch: { fieldIds: asFieldIds(remainingFieldIds) },
							});
						} catch (error) {
							errors.push(`Failed to update primary key constraint: ${error instanceof Error ? error.message : 'Unknown error'}`);
						}
					} else {
						try {
							await deletePkMutation.mutateAsync({ id: input.existingPrimaryKeyConstraintId });
						} catch (error) {
							errors.push(`Failed to delete primary key constraint: ${error instanceof Error ? error.message : 'Unknown error'}`);
						}
					}
				}
			}

			// Step 3: Handle unique constraint changes
			const hasUnique = input.field.constraints.unique;
			const hadUnique = !!input.existingUniqueConstraintId;

			if (hasUnique && !hadUnique) {
				try {
					await createUniqueMutation.mutateAsync({
						tableId: input.tableId,
						databaseId: input.databaseId,
						fieldIds: asFieldIds([input.id]),
						name: `${input.tableName}_${input.field.name}_key`,
						type: 'u',
					});
				} catch (error) {
					errors.push(`Failed to create unique constraint: ${error instanceof Error ? error.message : 'Unknown error'}`);
				}
			} else if (!hasUnique && hadUnique && input.existingUniqueConstraintId) {
				try {
					await deleteUniqueMutation.mutateAsync({ id: input.existingUniqueConstraintId });
				} catch (error) {
					errors.push(`Failed to delete unique constraint: ${error instanceof Error ? error.message : 'Unknown error'}`);
				}
			}

			if (errors.length > 0) {
				console.warn('Field updated with constraint errors:', errors.join('; '));
			}

			return updatedField;
		},
		onSuccess: async (_result, variables) => {
			await invalidateDatabaseEntities(queryClient, variables.databaseId ?? currentDatabase?.databaseId);
			if (selectedTableId) {
				selectTable(selectedTableId);
			}
		},
		onError: (error) => {
			console.error('Failed to update field:', error);
		},
	});
}

export function useDeleteField() {
	const queryClient = useQueryClient();
	const { selectTable, selectedTableId, currentDatabase } = useSchemaBuilderSelectors();
	const deleteFieldMutation = useDeleteFieldMutation({ selection: { fields: { id: true } } });
	const updatePkMutation = useUpdatePrimaryKeyConstraintMutation({ selection: { fields: { id: true } } });
	const deletePkMutation = useDeletePrimaryKeyConstraintMutation({ selection: { fields: { id: true } } });
	const deleteUniqueMutation = useDeleteUniqueConstraintMutation({ selection: { fields: { id: true } } });

	return useMutation({
		mutationFn: async (input: DeleteFieldData): Promise<string> => {
			// Step 1: Handle primary key constraint
			if (input.wasPartOfPrimaryKey && input.primaryKeyConstraintId) {
				if (input.allPrimaryKeyFieldIds && input.allPrimaryKeyFieldIds.length > 1) {
					const remainingFieldIds = input.allPrimaryKeyFieldIds.filter((id) => id !== input.id);
					await updatePkMutation.mutateAsync({
						id: input.primaryKeyConstraintId, primaryKeyConstraintPatch: { fieldIds: asFieldIds(remainingFieldIds) },
					});
				} else {
					await deletePkMutation.mutateAsync({ id: input.primaryKeyConstraintId });
				}
			}

			// Step 2: Handle unique constraint
			if (input.uniqueConstraintId) {
				await deleteUniqueMutation.mutateAsync({ id: input.uniqueConstraintId });
			}

			// Step 3: Delete the field
			await deleteFieldMutation.mutateAsync({ id: input.id });

			return input.id;
		},
		onSuccess: async () => {
			await invalidateDatabaseEntities(queryClient, currentDatabase?.databaseId);
			if (selectedTableId) {
				selectTable(selectedTableId);
			}
		},
		onError: (error) => {
			console.error('Failed to delete field:', error);
		},
	});
}

export function useUpdateFieldOrder() {
	const queryClient = useQueryClient();
	const { selectTable, selectedTableId, currentDatabase } = useSchemaBuilderSelectors();
	const updateFieldMutation = useUpdateFieldMutation({ selection: { fields: { id: true } } });

	return useMutation({
		mutationFn: async (fieldUpdates: FieldOrderUpdate[]) => {
			const updatePromises = fieldUpdates.map((update) =>
				updateFieldMutation.mutateAsync({
					id: update.id, fieldPatch: { fieldOrder: update.fieldOrder },
				}),
			);

			await Promise.all(updatePromises);
			return fieldUpdates;
		},
		onSuccess: async () => {
			await invalidateDatabaseEntities(queryClient, currentDatabase?.databaseId);
			if (selectedTableId) {
				selectTable(selectedTableId);
			}
		},
		onError: (error) => {
			console.error('Failed to update field order:', error);
		},
	});
}
