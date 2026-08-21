import type { UIDocument } from './envelope';
import type { UIActions, UIBinding, UINode, UINodeProps, UINodeType } from './node';

/**
 * A patch applied to the node with a given `key`. Composition is per node, not
 * per document, so a generated default can be customized in a few places
 * without giving up generation.
 */
export interface NodeOverride {
	type?: UINodeType;
	props?: UINodeProps;
	bindings?: UIBinding;
	actions?: UIActions;
	/** Drop the node (and its subtree) from the composed document. */
	remove?: boolean;
}

export type NodeOverrides = Record<string, NodeOverride>;

/** Reusable subtrees addressed by `Fragment` nodes via `props.ref`. */
export type FragmentMap = Record<string, UINode>;

/** Subtrees that fill `Slot` nodes, addressed by `props.name`. */
export type SlotMap = Record<string, UINode | UINode[]>;

export interface ComposeOptions {
	fragments?: FragmentMap;
	slots?: SlotMap;
	overrides?: NodeOverrides;
}

function applyOverride(node: UINode, override: NodeOverride): UINode {
	return {
		...node,
		...(override.type ? { type: override.type } : {}),
		props: { ...node.props, ...override.props },
		...(override.bindings ? { bindings: { ...node.bindings, ...override.bindings } } : {}),
		...(override.actions ? { actions: { ...node.actions, ...override.actions } } : {}),
	};
}

function expandChild(node: UINode, options: ComposeOptions): UINode[] {
	if (node.type === 'Fragment') {
		const ref = node.props?.ref;
		const fragment = typeof ref === 'string' ? options.fragments?.[ref] : undefined;
		// An unresolved reference stays in the tree so the renderer surfaces it
		// rather than silently dropping content.
		return fragment ? [composeNode(fragment, options)] : [composeNode({ ...node, children: [] }, options)];
	}

	if (node.type === 'Slot') {
		const name = node.props?.name;
		const filler = typeof name === 'string' ? options.slots?.[name] : undefined;
		if (filler === undefined) {
			// No filler: fall back to the slot's own children (its default content).
			return (node.children ?? []).flatMap((child) => expandChild(child, options));
		}
		const nodes = Array.isArray(filler) ? filler : [filler];
		return nodes.map((filled) => composeNode(filled, options));
	}

	return [composeNode(node, options)];
}

function composeNode(node: UINode, options: ComposeOptions): UINode {
	const override = options.overrides?.[node.key];
	const base = override ? applyOverride(node, override) : node;

	const children = (base.children ?? [])
		.filter((child) => !options.overrides?.[child.key]?.remove)
		.flatMap((child) => expandChild(child, options));

	return { ...base, children };
}

/**
 * Compose a document: expand `Fragment` references, fill `Slot` nodes, then
 * apply per-node overrides. Pure — the input document is never mutated.
 */
export function composeDocument(document: UIDocument, options: ComposeOptions = {}): UIDocument {
	return { ...document, page: composeNode(document.page, options) };
}

export function composeNodeTree(node: UINode, options: ComposeOptions = {}): UINode {
	return composeNode(node, options);
}
