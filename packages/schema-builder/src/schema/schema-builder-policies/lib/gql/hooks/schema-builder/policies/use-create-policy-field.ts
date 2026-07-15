/**
 * Hook for creating fields for policies
 * Tier 4 wrapper: uses SDK + transform + custom cache invalidation
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCreateFieldMutation } from '@/generated/schema-builder';
import { fieldTypeToTypeName, toFieldType } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder/transformers/field-type-mapper';
import { databasePoliciesQueryKeys } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder/policies/use-database-policies';

export type PolicyFieldType = 'uuid' | 'uuid[]' | 'timestamptz' | 'boolean';

export interface CreatePolicyFieldInput {
	name: string;
	tableId: string;
	databaseId: string;
	fieldType: PolicyFieldType;
}

export function useCreatePolicyField() {
	const queryClient = useQueryClient();
	const createFieldMutation = useCreateFieldMutation({ selection: { fields: { id: true, name: true, type: true } } });

	return useMutation({
		mutationFn: async (input: CreatePolicyFieldInput) => {
			const result = await createFieldMutation.mutateAsync({
				name: input.name,
				tableId: input.tableId,
				databaseId: input.databaseId,
				// type is a structured JSONB object in the metaschema now.
				type: toFieldType(input.fieldType) as unknown as Record<string, unknown>,
				isRequired: false,
			});

			const createdField = result.createField?.field;
			if (!createdField?.id) {
				throw new Error('Failed to create field');
			}

			return { id: createdField.id, name: createdField.name ?? '', type: fieldTypeToTypeName(createdField.type) };
		},
		onSuccess: async (_createdField, variables) => {
			await queryClient.invalidateQueries({
				queryKey: databasePoliciesQueryKeys.byDatabase(variables.databaseId),
			});
		},
	});
}
