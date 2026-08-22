/**
 * Field collection over a node tree. Which nodes are fields is a vocabulary
 * decision, so every helper takes a predicate: the core knows the *shape* of a
 * field (a `name`, an optional `defaultValue`, optional `constraints`) without
 * knowing the node types that carry it.
 */
import type { NodeConstraints } from './constraints';
import type { AnyDocumentNode } from './node';
import { walkNodes } from './node';

/** Decides whether a node contributes a field. */
export type FieldNodePredicate<TNode extends AnyDocumentNode = AnyDocumentNode> = (node: TNode) => boolean;

export interface FieldConstraintEntry {
	constraints?: NodeConstraints;
	required?: boolean;
}

function fieldName(node: AnyDocumentNode): string | undefined {
	const name = node.props?.name;
	return typeof name === 'string' ? name : undefined;
}

function* fieldNodes<TNode extends AnyDocumentNode>(
	node: TNode,
	isFieldNode: FieldNodePredicate<TNode>,
): Generator<[TNode, string]> {
	for (const current of walkNodes(node)) {
		if (!isFieldNode(current)) continue;
		const name = fieldName(current);
		if (name === undefined) continue;
		yield [current, name];
	}
}

/** Named fields in document order; field nodes without a `name` are skipped. */
export function collectFieldNames<TNode extends AnyDocumentNode>(
	node: TNode,
	isFieldNode: FieldNodePredicate<TNode>,
): string[] {
	const names: string[] = [];
	for (const [, name] of fieldNodes(node, isFieldNode)) names.push(name);
	return names;
}

/** Default values declared by field nodes, keyed by field name. */
export function collectDefaultValues<TNode extends AnyDocumentNode>(
	node: TNode,
	isFieldNode: FieldNodePredicate<TNode>,
): Record<string, unknown> {
	const values: Record<string, unknown> = {};
	for (const [current, name] of fieldNodes(node, isFieldNode)) {
		if (current.props.defaultValue !== undefined) {
			values[name] = current.props.defaultValue;
		}
	}
	return values;
}

/** Validation metadata declared by field nodes, keyed by field name. */
export function collectFieldConstraints<TNode extends AnyDocumentNode>(
	node: TNode,
	isFieldNode: FieldNodePredicate<TNode>,
): Record<string, FieldConstraintEntry> {
	const result: Record<string, FieldConstraintEntry> = {};
	for (const [current, name] of fieldNodes(node, isFieldNode)) {
		result[name] = {
			constraints: current.props.constraints as NodeConstraints | undefined,
			required: current.props.required as boolean | undefined,
		};
	}
	return result;
}
