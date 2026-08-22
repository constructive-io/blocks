/**
 * Composition ops: fragment expansion, slot filling, per-node overrides, and
 * document merge. Pure JSON in, pure JSON out — nothing here needs a renderer,
 * so a generated document can be customized on a server before it ships.
 */
import type { AnyDocumentEnvelope, DocumentDataSource, RegistrySource } from './envelope';
import type { AnyDocumentNode, NodeActions, NodeBindings, NodeProps } from './node';

/**
 * A patch applied to the node with a given `key`. Composition is per node, not
 * per document, so a generated default can be customized in a few places
 * without giving up generation.
 */
export interface NodeOverride<TType extends string = string, TProps extends NodeProps = NodeProps> {
	type?: TType;
	props?: TProps;
	bindings?: NodeBindings;
	actions?: NodeActions;
	/** Drop the node (and its subtree) from the composed document. */
	remove?: boolean;
}

export type NodeOverrides<TType extends string = string, TProps extends NodeProps = NodeProps> = Record<
	string,
	NodeOverride<TType, TProps>
>;

/** Reusable subtrees addressed by fragment nodes. */
export type FragmentMap<TNode extends AnyDocumentNode = AnyDocumentNode> = Record<string, TNode>;

/** Subtrees that fill slot nodes, addressed by slot name. */
export type SlotMap<TNode extends AnyDocumentNode = AnyDocumentNode> = Record<string, TNode | TNode[]>;

/**
 * Which node types and props carry composition. A vocabulary that spells its
 * indirection nodes differently (`include`/`outlet`) configures them here rather
 * than forking composition.
 */
export interface ComposeVocabulary {
	fragmentNodeType: string;
	slotNodeType: string;
	/** Prop on a fragment node naming the fragment to expand. */
	fragmentRefProp: string;
	/** Prop on a slot node naming the slot to fill. */
	slotNameProp: string;
}

export const DEFAULT_COMPOSE_VOCABULARY: ComposeVocabulary = {
	fragmentNodeType: 'Fragment',
	slotNodeType: 'Slot',
	fragmentRefProp: 'ref',
	slotNameProp: 'name',
};

export interface ComposeOptions<TNode extends AnyDocumentNode = AnyDocumentNode> {
	fragments?: FragmentMap<TNode>;
	slots?: SlotMap<TNode>;
	overrides?: NodeOverrides<string, NodeProps>;
	vocabulary?: Partial<ComposeVocabulary>;
}

function vocabularyOf(options: ComposeOptions<never> | ComposeOptions<AnyDocumentNode>): ComposeVocabulary {
	return { ...DEFAULT_COMPOSE_VOCABULARY, ...options.vocabulary };
}

function applyOverride<TNode extends AnyDocumentNode>(node: TNode, override: NodeOverride<string, NodeProps>): TNode {
	return {
		...node,
		...(override.type ? { type: override.type } : {}),
		props: { ...node.props, ...override.props },
		...(override.bindings ? { bindings: { ...node.bindings, ...override.bindings } } : {}),
		...(override.actions ? { actions: { ...node.actions, ...override.actions } } : {}),
	};
}

function expandChild<TNode extends AnyDocumentNode>(
	node: TNode,
	options: ComposeOptions<TNode>,
	vocabulary: ComposeVocabulary,
): TNode[] {
	if (node.type === vocabulary.fragmentNodeType) {
		const ref = node.props?.[vocabulary.fragmentRefProp];
		const fragment = typeof ref === 'string' ? options.fragments?.[ref] : undefined;
		// An unresolved reference stays in the tree so the renderer surfaces it
		// rather than silently dropping content.
		return fragment
			? [composeNode(fragment, options, vocabulary)]
			: [composeNode({ ...node, children: [] }, options, vocabulary)];
	}

	if (node.type === vocabulary.slotNodeType) {
		const name = node.props?.[vocabulary.slotNameProp];
		const filler = typeof name === 'string' ? options.slots?.[name] : undefined;
		if (filler === undefined) {
			// No filler: fall back to the slot's own children (its default content).
			return ((node.children ?? []) as TNode[]).flatMap((child) => expandChild(child, options, vocabulary));
		}
		const nodes = Array.isArray(filler) ? filler : [filler];
		return nodes.map((filled) => composeNode(filled, options, vocabulary));
	}

	return [composeNode(node, options, vocabulary)];
}

function composeNode<TNode extends AnyDocumentNode>(
	node: TNode,
	options: ComposeOptions<TNode>,
	vocabulary: ComposeVocabulary,
): TNode {
	const override = options.overrides?.[node.key];
	const base = override ? applyOverride(node, override) : node;

	const children = ((base.children ?? []) as TNode[])
		.filter((child) => !options.overrides?.[child.key]?.remove)
		.flatMap((child) => expandChild(child, options, vocabulary));

	return { ...base, children } as TNode;
}

/**
 * Compose a document: expand fragment references, fill slots, then apply
 * per-node overrides. Pure — the input document is never mutated.
 */
export function composeEnvelope<TEnvelope extends AnyDocumentEnvelope>(
	document: TEnvelope,
	options: ComposeOptions<TEnvelope['page']> = {},
): TEnvelope {
	return { ...document, page: composeNode(document.page, options, vocabularyOf(options)) };
}

export function composeNodeTree<TNode extends AnyDocumentNode>(
	node: TNode,
	options: ComposeOptions<TNode> = {},
): TNode {
	return composeNode(node, options, vocabularyOf(options));
}

/**
 * Merge an overlay tree onto a base tree by node `key`: matching nodes have
 * their props, bindings, and actions shallow-merged (overlay wins) and their
 * children merged recursively; overlay children with no match are appended.
 * This is the "hand-authored beats generated, at the node level" rule.
 */
export function mergeNodeTrees<TNode extends AnyDocumentNode>(base: TNode, overlay: TNode): TNode {
	const merged: TNode = {
		...base,
		...(overlay.type ? { type: overlay.type } : {}),
		props: { ...base.props, ...overlay.props },
		...(base.bindings || overlay.bindings ? { bindings: { ...base.bindings, ...overlay.bindings } } : {}),
		...(base.actions || overlay.actions ? { actions: { ...base.actions, ...overlay.actions } } : {}),
	};

	const overlayChildren = (overlay.children ?? []) as TNode[];
	const byKey = new Map(overlayChildren.map((child) => [child.key, child]));
	const consumed = new Set<string>();

	const children = ((base.children ?? []) as TNode[]).map((child) => {
		const patch = byKey.get(child.key);
		if (!patch) return child;
		consumed.add(child.key);
		return mergeNodeTrees(child, patch);
	});

	for (const child of overlayChildren) {
		if (!consumed.has(child.key)) children.push(child);
	}

	return { ...merged, children } as TNode;
}

function mergeNamed<T extends { name: string }>(base?: T[], overlay?: T[]): T[] | undefined {
	if (!base && !overlay) return undefined;
	const merged = new Map((base ?? []).map((entry) => [entry.name, entry]));
	for (const entry of overlay ?? []) merged.set(entry.name, entry);
	return [...merged.values()];
}

/**
 * Merge an overlay document onto a base document: envelope identity comes from
 * the overlay when set, `meta` is shallow-merged, `registries` and `dataSources`
 * are merged by name, and the page trees are merged by node key.
 */
export function mergeEnvelopes<TEnvelope extends AnyDocumentEnvelope>(
	base: TEnvelope,
	overlay: Partial<Omit<TEnvelope, 'page'>> & { page?: TEnvelope['page'] },
): TEnvelope {
	const registries = mergeNamed<RegistrySource>(base.registries, overlay.registries);
	const dataSources = mergeNamed<DocumentDataSource>(base.dataSources, overlay.dataSources);

	return {
		...base,
		...overlay,
		...(base.meta || overlay.meta ? { meta: { ...base.meta, ...overlay.meta } } : {}),
		...(registries ? { registries } : {}),
		...(dataSources ? { dataSources } : {}),
		page: overlay.page ? mergeNodeTrees(base.page, overlay.page) : base.page,
	} as TEnvelope;
}
