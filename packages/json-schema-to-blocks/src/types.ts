/**
 * Types for lowering JSON Schema into `blocks-schema` UI documents.
 *
 * Only the keywords this package lowers are modelled; anything else is carried
 * along untouched so a schema is never rejected for being richer than the
 * lowering rules.
 */

import type { UINode, UINodeConstraints, UINodeType } from 'blocks-schema';

export type JSONSchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';

/** UI hints authored inline on a schema, under the `x-ui` extension keyword. */
export interface UIAnnotation {
	/** Force a node type, bypassing widget rules. */
	widget?: UINodeType;
	label?: string;
	description?: string;
	placeholder?: string;
	hidden?: boolean;
	disabled?: boolean;
	className?: string;
	/** Sort weight within its group; lower comes first, unset keeps schema order. */
	order?: number;
	/** Extra props merged onto the produced node. */
	props?: Record<string, unknown>;
}

export interface JSONSchema {
	$id?: string;
	$ref?: string;
	$defs?: Record<string, JSONSchema>;
	definitions?: Record<string, JSONSchema>;
	type?: JSONSchemaType | JSONSchemaType[];
	title?: string;
	description?: string;
	format?: string;
	enum?: unknown[];
	const?: unknown;
	default?: unknown;
	examples?: unknown[];
	properties?: Record<string, JSONSchema>;
	required?: string[];
	items?: JSONSchema;
	oneOf?: JSONSchema[];
	anyOf?: JSONSchema[];
	allOf?: JSONSchema[];
	readOnly?: boolean;
	writeOnly?: boolean;
	minLength?: number;
	maxLength?: number;
	pattern?: string;
	minimum?: number;
	maximum?: number;
	exclusiveMinimum?: number;
	exclusiveMaximum?: number;
	multipleOf?: number;
	minItems?: number;
	maxItems?: number;
	'x-ui'?: UIAnnotation;
	[keyword: string]: unknown;
}

/** Everything a rule needs to decide on one schema position. */
export interface FieldContext {
	/** The schema at this position, with `$ref`s already resolved. */
	schema: JSONSchema;
	/** Property name, or `''` for the root schema. */
	name: string;
	/** Dot path from the root, e.g. `billing.address.city`. */
	path: string;
	/** Declared as required by the parent's `required` list. */
	required: boolean;
	/** Normalized primary `type`, or `undefined` when the schema omits it. */
	type?: JSONSchemaType;
	/** Merged `x-ui` annotation for this position. */
	ui: UIAnnotation;
	/** Resolve a `$ref` against the root schema's definitions. */
	resolve: (schema: JSONSchema) => JSONSchema;
}

/**
 * A widget rule maps one schema position to a node type. Rules are tried in
 * order and the first match wins, so app-specific rules are prepended rather
 * than replacing the defaults.
 */
export interface WidgetRule {
	/** Identifies the rule so a consumer can replace exactly one default. */
	name: string;
	match: (ctx: FieldContext) => boolean;
	/** Node type to render, or a partial node merged over the derived one. */
	node: UINodeType | ((ctx: FieldContext) => UINodeType | PartialNode);
}

/** A rule's contribution to the node built for a schema position. */
export interface PartialNode {
	type?: UINodeType;
	props?: Record<string, unknown>;
	constraints?: UINodeConstraints;
	children?: UINode[];
}

export interface ConvertOptions {
	/** Document id; defaults to the schema `$id` or `'document'`. */
	id?: string;
	/** Widget rules tried before the defaults. */
	rules?: WidgetRule[];
	/** Replace the default rule set entirely instead of prepending to it. */
	replaceDefaultRules?: boolean;
	/** Wrap the fields in a `Form` node (default `true`). */
	form?: boolean;
	/** Value for the form's `submit` label prop. */
	submitLabel?: string;
	/** Root node key (default `'page'`). */
	rootKey?: string;
	/** Include `readOnly` schema properties as disabled fields (default `true`). */
	includeReadOnly?: boolean;
}
