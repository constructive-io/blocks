import { Clock, Eye, Globe, Layers, Link, Lock, Network, Shield, Unlock, User, UserCheck, Users } from 'lucide-react';
import * as NodeTypes from 'node-type-registry';
import type { NodeTypeDefinition } from 'node-type-registry';
import {
	buildNodeData as sharedBuildNodeData,
	getDataNodeForPolicy as sharedGetDataNodeForPolicy,
	getFieldsRequiringColumns as sharedGetFieldsRequiringColumns,
	getGeneratedFields as sharedGetGeneratedFields,
	hasGeneratedFields as sharedHasGeneratedFields,
	policyCanBeNodeless as sharedPolicyCanBeNodeless,
	policyRequiresDataNode as sharedPolicyRequiresDataNode,
	getPolicyCategory as sharedGetPolicyCategory,
	injectSchemaFields as sharedInjectSchemaFields,
	sanitizePolicyData as sharedSanitizePolicyData,
} from '../../lib/data';

import { MEMBERSHIP_TYPES } from '../../lib/constants/membership-types';

import type { CompositePolicyData } from './composite-policy-builder/types';
import type {
	FieldOverride,
	GeneratedField,
	MergedPolicyType,
	PolicyCategory,
	PolicyTypeUIConfig,
} from './policy-types';

// ============================================================================
// POLICY TYPE UI CONFIG
// ============================================================================

/**
 * Frontend UI decorator for policy types.
 *
 * Backend node_type_registry is the source of truth for policy type identity
 * (name, displayName). This config adds frontend-only concerns:
 * icons, descriptions, workflow categories, field overrides.
 * Display order is determined by object insertion order.
 *
 * Policy types NOT in this config will not appear in the wizard.
 */
const paramOf = (def: NodeTypeDefinition) => def.parameter_schema.properties;

export const POLICY_TYPE_UI_CONFIG: Record<string, PolicyTypeUIConfig> = {
	// === MOST COMMON ===

	AuthzDirectOwner: {
		fallbackTitle: NodeTypes.AuthzDirectOwner.display_name,
		description: NodeTypes.AuthzDirectOwner.description,
		icon: User,
		category: 'has-module',
		hasDataNode: true,
		dataNodeType: NodeTypes.DataDirectOwner.name,
		fieldOverrides: {
			entity_field: {
				type: 'string',
				required: true,
				label: 'Owner Field Name',
				placeholder: 'owner_id',
				description: paramOf(NodeTypes.AuthzDirectOwner)?.entity_field?.description,
				defaultValue: 'owner_id',
			},
		},
	},

	AuthzEntityMembership: {
		fallbackTitle: NodeTypes.AuthzEntityMembership.display_name,
		description: NodeTypes.AuthzEntityMembership.description,
		icon: Shield,
		category: 'has-module',
		hasDataNode: true,
		dataNodeType: NodeTypes.DataEntityMembership.name,
		fieldOverrides: {
			entity_field: {
				type: 'string',
				required: true,
				label: 'Entity Field Name',
				placeholder: 'entity_id',
				description: paramOf(NodeTypes.AuthzEntityMembership)?.entity_field?.description,
				defaultValue: 'entity_id',
			},
			membership_type: {
				type: 'integer',
				hidden: true,
				defaultValue: MEMBERSHIP_TYPES.ORGANIZATION,
			},
			permission: {
				type: 'string',
				component: 'permission-select',
				label: 'Required Permission',
				description: paramOf(NodeTypes.AuthzEntityMembership)?.permission?.description,
			},
			is_admin: {
				type: 'boolean',
				label: 'Admins',
				description: paramOf(NodeTypes.AuthzEntityMembership)?.is_admin?.description,
			},
			is_owner: {
				type: 'boolean',
				label: 'Owners',
				description: paramOf(NodeTypes.AuthzEntityMembership)?.is_owner?.description,
			},
		},
	},

	// === OWNERSHIP PATTERNS ===

	AuthzDirectOwnerAny: {
		fallbackTitle: NodeTypes.AuthzDirectOwnerAny.display_name,
		description: NodeTypes.AuthzDirectOwnerAny.description,
		icon: Users,
		category: 'needs-fields',
		hasDataNode: false,
		fieldOverrides: {
			entity_fields: {
				type: 'uuid[]',
				required: true,
				label: 'Owner Fields',
				description: paramOf(NodeTypes.AuthzDirectOwnerAny)?.entity_fields?.description,
				defaultValue: ['owner_id'],
				pgType: 'uuid',
			},
		},
	},

	AuthzAppMembership: {
		fallbackTitle: NodeTypes.AuthzAppMembership.display_name,
		description: NodeTypes.AuthzAppMembership.description,
		icon: Globe,
		category: 'no-fields',
		hasDataNode: false,
		fieldOverrides: {
			permission: {
				type: 'string',
				component: 'permission-select',
				label: 'Required Permission',
				description: paramOf(NodeTypes.AuthzAppMembership)?.permission?.description,
			},
			is_admin: {
				type: 'boolean',
				label: 'Admins',
				description: paramOf(NodeTypes.AuthzAppMembership)?.is_admin?.description,
			},
			is_owner: {
				type: 'boolean',
				label: 'Owners',
				description: paramOf(NodeTypes.AuthzAppMembership)?.is_owner?.description,
			},
		},
	},

	// === TEMPORAL/PUBLISHING PATTERNS ===

	AuthzPublishable: {
		fallbackTitle: NodeTypes.AuthzPublishable.display_name,
		description: NodeTypes.AuthzPublishable.description,
		icon: Eye,
		category: 'has-module',
		hasDataNode: true,
		dataNodeType: NodeTypes.DataPublishable.name,
		fieldOverrides: {
			is_published_field: {
				type: 'string',
				label: 'Published Flag Field',
				placeholder: 'is_published',
				description: paramOf(NodeTypes.AuthzPublishable)?.is_published_field?.description,
				defaultValue: paramOf(NodeTypes.AuthzPublishable)?.is_published_field?.default ?? 'is_published',
			},
			published_at_field: {
				type: 'string',
				label: 'Published At Field',
				placeholder: 'published_at',
				description: paramOf(NodeTypes.AuthzPublishable)?.published_at_field?.description,
				defaultValue: paramOf(NodeTypes.AuthzPublishable)?.published_at_field?.default ?? 'published_at',
			},
			require_published_at: {
				type: 'boolean',
				label: 'Require Published At',
				description: paramOf(NodeTypes.AuthzPublishable)?.require_published_at?.description,
				defaultValue: paramOf(NodeTypes.AuthzPublishable)?.require_published_at?.default ?? true,
			},
		},
	},

	AuthzTemporal: {
		fallbackTitle: NodeTypes.AuthzTemporal.display_name,
		description: NodeTypes.AuthzTemporal.description,
		icon: Clock,
		category: 'needs-fields',
		hasDataNode: false,
		fieldOverrides: {
			valid_from_field: {
				type: 'string',
				required: true,
				label: 'Valid From Field',
				placeholder: 'valid_from',
				description: paramOf(NodeTypes.AuthzTemporal)?.valid_from_field?.description,
				defaultValue: 'valid_from',
				pgType: 'timestamptz',
			},
			valid_until_field: {
				type: 'string',
				required: true,
				label: 'Valid Until Field',
				placeholder: 'valid_until',
				description: paramOf(NodeTypes.AuthzTemporal)?.valid_until_field?.description,
				defaultValue: 'valid_until',
				pgType: 'timestamptz',
			},
			valid_from_inclusive: {
				type: 'boolean',
				label: 'Include Start',
				description: paramOf(NodeTypes.AuthzTemporal)?.valid_from_inclusive?.description,
				defaultValue: paramOf(NodeTypes.AuthzTemporal)?.valid_from_inclusive?.default ?? true,
			},
			valid_until_inclusive: {
				type: 'boolean',
				label: 'Include End',
				description: paramOf(NodeTypes.AuthzTemporal)?.valid_until_inclusive?.description,
				defaultValue: paramOf(NodeTypes.AuthzTemporal)?.valid_until_inclusive?.default ?? false,
			},
		},
	},

	// === LIST/ARRAY-BASED (deprioritized) ===

	AuthzMemberList: {
		fallbackTitle: NodeTypes.AuthzMemberList.display_name,
		description: NodeTypes.AuthzMemberList.description,
		icon: Users,
		category: 'needs-fields',
		hasDataNode: false,
		fieldOverrides: {
			array_field: {
				type: 'string',
				required: true,
				label: 'Member List Field',
				placeholder: 'allowed_users',
				description: paramOf(NodeTypes.AuthzMemberList)?.array_field?.description,
				defaultValue: 'allowed_users',
				pgType: 'uuid[]',
			},
		},
	},

	AuthzRelatedMemberList: {
		fallbackTitle: NodeTypes.AuthzRelatedMemberList.display_name,
		description: NodeTypes.AuthzRelatedMemberList.description,
		icon: UserCheck,
		category: 'needs-table',
		hasDataNode: false,
		fieldOverrides: {
			owned_schema: {
				hidden: true,
				// Injected dynamically from current database context at submit time
			},
			owned_table: {
				type: 'string',
				required: true,
				component: 'table-select',
				label: 'Related Table',
				placeholder: 'groups',
				description: paramOf(NodeTypes.AuthzRelatedMemberList)?.owned_table?.description,
			},
			owned_table_key: {
				type: 'uuid',
				required: true,
				label: 'Member List Column',
				placeholder: 'member_ids',
				description: paramOf(NodeTypes.AuthzRelatedMemberList)?.owned_table_key?.description,
				dependsOn: 'owned_table',
			},
			owned_table_ref_key: {
				type: 'uuid',
				required: true,
				label: 'Reference Key',
				placeholder: 'id',
				description: paramOf(NodeTypes.AuthzRelatedMemberList)?.owned_table_ref_key?.description,
				dependsOn: 'owned_table',
			},
			this_object_key: {
				type: 'uuid',
				required: true,
				label: 'Foreign Key',
				placeholder: 'group_id',
				description: paramOf(NodeTypes.AuthzRelatedMemberList)?.this_object_key?.description,
			},
		},
	},

	AuthzRelatedEntityMembership: {
		fallbackTitle: NodeTypes.AuthzRelatedEntityMembership.display_name,
		description: NodeTypes.AuthzRelatedEntityMembership.description,
		icon: Link,
		category: 'needs-table',
		hasDataNode: false,
		fieldOverrides: {
			entity_field: {
				type: 'uuid',
				required: true,
				label: 'Foreign Key Field',
				description: paramOf(NodeTypes.AuthzRelatedEntityMembership)?.entity_field?.description,
			},
			membership_type: {
				type: 'integer',
				required: true,
				component: 'membership-type-select',
				label: 'Membership Scope',
				description: paramOf(NodeTypes.AuthzRelatedEntityMembership)?.membership_type?.description,
			},
			obj_schema: {
				hidden: true,
				// Injected dynamically from current database context at submit time
			},
			obj_table: {
				type: 'string',
				required: true,
				component: 'table-select',
				label: 'Linked Table',
				description: paramOf(NodeTypes.AuthzRelatedEntityMembership)?.obj_table?.description,
			},
			obj_field: {
				type: 'uuid',
				required: true,
				label: 'Entity Field on Linked Table',
				description: paramOf(NodeTypes.AuthzRelatedEntityMembership)?.obj_field?.description,
				dependsOn: 'obj_table',
			},
			permission: {
				type: 'string',
				component: 'permission-select',
				label: 'Required Permission',
				description: paramOf(NodeTypes.AuthzRelatedEntityMembership)?.permission?.description,
			},
			is_admin: {
				type: 'boolean',
				label: 'Admins',
				description: paramOf(NodeTypes.AuthzRelatedEntityMembership)?.is_admin?.description,
			},
			is_owner: {
				type: 'boolean',
				label: 'Owners',
				description: paramOf(NodeTypes.AuthzRelatedEntityMembership)?.is_owner?.description,
			},
		},
	},

	AuthzOrgHierarchy: {
		fallbackTitle: NodeTypes.AuthzOrgHierarchy.display_name,
		description: NodeTypes.AuthzOrgHierarchy.description,
		icon: Network,
		category: 'has-module',
		hasDataNode: true,
		dataNodeType: NodeTypes.DataOwnershipInEntity.name,
		disabled: true,
		fieldOverrides: {
			direction: {
				type: 'string',
				required: true,
				label: 'Direction',
				description: paramOf(NodeTypes.AuthzOrgHierarchy)?.direction?.description,
				defaultValue: 'down',
				options: [
					{ value: 'down', label: 'Down', description: 'Managers can see their subordinates' },
					{ value: 'up', label: 'Up', description: 'Subordinates can see their managers' },
				],
			},
			entity_field: {
				type: 'string',
				label: 'Entity Field Name',
				placeholder: 'entity_id',
				description: paramOf(NodeTypes.AuthzOrgHierarchy)?.entity_field?.description,
				defaultValue: paramOf(NodeTypes.AuthzOrgHierarchy)?.entity_field?.default ?? 'entity_id',
			},
			anchor_field: {
				type: 'string',
				required: true,
				label: 'Anchor Field',
				placeholder: 'owner_id',
				description: paramOf(NodeTypes.AuthzOrgHierarchy)?.anchor_field?.description,
				defaultValue: 'owner_id',
			},
			max_depth: {
				type: 'integer',
				label: 'Max Depth',
				description: paramOf(NodeTypes.AuthzOrgHierarchy)?.max_depth?.description,
			},
		},
	},

	// === SIMPLE POLICIES ===

	AuthzAllowAll: {
		fallbackTitle: NodeTypes.AuthzAllowAll.display_name,
		description: NodeTypes.AuthzAllowAll.description,
		icon: Unlock,
		category: 'no-fields',
		hasDataNode: false,
	},

	AuthzDenyAll: {
		fallbackTitle: NodeTypes.AuthzDenyAll.display_name,
		description: NodeTypes.AuthzDenyAll.description,
		icon: Lock,
		category: 'no-fields',
		hasDataNode: false,
	},

	// === COMPOSITE POLICY ===

	AuthzComposite: {
		fallbackTitle: NodeTypes.AuthzComposite.display_name,
		description: NodeTypes.AuthzComposite.description,
		icon: Layers,
		category: 'no-fields',
		hasDataNode: false,
	},
};

/**
 * Policy type identifier derived from the UI config registry keys.
 */
export type PolicyTypeId = keyof typeof POLICY_TYPE_UI_CONFIG;

export const MEMBERSHIP_TYPE_OPTIONS = [
	{
		value: MEMBERSHIP_TYPES.APP,
		label: 'App Member',
		description: 'Memberships to the app.',
	},
	{
		value: MEMBERSHIP_TYPES.ORGANIZATION,
		label: 'Organization Member',
		description: 'Membership to an organization.',
	},
	{
		value: MEMBERSHIP_TYPES.GROUP,
		label: 'Group Member',
		description: "User's membership to a group.",
	},
] as const;

/**
 * Get UI config for a policy type
 */
export function getPolicyTypeUIConfig(policyType: string): PolicyTypeUIConfig | undefined {
	return POLICY_TYPE_UI_CONFIG[policyType];
}

/**
 * Check if a policy type has UI configuration
 */
export function hasPolicyTypeUIConfig(policyType: string): boolean {
	return policyType in POLICY_TYPE_UI_CONFIG;
}

// ============================================================================
// GENERATED FIELDS
// ============================================================================

/**
 * Fields that are auto-generated by each data node type.
 *
 * When a policy uses a data node (hasDataNode: true), these fields
 * will be automatically created on the table.
 */
export const DATA_NODE_GENERATED_FIELDS: Record<string, GeneratedField[]> = {
	DataDirectOwner: [
		{
			name: 'owner_id',
			type: 'uuid',
			nullable: false,
			description: 'References the owning user',
		},
	],

	DataEntityMembership: [
		{
			name: 'entity_id',
			type: 'uuid',
			nullable: false,
			description: 'References the organization or group',
		},
	],

	DataOwnershipInEntity: [
		{
			name: 'owner_id',
			type: 'uuid',
			nullable: false,
			description: 'References the owning user',
		},
		{
			name: 'entity_id',
			type: 'uuid',
			nullable: false,
			description: 'References the organization or group',
		},
	],

	DataPublishable: [
		{
			name: 'is_published',
			type: 'boolean',
			nullable: false,
			description: 'Whether the record is published',
		},
		{
			name: 'published_at',
			type: 'timestamptz',
			nullable: true,
			description: 'When the record was published',
		},
	],

	DataTimestamps: [
		{
			name: 'created_at',
			type: 'timestamptz',
			nullable: false,
			description: 'When the record was created',
		},
		{
			name: 'updated_at',
			type: 'timestamptz',
			nullable: false,
			description: 'When the record was last updated',
		},
	],

	DataPeoplestamps: [
		{
			name: 'created_by',
			type: 'uuid',
			nullable: true,
			description: 'User who created the record',
		},
		{
			name: 'updated_by',
			type: 'uuid',
			nullable: true,
			description: 'User who last updated the record',
		},
	],

	DataSoftDelete: [
		{
			name: 'is_deleted',
			type: 'boolean',
			nullable: false,
			description: 'Whether the record is soft-deleted',
		},
		{
			name: 'deleted_at',
			type: 'timestamptz',
			nullable: true,
			description: 'When the record was deleted',
		},
	],
};

/**
 * Get generated fields for a data node type
 */
export function getGeneratedFields(dataNodeType: string): GeneratedField[] {
	return sharedGetGeneratedFields(dataNodeType);
}

/**
 * Derives the mapping from generated field names to policy keys for a given policy type.
 * This is computed from fieldOverrides where defaultValue matches a generated field name.
 *
 * Returns: { generatedFieldName: { policyKey, defaultValue } }
 */
export function getGeneratedFieldMappings(
	policyType: MergedPolicyType,
): Record<string, { policyKey: string; defaultValue: string }> | undefined {
	if (!policyType.dataNodeType) return undefined;

	const generatedFields = DATA_NODE_GENERATED_FIELDS[policyType.dataNodeType];
	if (!generatedFields) return undefined;

	const generatedFieldNames = new Set(generatedFields.map((f) => f.name));
	const result: Record<string, { policyKey: string; defaultValue: string }> = {};

	// For each field override, check if its defaultValue matches a generated field name
	for (const [policyKey, override] of Object.entries(policyType.fieldOverrides ?? {})) {
		const defaultValue = override?.defaultValue;
		if (typeof defaultValue === 'string' && generatedFieldNames.has(defaultValue)) {
			result[defaultValue] = { policyKey, defaultValue };
		}
	}

	return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Check if a data node type has generated fields defined
 */
export function hasGeneratedFields(dataNodeType: string): boolean {
	return sharedHasGeneratedFields(dataNodeType);
}

// ============================================================================
// DATA NODE HELPERS
// ============================================================================

/**
 * Get the data node type for a policy type.
 */
export function getDataNodeForPolicy(policyType: string): string | undefined {
	return sharedGetDataNodeForPolicy(policyType);
}

/**
 * Check if a policy type requires a data node
 */
export function policyRequiresDataNode(policyType: string): boolean {
	return sharedPolicyRequiresDataNode(policyType);
}

/**
 * Check if a policy type can be used without a data node
 */
export function policyCanBeNodeless(policyType: string): boolean {
	return sharedPolicyCanBeNodeless(policyType);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sanitize policy data by removing undefined/null values
 */
export function sanitizePolicyData(data: Record<string, unknown>): Record<string, unknown> {
	return sharedSanitizePolicyData(data);
}

/**
 * Build node data from policy data for the provision call.
 *
 * Some node types need specific configuration from the policy data
 * (e.g., DataDirectOwner may need a custom field name)
 */
export function buildNodeData(
	policyData: Record<string, unknown>,
	policyType: MergedPolicyType,
): Record<string, unknown> {
	return sharedBuildNodeData(policyType.name, policyData);
}

/**
 * Build a policy name from table name and policy type
 */
export function buildPolicyName(tableName: string, policyType: string): string {
	// Convert policyType from PascalCase to snake_case
	const snakeType = policyType
		.replace(/^Authz/, '')
		.replace(/([A-Z])/g, '_$1')
		.toLowerCase()
		.replace(/^_/, '');

	return `${tableName}_${snakeType}`;
}

/**
 * Validate that all required context values are present
 */
export function validateContext(context: { databaseId?: string; schemaId?: string }): {
	valid: boolean;
	missing: string[];
} {
	const missing: string[] = [];

	if (!context.databaseId) missing.push('databaseId');
	if (!context.schemaId) missing.push('schemaId');

	return {
		valid: missing.length === 0,
		missing,
	};
}

/**
 * Schema fields that should be auto-injected from context
 */
const AUTO_INJECT_SCHEMA_FIELDS = ['owned_schema', 'obj_schema'];

/**
 * Inject schema ID into policy data for fields that require it.
 * These fields are hidden from the form but need to be populated at submit time.
 */
export function injectSchemaFields(
	policyData: Record<string, unknown>,
	schemaId: string,
	policyType: string,
): Record<string, unknown> {
	return sharedInjectSchemaFields(policyData, schemaId, policyType);
}

// ============================================================================
// CATEGORY HELPERS
// ============================================================================

/**
 * Get the policy category for a policy type
 */
export function getPolicyCategory(policyType: string): PolicyCategory {
	return sharedGetPolicyCategory(policyType);
}

/**
 * Get fields that need database columns created (those with pgType in fieldOverrides)
 */
export function getFieldsRequiringColumns(
	policyType: string,
): { key: string; defaultName: string | string[]; pgType: NonNullable<FieldOverride['pgType']> }[] {
	return sharedGetFieldsRequiringColumns(policyType);
}

/**
 * Check if a policy type needs explicit field creation
 */
export function policyNeedsFieldCreation(policyType: string): boolean {
	return sharedGetPolicyCategory(policyType) === 'needs-fields';
}

/**
 * Walk a composite condition tree and inject schema fields into each leaf's data.
 * Returns a new tree (immutable).
 */
export function injectSchemaFieldsIntoCompositeTree(tree: CompositePolicyData, schemaId: string): CompositePolicyData {
	return {
		...tree,
		children: tree.children.map((child) => {
			if (child.type === 'condition') {
				return {
					...child,
					data: {
						...child.data,
						data: injectSchemaFields(child.data.data, schemaId, child.data.policyType),
					},
				} as typeof child;
			}
			// Groups: recurse (cast as CompositePolicyData for recursive call)
			return injectSchemaFieldsIntoCompositeTree(
				child as unknown as CompositePolicyData,
				schemaId,
			) as unknown as typeof child;
		}),
	};
}
