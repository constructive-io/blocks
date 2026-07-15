'use client';

import type { MergedPolicyType } from '@/blocks/schema/schema-builder-core/components/policies/policy-types';
import {
	AllowAllDiagram,
	CompositeDiagram,
	DenyAllDiagram,
	DirectOwnerAnyDiagram,
	DirectOwnerDiagram,
	EntityMembershipDiagram,
	MemberListDiagram,
	MembershipDiagram,
	OrgHierarchyDiagram,
	PublishableDiagram,
	RelatedEntityMembershipDiagram,
	RelatedMemberListDiagram,
	TemporalDiagram,
} from './diagram-adapters';

/**
 * Registry of diagram components keyed by policy type ID (Authz* keys from POLICY_TYPE_UI_CONFIG)
 */
export const DIAGRAM_COMPONENTS: Record<
	string,
	React.ComponentType<{ tableName: string; config: Record<string, unknown> }>
> = {
	// Ownership patterns
	AuthzDirectOwner: DirectOwnerDiagram,
	AuthzDirectOwnerAny: DirectOwnerAnyDiagram,
	AuthzMemberList: MemberListDiagram,
	AuthzRelatedMemberList: RelatedMemberListDiagram,

	// Membership patterns
	AuthzAppMembership: MembershipDiagram,
	AuthzEntityMembership: EntityMembershipDiagram,
	AuthzRelatedEntityMembership: RelatedEntityMembershipDiagram,
	AuthzOrgHierarchy: OrgHierarchyDiagram,

	// Temporal/Publishing
	AuthzPublishable: PublishableDiagram,
	AuthzTemporal: TemporalDiagram,

	// Simple
	AuthzAllowAll: AllowAllDiagram,
	AuthzDenyAll: DenyAllDiagram,

	// Composite
	AuthzComposite: CompositeDiagram,
};

interface PolicyDiagramProps {
	policyType: MergedPolicyType | null;
	tableName: string;
	config: Record<string, unknown>;
}

/**
 * Main diagram container - selects the appropriate diagram based on policy type
 */
export function PolicyDiagram({ policyType, tableName, config }: PolicyDiagramProps) {
	if (!policyType?.diagramKey) {
		return null;
	}

	const DiagramComponent = DIAGRAM_COMPONENTS[policyType.diagramKey];
	if (!DiagramComponent) {
		return null;
	}

	return (
		<div className='policy-diagram flex items-center justify-center'>
			<DiagramComponent tableName={tableName || 'table'} config={config} />
		</div>
	);
}

/**
 * Render a diagram by diagramKey directly (without needing full policyType)
 */
export function PolicyDiagramByKey({
	diagramKey,
	tableName,
	config = {},
}: {
	diagramKey: string;
	tableName: string;
	config?: Record<string, unknown>;
}) {
	const DiagramComponent = DIAGRAM_COMPONENTS[diagramKey];
	if (!DiagramComponent) {
		return null;
	}

	return (
		<div className='policy-diagram flex items-center justify-center'>
			<DiagramComponent tableName={tableName || 'table'} config={config} />
		</div>
	);
}
