import {
	createNode,
	type AnyDocumentNode,
	type NodeActions,
	type NodeBindings,
	type NodeProps,
} from '../node';

/**
 * Builds a node in an open vocabulary, which is how a generic host uses the
 * model: `type` is any string and props are unconstrained.
 */
export function node(
	type: string,
	key: string,
	options: {
		props?: NodeProps;
		children?: AnyDocumentNode[];
		bindings?: NodeBindings;
		actions?: NodeActions;
	} = {},
): AnyDocumentNode {
	return createNode<string, NodeProps>(type, key, options);
}
