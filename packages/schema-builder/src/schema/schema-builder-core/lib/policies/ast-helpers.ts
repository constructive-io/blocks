import { nodes } from 'pg-ast';
import type { Node } from '@pgsql/types';

import type { ConditionGroupNode, ConditionLeafNode, PolicyConditionData } from '../../components/policies/condition-builder/types';

import { getAstNodeForPolicyType, sanitizePolicyTypeData, type PolicyTypeId } from './policy-type-utils';

export const and = (...args: Node[]) =>
	nodes.boolExpr({
		boolop: 'AND_EXPR',
		args,
	});

export const or = (...args: Node[]) =>
	nodes.boolExpr({
		boolop: 'OR_EXPR',
		args,
	});

function mapLeafToAstNode(leaf: ConditionLeafNode<PolicyConditionData>): Node | null {
	const policyTypeId = leaf.data.policyType as PolicyTypeId;
	const astNode = getAstNodeForPolicyType(policyTypeId, leaf.data.data as Record<string, unknown>);
	if (!astNode) return null;

	const data = sanitizePolicyTypeData(policyTypeId, (leaf.data.data || {}) as Record<string, unknown>);

	return {
		[astNode]: data,
	} as unknown as Node;
}

export function mapConditionNodeToAst(
	node: ConditionGroupNode<PolicyConditionData> | ConditionLeafNode<PolicyConditionData>,
): Node | null {
	if (node.type === 'condition') {
		return mapLeafToAstNode(node);
	}

	const childExprs = node.children
		.map((child) => mapConditionNodeToAst(child))
		.filter((child): child is Node => child !== null);

	if (childExprs.length === 0) return null;
	if (childExprs.length === 1) return childExprs[0];

	return node.operator === 'AND' ? and(...childExprs) : or(...childExprs);
}
