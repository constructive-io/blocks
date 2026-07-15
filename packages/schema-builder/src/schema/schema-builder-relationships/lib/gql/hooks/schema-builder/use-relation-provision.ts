/**
 * Hook for atomic relationship creation via relation_provision
 * Tier 4 wrapper: single mutation replaces multi-step FK/M2M creation
 */
import { useCreateRelationProvisionMutation } from '@/generated/modules';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { RelationBelongsTo, RelationHasMany, RelationHasOne, RelationManyToMany } from 'node-type-registry';

import type { ForeignKeyAction, RelationshipType } from '@/blocks/schema/schema-builder-core/lib/schema';
import { buildNodeData, getDataNodeForPolicy, sanitizePolicyData } from '@/blocks/schema/schema-builder-core/components/policies/policy-config';
import { getDefaultFormValues } from '@/blocks/schema/schema-builder-policies/components/policies/policy-hooks';
import type { MergedPolicyType } from '@/blocks/schema/schema-builder-core/components/policies/policy-types';
import { buildGrants, buildPolicyEntry } from '@/blocks/schema/schema-builder-core/lib/policies/provision-helpers';

import { invalidateDatabaseEntities } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder/modules/invalidate-database-entities';
import { useSchemaBuilderSelectors } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder/use-schema-builder-selectors';

const RELATION_TYPE_MAP: Record<RelationshipType, string> = {
	'one-to-one': RelationHasOne.name,
	'belongs-to': RelationBelongsTo.name,
	'one-to-many': RelationHasMany.name,
	'many-to-many': RelationManyToMany.name,
} as const;

export interface RelationProvisionInput {
	relationshipType: RelationshipType;
	sourceTableId: string;
	targetTableId: string;
	/** 'c'=CASCADE, 'r'=RESTRICT, 'n'=SET NULL. Required for FK types; M2M always cascades. */
	deleteAction?: ForeignKeyAction;
	/** FK column name (auto-derived from target table name if omitted) */
	fieldName?: string;
	/** Whether FK field is NOT NULL (default: true) */
	isRequired?: boolean;
	/** Junction table name for M2M (auto-derived if omitted) */
	junctionTableName?: string;
	/** Use composite PK on junction table (M2M only) */
	useCompositeKey?: boolean;
	/** Source FK name override (M2M only) */
	sourceFieldName?: string;
	/** Target FK name override (M2M only) */
	targetFieldName?: string;
	/** Policy type for junction table (M2M only, default: AuthzAllowAll) */
	policyType?: string;
	/** Policy config data (M2M only) */
	policyData?: Record<string, unknown>;
	/** Resolved policy type object (M2M only, used to derive data nodes) */
	policyTypeObj?: MergedPolicyType;
	/** Whether to expose this M2M relation in the GraphQL API */
	exposeInApi?: boolean;
}

export interface RelationProvisionResult {
	outFieldId: string | null;
	outJunctionTableId: string | null;
	outSourceFieldId: string | null;
	outTargetFieldId: string | null;
}

export function useRelationProvision(options?: { skipTableSelect?: boolean }) {
	const queryClient = useQueryClient();
	const { selectTable, currentDatabase, currentSchema } = useSchemaBuilderSelectors();

	const createProvisionMutation = useCreateRelationProvisionMutation({
		selection: {
			fields: {
				id: true,
				outFieldId: true,
				outJunctionTableId: true,
				outSourceFieldId: true,
				outTargetFieldId: true,
			},
		},
	});

	return useMutation<RelationProvisionResult, Error, RelationProvisionInput>({
		mutationFn: async (input) => {
			const databaseId = currentDatabase?.databaseId ?? currentSchema?.metadata?.databaseId;
			if (!databaseId) throw new Error('Database ID not found');

			const relationType = RELATION_TYPE_MAP[input.relationshipType];
			if (!relationType) throw new Error(`Unsupported relationship type: ${input.relationshipType}`);

			const isManyToMany = input.relationshipType === 'many-to-many';

			// Build nodes array for M2M junction table provisioning
			let derivedNodes: Record<string, unknown>[] | undefined;
			let resolvedPolicyData = input.policyData ?? {};
			if (isManyToMany) {
				const policyName = input.policyType || 'AuthzAllowAll';
				const dataNode = getDataNodeForPolicy(policyName);

				// Ensure policyData has defaults from policy type config
				if (input.policyTypeObj) {
					const defaults = getDefaultFormValues(input.policyTypeObj);
					resolvedPolicyData = { ...defaults, ...resolvedPolicyData };
					resolvedPolicyData = sanitizePolicyData(resolvedPolicyData);
				}

				const nodes: Record<string, unknown>[] = [];

				// Add DataId for UUID PK unless using composite key
				if (!input.useCompositeKey) {
					nodes.push({ $type: 'DataId' });
				}

				if (dataNode) {
					const baseNodeData = input.policyTypeObj ? buildNodeData(resolvedPolicyData, input.policyTypeObj) : {};
					nodes.push({ $type: dataNode, ...(Object.keys(baseNodeData).length > 0 ? { data: baseNodeData } : {}) });
				}

				if (nodes.length > 0) {
					derivedNodes = nodes;
				}
			}

			const result = await createProvisionMutation.mutateAsync({
				databaseId,
				relationType,
				sourceTableId: input.sourceTableId,
				targetTableId: input.targetTableId,
				...(input.deleteAction && { deleteAction: input.deleteAction }),
				...(input.fieldName && { fieldName: input.fieldName }),
				...(input.isRequired !== undefined && { isRequired: input.isRequired }),
				...(input.junctionTableName && { junctionTableName: input.junctionTableName }),
				...(input.useCompositeKey !== undefined && { useCompositeKey: input.useCompositeKey }),
				...(input.sourceFieldName && { sourceFieldName: input.sourceFieldName }),
				...(input.targetFieldName && { targetFieldName: input.targetFieldName }),
				...(derivedNodes && { nodes: derivedNodes as unknown as Record<string, unknown> }),
				...(input.exposeInApi !== undefined && { exposeInApi: input.exposeInApi }),
				// M2M: junction table gets grants + a single policy
				...(isManyToMany && {
					grants: buildGrants() as unknown as Record<string, unknown>,
					policies: [
						buildPolicyEntry(input.policyType || 'AuthzAllowAll', {
							permissive: true,
							...(Object.keys(resolvedPolicyData).length > 0 && { data: resolvedPolicyData }),
						}),
					] as unknown as Record<string, unknown>,
				}),
			});

			const provision = result.createRelationProvision?.relationProvision;
			if (!provision) throw new Error('Failed to create relation provision');

			return {
				outFieldId: provision.outFieldId ?? null,
				outJunctionTableId: provision.outJunctionTableId ?? null,
				outSourceFieldId: provision.outSourceFieldId ?? null,
				outTargetFieldId: provision.outTargetFieldId ?? null,
			};
		},
		onSuccess: async (_result, input) => {
			await invalidateDatabaseEntities(queryClient, currentDatabase?.databaseId ?? currentSchema?.metadata?.databaseId);
			if (!options?.skipTableSelect) {
				selectTable(input.sourceTableId);
			}
		},
		onError: (error) => {
			console.error('Failed to provision relation:', error);
		},
	});
}
