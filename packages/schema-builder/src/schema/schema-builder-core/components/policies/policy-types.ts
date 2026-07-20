import type { LucideIcon } from 'lucide-react';

import type { CompositePolicyData } from './composite-policy-builder/types';

// ============================================================================
// CRUD OPERATIONS TYPES
// ============================================================================

/**
 * CRUD operation type
 */
export type CrudOperation = 'create' | 'read' | 'update' | 'delete';

/**
 * Mapping from CRUD operations to SQL privileges
 */
export const CRUD_TO_PRIVILEGE: Record<CrudOperation, string> = {
	create: 'INSERT',
	read: 'SELECT',
	update: 'UPDATE',
	delete: 'DELETE',
};

/**
 * Reverse mapping from SQL privileges to CRUD operations
 */
export const PRIVILEGE_TO_OPERATION: Record<string, CrudOperation> = {
	INSERT: 'create',
	SELECT: 'read',
	UPDATE: 'update',
	DELETE: 'delete',
};

/**
 * All CRUD operations in display order
 */
export const CRUD_OPERATIONS: CrudOperation[] = ['create', 'read', 'update', 'delete'];

/**
 * Human-readable labels for CRUD operations
 */
export const OPERATION_LABELS: Record<CrudOperation, string> = {
	create: 'CREATE',
	read: 'READ',
	update: 'UPDATE',
	delete: 'DELETE',
};

/**
 * Descriptions for each CRUD operation
 */
export const OPERATION_DESCRIPTIONS: Record<CrudOperation, string> = {
	create: 'Insert new records into the table',
	read: 'Retrieve records from the table',
	update: 'Modify existing records',
	delete: 'Remove records from the table',
};

/**
 * Style configuration for each CRUD operation (icon imported separately)
 */
export interface OperationStyle {
	bgClass: string;
	textClass: string;
	iconName: 'Plus' | 'Search' | 'Pencil' | 'Trash2';
}

export const OPERATION_STYLES: Record<CrudOperation, OperationStyle> = {
	create: { bgClass: 'bg-emerald-500/10 ring-1 ring-emerald-500/30', textClass: 'text-emerald-600 dark:text-emerald-400', iconName: 'Plus' },
	read: { bgClass: 'bg-sky-500/10 ring-1 ring-sky-500/30', textClass: 'text-sky-600 dark:text-sky-400', iconName: 'Search' },
	update: { bgClass: 'bg-amber-500/10 ring-1 ring-amber-500/30', textClass: 'text-amber-600 dark:text-amber-400', iconName: 'Pencil' },
	delete: { bgClass: 'bg-rose-500/10 ring-1 ring-rose-500/30', textClass: 'text-rose-600 dark:text-rose-400', iconName: 'Trash2' },
};

/**
 * Optional hints for specific operations
 */
export const OPERATION_HINTS: Partial<Record<CrudOperation, string>> = {
	read: 'Hint: Many apps allow more visibility than write access. Consider a public read policy if appropriate.',
};

/**
 * Per-operation policy configuration
 */
export interface OperationPolicyConfig {
	roleName: string;
	isPermissive: boolean;
	/** Policy type specific data (e.g., owner_id field selection) */
	policyData: Record<string, unknown>;
	/** Whether user has customized this operation from defaults */
	isCustomized: boolean;
}

/**
 * Default policy configuration that all operations inherit from
 */
export interface DefaultPolicyConfig {
	roleName: string;
	isPermissive: boolean;
	/** Policy type specific data (e.g., owner_id field selection) */
	policyData: Record<string, unknown>;
}

/**
 * All 4 CRUD operation configs
 */
export interface CrudPolicyConfigs {
	create: OperationPolicyConfig;
	read: OperationPolicyConfig;
	update: OperationPolicyConfig;
	delete: OperationPolicyConfig;
}

/**
 * Input for creating a table with CRUD policies.
 * If tableId is provided, skips table creation and creates policies for existing table.
 */
export interface CreateTableWithPoliciesInput {
	databaseId: string;
	schemaId: string;
	/** If provided, skip table creation and use this existing table */
	tableId?: string;
	tableName: string;
	policyType: string;
	dataNodeType?: string;
	nodeData?: Record<string, unknown>;
	/**
	 * Shared policy data that applies to all operations.
	 * Contains field references, table references, and structural params.
	 * Per-op params (permission, is_admin, is_owner) are taken from each operation.
	 */
	sharedPolicyData: Record<string, unknown>;
	/** Per-operation configs (roleName, isPermissive, per-op policyData like permission) */
	operations: CrudPolicyConfigs;
	/** Which operations to create policies for. Defaults to all 4 if not specified. */
	enabledOperations?: CrudOperation[];
	/** Custom field names for Category B policies (key -> field name or array of names) */
	fieldNameOverrides?: Record<string, string | string[]>;
	/** For AuthzComposite: the full condition tree so sub-policy modules/fields can be created */
	compositeTree?: CompositePolicyData;
}

// ============================================================================
// POLICY TYPE CONFIGURATION
// ============================================================================

/**
 * Primitive data type for a field override. Determines the default form component.
 */
export type FieldType = 'string' | 'boolean' | 'integer' | 'uuid' | 'uuid[]';

/**
 * Specialized form component override. Takes priority over type-based resolution.
 */
export type FieldComponent = 'table-select' | 'membership-type-select' | 'permission-select';

/**
 * Field override for customizing how a policy parameter is displayed in the form.
 * For 'needs-fields' category policies, set pgType to indicate a database column should be created.
 */
export interface FieldOverride {
	/** Primitive data type — determines which form component to render */
	type?: FieldType;
	/** Specialized form component (takes priority over type) */
	component?: FieldComponent;
	label?: string;
	placeholder?: string;
	description?: string;
	defaultValue?: unknown;
	/** Whether this field is required */
	required?: boolean;
	/** Hide this field from the form (it will still use defaultValue if provided) */
	hidden?: boolean;
	/** PostgreSQL type - if set, a column will be created for this field */
	pgType?: 'uuid' | 'uuid[]' | 'timestamptz' | 'boolean';
	/** If set, this field depends on another field (e.g. a table-select) for populating dropdown options */
	dependsOn?: string;
	/** Fixed options for select dropdown (e.g. direction: up/down) */
	options?: { value: string; label: string; description?: string }[];
}

/**
 * Policy category based on POLICY_SYSTEM_REFERENCE.md
 *
 * - 'has-module': Has data node that auto-creates fields (e.g., DataDirectOwner)
 * - 'needs-fields': Needs explicit field creation before policy
 * - 'needs-table': Needs a related table for join-based access
 * - 'no-fields': No fields needed, just creates policy
 */
export type PolicyCategory = 'has-module' | 'needs-fields' | 'needs-table' | 'no-fields';

/**
 * UI configuration for a policy type.
 * Decorates backend registry data with frontend-only concerns (icons, categories, field overrides).
 * Backend's displayName is the source of truth for titles.
 */
export interface PolicyTypeUIConfig {
	/** Fallback title when backend registry is unavailable. Backend displayName takes priority. */
	fallbackTitle: string;
	/** Short description shown on cards */
	description: string;
	/** Icon component */
	icon: LucideIcon;
	/** Policy category (A=data node, B=needs fields, C=needs table, D=no fields) */
	category: PolicyCategory;
	/** Whether this policy type uses a data node to auto-generate fields */
	hasDataNode: boolean;
	/** The Data* module type (e.g., 'DataDirectOwner') */
	dataNodeType?: string;
	/** Form field customizations (fields with pgType will create database columns) */
	fieldOverrides?: Record<string, FieldOverride>;
	/** Field keys to show in advanced section */
	advancedFields?: string[];
	/** Hide this policy type from the UI entirely */
	disabled?: boolean;
}

/**
 * Generated field that will be auto-created by a data node
 */
export interface GeneratedField {
	name: string;
	type: string;
	nullable: boolean;
	description: string;
}

/**
 * Content for the "Know More" card - user-friendly descriptions and use cases
 */
export interface PolicyKnowMoreContent {
	/** Main description paragraph explaining the policy in plain terms */
	vibeCheck: string;
	/** Security benefits/features of this policy */
	securityFeatures: string[];
	/** Use cases - what this policy is perfect for building */
	useCases: string[];
}

/**
 * Merged policy type combining backend registry data with UI config
 */
export interface MergedPolicyType {
	name: string;
	title: string;
	description: string;
	icon: LucideIcon;
	category: PolicyCategory;
	hasDataNode: boolean;
	dataNodeType?: string;
	generatedFields: GeneratedField[];
	fieldOverrides?: Record<string, FieldOverride>;
	advancedFields?: string[];
	/** Diagram key — derived from the config object key (always equals `name`) */
	diagramKey: string;
}

/**
 * Form field schema derived from field overrides
 */
export type FormFieldType =
	| 'text'
	| 'field-select'
	| 'field-multi-select'
	| 'table-select'
	| 'membership-type-select'
	| 'permission-select'
	| 'boolean'
	| 'number';

export interface FormFieldSchema {
	key: string;
	type: FormFieldType;
	label: string;
	description?: string;
	placeholder?: string;
	required: boolean;
	defaultValue?: unknown;
	dependsOn?: string;
	options?: { value: string; label: string; description?: string }[];
	pgType?: string;
}

/**
 * Result of table with policy creation
 */
export interface CreateTableWithPolicyResult {
	tableId: string;
	tableName: string;
	policyIds: string[];
}

// ============================================================================
// POLICY ROLES & PRIVILEGES
// ============================================================================

export type PolicyStatus = 'active' | 'disabled';

export const POLICY_ROLES = [
	{ value: 'public', label: 'Public' },
	{ value: 'anonymous', label: 'Anonymous' },
	{ value: 'authenticated', label: 'Authenticated' },
	{ value: 'administrator', label: 'Administrator' },
] as const;

export type PolicyRole = (typeof POLICY_ROLES)[number]['value'];

export const POLICY_PRIVILEGES = [
	{ value: 'SELECT', label: 'Select' },
	{ value: 'INSERT', label: 'Insert' },
	{ value: 'UPDATE', label: 'Update' },
	{ value: 'DELETE', label: 'Delete' },
] as const;
