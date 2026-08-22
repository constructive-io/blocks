import type { UIAction, UIDocument, UINode, UINodeProps } from 'blocks-schema';
import type { BindingScope, NodeRegistry, RenderContext } from 'json-renderer';
import type { ComponentType, ReactNode } from 'react';

export type RenderMode = 'preview' | 'edit';

/**
 * Props every block component receives. Children are already rendered, and
 * `props` has the node's bindings resolved against the current scope.
 */
export interface BlockProps {
	node: UINode;
	props: UINodeProps;
	children?: ReactNode;
}

export type BlockComponent = ComponentType<BlockProps>;

/** Node type → component. Layered by {@link composeRegistry}. */
export type BlockRegistry = NodeRegistry<BlockComponent>;

/**
 * The React adapter's render context: `json-renderer`'s generic
 * {@link RenderContext} plus the field state a form needs while rendering.
 */
export interface RendererContextValue extends RenderContext<BlockComponent, UIDocument, UIAction> {
	document: UIDocument;
	registry: BlockRegistry;
	mode: RenderMode;
	values: Record<string, unknown>;
	errors: Record<string, string>;
	setValue: (name: string, value: unknown) => void;
	setError: (name: string, error: string | null) => void;
	/** Scope for binding expressions (`{{ row.title }}`), merged with `values`. */
	scope: BindingScope;
	onAction?: (action: UIAction, event: string) => void;
}
