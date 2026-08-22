/**
 * The field lowering layer: a source-neutral description of one field, and the
 * ordered rule pipeline that turns it into a node.
 *
 * Every document source (JSON Schema, database metadata, a flow) knows how to
 * describe a field but should not own the widget decisions — "`format: uri`
 * renders as a file picker", "enums over twenty values render as a combobox".
 * Those decisions are data: an ordered list of rules, first match wins, defaults
 * last. Rules written against `FieldDescriptor` are shared across sources, and a
 * source may extend the descriptor with its own facts (the raw schema, the
 * column) for rules that need them.
 */

import type { NodeConstraints } from './constraints';
import type { DocumentNode, NodeProps } from './node';

/** Author-supplied hints that override what a rule would otherwise decide. */
export interface FieldHints<TType extends string = string> {
	/** Force a node type, bypassing the rules. */
	widget?: TType;
	label?: string;
	description?: string;
	placeholder?: string;
	hidden?: boolean;
	disabled?: boolean;
	className?: string;
	/** Sort weight within its group; lower comes first, unset keeps source order. */
	order?: number;
	/** Extra props merged onto the produced node. */
	props?: NodeProps;
}

/**
 * One field, described independently of where it came from. `dataType` and
 * `format` are deliberately open strings: a JSON Schema contributes
 * `'string'`/`'uri'`, a database column `'text'`/`'json'`, and a rule matches on
 * whichever it cares about.
 */
export interface FieldDescriptor<TType extends string = string> {
	/** Field name within its parent, e.g. `city`. */
	name: string;
	/** Path from the document root, e.g. `billing.address.city`. */
	path: string;
	required: boolean;
	dataType?: string;
	format?: string;
	label?: string;
	description?: string;
	enumValues?: readonly unknown[];
	nullable?: boolean;
	readOnly?: boolean;
	defaultValue?: unknown;
	constraints?: NodeConstraints;
	hints: FieldHints<TType>;
}

/** A rule's contribution to the node built for a field. */
export interface PartialNode<TType extends string = string, TNode extends DocumentNode<TType> = DocumentNode<TType>> {
	type?: TType;
	props?: NodeProps;
	constraints?: NodeConstraints;
	children?: TNode[];
}

/**
 * A widget rule maps one field to a node type. Rules are tried in order and the
 * first match wins, so app-specific rules are prepended rather than replacing
 * the defaults.
 */
export interface WidgetRule<
	TContext extends FieldDescriptor = FieldDescriptor,
	TType extends string = string,
	TNode extends DocumentNode<TType> = DocumentNode<TType>,
> {
	/** Identifies the rule so a consumer can replace exactly one default. */
	name: string;
	match: (context: TContext) => boolean;
	/** Node type to render, or a partial node merged over the derived one. */
	node: TType | ((context: TContext) => TType | PartialNode<TType, TNode>);
}

/**
 * Order a rule set: caller rules first (so they win), defaults last, unless the
 * caller replaces the defaults outright.
 */
export function composeWidgetRules<TRule extends { name: string }>(
	defaults: readonly TRule[],
	rules?: readonly TRule[],
	replaceDefaults?: boolean,
): TRule[] {
	if (replaceDefaults) return [...(rules ?? [])];
	return rules?.length ? [...rules, ...defaults] : [...defaults];
}

/** Run the pipeline: the first matching rule's contribution, else the fallback type. */
export function applyWidgetRules<TContext extends FieldDescriptor, TType extends string, TNode extends DocumentNode<TType>>(
	context: TContext,
	rules: readonly WidgetRule<TContext, TType, TNode>[],
	fallbackType: TType,
): PartialNode<TType, TNode> {
	for (const rule of rules) {
		if (!rule.match(context)) continue;
		const result = typeof rule.node === 'function' ? rule.node(context) : rule.node;
		return typeof result === 'string' ? { type: result } : result;
	}
	return { type: fallbackType };
}

/**
 * The props every lowered field node carries, before a rule's own props are
 * merged on top. Sources share this so a generated field looks the same whether
 * it came from a schema or a column.
 */
export function fieldNodeProps(descriptor: FieldDescriptor): NodeProps {
	const { hints } = descriptor;
	const label = hints.label ?? descriptor.label;
	const description = hints.description ?? descriptor.description;

	return {
		name: descriptor.path,
		...(label !== undefined ? { label } : {}),
		...(description !== undefined ? { description } : {}),
		...(hints.placeholder ? { placeholder: hints.placeholder } : {}),
		...(descriptor.required ? { required: true } : {}),
		...(hints.hidden ? { hidden: true } : {}),
		...(hints.disabled || descriptor.readOnly ? { disabled: true } : {}),
		...(hints.className ? { className: hints.className } : {}),
		...(descriptor.nullable ? { nullable: true } : {}),
		...(descriptor.defaultValue !== undefined ? { defaultValue: descriptor.defaultValue } : {}),
	};
}

/** Sort key honouring `hints.order`; fields without one keep source order. */
export function compareFieldOrder(
	left: { order?: number; index: number },
	right: { order?: number; index: number },
): number {
	if (left.order == null && right.order == null) return left.index - right.index;
	if (left.order == null) return 1;
	if (right.order == null) return -1;
	return left.order - right.order;
}
