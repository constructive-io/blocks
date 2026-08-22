import type { NodeDefinitionWithImpl } from '@fbp/evaluator';
import type { UIDocumentMetadata } from 'blocks-schema';

/**
 * The FBP context every node definition here is declared under. A graph has one
 * default context, so element nodes share `js` with the evaluator's data nodes
 * (`json:select`, `math:add`) — otherwise every node in a mixed graph would
 * need a context override.
 */
export const FLOW_CONTEXT = 'js';

/** The category every element node is declared under, so a graph node's type mirrors the document node's type: `ui:Page` produces a `Page`. */
export const FLOW_CATEGORY = 'ui';

export interface FlowToBlocksOptions {
	/**
	 * Extra node definitions — the data half of a graph (`math:add`,
	 * `json:select`, a host's own nodes). Appended after this package's element
	 * definitions, so a definition with the same `context:category:name` wins.
	 */
	definitions?: NodeDefinitionWithImpl[];
	/** Output boundary node to pull from. Defaults to the graph's sole `graphOutput`. */
	outputNode?: string;
	/** Port on {@link outputNode}. Boundary nodes carry their value on `value`. */
	outputPort?: string;
	/** External values for the graph's `graphInput` nodes, keyed by port name. */
	inputs?: Record<string, unknown>;
	/** External values for the graph's `graphProp` nodes, keyed by prop name. */
	props?: Record<string, unknown>;
	/** Document id, when the flow produced a bare node rather than a document. */
	documentId?: string;
	/** Document metadata, merged over anything the flow declared. */
	meta?: UIDocumentMetadata;
}
