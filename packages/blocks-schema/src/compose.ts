/**
 * Document composition for Constructive documents: the generic ops from
 * `json-renderer`, typed over this package's `UINode`/`UIDocument` and its
 * `Fragment`/`Slot` vocabulary.
 */
import { composeEnvelope, composeNodeTree as composeGenericNodeTree, mergeEnvelopes, mergeNodeTrees } from 'json-renderer';
import type { ComposeOptions as GenericComposeOptions, NodeOverride as GenericNodeOverride } from 'json-renderer';

import type { UIDocument } from './envelope';
import type { UIActions, UIBinding, UINode, UINodeProps, UINodeType } from './node';

/**
 * A patch applied to the node with a given `key`. Composition is per node, not
 * per document, so a generated default can be customized in a few places
 * without giving up generation.
 */
export interface NodeOverride extends GenericNodeOverride<UINodeType, UINodeProps> {
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

function genericOptions(options: ComposeOptions): GenericComposeOptions<UINode> {
	return options as GenericComposeOptions<UINode>;
}

/**
 * Compose a document: expand `Fragment` references, fill `Slot` nodes, then
 * apply per-node overrides. Pure — the input document is never mutated.
 */
export function composeDocument(document: UIDocument, options: ComposeOptions = {}): UIDocument {
	return composeEnvelope(document, genericOptions(options));
}

export function composeNodeTree(node: UINode, options: ComposeOptions = {}): UINode {
	return composeGenericNodeTree(node, genericOptions(options));
}

/**
 * Merge an overlay document onto a generated one by node `key`: hand-authored
 * content wins per node, not per document.
 */
export function mergeDocuments(base: UIDocument, overlay: Partial<Omit<UIDocument, 'page'>> & { page?: UINode }): UIDocument {
	return mergeEnvelopes(base, overlay);
}

export function mergeNodes(base: UINode, overlay: UINode): UINode {
	return mergeNodeTrees(base, overlay);
}
