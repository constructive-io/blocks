/**
 * The node tree model: a document is a tree of typed nodes, and a node's `type`
 * is a plain string resolved by an adapter's registry. The vocabulary is a
 * parameter, never a fixed list — a host that renders `Input`/`DataTable` and a
 * host that renders `chart.line` share this model.
 */

/** Node props are open: an adapter reads what its components need. */
export interface NodeProps {
	[propName: string]: unknown;
}

/** Prop name → template expression, e.g. `{ label: '{{ row.title }}' }`. */
export interface NodeBindings {
	[propName: string]: string;
}

/**
 * A declarative reference to behaviour that lives outside the document. Keeping
 * actions declarative is what stops the format becoming a programming language.
 */
export interface NodeAction {
	type: string;
	flowId?: string;
	handler?: string;
	inputMapping?: Record<string, string>;
	params?: Record<string, unknown>;
}

/** Event name → action, e.g. `{ submit: { type: 'flow', flowId } }`. */
export interface NodeActions {
	[eventName: string]: NodeAction;
}

/**
 * A node in the document tree, generic over the node vocabulary (`TType`) and
 * the props shape (`TProps`) a vocabulary declares.
 */
export interface DocumentNode<TType extends string = string, TProps extends NodeProps = NodeProps> {
	type: TType;
	key: string;
	props: TProps;
	children: DocumentNode<TType, TProps>[];
	bindings?: NodeBindings;
	actions?: NodeActions;
}

/** Any node tree, whatever its vocabulary. */
export type AnyDocumentNode = DocumentNode<string, NodeProps>;

/** Depth-first walk over a node and its descendants. */
export function* walkNodes<TNode extends AnyDocumentNode>(node: TNode): Generator<TNode> {
	yield node;
	for (const child of (node.children ?? []) as TNode[]) {
		yield* walkNodes(child);
	}
}

export function findNodeByKey<TNode extends AnyDocumentNode>(node: TNode, key: string): TNode | undefined {
	for (const current of walkNodes(node)) {
		if (current.key === key) return current;
	}
	return undefined;
}

export function collectNodes<TNode extends AnyDocumentNode>(node: TNode, predicate: (node: TNode) => boolean): TNode[] {
	const matches: TNode[] = [];
	for (const current of walkNodes(node)) {
		if (predicate(current)) matches.push(current);
	}
	return matches;
}

/**
 * Rewrite a tree bottom-up. Pure: the input node is never mutated, so a
 * transform is safe to run on a document that is also being rendered.
 */
export function mapNodes<TNode extends AnyDocumentNode>(node: TNode, transform: (node: TNode) => TNode): TNode {
	const children = (node.children ?? []).map((child) => mapNodes(child as TNode, transform));
	return transform({ ...node, children } as TNode);
}

/** Node types used anywhere in a tree, sorted for stable output. */
export function collectNodeTypes(node: AnyDocumentNode): string[] {
	const types = new Set<string>();
	for (const current of walkNodes(node)) {
		types.add(current.type);
	}
	return [...types].sort();
}

export function createNode<TType extends string = string, TProps extends NodeProps = NodeProps>(
	type: TType,
	key: string,
	options: {
		props?: TProps;
		children?: DocumentNode<TType, TProps>[];
		bindings?: NodeBindings;
		actions?: NodeActions;
	} = {},
): DocumentNode<TType, TProps> {
	return {
		type,
		key,
		props: options.props ?? ({} as TProps),
		children: options.children ?? [],
		...(options.bindings ? { bindings: options.bindings } : {}),
		...(options.actions ? { actions: options.actions } : {}),
	};
}
