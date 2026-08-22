import type { NodeDefinitionWithImpl, PropDefinitionWithOptions } from '@fbp/evaluator';
import type { Port } from '@fbp/types';
import {
	BLOCK_NODE_TYPES,
	CONTAINER_NODE_TYPES,
	createDocument,
	type UIDocumentMetadata,
	type UINode,
	type UINodeType,
	WIDGET_NODE_TYPES,
} from 'blocks-schema';
import { type JSONSchema, schemaToNodes } from 'json-schema-to-blocks';

import { buildElement, isElement } from './element';
import { FLOW_CATEGORY, FLOW_CONTEXT } from './types';

/** Props every element node carries: its identity in the document, plus presentation. */
const envelopeProps: PropDefinitionWithOptions[] = [
	{ name: 'key', type: 'string', required: true, description: 'Node key — unique within the document' },
	{ name: 'className', type: 'string' },
	{ name: 'props', type: 'json', description: 'Extra props merged onto the node' },
	{ name: 'bindings', type: 'json', description: 'Prop name → template expression, resolved at render' },
	{ name: 'actions', type: 'json', description: 'Event name → action' },
];

/** Props a field node carries. Mirrors `UINodePropsBase` in blocks-schema. */
const widgetProps: PropDefinitionWithOptions[] = [
	{ name: 'name', type: 'string', description: 'Field name in the form value' },
	{ name: 'label', type: 'string' },
	{ name: 'description', type: 'string' },
	{ name: 'placeholder', type: 'string' },
	{ name: 'required', type: 'boolean' },
	{ name: 'hidden', type: 'boolean' },
	{ name: 'disabled', type: 'boolean' },
	{ name: 'defaultValue', type: 'any' },
	{ name: 'constraints', type: 'json', description: 'min/max/pattern metadata' },
];

/**
 * Inputs every element node accepts, so any prop can be computed upstream
 * instead of authored: an evaluated `props` object is merged over the static
 * props, and bindings/actions can likewise arrive from a computation.
 */
const overrideInputs: Port[] = [
	{ name: 'props', type: 'object', optional: true },
	{ name: 'bindings', type: 'object', optional: true },
	{ name: 'actions', type: 'object', optional: true },
];

const childrenInput: Port = { name: 'children', type: 'Element[]', optional: true, multi: true };
const elementOutput: Port[] = [{ name: 'node', type: 'Element' }];

/**
 * Block node types that own children. The rest are leaves: a `StatCard` or a
 * `Chart` is configured, not filled.
 */
const CHILD_BEARING_BLOCKS = new Set(['ActionBar', 'DetailPanel', 'Slot', 'Fragment', 'Custom']);

function elementDefinition(
	type: UINodeType,
	options: { icon: string; children: boolean; props?: PropDefinitionWithOptions[] }
): NodeDefinitionWithImpl {
	return {
		context: FLOW_CONTEXT,
		category: FLOW_CATEGORY,
		name: type,
		icon: options.icon,
		description: `${type} document node`,
		inputs: options.children ? [childrenInput, ...overrideInputs] : overrideInputs,
		outputs: elementOutput,
		props: [...envelopeProps, ...(options.props ?? [])],
		impl: (inputs, props) => ({ node: buildElement({ type, inputs, props }) }),
	};
}

/**
 * Container definitions (`ui:Page`, `ui:Form`, …), generated from the node type
 * lists blocks-schema exports so the palette cannot drift from the document
 * format: a node type added there is authorable here without an edit.
 */
export const containerDefinitions: NodeDefinitionWithImpl[] = CONTAINER_NODE_TYPES.map((type) =>
	elementDefinition(type, { icon: 'layout', children: true })
);

/** Field definitions (`ui:Input`, `ui:Select`, …). */
export const widgetDefinitions: NodeDefinitionWithImpl[] = WIDGET_NODE_TYPES.map((type) =>
	elementDefinition(type, { icon: 'text-cursor', children: false, props: widgetProps })
);

/** Screen-level block definitions (`ui:DataTable`, `ui:Markdown`, …). */
export const blockDefinitions: NodeDefinitionWithImpl[] = BLOCK_NODE_TYPES.map((type) =>
	elementDefinition(type, { icon: 'square', children: CHILD_BEARING_BLOCKS.has(type) })
);

/**
 * `ui:Node` — an element of any type, including one this package has never
 * heard of. A registry may satisfy node types blocks-schema does not enumerate,
 * and a flow must be able to produce them.
 */
export const genericNodeDef: NodeDefinitionWithImpl = {
	context: FLOW_CONTEXT,
	category: FLOW_CATEGORY,
	name: 'Node',
	icon: 'box',
	description: 'Document node of an arbitrary type',
	inputs: [childrenInput, ...overrideInputs],
	outputs: elementOutput,
	props: [{ name: 'type', type: 'string', required: true, description: 'Node type to emit' }, ...envelopeProps],
	impl: (inputs, props) => {
		const type = props.type;
		if (typeof type !== 'string' || type === '') {
			throw new Error('ui:Node requires a non-empty "type" prop');
		}
		return { node: buildElement({ type, inputs, props }) };
	},
};

/**
 * `ui:Document` — wrap a page node in the document envelope. Optional: a flow
 * whose output is a bare node is wrapped by {@link flowToDocument} instead;
 * this node exists for a flow that wants to name the document or attach
 * metadata itself.
 */
export const documentDef: NodeDefinitionWithImpl = {
	context: FLOW_CONTEXT,
	category: FLOW_CATEGORY,
	name: 'Document',
	icon: 'file',
	description: 'UI document envelope',
	inputs: [{ name: 'page', type: 'Element' }, { name: 'meta', type: 'object', optional: true }],
	outputs: [{ name: 'document', type: 'Document' }],
	props: [
		{ name: 'id', type: 'string', default: 'document' },
		{ name: 'title', type: 'string' },
		{ name: 'description', type: 'string' },
	],
	impl: (inputs, props) => {
		if (!isElement(inputs.page)) {
			throw new Error('ui:Document requires an element on "page"');
		}
		const meta: UIDocumentMetadata = {
			...(typeof props.title === 'string' ? { title: props.title } : {}),
			...(typeof props.description === 'string' ? { description: props.description } : {}),
			...((inputs.meta as UIDocumentMetadata | undefined) ?? {}),
		};
		return {
			document: createDocument(inputs.page as UINode, {
				id: typeof props.id === 'string' ? props.id : 'document',
				...(Object.keys(meta).length > 0 ? { meta } : {}),
			}),
		};
	},
};

/**
 * `ui:FromJsonSchema` — lower a JSON Schema arriving on a wire into field
 * nodes, so a flow that computes a schema (a task's input contract, a tool's
 * arguments) does not hand-build the fields. Emits a list, which a container's
 * `children` input flattens.
 */
export const fromJsonSchemaDef: NodeDefinitionWithImpl = {
	context: FLOW_CONTEXT,
	category: FLOW_CATEGORY,
	name: 'FromJsonSchema',
	icon: 'braces',
	description: 'Lower a JSON Schema into field nodes',
	inputs: [
		{ name: 'schema', type: 'object' },
		{ name: 'options', type: 'object', optional: true },
	],
	outputs: [{ name: 'nodes', type: 'Element[]' }],
	props: [{ name: 'includeReadOnly', type: 'boolean', default: true }],
	impl: (inputs, props) => {
		const schema = inputs.schema;
		if (typeof schema !== 'object' || schema === null) {
			throw new Error('ui:FromJsonSchema requires a schema object on "schema"');
		}
		return {
			nodes: schemaToNodes(schema as JSONSchema, {
				includeReadOnly: props.includeReadOnly !== false,
				...((inputs.options as Record<string, unknown> | undefined) ?? {}),
			}),
		};
	},
};

/**
 * Every element node this package contributes. Pass to `evaluate` alongside the
 * data nodes a graph uses (`coreDefinitions`, `mathDefinitions`, a host's own).
 */
export const uiNodeDefinitions: NodeDefinitionWithImpl[] = [
	...containerDefinitions,
	...widgetDefinitions,
	...blockDefinitions,
	genericNodeDef,
	documentDef,
	fromJsonSchemaDef,
];
