/**
 * Node-level types for the Constructive JSON UI document format.
 *
 * The tree model, the walk, and the field-collection primitives live in
 * `json-renderer`; this module owns the Constructive *vocabulary* — which node
 * types exist and which of them are fields — and specializes the generic
 * helpers over it. A node's `type` is resolved to a component by the renderer's
 * widget registry, so this package never imports React and stays usable on a
 * server, in an agent, or in a validator.
 */
import {
	collectDefaultValues as collectNodeDefaultValues,
	collectFieldConstraints as collectNodeFieldConstraints,
	collectFieldNames as collectNodeFieldNames,
	findNodeByKey as findNodeInTreeByKey,
	walkNodes as walkNodeTree,
} from 'json-renderer';
import type {
	DocumentNode,
	FieldConstraintEntry,
	NodeActions,
	NodeBindings,
	NodeConstraints,
	NodeProps,
} from 'json-renderer';

export type { FieldConstraintEntry } from 'json-renderer';

/** Field widget node types (a form's leaves). */
export const WIDGET_NODE_TYPES = [
	'Input',
	'Textarea',
	'Select',
	'RadioGroup',
	'Checkbox',
	'Switch',
	'NumberInput',
	'DatePicker',
	'DateTimePicker',
	'TimePicker',
	'PhoneInput',
	'CodeEditor',
	'MarkdownEditor',
	'JsonEditor',
	'FileUpload',
] as const;

/** Layout node types that own children. */
export const CONTAINER_NODE_TYPES = ['Page', 'Form', 'Grid', 'GridColumn', 'Section', 'Tabs', 'Tab'] as const;

/** Document-level blocks (screens, not fields). */
export const BLOCK_NODE_TYPES = [
	'DataTable',
	'DetailPanel',
	'RelationList',
	'StatCard',
	'Chart',
	'ActionBar',
	'Markdown',
	'AgentChat',
	'Button',
	'Slot',
	'Fragment',
	'Custom',
] as const;

export type WidgetNodeType = (typeof WIDGET_NODE_TYPES)[number];
export type ContainerNodeType = (typeof CONTAINER_NODE_TYPES)[number];
export type BlockNodeType = (typeof BLOCK_NODE_TYPES)[number];

/**
 * Known node types. Unknown strings stay valid: a registry may satisfy node
 * types this package has never heard of, and the renderer falls back to an
 * `UnknownBlock` rather than throwing.
 */
export type KnownNodeType = WidgetNodeType | ContainerNodeType | BlockNodeType;
export type UINodeType = KnownNodeType | (string & {});

export type InputType = 'text' | 'email' | 'url' | 'password' | 'tel' | 'search';

export interface UINodeConstraints extends NodeConstraints {
	minLength?: number;
	maxLength?: number;
	minValue?: number;
	maxValue?: number;
	pattern?: string;
	precision?: number;
	scale?: number;
}

export interface UINodePropsBase {
	fieldId?: string;
	name?: string;
	label?: string;
	description?: string;
	placeholder?: string;
	required?: boolean;
	hidden?: boolean;
	disabled?: boolean;
	defaultValue?: string | number | boolean | null;
	constraints?: UINodeConstraints;
	className?: string;
}

export type UINodeProps = UINodePropsBase & Record<string, unknown>;

/** Prop name → template expression, e.g. `{ label: '{{ row.title }}' }`. */
export interface UIBinding extends NodeBindings {
	[propName: string]: string;
}

export interface UIAction {
	type: 'flow' | 'handler';
	flowId?: string;
	handler?: string;
	inputMapping?: Record<string, string>;
	params?: Record<string, unknown>;
}

/** Event name → action, e.g. `{ submit: { type: 'flow', flowId } }`. */
export interface UIActions {
	[eventName: string]: UIAction;
}

/** The generic node tree pinned to the Constructive vocabulary and props. */
export interface UINode extends DocumentNode<UINodeType, UINodeProps> {
	children: UINode[];
	bindings?: UIBinding;
	actions?: UIActions;
}

const widgetTypes = new Set<string>(WIDGET_NODE_TYPES);
const containerTypes = new Set<string>(CONTAINER_NODE_TYPES);
const blockTypes = new Set<string>(BLOCK_NODE_TYPES);

export function isWidgetNodeType(type: string): type is WidgetNodeType {
	return widgetTypes.has(type);
}

export function isContainerNodeType(type: string): type is ContainerNodeType {
	return containerTypes.has(type);
}

export function isKnownNodeType(type: string): type is KnownNodeType {
	return widgetTypes.has(type) || containerTypes.has(type) || blockTypes.has(type);
}

export function isWidgetNode(node: UINode): boolean {
	return isWidgetNodeType(node.type);
}

export function isContainerNode(node: UINode): boolean {
	return isContainerNodeType(node.type);
}

/** Depth-first walk over a node and its descendants. */
export function walkNodes(node: UINode): Generator<UINode> {
	return walkNodeTree(node);
}

/** Named fields in document order; widget nodes without a `name` are skipped. */
export function collectFieldNames(node: UINode): string[] {
	return collectNodeFieldNames(node, isWidgetNode);
}

/** Default values declared by widget nodes, keyed by field name. */
export function collectDefaultValues(node: UINode): Record<string, unknown> {
	return collectNodeDefaultValues(node, isWidgetNode);
}

/** Validation metadata declared by widget nodes, keyed by field name. */
export function collectFieldConstraints(node: UINode): Record<string, FieldConstraintEntry> {
	return collectNodeFieldConstraints(node, isWidgetNode);
}

export function findNodeByKey(node: UINode, key: string): UINode | undefined {
	return findNodeInTreeByKey(node, key);
}

/** Re-exported so `UINodeProps` consumers can name the generic props shape. */
export type { NodeActions, NodeBindings, NodeProps };
