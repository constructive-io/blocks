import { useMemo } from 'react';
import {
	useCreateSecureTableProvisionMutation,
} from '@/generated/modules';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useSchemaBuilderSelectors } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder';
import { invalidateDatabaseEntities } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder/modules/invalidate-database-entities';
import {
	useCreatePolicyField,
	type PolicyFieldType,
} from '../../lib/gql/hooks/schema-builder/policies/use-create-policy-field';
import { addPoliciesToExistingTable } from '@/blocks/schema/schema-builder-core/lib/policies/add-policies-to-table';
import {
	buildGrants,
	buildPolicyEntry,
	crudOpsToPrivileges,
	groupOperationsByConfig,
} from '@/blocks/schema/schema-builder-core/lib/policies/provision-helpers';

import {
	buildNodeData,
	getFieldsRequiringColumns,
	getGeneratedFields,
	getPolicyCategory,
	POLICY_TYPE_UI_CONFIG,
} from '@/blocks/schema/schema-builder-core/components/policies/policy-config';
import type {
	CreateTableWithPoliciesInput,
	CreateTableWithPolicyResult,
	FieldOverride,
	FormFieldSchema,
	FormFieldType,
	MergedPolicyType,
} from '@/blocks/schema/schema-builder-core/components/policies/policy-types';
import { CRUD_OPERATIONS } from '@/blocks/schema/schema-builder-core/components/policies/policy-types';

// ============================================================================
// POLICY TYPES HOOKS
// ============================================================================

/**
 * Build policy types from UI config only (fallback when backend unavailable)
 */
function buildPolicyTypesFromUIConfig(): MergedPolicyType[] {
	return Object.entries(POLICY_TYPE_UI_CONFIG).filter(([, c]) => !c.disabled).map(([name, uiConfig]) => ({
		name,
		title: uiConfig.fallbackTitle,
		description: uiConfig.description,
		icon: uiConfig.icon,
		category: uiConfig.category,
		hasDataNode: uiConfig.hasDataNode,
		dataNodeType: uiConfig.dataNodeType,
		generatedFields: uiConfig.dataNodeType ? getGeneratedFields(uiConfig.dataNodeType) : [],
		fieldOverrides: uiConfig.fieldOverrides,
		advancedFields: uiConfig.advancedFields,
		diagramKey: name,
	}));
}

/**
 * Hook to fetch policy types from the backend registry and merge with UI config.
 *
 * Falls back to UI config only if backend returns no data.
 * Display order follows POLICY_TYPE_UI_CONFIG insertion order.
 */
export function usePolicyTypes(): { policyTypes: MergedPolicyType[]; isLoading: boolean; error: Error | null } {
	const policyTypes = useMemo<MergedPolicyType[]>(() => {
		return buildPolicyTypesFromUIConfig();
	}, []);

	return {
		policyTypes,
		isLoading: false,
		error: null,
	};
}

/**
 * Hook to get a single policy type by name
 */
export function usePolicyType(policyTypeName: string | null) {
	const { policyTypes, isLoading, error } = usePolicyTypes();

	const policyType = useMemo(() => {
		if (!policyTypeName) return null;
		return policyTypes.find((pt) => pt.name === policyTypeName) ?? null;
	}, [policyTypes, policyTypeName]);

	return {
		policyType,
		isLoading,
		error,
	};
}

// ============================================================================
// FORM SCHEMA HOOKS
// ============================================================================

/**
 * Resolve a FieldOverride to a FormFieldType.
 * component takes priority over type.
 */
function resolveFormFieldType(override: FieldOverride): FormFieldType {
	if (override.component) {
		return override.component;
	}
	switch (override.type) {
		case 'boolean':
			return 'boolean';
		case 'integer':
			return 'number';
		case 'uuid':
			return 'field-select';
		case 'uuid[]':
			return 'field-multi-select';
		case 'string':
		default:
			return 'text';
	}
}

/**
 * Build form fields from fieldOverrides config.
 */
function buildFormFields(overrides?: Record<string, FieldOverride>): FormFieldSchema[] {
	if (!overrides) return [];

	const fields: FormFieldSchema[] = [];

	for (const [key, override] of Object.entries(overrides)) {
		if (override.hidden) continue;
		if (!override.type && !override.component) continue;

		fields.push({
			key,
			type: resolveFormFieldType(override),
			label: override.label ?? formatKeyAsLabel(key),
			description: override.description,
			placeholder: override.placeholder,
			required: override.required ?? false,
			defaultValue: override.defaultValue,
			dependsOn: override.dependsOn,
			options: override.options,
			pgType: override.pgType,
		});
	}

	return fields;
}

/**
 * Format a snake_case key as a human-readable label
 */
function formatKeyAsLabel(key: string): string {
	return key
		.split('_')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

/**
 * Hook to convert a policy type's field overrides to form fields
 *
 * Returns:
 * - mainFields: Fields shown in the main form area
 * - advancedFields: Fields shown in the collapsible advanced section
 */
export function useFormSchema(policyType: MergedPolicyType | null) {
	return useMemo(() => {
		if (!policyType) {
			return {
				mainFields: [],
				advancedFields: [],
				allFields: [],
			};
		}

		const allFields = buildFormFields(policyType.fieldOverrides);

		// Split into main and advanced
		const advancedKeys = new Set(policyType.advancedFields ?? []);

		const mainFields = allFields.filter((f) => !advancedKeys.has(f.key));
		const advancedFields = allFields.filter((f) => advancedKeys.has(f.key));

		return {
			mainFields,
			advancedFields,
			allFields,
		};
	}, [policyType]);
}

/**
 * Get default values for all fields in a policy type
 */
export function getDefaultFormValues(policyType: MergedPolicyType | null): Record<string, unknown> {
	if (!policyType) return {};

	const fields = buildFormFields(policyType.fieldOverrides);
	const defaults: Record<string, unknown> = {};

	for (const field of fields) {
		if (field.defaultValue !== undefined) {
			defaults[field.key] = field.defaultValue;
		}
	}

	// Include default values from hidden fields (they are skipped by buildFormFields)
	if (policyType.fieldOverrides) {
		for (const [key, override] of Object.entries(policyType.fieldOverrides)) {
			if (override.hidden && override.defaultValue !== undefined && defaults[key] === undefined) {
				defaults[key] = override.defaultValue;
			}
		}
	}

	return defaults;
}

/**
 * Check if a policy type has fields that need user configuration.
 * Returns true if any required or non-defaulted field is empty.
 */
export function hasRequiredFieldsMissing(
	policyType: MergedPolicyType | null,
	data: Record<string, unknown>,
): boolean {
	if (!policyType) return false;

	const fields = buildFormFields(policyType.fieldOverrides);

	for (const field of fields) {
		// Booleans are always valid (false is a valid value)
		if (field.type === 'boolean') continue;
		// Permission selects are optional
		if (field.type === 'permission-select') continue;

		const value = data[field.key];
		const isEmpty =
			value === null ||
			value === undefined ||
			(typeof value === 'string' && value.trim() === '') ||
			(Array.isArray(value) && value.length === 0);

		if (!isEmpty) continue;

		// If explicitly required, it's missing
		if (field.required) return true;

		// If field has no default, it needs user input
		if (field.defaultValue === undefined || field.defaultValue === null || field.defaultValue === '') {
			return true;
		}
	}

	return false;
}

// ============================================================================
// TABLE WITH CRUD POLICIES CREATION HOOK
// ============================================================================

/**
 * Hook to create a table with CRUD policies via `secure_table_provision`.
 *
 * One provision call now carries all grants + all policies for a table atomically,
 * so operations grouped by (role, permissive) become separate `policies[]` entries
 * in a single call rather than a sequence of calls.
 *
 * - Standard (has-module / no-fields / needs-table): single call.
 * - Needs-fields: table-creation call, per-field createField calls, then single policy call.
 * - Composite: table-creation call bundles all sub-policy data nodes, per-leaf createField calls
 *   for needs-fields leaves, then single composite-policy call.
 */
export function useCreateTableWithPolicies() {
	const queryClient = useQueryClient();
	const { selectTable } = useSchemaBuilderSelectors();

	const createProvision = useCreateSecureTableProvisionMutation({
		selection: { fields: { id: true, tableId: true, tableName: true } },
	});
	const createField = useCreatePolicyField();

	const mutation = useMutation({
		mutationFn: async (input: CreateTableWithPoliciesInput): Promise<CreateTableWithPolicyResult> => {
			const {
				databaseId,
				schemaId,
				tableId: existingTableId,
				tableName,
				policyType,
				dataNodeType,
				nodeData = {},
				sharedPolicyData,
				operations,
				enabledOperations = CRUD_OPERATIONS,
				fieldNameOverrides = {},
				compositeTree,
			} = input;

			const category = getPolicyCategory(policyType);
			let tableId = existingTableId;

			// ── AuthzComposite ──────────────────────────────────────────
			if (policyType === 'AuthzComposite' && compositeTree) {
				const leaves = compositeTree.children.filter((c) => c.type === 'condition');
				const seenModules = new Set<string>();
				const seenFields = new Set<string>();

				// Find first has-module leaf to bundle with Step 1
				const firstModuleLeaf = leaves.find((leaf) => {
					const subCategory = getPolicyCategory(leaf.data.policyType);
					const subConfig = POLICY_TYPE_UI_CONFIG[leaf.data.policyType];
					return subCategory === 'has-module' && subConfig?.dataNodeType;
				});

				// Step 1: Create table (if new) + first node module + grants
				const step1Input: Record<string, unknown> = {
					databaseId,
					schemaId,
					grants: buildGrants(),
				};

				if (tableId) {
					step1Input.tableId = tableId;
				} else {
					step1Input.tableName = tableName;
				}

				if (firstModuleLeaf) {
					const subConfig = POLICY_TYPE_UI_CONFIG[firstModuleLeaf.data.policyType];
					if (subConfig?.dataNodeType) {
						seenModules.add(subConfig.dataNodeType);
						const modData = buildNodeData(firstModuleLeaf.data.data, { dataNodeType: subConfig.dataNodeType } as MergedPolicyType);
						const moduleNode = { $type: subConfig.dataNodeType, ...(Object.keys(modData).length > 0 ? { data: modData } : {}) };
						step1Input.nodes = !tableId ? [{ $type: 'DataId' }, moduleNode] : [moduleNode];
					}
				}

				const r = await createProvision.mutateAsync(
					step1Input as Parameters<typeof createProvision.mutateAsync>[0],
				);
				if (!tableId) {
					tableId = r.createSecureTableProvision?.secureTableProvision?.tableId ?? undefined;
					if (!tableId) throw new Error('Provision failed: no tableId returned');
				}

				// Step 2: Add each additional sub-policy's data nodes / fields
				for (const leaf of leaves) {
					const subType = leaf.data.policyType;
					const subData = leaf.data.data;
					const subCategory = getPolicyCategory(subType);
					const subConfig = POLICY_TYPE_UI_CONFIG[subType];

					if (subCategory === 'has-module' && subConfig?.dataNodeType && !seenModules.has(subConfig.dataNodeType)) {
						seenModules.add(subConfig.dataNodeType);
						const modData = buildNodeData(subData, { dataNodeType: subConfig.dataNodeType } as MergedPolicyType);
						await createProvision.mutateAsync({
							databaseId,
							schemaId,
							tableId,
							nodes: [{ $type: subConfig.dataNodeType, ...(Object.keys(modData).length > 0 ? { data: modData } : {}) }] as unknown as Record<string, unknown>,
						});
					}

					if (subCategory === 'needs-fields') {
						for (const fieldConfig of getFieldsRequiringColumns(subType)) {
							const resolved = (subData[fieldConfig.key] as string | string[]) || fieldConfig.defaultName;
							const names = Array.isArray(resolved) ? resolved : [resolved as string];
							for (const name of names) {
								if (!seenFields.has(name)) {
									seenFields.add(name);
									await createField.mutateAsync({
										name,
										tableId,
										databaseId,
										fieldType: fieldConfig.pgType as PolicyFieldType,
									});
								}
							}
						}
					}
				}

				// Step 3: Create the composite policy
				const firstOp = enabledOperations[0];
				const config = operations[firstOp];

				await createProvision.mutateAsync({
					databaseId,
					schemaId,
					tableId,
					policies: [
						buildPolicyEntry('AuthzComposite', {
							privileges: crudOpsToPrivileges(enabledOperations),
							policy_role: config.roleName,
							permissive: config.isPermissive,
							data: sharedPolicyData,
						}),
					] as unknown as Record<string, unknown>,
				});

				return { tableId, tableName, policyIds: [] };
			}

			// ── needs-fields category ───────────────────────────────────
			if (category === 'needs-fields') {
				if (!tableId) {
					const r = await createProvision.mutateAsync({
						databaseId,
						schemaId,
						tableName,
						grants: buildGrants() as unknown as Record<string, unknown>,
					});
					tableId = r.createSecureTableProvision?.secureTableProvision?.tableId ?? undefined;
					if (!tableId) throw new Error('Provision failed: no tableId returned');
				}

				const createdFieldNames: Record<string, string | string[]> = {};
				const fieldsToCreate = getFieldsRequiringColumns(policyType);

				for (const fieldConfig of fieldsToCreate) {
					const override = fieldNameOverrides?.[fieldConfig.key];
					const resolved = override || fieldConfig.defaultName;
					const fieldNames = Array.isArray(resolved) ? resolved : [resolved];

					for (const name of fieldNames) {
						await createField.mutateAsync({
							name,
							tableId,
							databaseId,
							fieldType: fieldConfig.pgType as PolicyFieldType,
						});
					}
					createdFieldNames[fieldConfig.key] = Array.isArray(fieldConfig.defaultName) ? fieldNames : fieldNames[0];
				}

				const policyData = { ...sharedPolicyData, ...createdFieldNames };
				const groups = groupOperationsByConfig(enabledOperations, operations);

				await createProvision.mutateAsync({
					databaseId,
					schemaId,
					tableId,
					policies: groups.map((group) =>
						buildPolicyEntry(policyType, {
							privileges: group.privileges,
							policy_role: group.roleName,
							permissive: group.isPermissive,
							data: policyData,
							// Disambiguate multi-group case so auto-derived policy_name does not collide.
							policy_name: group.privileges.join('_'),
						}),
					) as unknown as Record<string, unknown>,
				});

				return { tableId, tableName, policyIds: [] };
			}

			// ── Standard case (has-module, no-fields, needs-table) ──────
			if (tableId) {
				// Existing table → reuse non-React core for parity with the chat agent path.
				await addPoliciesToExistingTable({
					createSecureTableProvision: (input) =>
						createProvision.mutateAsync(input as Parameters<typeof createProvision.mutateAsync>[0]),
					databaseId,
					schemaId,
					tableId,
					policies: [
						{ policyType, dataNodeType, nodeData, sharedPolicyData, operations, enabledOperations },
					],
				});
				return { tableId, tableName, policyIds: [] };
			}

			// New-table case stays inline because it carries the DataId prefix node and
			// returns the freshly-created tableId from the provision result.
			const groups = groupOperationsByConfig(enabledOperations, operations);
			const policiesArray = groups.map((group) =>
				buildPolicyEntry(policyType, {
					privileges: group.privileges,
					policy_role: group.roleName,
					permissive: group.isPermissive,
					data: sharedPolicyData,
					policy_name: group.privileges.join('_'),
				}),
			);

			const provisionInput: Record<string, unknown> = {
				databaseId,
				schemaId,
				tableName,
				grants: buildGrants(),
				policies: policiesArray,
			};

			if (dataNodeType) {
				provisionInput.nodes = [
					{ $type: 'DataId' },
					{ $type: dataNodeType, ...(Object.keys(nodeData).length > 0 ? { data: nodeData } : {}) },
				];
			}

			const r = await createProvision.mutateAsync(
				provisionInput as Parameters<typeof createProvision.mutateAsync>[0],
			);

			const newTableId = r.createSecureTableProvision?.secureTableProvision?.tableId ?? undefined;
			if (!newTableId) throw new Error('Provision failed: no tableId returned');

			return { tableId: newTableId, tableName, policyIds: [] };
		},
		onSuccess: async (result, variables) => {
			await invalidateDatabaseEntities(queryClient, variables.databaseId);
			if (!variables.tableId) {
				selectTable(result.tableId, result.tableName);
			}
		},
		onError: (error) => {
			console.error('Failed to create table with policies:', error);
		},
	});

	return {
		createTableWithPolicies: mutation.mutateAsync,
		isCreating: mutation.isPending,
		error: mutation.error,
	};
}
