/**
 * The lowering itself: JSON Schema in, `blocks-schema` document out.
 *
 * Structure keywords become container nodes (`Section`, `Tabs`), leaf schemas
 * become widget nodes chosen by the rule pipeline, and validation keywords
 * become node constraints. Nothing here renders — the output is plain JSON that
 * any `blocks-schema` adapter can draw.
 */

import { createDocument, type UIDocument, type UINode, type UINodeType } from 'blocks-schema';
import { toConstraints } from './constraints';
import { resolveRules } from './rules';
import { annotation, createResolver, isNullable, mergeAllOf, primaryType } from './schema';
import type { ConvertOptions, FieldContext, JSONSchema, PartialNode, WidgetRule } from './types';

interface Lowering {
	rules: WidgetRule[];
	resolve: (schema: JSONSchema) => JSONSchema;
	includeReadOnly: boolean;
}

/**
 * `first_name`/`shippingCity` → `First name`. Sentence case, not title case,
 * and all-caps words are left alone so acronyms survive (`apiURL` → `Api URL`).
 */
function titleize(name: string): string {
	if (!name) return '';
	const words = name
		.replace(/[_-]+/g, ' ')
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.trim()
		.split(/\s+/)
		.map((word) => (word === word.toUpperCase() ? word : word.toLowerCase()));

	return words.join(' ').replace(/^./, (character) => character.toUpperCase());
}

function context(
	schema: JSONSchema,
	name: string,
	path: string,
	required: boolean,
	lowering: Lowering
): FieldContext {
	return {
		schema,
		name,
		path,
		required,
		type: primaryType(schema),
		ui: annotation(schema),
		resolve: lowering.resolve,
	};
}

function applyRules(ctx: FieldContext, rules: WidgetRule[]): PartialNode {
	for (const rule of rules) {
		if (!rule.match(ctx)) continue;
		const result = typeof rule.node === 'function' ? rule.node(ctx) : rule.node;
		return typeof result === 'string' ? { type: result } : result;
	}
	return { type: 'Input' };
}

function widgetNode(ctx: FieldContext, lowering: Lowering): UINode {
	const { schema, ui } = ctx;
	const partial = applyRules(ctx, lowering.rules);
	const constraints = { ...toConstraints(schema), ...partial.constraints };
	const defaultValue = schema.default ?? schema.const;

	return {
		type: (partial.type ?? 'Input') as UINodeType,
		key: ctx.path || 'field',
		props: {
			name: ctx.path,
			label: ui.label ?? schema.title ?? titleize(ctx.name),
			...(ui.description ?? schema.description ? { description: ui.description ?? schema.description } : {}),
			...(ui.placeholder ? { placeholder: ui.placeholder } : {}),
			...(ctx.required ? { required: true } : {}),
			...(ui.hidden ? { hidden: true } : {}),
			...(ui.disabled || schema.readOnly ? { disabled: true } : {}),
			...(ui.className ? { className: ui.className } : {}),
			...(isNullable(schema) ? { nullable: true } : {}),
			...(defaultValue !== undefined ? { defaultValue: defaultValue as UINode['props']['defaultValue'] } : {}),
			...(constraints && Object.keys(constraints).length > 0 ? { constraints } : {}),
			...partial.props,
			...ui.props,
		},
		children: partial.children ?? [],
	};
}

function containerProps(ctx: FieldContext): UINode['props'] {
	const { schema, ui } = ctx;
	return {
		...(ctx.path ? { name: ctx.path } : {}),
		...(ui.label ?? schema.title ?? ctx.name ? { label: ui.label ?? schema.title ?? titleize(ctx.name) } : {}),
		...(ui.description ?? schema.description ? { description: ui.description ?? schema.description } : {}),
		...(ui.className ? { className: ui.className } : {}),
		...ui.props,
	};
}

/** Variant unions become tabs: one tab per branch, the branch's fields inside. */
function variantNode(ctx: FieldContext, variants: JSONSchema[], lowering: Lowering): UINode {
	return {
		type: 'Tabs',
		key: ctx.path || 'variants',
		props: containerProps(ctx),
		children: variants.map((rawVariant, index) => {
			const variant = mergeAllOf(lowering.resolve(rawVariant), lowering.resolve);
			const key = `${ctx.path || 'variants'}.variant${index}`;
			return {
				type: 'Tab',
				key,
				props: { label: annotation(variant).label ?? variant.title ?? `Option ${index + 1}` },
				children: childNodes(variant, ctx.path, lowering),
			};
		}),
	};
}

/** Arrays lower to a repeatable section holding the item's own nodes. */
function arrayNode(ctx: FieldContext, lowering: Lowering): UINode {
	const items = ctx.schema.items ? mergeAllOf(lowering.resolve(ctx.schema.items), lowering.resolve) : {};
	const itemCtx = context(items, ctx.name, ctx.path, false, lowering);
	const constraints = ctx.schema;

	return {
		type: 'Section',
		key: ctx.path || 'items',
		props: {
			...containerProps(ctx),
			repeatable: true,
			...(constraints.minItems != null ? { minItems: constraints.minItems } : {}),
			...(constraints.maxItems != null ? { maxItems: constraints.maxItems } : {}),
			...(ctx.required ? { required: true } : {}),
		},
		children:
			primaryType(items) === 'object' ? childNodes(items, ctx.path, lowering) : [widgetNode(itemCtx, lowering)],
	};
}

function nodeFor(ctx: FieldContext, lowering: Lowering): UINode {
	const schema = ctx.schema;
	const variants = schema.oneOf ?? schema.anyOf;

	if (variants?.length && !ctx.ui.widget) return variantNode(ctx, variants, lowering);
	if (ctx.type === 'object' && !ctx.ui.widget) {
		return {
			type: 'Section',
			key: ctx.path || 'group',
			props: containerProps(ctx),
			children: childNodes(schema, ctx.path, lowering),
		};
	}
	if (ctx.type === 'array' && !ctx.ui.widget) return arrayNode(ctx, lowering);

	return widgetNode(ctx, lowering);
}

/** Lower an object schema's `properties`, honouring `x-ui.order`. */
function childNodes(schema: JSONSchema, parentPath: string, lowering: Lowering): UINode[] {
	const properties = schema.properties ?? {};
	const required = new Set(schema.required ?? []);

	const entries = Object.entries(properties)
		.map(([name, rawChild], index) => {
			const child = mergeAllOf(lowering.resolve(rawChild), lowering.resolve);
			return { name, child, index, order: annotation(child).order };
		})
		.filter(({ child }) => lowering.includeReadOnly || !child.readOnly)
		.sort((left, right) => {
			if (left.order == null && right.order == null) return left.index - right.index;
			if (left.order == null) return 1;
			if (right.order == null) return -1;
			return left.order - right.order;
		});

	return entries.map(({ name, child }) => {
		const path = parentPath ? `${parentPath}.${name}` : name;
		return nodeFor(context(child, name, path, required.has(name), lowering), lowering);
	});
}

/** Lower a schema to a node tree without the document envelope. */
export function schemaToNodes(schema: JSONSchema, options: ConvertOptions = {}): UINode[] {
	const resolve = createResolver(schema);
	const lowering: Lowering = {
		rules: resolveRules(options.rules, options.replaceDefaultRules),
		resolve,
		includeReadOnly: options.includeReadOnly ?? true,
	};

	const root = mergeAllOf(resolve(schema), resolve);
	if (primaryType(root) === 'object' && !root.oneOf && !root.anyOf) {
		return childNodes(root, '', lowering);
	}
	// A non-object root is a single value, so it lowers to one node.
	return [nodeFor(context(root, root.title ?? 'value', 'value', true, lowering), lowering)];
}

/**
 * Lower a JSON Schema to a UI document: a `Page` wrapping a `Form` of the
 * schema's fields. The result is an ordinary document — it can be persisted,
 * hand-edited, and composed over with `composeDocument`.
 */
export function schemaToDocument(schema: JSONSchema, options: ConvertOptions = {}): UIDocument {
	const resolve = createResolver(schema);
	const root = mergeAllOf(resolve(schema), resolve);
	const fields = schemaToNodes(schema, options);
	const rootKey = options.rootKey ?? 'page';
	const title = annotation(root).label ?? root.title;

	const children: UINode[] =
		options.form === false
			? fields
			: [
					{
						type: 'Form',
						key: 'form',
						props: {
							...(options.submitLabel ? { submitLabel: options.submitLabel } : {}),
						},
						children: fields,
					},
				];

	return createDocument(
		{
			type: 'Page',
			key: rootKey,
			props: {
				...(title ? { title } : {}),
				...(root.description ? { description: root.description } : {}),
			},
			children,
		},
		{
			id: options.id ?? root.$id ?? 'document',
			...(title || root.description
				? { meta: { ...(title ? { title } : {}), ...(root.description ? { description: root.description } : {}) } }
				: {}),
		}
	);
}
