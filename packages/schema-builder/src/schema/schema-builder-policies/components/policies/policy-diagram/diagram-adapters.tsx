'use client';

/**
 * Policy diagram adapters — map the { tableName, config } interface
 * to generated SVG components with named props.
 *
 * Each adapter reads the theme to pick light/dark variant.
 */

import { useSchemaBuilderRuntime } from '@/blocks/schema/schema-builder-core/context/block-config';

import {
	AuthzAllowAllDark,
	AuthzAllowAllLight,
	AuthzAppMembershipDark,
	AuthzAppMembershipLight,
	AuthzCompositeDark,
	AuthzCompositeLight,
	AuthzDenyAllDark,
	AuthzDenyAllLight,
	AuthzDirectOwnerAnyDark,
	AuthzDirectOwnerAnyLight,
	AuthzDirectOwnerDark,
	AuthzDirectOwnerLight,
	AuthzEntityMembershipDark,
	AuthzEntityMembershipLight,
	AuthzMemberListDark,
	AuthzMemberListLight,
	AuthzOrgHierarchyDark,
	AuthzOrgHierarchyLight,
	AuthzPublishableDark,
	AuthzPublishableLight,
	AuthzRelatedEntityMembershipDark,
	AuthzRelatedEntityMembershipLight,
	AuthzRelatedMemberListDark,
	AuthzRelatedMemberListLight,
	AuthzTemporalDark,
	AuthzTemporalLight,
} from './generated';

// ---------------------------------------------------------------------------
// Theme resolution
// ---------------------------------------------------------------------------

function useMode(): 'light' | 'dark' {
	const { colorMode: resolvedTheme } = useSchemaBuilderRuntime();
	return resolvedTheme === 'dark' ? 'dark' : 'light';
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

interface DiagramProps {
	tableName: string;
	config: Record<string, unknown>;
}

const getMembershipLabel = (value: unknown) => {
	if (value === 1) return 'App';
	if (value === 2) return 'Org';
	if (value === 3) return 'Group';
	return 'scope';
};

// ---------------------------------------------------------------------------
// Adapters
// ---------------------------------------------------------------------------

export function AllowAllDiagram({ tableName }: DiagramProps) {
	const mode = useMode();
	const C = mode === 'dark' ? AuthzAllowAllDark : AuthzAllowAllLight;
	return <C table={tableName} />;
}

export function DenyAllDiagram({ tableName }: DiagramProps) {
	const mode = useMode();
	const C = mode === 'dark' ? AuthzDenyAllDark : AuthzDenyAllLight;
	return <C table={tableName} />;
}

export function CompositeDiagram({ tableName }: DiagramProps) {
	const mode = useMode();
	const C = mode === 'dark' ? AuthzCompositeDark : AuthzCompositeLight;
	return <C table={tableName} />;
}

export function DirectOwnerDiagram({ tableName, config }: DiagramProps) {
	const mode = useMode();
	const field = (config.entity_field as string) || 'owner_id';
	const C = mode === 'dark' ? AuthzDirectOwnerDark : AuthzDirectOwnerLight;
	return <C table={tableName} field={field} />;
}

export function DirectOwnerAnyDiagram({ tableName, config }: DiagramProps) {
	const mode = useMode();
	const entityFields = Array.isArray(config.entity_fields) ? config.entity_fields : undefined;
	const fields = entityFields?.length
		? entityFields.slice(0, 2).join(' | ') + (entityFields.length > 2 ? ' | ...' : '')
		: 'field1 | field2';
	const C = mode === 'dark' ? AuthzDirectOwnerAnyDark : AuthzDirectOwnerAnyLight;
	return <C table={tableName} fields={fields} />;
}

export function MembershipDiagram({ tableName, config }: DiagramProps) {
	const mode = useMode();
	const accessParts: string[] = [];
	if (config.is_admin) accessParts.push('Admin');
	if (config.permission) accessParts.push(config.permission as string);
	const access = accessParts.length > 0 ? accessParts.join(' / ') : 'access';
	const C = mode === 'dark' ? AuthzAppMembershipDark : AuthzAppMembershipLight;
	return <C table={tableName} scope='App' access={access} />;
}

export function EntityMembershipDiagram({ tableName, config }: DiagramProps) {
	const mode = useMode();
	const field = (config.entity_field as string) || 'entity_id';
	const C = mode === 'dark' ? AuthzEntityMembershipDark : AuthzEntityMembershipLight;
	return <C table={tableName} field={field} />;
}

export function MemberListDiagram({ tableName, config }: DiagramProps) {
	const mode = useMode();
	const arrayField = (config.array_field as string) || 'member_ids';
	const C = mode === 'dark' ? AuthzMemberListDark : AuthzMemberListLight;
	return <C table={tableName} arrayField={arrayField} />;
}

export function RelatedMemberListDiagram({ tableName, config }: DiagramProps) {
	const mode = useMode();
	const joinTable = (config.owned_table as string) || 'table';
	const arrayField = (config.owned_table_key as string) || 'members[]';
	const fk = (config.this_object_key as string) || 'field';
	const C = mode === 'dark' ? AuthzRelatedMemberListDark : AuthzRelatedMemberListLight;
	return <C table={tableName} joinTable={joinTable} arrayField={arrayField} fk={fk} />;
}

export function RelatedEntityMembershipDiagram({ tableName, config }: DiagramProps) {
	const mode = useMode();
	const scope = getMembershipLabel(config.membership_type);
	const joinTable = (config.obj_table as string) || 'table';
	const owner = (config.obj_field as string) || 'owner';
	const fk = (config.entity_field as string) || 'field';
	const C = mode === 'dark' ? AuthzRelatedEntityMembershipDark : AuthzRelatedEntityMembershipLight;
	return <C table={tableName} scope={scope} joinTable={joinTable} owner={owner} fk={fk} />;
}

export function OrgHierarchyDiagram({ tableName, config }: DiagramProps) {
	const mode = useMode();
	const direction = (config.direction as string) || 'down';
	const field = direction === 'down' ? 'Manager → Staff' : 'Staff → Manager';
	const C = mode === 'dark' ? AuthzOrgHierarchyDark : AuthzOrgHierarchyLight;
	return <C table={tableName} field={field} />;
}

export function PublishableDiagram({ tableName, config }: DiagramProps) {
	const mode = useMode();
	const publishedField = (config.is_published_field as string) || 'is_published';
	const C = mode === 'dark' ? AuthzPublishableDark : AuthzPublishableLight;
	return <C table={tableName} publishedField={publishedField} />;
}

export function TemporalDiagram({ tableName, config }: DiagramProps) {
	const mode = useMode();
	const fromField = (config.valid_from_field as string) || 'valid_from';
	const untilField = (config.valid_until_field as string) || 'valid_until';
	const C = mode === 'dark' ? AuthzTemporalDark : AuthzTemporalLight;
	return <C table={tableName} fromField={fromField} untilField={untilField} />;
}
