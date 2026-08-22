/**
 * Registry layering for the React adapter: `json-renderer`'s generic registry
 * ops, typed over React block components.
 */
import {
	composeRegistry as composeNodeRegistry,
	missingTypes as missingRegistryTypes,
	registeredTypes as registeredNodeTypes,
	resolveHandler,
} from 'json-renderer';

import type { BlockComponent, BlockRegistry } from './types';

/**
 * Layer registries left-to-right, later layers winning. This is how a host
 * customizes rendering: base primitives, then an app registry, then per-document
 * overrides — no forking of the renderer, and no single global map.
 */
export function composeRegistry(...layers: (BlockRegistry | undefined)[]): BlockRegistry {
	return composeNodeRegistry<BlockComponent>(...layers);
}

export function resolveBlock(registry: BlockRegistry, type: string): BlockComponent | undefined {
	return resolveHandler(registry, type);
}

/** Node types the registry can render, sorted for stable output. */
export function registeredTypes(registry: BlockRegistry): string[] {
	return registeredNodeTypes(registry);
}

/** Node types a document uses that no registry layer satisfies. */
export function missingTypes(registry: BlockRegistry, usedTypes: Iterable<string>): string[] {
	return missingRegistryTypes(registry, usedTypes);
}
