'use client';

import type { UINode } from 'blocks-schema';

/**
 * Rendered when no registry layer satisfies a node type. A document may name
 * blocks a given host has not installed, so an unknown type is a visible gap,
 * never a thrown render.
 */
export function UnknownBlock({ node }: { node: UINode }) {
	return (
		<div data-block-unknown={node.type} role="note">
			Unknown block: {node.type}
		</div>
	);
}
