import type { ConditionLeafNode, ConditionNode } from '../condition-builder/types';

/**
 * Data stored in each leaf node of a composite policy tree.
 * Aligned with PolicyConditionData from policies.types.ts for compatibility with mapConditionNodeToAst.
 */
export interface CompositeConditionData {
	policyType: string;
	data: Record<string, unknown>;
}

/**
 * The full composite policy data is a ConditionGroupNode tree.
 * This is what gets stored in policyData for AuthzComposite.
 *
 * Includes index signature to be compatible with Record<string, unknown>.
 */
export interface CompositePolicyData {
	id: string;
	type: 'group';
	operator: 'AND' | 'OR';
	children: ConditionNode<CompositeConditionData>[];
	[key: string]: unknown;
}

/**
 * Create a new leaf condition node with the given policy type and data.
 */
export function createNewCompositeCondition(
	policyType: string,
	policyData: Record<string, unknown> = {},
): ConditionLeafNode<CompositeConditionData> {
	return {
		id: crypto.randomUUID(),
		type: 'condition',
		data: {
			policyType,
			data: policyData,
		},
	};
}

/**
 * Create an empty composite policy data structure (root group with one default condition).
 */
export function createEmptyCompositePolicyData(
	defaultPolicyType: string,
	defaultPolicyData: Record<string, unknown> = {},
): CompositePolicyData {
	return {
		id: crypto.randomUUID(),
		type: 'group',
		operator: 'AND',
		children: [createNewCompositeCondition(defaultPolicyType, defaultPolicyData)],
	};
}

/**
 * Flatten a potentially nested condition tree into a single-level list.
 * Extracts all leaf nodes from nested groups into the root's children array.
 */
export function flattenConditionTree(root: CompositePolicyData): CompositePolicyData {
	const leaves: ConditionLeafNode<CompositeConditionData>[] = [];

	function collectLeaves(node: ConditionNode<CompositeConditionData>) {
		if (node.type === 'condition') {
			leaves.push(node);
		} else {
			node.children.forEach(collectLeaves);
		}
	}

	root.children.forEach(collectLeaves);

	return { ...root, children: leaves };
}
