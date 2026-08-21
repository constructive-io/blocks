import type { BlockComponent, BlockRegistry } from './types';

/**
 * Layer registries left-to-right, later layers winning. This is how a host
 * customizes rendering: base primitives, then an app registry, then per-document
 * overrides — no forking of the renderer, and no single global map.
 */
export function composeRegistry(...layers: (BlockRegistry | undefined)[]): BlockRegistry {
	const composed: BlockRegistry = {};
	for (const layer of layers) {
		if (!layer) continue;
		Object.assign(composed, layer);
	}
	return composed;
}

export function resolveBlock(registry: BlockRegistry, type: string): BlockComponent | undefined {
	return registry[type];
}

/** Node types the registry can render, sorted for stable output. */
export function registeredTypes(registry: BlockRegistry): string[] {
	return Object.keys(registry).sort();
}
