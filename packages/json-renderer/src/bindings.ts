/**
 * Binding and scope resolution. A binding is a template expression over a scope
 * object; resolution is pure string/object work, so it runs in a renderer, in an
 * SSR pass, or in a validator with no framework present.
 */
import type { AnyDocumentNode, NodeProps } from './node';

const TEMPLATE = /\{\{\s*([^}\s]+)\s*\}\}/g;

/** The data a document's expressions read from, e.g. `{ row, user, values }`. */
export interface BindingScope {
	[key: string]: unknown;
}

/** Read a dotted path (`row.author.name`) out of a scope object. */
export function readPath(scope: BindingScope, path: string): unknown {
	let current: unknown = scope;
	for (const segment of path.split('.')) {
		if (current == null || typeof current !== 'object') return undefined;
		current = (current as Record<string, unknown>)[segment];
	}
	return current;
}

/**
 * Resolve a binding expression. A template that is exactly one placeholder
 * yields the raw value (so a boolean or an object survives); a template mixed
 * with text is interpolated as a string.
 */
export function resolveBinding(expression: string, scope: BindingScope): unknown {
	const single = expression.match(/^\{\{\s*([^}\s]+)\s*\}\}$/);
	if (single) {
		return readPath(scope, single[1]);
	}

	return expression.replace(TEMPLATE, (_match, path: string) => {
		const value = readPath(scope, path);
		return value == null ? '' : String(value);
	});
}

/** Apply a node's `bindings` over its static props. */
export function resolveNodeProps<TProps extends NodeProps = NodeProps>(
	node: AnyDocumentNode,
	scope: BindingScope,
): TProps {
	if (!node.bindings) return (node.props ?? {}) as TProps;

	const resolved: NodeProps = { ...(node.props ?? {}) };
	for (const [prop, expression] of Object.entries(node.bindings)) {
		resolved[prop] = resolveBinding(expression, scope);
	}
	return resolved as TProps;
}

/**
 * Layer scopes left-to-right, later layers winning. Scope layering is how a
 * renderer adds row/item context inside a repeating node without rebuilding the
 * document's scope.
 */
export function composeScope(...layers: (BindingScope | undefined)[]): BindingScope {
	const composed: BindingScope = {};
	for (const layer of layers) {
		if (!layer) continue;
		Object.assign(composed, layer);
	}
	return composed;
}
