import type { UIAction, UIDocument, UINode, UINodeProps } from '@constructive-io/blocks-schema';
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
export type BlockRegistry = Record<string, BlockComponent>;

export interface RendererContextValue {
	document: UIDocument;
	registry: BlockRegistry;
	mode: RenderMode;
	values: Record<string, unknown>;
	errors: Record<string, string>;
	setValue: (name: string, value: unknown) => void;
	setError: (name: string, error: string | null) => void;
	/** Scope for binding expressions (`{{ row.title }}`), merged with `values`. */
	scope: Record<string, unknown>;
	onAction?: (action: UIAction, event: string) => void;
}
