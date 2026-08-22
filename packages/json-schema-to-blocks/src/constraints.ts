/** JSON Schema validation keywords → `UINodeConstraints`. */

import type { UINodeConstraints } from 'blocks-schema';
import type { JSONSchema } from './types';

/**
 * Exclusive bounds are tightened to the nearest representable inclusive bound
 * for integers (a fractional bound floors/ceils first, so `exclusiveMinimum:
 * 0.5` still admits `1`), and passed through for numbers — the document format
 * only carries inclusive `minValue`/`maxValue`.
 */
export function toConstraints(schema: JSONSchema): UINodeConstraints | undefined {
	const constraints: UINodeConstraints = {};

	if (schema.minLength != null) constraints.minLength = schema.minLength;
	if (schema.maxLength != null) constraints.maxLength = schema.maxLength;
	if (schema.pattern) constraints.pattern = schema.pattern;

	const isInteger = schema.type === 'integer' || (Array.isArray(schema.type) && schema.type.includes('integer'));

	if (schema.minimum != null) constraints.minValue = schema.minimum;
	else if (schema.exclusiveMinimum != null) {
		constraints.minValue = isInteger ? Math.floor(schema.exclusiveMinimum) + 1 : schema.exclusiveMinimum;
	}

	if (schema.maximum != null) constraints.maxValue = schema.maximum;
	else if (schema.exclusiveMaximum != null) {
		constraints.maxValue = isInteger ? Math.ceil(schema.exclusiveMaximum) - 1 : schema.exclusiveMaximum;
	}

	return Object.keys(constraints).length > 0 ? constraints : undefined;
}
