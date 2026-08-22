/** Schema-shape helpers shared by the rules and the converter. */

import type { JSONSchema, JSONSchemaType, UIAnnotation } from './types';

/**
 * A union with `null` is how nullability is spelled in JSON Schema; the primary
 * type is the non-null member so `['string', 'null']` still lowers to an Input.
 */
export function primaryType(schema: JSONSchema): JSONSchemaType | undefined {
	const { type } = schema;
	if (Array.isArray(type)) return type.find((entry) => entry !== 'null');
	if (type) return type;
	// A schema may describe its type only through structural keywords.
	if (schema.properties) return 'object';
	if (schema.items) return 'array';
	if (schema.enum || schema.const !== undefined) return 'string';
	return undefined;
}

export function isNullable(schema: JSONSchema): boolean {
	return Array.isArray(schema.type) ? schema.type.includes('null') : false;
}

export function annotation(schema: JSONSchema): UIAnnotation {
	return schema['x-ui'] ?? {};
}

/**
 * Resolve local `$ref`s (`#/$defs/x`, `#/definitions/x`) against the root.
 * Remote refs are left alone: a resolver would need IO, and an unresolved ref
 * lowers to a JsonEditor rather than failing the whole document.
 */
export function createResolver(root: JSONSchema): (schema: JSONSchema) => JSONSchema {
	const seen = new Set<string>();

	function resolve(schema: JSONSchema): JSONSchema {
		const ref = schema.$ref;
		if (!ref || !ref.startsWith('#/')) return schema;
		if (seen.has(ref)) return schema;

		const target = pointer(root, ref);
		if (!target) return schema;

		seen.add(ref);
		try {
			// Sibling keywords win over the referenced schema, per JSON Schema 2019-09.
			const { $ref: _ref, ...rest } = schema;
			return resolve({ ...target, ...rest });
		} finally {
			seen.delete(ref);
		}
	}

	return resolve;
}

function pointer(root: JSONSchema, ref: string): JSONSchema | undefined {
	let current: unknown = root;
	for (const rawSegment of ref.slice(2).split('/')) {
		const segment = rawSegment.replace(/~1/g, '/').replace(/~0/g, '~');
		if (!current || typeof current !== 'object') return undefined;
		current = (current as Record<string, unknown>)[segment];
	}
	return current && typeof current === 'object' ? (current as JSONSchema) : undefined;
}

/**
 * Flatten `allOf` into its parent. Composition-by-intersection has no UI
 * meaning: the fields of every member belong to the same group.
 */
export function mergeAllOf(schema: JSONSchema, resolve: (schema: JSONSchema) => JSONSchema): JSONSchema {
	if (!schema.allOf?.length) return schema;

	const { allOf, ...base } = schema;
	let merged: JSONSchema = base;

	for (const member of allOf) {
		const resolved = mergeAllOf(resolve(member), resolve);
		merged = {
			...resolved,
			...merged,
			properties: { ...resolved.properties, ...merged.properties },
			required: [...(resolved.required ?? []), ...(merged.required ?? [])],
			'x-ui': { ...annotation(resolved), ...annotation(merged) },
		};
	}

	if (!merged.required?.length) delete merged.required;
	if (!merged.properties || Object.keys(merged.properties).length === 0) delete merged.properties;
	return merged;
}
