/**
 * Parse list-like scalar values emitted by schema-builder ORM fields.
 *
 * Codegen v4 ORM types expose list columns (e.g. uuid[]) as `string | null`.
 * At runtime this value may be:
 * - a real array (already parsed)
 * - JSON array string: ["a","b"]
 * - PostgreSQL array literal: {a,b} or {"a","b"}
 * - single scalar string: a
 */
export function parseListField(value: unknown): string[] {
	if (value == null) return [];

	if (Array.isArray(value)) {
		return value
			.filter((item): item is string => typeof item === 'string')
			.map((item) => item.trim())
			.filter(Boolean);
	}

	if (typeof value !== 'string') return [];

	const input = value.trim();
	if (!input) return [];

	// JSON array payload
	if (input.startsWith('[') && input.endsWith(']')) {
		try {
			const parsed = JSON.parse(input);
			if (Array.isArray(parsed)) {
				return parsed
					.filter((item): item is string => typeof item === 'string')
					.map((item) => item.trim())
					.filter(Boolean);
			}
		} catch {
			// Fall through to additional formats.
		}
	}

	// PostgreSQL array literal payload: {a,b} or {"a","b"}
	if (input.startsWith('{') && input.endsWith('}')) {
		const inner = input.slice(1, -1).trim();
		if (!inner) return [];
		return splitPgArrayLiteral(inner)
			.map(stripPgArrayItemQuotes)
			.map((item) => item.trim())
			.filter((item) => item.length > 0 && item.toUpperCase() !== 'NULL');
	}

	// Fallback: treat as single scalar value.
	return [input];
}

function splitPgArrayLiteral(input: string): string[] {
	const items: string[] = [];
	let current = '';
	let inQuotes = false;
	let escaped = false;

	for (let i = 0; i < input.length; i += 1) {
		const char = input[i];

		if (escaped) {
			current += char;
			escaped = false;
			continue;
		}

		if (char === '\\') {
			escaped = true;
			continue;
		}

		if (char === '"') {
			inQuotes = !inQuotes;
			current += char;
			continue;
		}

		if (char === ',' && !inQuotes) {
			items.push(current);
			current = '';
			continue;
		}

		current += char;
	}

	items.push(current);
	return items;
}

function stripPgArrayItemQuotes(item: string): string {
	if (item.startsWith('"') && item.endsWith('"') && item.length >= 2) {
		return item.slice(1, -1).replace(/\\"/g, '"');
	}
	return item;
}
