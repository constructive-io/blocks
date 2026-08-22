/**
 * Types for lowering JSON Schema into `blocks-schema` UI documents.
 *
 * Only the keywords this package lowers are modelled; anything else is carried
 * along untouched so a schema is never rejected for being richer than the
 * lowering rules.
 */

import type { UINode, UINodeType } from 'blocks-schema';
import type { FieldDescriptor, FieldHints, PartialNode as CorePartialNode, WidgetRule as CoreWidgetRule } from 'json-renderer';

export type JSONSchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';

/**
 * UI hints authored inline on a schema, under the `x-ui` extension keyword —
 * the generic field hints, narrowed to the Constructive node vocabulary.
 */
export type UIAnnotation = FieldHints<UINodeType>;

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

/**
 * Everything a rule needs to decide on one schema position: the generic field
 * descriptor (`dataType`, `format`, `enumValues`, `constraints`, `hints`, …) plus
 * the JSON-Schema-specific facts. Rules written against the descriptor fields
 * work for any document source; rules that need the raw keywords read `schema`.
 */
export interface FieldContext extends FieldDescriptor<UINodeType> {
	/** The schema at this position, with `$ref`s already resolved. */
	schema: JSONSchema;
	/** Normalized primary `type`, or `undefined` when the schema omits it. */
	type?: JSONSchemaType;
	/** Merged `x-ui` annotation for this position; the same object as `hints`. */
	ui: UIAnnotation;
	/** Resolve a `$ref` against the root schema's definitions. */
	resolve: (schema: JSONSchema) => JSONSchema;
}

/**
 * A widget rule maps one schema position to a node type. Rules are tried in
 * order and the first match wins, so app-specific rules are prepended rather
 * than replacing the defaults.
 */
export type WidgetRule = CoreWidgetRule<FieldContext, UINodeType, UINode>;

/** A rule's contribution to the node built for a schema position. */
export type PartialNode = CorePartialNode<UINodeType, UINode>;

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
