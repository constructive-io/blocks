'use client';

import type { UIDocument, UINode } from 'blocks-schema';
import { resolveNode, resolveNodeProps, type NodeProps, type NodeResolution, type RendererAdapter } from 'json-renderer';
import type { ReactNode } from 'react';

import { RendererProvider } from './context';
import { BlockRenderer } from './renderer';
import type { BlockComponent, RendererContextValue } from './types';
import { UnknownBlock } from './unknown-block';

/**
 * `blocks-renderer` as an explicit {@link RendererAdapter}: node type resolves to
 * a React component, output is a React element, and an unsatisfied type renders
 * {@link UnknownBlock}.
 *
 * The React components ({@link DocumentRenderer}, {@link BlockRenderer}) remain
 * the ergonomic entry point; this object states the contract they satisfy so a
 * second adapter has something to conform to.
 */
export const reactAdapter: RendererAdapter<BlockComponent, ReactNode, UIDocument, RendererContextValue> = {
	name: 'blocks-renderer/react',

	resolve(type, context): NodeResolution<BlockComponent> {
		return resolveNode(context.registry, type);
	},

	resolveProps(node, context): NodeProps {
		return resolveNodeProps(node, context.scope);
	},

	renderNode(node, context) {
		return <RendererProvider value={context}>{<BlockRenderer node={node as UINode} />}</RendererProvider>;
	},

	renderUnknown(node) {
		return <UnknownBlock node={node as UINode} />;
	},

	renderDocument(document, context) {
		return (
			<RendererProvider value={{ ...context, document }}>
				<BlockRenderer node={document.page} />
			</RendererProvider>
		);
	},
};
