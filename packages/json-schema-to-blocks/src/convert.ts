/**
 * The lowering itself: JSON Schema in, `blocks-schema` document out.
 *
 * Structure keywords become container nodes (`Section`, `Tabs`), leaf schemas
 * become widget nodes chosen by the rule pipeline, and validation keywords
 * become node constraints. Nothing here renders — the output is plain JSON that
 * any `blocks-schema` adapter can draw.
 */

import { createDocument, type UIDocument, type UINode, type UINodeType } from 'blocks-schema';
import { applyWidgetRules, compareFieldOrder, fieldNodeProps } from 'json-renderer';
import { toConstraints } from './constraints';
import { resolveRules } from './rules';
import { annotation, createResolver, isNullable, mergeAllOf, primaryType } from './schema';
import type { ConvertOptions, FieldContext, JSONSchema, WidgetRule } from './types';

interface Lowering {
	rules: WidgetRule[];
	resolve: (schema: JSONSchema) => JSONSchema;
	includeReadOnly: boolean;
	/** Local `$ref`s currently being lowered on this path, to break recursion. */
	visiting: Set<string>;
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
	const ui = annotation(schema);
	// The document format only carries scalar defaults, so an object or array
	// default is dropped rather than emitted as an invalid document.
	const raw = schema.default ?? schema.const;
	const constraints = toConstraints(schema);

	return {
		name,
		path,
		required,
		dataType: primaryType(schema),
		...(typeof schema.format === 'string' ? { format: schema.format } : {}),
		label: schema.title ?? titleize(name),
		...(schema.description !== undefined ? { description: schema.description } : {}),
		...(schema.enum ? { enumValues: schema.enum } : {}),
		nullable: isNullable(schema),
		readOnly: schema.readOnly ?? false,
		...(isScalar(raw) ? { defaultValue: raw } : {}),
		...(constraints ? { constraints } : {}),
		hints: ui,
		schema,
		type: primaryType(schema),
		ui,
		resolve: lowering.resolve,
	};
}

function widgetNode(ctx: FieldContext, lowering: Lowering): UINode {
	const { ui } = ctx;
	const partial = applyWidgetRules<FieldContext, UINodeType, UINode>(ctx, lowering.rules, 'Input');
	const constraints = { ...ctx.constraints, ...partial.constraints };

	return {
		type: (partial.type ?? 'Input') as UINodeType,
		key: ctx.path || 'field',
		props: {
			...fieldNodeProps(ctx),
			...(Object.keys(constraints).length > 0 ? { constraints } : {}),
			...partial.props,
			...ui.props,
		},
		children: partial.children ?? [],
	};
}

function isScalar(value: unknown): value is string | number | boolean | null {
	return value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function localRef(schema: JSONSchema | undefined): string | undefined {
	const ref = schema?.$ref;
	return typeof ref === 'string' && ref.startsWith('#/') ? ref : undefined;
}

/** An object schema only lowers to a group when it has fields to put in it. */
function hasFields(schema: JSONSchema): boolean {
	return Object.keys(schema.properties ?? {}).length > 0;
}

/**
 * A `$defs` entry that references itself (a tree node, a linked list) would
 * lower forever, so re-entering the same ref on one path stops at a terminal
 * JsonEditor instead.
 */
function guarded<T>(ref: string | undefined, lowering: Lowering, onCycle: () => T, lower: () => T): T {
	if (!ref) return lower();
	if (lowering.visiting.has(ref)) return onCycle();

	lowering.visiting.add(ref);
	try {
		return lower();
	} finally {
		lowering.visiting.delete(ref);
	}
}

function cycleNode(ctx: FieldContext): UINode {
	return {
		type: 'JsonEditor',
		key: ctx.path || 'field',
		props: {
			name: ctx.path,
			label: ctx.ui.label ?? ctx.label,
			...(ctx.required ? { required: true } : {}),
		},
		children: [],
	};
}

function containerProps(ctx: FieldContext): UINode['props'] {
	const { schema, ui } = ctx;
	return {
		...(ctx.path ? { name: ctx.path } : {}),
		...(ui.label ?? ctx.label ? { label: ui.label ?? ctx.label } : {}),
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
			const variantCtx = context(variant, ctx.name, ctx.path, ctx.required, lowering);
			return {
				type: 'Tab',
				key: `${ctx.path || 'variants'}.variant${index}`,
				props: { label: annotation(variant).label ?? variant.title ?? `Option ${index + 1}` },
				children: guarded(
					localRef(rawVariant),
					lowering,
					() => [cycleNode(variantCtx)],
					// A primitive branch has no properties, so it becomes the tab's
					// single widget rather than an empty tab.
					() => (hasFields(variant) ? childNodes(variant, ctx.path, lowering) : [nodeFor(variantCtx, lowering)])
				),
			};
		}),
	};
}

/** Arrays lower to a repeatable section holding the item's own nodes. */
function arrayNode(ctx: FieldContext, lowering: Lowering): UINode {
	const rawItems = ctx.schema.items;
	const items = rawItems ? mergeAllOf(lowering.resolve(rawItems), lowering.resolve) : {};
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
		children: guarded(
			localRef(rawItems),
			lowering,
			() => [cycleNode(itemCtx)],
			() => (hasFields(items) ? childNodes(items, ctx.path, lowering) : [widgetNode(itemCtx, lowering)])
		),
	};
}

function nodeFor(ctx: FieldContext, lowering: Lowering): UINode {
	const schema = ctx.schema;
	const variants = schema.oneOf ?? schema.anyOf;

	if (variants?.length && !ctx.ui.widget) return variantNode(ctx, variants, lowering);
	if (ctx.type === 'object' && hasFields(schema) && !ctx.ui.widget) {
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
			return { name, child, ref: localRef(rawChild), index, order: annotation(child).order };
		})
		.filter(({ child }) => lowering.includeReadOnly || !child.readOnly)
		.sort(compareFieldOrder);

	return entries.map(({ name, child, ref }) => {
		const path = parentPath ? `${parentPath}.${name}` : name;
		const ctx = context(child, name, path, required.has(name), lowering);
		return guarded(
			ref,
			lowering,
			() => cycleNode(ctx),
			() => nodeFor(ctx, lowering)
		);
	});
}

/** Lower a schema to a node tree without the document envelope. */
export function schemaToNodes(schema: JSONSchema, options: ConvertOptions = {}): UINode[] {
	const resolve = createResolver(schema);
	const lowering: Lowering = {
		rules: resolveRules(options.rules, options.replaceDefaultRules),
		resolve,
		includeReadOnly: options.includeReadOnly ?? true,
		visiting: new Set(),
	};

	const root = mergeAllOf(resolve(schema), resolve);
	if (primaryType(root) === 'object' && hasFields(root) && !root.oneOf && !root.anyOf) {
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
