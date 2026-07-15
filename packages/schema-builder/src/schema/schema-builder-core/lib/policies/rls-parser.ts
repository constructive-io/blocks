import type {
	ConditionGroupNode,
	ConditionLeafNode,
	ConditionLogicalOperator,
	ConditionNode,
	PolicyConditionData,
} from '../../components/policies/condition-builder/types';

import { AST_NODE_TO_POLICY_TYPE, fromBackendPolicyTypeId, type PolicyTypeId } from './policy-type-utils';

type AstNode = Record<string, unknown>;

class IdGenerator {
	private counter = 1;
	next(): string {
		return `c-${this.counter++}`;
	}
}

class MembershipByFieldParser implements NodeParser {
	canParse(tag: string): boolean {
		return tag === 'AuthzEntityMembership';
	}

	parse(node: AstNode, tag: string, idGen: IdGenerator): ConditionLeafNode<PolicyConditionData> {
		const data = node[tag] as Record<string, unknown>;
		const policyTypeId = fromBackendPolicyTypeId('AuthzEntityMembership', data) ?? 'OwnedRecords';

		return {
			id: idGen.next(),
			type: 'condition',
			data: {
				policyType: policyTypeId,
				data: { ...data },
			},
		};
	}
}

interface NodeParser {
	canParse(tag: string): boolean;
	parse(node: AstNode, tag: string, idGen: IdGenerator): ConditionNode<PolicyConditionData> | null;
}

class RlsNodeParser implements NodeParser {
	canParse(tag: string): boolean {
		return tag in AST_NODE_TO_POLICY_TYPE;
	}

	parse(node: AstNode, tag: string, idGen: IdGenerator): ConditionLeafNode<PolicyConditionData> {
		const policyTypeId = AST_NODE_TO_POLICY_TYPE[tag];
		const data = node[tag] as Record<string, unknown>;

		return {
			id: idGen.next(),
			type: 'condition',
			data: {
				policyType: policyTypeId,
				data: { ...data },
			},
		};
	}
}

class BoolExprParser implements NodeParser {
	constructor(private transformer: AstToConditionTransformer) {}

	canParse(tag: string): boolean {
		return tag === 'BoolExpr';
	}

	parse(node: AstNode, _tag: string, idGen: IdGenerator): ConditionNode<PolicyConditionData> | null {
		const data = node['BoolExpr'] as { boolop: string; args: AstNode[] };
		const operator: ConditionLogicalOperator = data.boolop === 'AND_EXPR' ? 'AND' : 'OR';
		const args = data.args || [];

		const children: ConditionNode<PolicyConditionData>[] = [];
		for (const arg of args) {
			const child = this.transformer.transformNode(arg, idGen);
			if (child) children.push(child);
		}

		if (children.length === 0) return null;
		if (children.length === 1) return children[0];

		return {
			id: idGen.next(),
			type: 'group',
			operator,
			children,
		};
	}
}

class AstToConditionTransformer {
	private parsers: NodeParser[];

	constructor() {
		this.parsers = [new MembershipByFieldParser(), new RlsNodeParser(), new BoolExprParser(this)];
	}

	private getNodeTag(node: AstNode): string | null {
		const keys = Object.keys(node);
		if (keys.length === 1 && /^[A-Z]/.test(keys[0])) {
			return keys[0];
		}
		return null;
	}

	transformNode(node: AstNode, idGen: IdGenerator): ConditionNode<PolicyConditionData> | null {
		const tag = this.getNodeTag(node);
		if (!tag) return null;

		for (const parser of this.parsers) {
			if (parser.canParse(tag)) {
				return parser.parse(node, tag, idGen);
			}
		}
		return null;
	}

	transform(ast: AstNode): ConditionGroupNode<PolicyConditionData> {
		const idGen = new IdGenerator();
		const result = this.transformNode(ast, idGen);

		if (!result) {
			return { id: 'root', type: 'group', operator: 'AND', children: [] };
		}

		if (result.type === 'group') {
			return { ...result, id: 'root' };
		}

		return { id: 'root', type: 'group', operator: 'AND', children: [result] };
	}
}

const transformer = new AstToConditionTransformer();

export function mapAstToConditionNode(ast: AstNode): ConditionGroupNode<PolicyConditionData> {
	return transformer.transform(ast);
}
