import { isRequiredInput, namedTypeOf, type IntrospectedType } from './schema-introspection';
import type { TypeLookup } from './type-lookup';

/** Deepest object nesting a column sub-selection follows. */
const MAX_SELECTION_DEPTH = 3;

export interface SelectionOptions {
	/** Select only the leaf fields of the top-level type (geometry values). */
	leavesOnly?: boolean;
}

/**
 * The sub-selection for an object-typed value: every leaf field, and object
 * fields by recursion up to a depth limit. Fields that need arguments and
 * union-typed fields are skipped. Null when nothing can be selected.
 */
export function buildOutputSelection(
	type: IntrospectedType | null,
	lookup: TypeLookup,
	options: SelectionOptions = {},
	depth = 0,
): string | null {
	if (!type || (type.kind !== 'OBJECT' && type.kind !== 'INTERFACE')) return null;
	// An interface value (geometry) reports its concrete type only through `__typename`.
	const parts: string[] = type.kind === 'INTERFACE' ? ['__typename'] : [];
	for (const field of type.fields ?? []) {
		if (field.args.some(isRequiredInput)) continue;
		const named = namedTypeOf(field.type);
		if (!named) continue;
		if (named.kind === 'SCALAR' || named.kind === 'ENUM') {
			parts.push(field.name);
			continue;
		}
		if (options.leavesOnly || depth + 1 >= MAX_SELECTION_DEPTH) continue;
		if (named.kind !== 'OBJECT' && named.kind !== 'INTERFACE') continue;
		const nested = buildOutputSelection(lookup.type(named.name), lookup, options, depth + 1);
		if (nested) parts.push(`${field.name} ${nested}`);
	}
	return parts.some((part) => part !== '__typename') ? `{ ${parts.join(' ')} }` : null;
}
