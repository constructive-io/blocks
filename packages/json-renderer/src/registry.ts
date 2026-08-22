/**
 * Registry resolution: node type → whatever an adapter renders with (a React
 * component, a template function, an HTML serializer). The core owns the
 * layering rules; the handler type is the adapter's business.
 */

/** Node type → handler. Layered by {@link composeRegistry}. */
export type NodeRegistry<THandler> = Record<string, THandler>;

/**
 * Layer registries left-to-right, later layers winning. This is how a host
 * customizes rendering: base primitives, then an app registry, then per-document
 * overrides — no forking of the renderer, and no single global map.
 */
export function composeRegistry<THandler>(
	...layers: (NodeRegistry<THandler> | undefined)[]
): NodeRegistry<THandler> {
	const composed: NodeRegistry<THandler> = {};
	for (const layer of layers) {
		if (!layer) continue;
		Object.assign(composed, layer);
	}
	return composed;
}

export function resolveHandler<THandler>(registry: NodeRegistry<THandler>, type: string): THandler | undefined {
	return registry[type];
}

/** Node types the registry can render, sorted for stable output. */
export function registeredTypes<THandler>(registry: NodeRegistry<THandler>): string[] {
	return Object.keys(registry).sort();
}

/** Node types a document uses that no registry layer satisfies. */
export function missingTypes<THandler>(registry: NodeRegistry<THandler>, usedTypes: Iterable<string>): string[] {
	const missing = new Set<string>();
	for (const type of usedTypes) {
		if (!(type in registry)) missing.add(type);
	}
	return [...missing].sort();
}
