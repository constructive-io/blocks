import type { UIActions, UIBinding, UINode, UINodeProps, UINodeType } from 'blocks-schema';

/**
 * Props whose meaning belongs to the envelope rather than to the component, so
 * they are lifted out of `props` when a node is built.
 */
const RESERVED_PROPS = new Set(['key', 'type', 'bindings', 'actions', 'props']);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * A graph carries values as JSON, and an editor's prop field hands over a
 * string, so an object-valued prop is accepted in either form. An unparseable
 * string is a graph authoring error and says so, rather than silently becoming
 * an empty object.
 */
function asRecord(value: unknown, label: string, nodeType: string): Record<string, unknown> | undefined {
	if (value === undefined || value === null || value === '') return undefined;
	if (isRecord(value)) return value;
	if (typeof value === 'string') {
		let parsed: unknown;
		try {
			parsed = JSON.parse(value);
		} catch {
			throw new Error(`ui:${nodeType} "${label}" is not valid JSON: ${value}`);
		}
		if (!isRecord(parsed)) {
			throw new Error(`ui:${nodeType} "${label}" must be a JSON object, received ${JSON.stringify(parsed)}`);
		}
		return parsed;
	}
	throw new Error(`ui:${nodeType} "${label}" must be an object, received ${typeof value}`);
}

/** Flatten a container's `children` input: a multi input yields one slot per edge, and a slot may itself carry a list (`ui:FromJsonSchema` emits one). */
function flattenChildren(value: unknown, nodeType: string): UINode[] {
	if (value === undefined || value === null) return [];
	const slots = Array.isArray(value) ? value : [value];
	const children: UINode[] = [];
	for (const slot of slots) {
		if (slot === undefined || slot === null) continue;
		if (Array.isArray(slot)) {
			children.push(...flattenChildren(slot, nodeType));
			continue;
		}
		if (!isElement(slot)) {
			throw new Error(
				`ui:${nodeType} received a child that is not an element: ${JSON.stringify(slot)}. Connect an element-producing node to "children".`
			);
		}
		children.push(slot);
	}
	return children;
}

export function isElement(value: unknown): value is UINode {
	return isRecord(value) && typeof value.type === 'string' && typeof value.key === 'string';
}

export interface BuildElementArgs {
	type: UINodeType;
	inputs: Record<string, unknown>;
	props: Record<string, unknown>;
}

/**
 * Build one document node from an evaluated graph node.
 *
 * Static props are authored on the graph node; the `props` input lets an
 * upstream computation supply or override them at evaluation time, which is
 * what makes a flow-produced document dynamic without putting expressions in
 * the document itself.
 */
export function buildElement({ type, inputs, props }: BuildElementArgs): UINode {
	const key = props.key;
	if (typeof key !== 'string' || key === '') {
		throw new Error(`ui:${type} requires a non-empty "key" prop`);
	}

	const staticProps: UINodeProps = {};
	for (const [name, value] of Object.entries(props)) {
		if (RESERVED_PROPS.has(name) || value === undefined) continue;
		staticProps[name] = value;
	}

	const authoredProps = asRecord(props.props, 'props', type);
	const computedProps = asRecord(inputs.props, 'props', type);
	const bindings = asRecord(inputs.bindings ?? props.bindings, 'bindings', type);
	const actions = asRecord(inputs.actions ?? props.actions, 'actions', type);

	return {
		type,
		key,
		props: { ...staticProps, ...authoredProps, ...computedProps },
		children: flattenChildren(inputs.children, type),
		...(bindings ? { bindings: bindings as UIBinding } : {}),
		...(actions ? { actions: actions as UIActions } : {}),
	};
}
