import { validateValue } from 'json-renderer';

import type { UINodeConstraints } from './node';

/**
 * Validate a single field value against the constraints declared on its node.
 * Returns a human-readable message, or `null` when the value is acceptable.
 *
 * The check itself is `json-renderer`'s `validateValue`; this is the named,
 * vocabulary-typed entry point Constructive consumers already import.
 */
export function validateField(value: unknown, constraints?: UINodeConstraints, required?: boolean): string | null {
	return validateValue(value, constraints, required);
}
