import type { UINode, UINodeProps } from 'blocks-schema';

const TEMPLATE = /\{\{\s*([^}\s]+)\s*\}\}/g;

/** Read a dotted path (`row.author.name`) out of a scope object. */
export function readPath(scope: Record<string, unknown>, path: string): unknown {
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
export function resolveBinding(expression: string, scope: Record<string, unknown>): unknown {
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
export function resolveNodeProps(node: UINode, scope: Record<string, unknown>): UINodeProps {
	if (!node.bindings) return node.props ?? {};

	const resolved: UINodeProps = { ...(node.props ?? {}) };
	for (const [prop, expression] of Object.entries(node.bindings)) {
		resolved[prop] = resolveBinding(expression, scope);
	}
	return resolved;
}
