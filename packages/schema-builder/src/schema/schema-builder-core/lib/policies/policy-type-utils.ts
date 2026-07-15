import { POLICY_TYPE_UI_CONFIG, type PolicyTypeId } from '../../components/policies/policy-config';

export type { PolicyTypeId };

const UI_POLICY_TYPE_DISCRIMINATOR_KEY = '__ui_policy_type';

/**
 * Build reverse lookup: AST node name → policy type ID.
 * Used by the RLS parser to identify policy types from AST expressions.
 */
export const AST_NODE_TO_POLICY_TYPE: Record<string, PolicyTypeId> = Object.fromEntries(
	Object.keys(POLICY_TYPE_UI_CONFIG)
		.filter((name) => name !== 'AuthzComposite')
		.map((name) => [name, name as PolicyTypeId]),
);

/**
 * Map a backend policy type ID to a frontend PolicyTypeId.
 * Handles AuthzComposite and AuthzEntityMembership variant detection.
 */
export function fromBackendPolicyTypeId(
	backendPolicyTypeId: string,
	_data?: Record<string, unknown> | null,
): PolicyTypeId | 'AuthzComposite' | undefined {
	if (backendPolicyTypeId === 'AuthzComposite') return 'AuthzComposite';
	if (backendPolicyTypeId === 'AuthzEntityMembership') return 'AuthzEntityMembership';
	if (backendPolicyTypeId in POLICY_TYPE_UI_CONFIG) return backendPolicyTypeId as PolicyTypeId;
	return undefined;
}

/**
 * Map a frontend PolicyTypeId back to the backend policy type ID.
 */
export function toBackendPolicyTypeId(policyTypeId: PolicyTypeId | 'AuthzComposite'): string {
	if (policyTypeId === 'AuthzComposite') return 'AuthzComposite';
	return policyTypeId;
}

/**
 * Strip unknown keys from policy data based on the fieldOverrides for that policy type.
 * Preserves the UI discriminator key and auto-injected schema fields.
 */
export function sanitizePolicyTypeData(
	policyTypeId: PolicyTypeId,
	data: Record<string, unknown>,
): Record<string, unknown> {
	const config = POLICY_TYPE_UI_CONFIG[policyTypeId];
	if (!config?.fieldOverrides) return data;

	const allowedKeys = new Set(Object.keys(config.fieldOverrides));
	allowedKeys.add(UI_POLICY_TYPE_DISCRIMINATOR_KEY);

	const filtered: Record<string, unknown> = {};
	for (const key of Object.keys(data)) {
		if (allowedKeys.has(key)) {
			filtered[key] = data[key];
		}
	}
	return filtered;
}

/**
 * Get the AST node name for a policy type, resolving backend ID if needed.
 */
export function getAstNodeForPolicyType(
	policyTypeId: string,
	data?: Record<string, unknown> | null,
): string | undefined {
	const frontendId = fromBackendPolicyTypeId(policyTypeId, data) ?? (policyTypeId as PolicyTypeId);
	if (frontendId === 'AuthzComposite') return undefined;
	return frontendId in POLICY_TYPE_UI_CONFIG ? frontendId : undefined;
}
