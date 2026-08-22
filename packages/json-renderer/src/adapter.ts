/**
 * The adapter contract.
 *
 * `json-renderer` never renders anything: it defines the document, and the
 * interface a renderer implements to turn that document into output. An adapter
 * is generic over two things — the handler it resolves a node type to
 * (`THandler`: a React component, a string template, a serializer) and the output
 * it produces (`TOutput`: a React element, a string, a DOM node).
 *
 * An adapter owes three answers:
 *
 * 1. **Registry resolution** — node type → handler, layered (see
 *    {@link composeRegistry}).
 * 2. **Binding scope access** — the scope a node's bindings resolve against, and
 *    how scope is layered for nested content.
 * 3. **Unknown-node handling** — what happens when no layer satisfies a type.
 *    A document may name nodes a given host has not installed, so the default is
 *    a visible placeholder, never a thrown render.
 *
 * `blocks-renderer` is the reference implementation (React + shadcn).
 */
import type { BindingScope } from './bindings';
import type { AnyDocumentEnvelope } from './envelope';
import type { AnyDocumentNode, NodeAction, NodeProps } from './node';
import type { NodeRegistry } from './registry';

/** How an adapter treats a node type no registry layer satisfies. */
export type UnknownNodePolicy = 'fallback' | 'omit' | 'throw';

/** Resolution outcome for one node type. */
export type NodeResolution<THandler> =
	| { status: 'resolved'; type: string; handler: THandler }
	| { status: 'unknown'; type: string };

export function resolveNode<THandler>(registry: NodeRegistry<THandler>, type: string): NodeResolution<THandler> {
	const handler = registry[type];
	return handler === undefined ? { status: 'unknown', type } : { status: 'resolved', type, handler };
}

/**
 * Everything an adapter needs while walking one document. A React adapter puts
 * this in context; a string adapter threads it through its recursion.
 */
export interface RenderContextBase<THandler, TDocument extends AnyDocumentEnvelope = AnyDocumentEnvelope> {
	document: TDocument;
	registry: NodeRegistry<THandler>;
	/** Scope for binding expressions (`{{ row.title }}`). */
	scope: BindingScope;
	unknownNodePolicy?: UnknownNodePolicy;
}

/**
 * The context plus action dispatch. `TAction` lets a vocabulary narrow its
 * action union (`blocks-schema`'s `UIAction`) without restating the context.
 */
export interface RenderContext<
	THandler,
	TDocument extends AnyDocumentEnvelope = AnyDocumentEnvelope,
	TAction extends NodeAction = NodeAction,
> extends RenderContextBase<THandler, TDocument> {
	/** Declarative actions are dispatched to the host, never executed here. */
	onAction?: (action: TAction, event: string) => void;
}

/** Props an adapter hands a resolved handler: the node plus its resolved props. */
export interface NodeRenderInput<TOutput> {
	node: AnyDocumentNode;
	props: NodeProps;
	children?: TOutput;
}

/**
 * The interface a renderer implements. Methods are the contract, not a base
 * class: adapters are free to be a single function, a class, or a React tree.
 */
export interface RendererAdapter<
	THandler,
	TOutput,
	TDocument extends AnyDocumentEnvelope = AnyDocumentEnvelope,
	TContext extends RenderContextBase<THandler, TDocument> = RenderContext<THandler, TDocument>,
> {
	/** Adapter identity, for diagnostics: e.g. `blocks-renderer/react`. */
	readonly name: string;
	/** Node type → handler, after layering. */
	resolve(type: string, context: TContext): NodeResolution<THandler>;
	/** Resolve a node's bindings against the context scope. */
	resolveProps(node: AnyDocumentNode, context: TContext): NodeProps;
	/** Render one node (and, recursively, its children). */
	renderNode(node: AnyDocumentNode, context: TContext): TOutput;
	/** Render the placeholder for an unsatisfied node type. */
	renderUnknown(node: AnyDocumentNode, context: TContext): TOutput;
	/** Render a whole document. */
	renderDocument(document: TDocument, context: TContext): TOutput;
}

/**
 * A field-value store an adapter exposes to interactive nodes. Kept in the core
 * so form semantics (value, error, validate-on-change) are one contract across
 * adapters instead of per-framework inventions.
 */
export interface FieldStateAccess {
	getValue(name: string): unknown;
	setValue(name: string, value: unknown): void;
	getError(name: string): string | undefined;
	setError(name: string, error: string | null): void;
}
