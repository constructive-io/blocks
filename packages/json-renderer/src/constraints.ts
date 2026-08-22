/**
 * Value constraints a node can declare, and the pure check over them. Documents
 * are authored elsewhere (a JSON Schema, a database constraint, an agent), so
 * this layer never throws on malformed input.
 */

export interface NodeConstraints {
	minLength?: number;
	maxLength?: number;
	minValue?: number;
	maxValue?: number;
	pattern?: string;
	precision?: number;
	scale?: number;
}

/**
 * Validate a single value against the constraints declared on its node.
 * Returns a human-readable message, or `null` when the value is acceptable.
 */
export function validateValue(value: unknown, constraints?: NodeConstraints, required?: boolean): string | null {
	const stringValue = value == null ? '' : String(value);
	const isEmpty = stringValue.trim() === '';

	if (required && isEmpty) {
		return 'This field is required';
	}

	if (isEmpty) return null;

	if (constraints?.minLength != null && stringValue.length < constraints.minLength) {
		return `Minimum ${constraints.minLength} characters required`;
	}

	if (constraints?.maxLength != null && stringValue.length > constraints.maxLength) {
		return `Maximum ${constraints.maxLength} characters allowed`;
	}

	if (constraints?.minValue != null && typeof value === 'number' && value < constraints.minValue) {
		return `Minimum value is ${constraints.minValue}`;
	}

	if (constraints?.maxValue != null && typeof value === 'number' && value > constraints.maxValue) {
		return `Maximum value is ${constraints.maxValue}`;
	}

	if (constraints?.pattern) {
		const regex = compilePattern(constraints.pattern);
		if (regex && !regex.test(stringValue)) {
			return 'Invalid format';
		}
	}

	return null;
}

/**
 * An uncompilable pattern must not take the document down — it is reported as
 * unconstrained rather than as a failed value.
 */
function compilePattern(pattern: string): RegExp | null {
	try {
		return new RegExp(pattern);
	} catch {
		return null;
	}
}
