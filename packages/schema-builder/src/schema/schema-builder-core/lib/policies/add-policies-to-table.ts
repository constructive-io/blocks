/**
 * Non-React core for adding RLS policies to an existing table.
 *
 * Shared by:
 *  - `useCreateTableWithPolicies` (existing-table standard branch in policy-hooks.ts)
 *  - `executeAddPolicies` chat tool (exec-add-policies.ts)
 *
 * Scope: standard policy categories only (`has-module`, `no-fields`, `needs-table`).
 * `needs-fields` and `AuthzComposite` need column creation / multi-step orchestration
 * that lives in the React hook for now.
 */
import { getPolicyCategory } from '../../components/policies/policy-config';
import type { CrudOperation, CrudPolicyConfigs, PolicyCategory } from '../../components/policies/policy-types';
import { CRUD_OPERATIONS } from '../../components/policies/policy-types';

import { buildGrants, buildPolicyEntry, groupOperationsByConfig, type PolicyEntry } from './provision-helpers';

const SUPPORTED_CATEGORIES: ReadonlySet<PolicyCategory> = new Set(['has-module', 'no-fields', 'needs-table']);

export interface AddPoliciesToTablePolicyEntry {
	policyType: string;
	/** From POLICY_TYPE_UI_CONFIG[policyType].dataNodeType — only set for has-module. */
	dataNodeType?: string;
	nodeData?: Record<string, unknown>;
	sharedPolicyData: Record<string, unknown>;
	operations: CrudPolicyConfigs;
	/** Defaults to all four CRUD operations. */
	enabledOperations?: CrudOperation[];
}

export interface AddPoliciesToTableInput {
	createSecureTableProvision: (input: Record<string, unknown>) => Promise<unknown>;
	databaseId: string;
	schemaId: string;
	tableId: string;
	policies: AddPoliciesToTablePolicyEntry[];
}

export class UnsupportedPolicyCategoryError extends Error {
	constructor(public readonly policyType: string, public readonly category: PolicyCategory) {
		super(
			`Policy type "${policyType}" has category "${category}" which requires column creation or composite handling — use the policies UI instead.`,
		);
		this.name = 'UnsupportedPolicyCategoryError';
	}
}

/**
 * Install all policy entries in a single `secureTableProvision.create` call.
 * The backend `policies[]` and `nodes[]` arrays accept multiple items per call, so the
 * whole batch is atomic — either all policies land or none do.
 */
export async function addPoliciesToExistingTable(input: AddPoliciesToTableInput): Promise<{ success: true }> {
	for (const entry of input.policies) {
		const category = getPolicyCategory(entry.policyType);
		if (!SUPPORTED_CATEGORIES.has(category)) {
			throw new UnsupportedPolicyCategoryError(entry.policyType, category);
		}
	}

	const policiesArray: PolicyEntry[] = [];
	const nodesByType = new Map<string, { $type: string; data?: Record<string, unknown> }>();

	for (const entry of input.policies) {
		const groups = groupOperationsByConfig(entry.enabledOperations ?? CRUD_OPERATIONS, entry.operations);

		for (const group of groups) {
			const ops = group.privileges.join('_');
			const rand = Math.random().toString(36).slice(2, 8);
			policiesArray.push(
				buildPolicyEntry(entry.policyType, {
					privileges: group.privileges,
					policy_role: group.roleName,
					permissive: group.isPermissive,
					data: entry.sharedPolicyData,
					policy_name: `${ops}_${rand}`,
				}),
			);
		}

		if (entry.dataNodeType && !nodesByType.has(entry.dataNodeType)) {
			const nodeData = entry.nodeData ?? {};
			nodesByType.set(entry.dataNodeType, {
				$type: entry.dataNodeType,
				...(Object.keys(nodeData).length > 0 ? { data: nodeData } : {}),
			});
		}
	}

	const provisionInput: Record<string, unknown> = {
		databaseId: input.databaseId,
		schemaId: input.schemaId,
		tableId: input.tableId,
		grants: buildGrants(),
		policies: policiesArray,
	};

	if (nodesByType.size > 0) {
		provisionInput.nodes = [...nodesByType.values()];
	}

	await input.createSecureTableProvision(provisionInput);

	return { success: true };
}
