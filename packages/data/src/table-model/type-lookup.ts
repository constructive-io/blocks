import {
	isListTypeRef,
	isRequiredInput,
	namedTypeOf,
	type IntrospectedField,
	type IntrospectedType,
	type IntrospectedTypeRef,
	type SchemaTypeIndex,
} from './schema-introspection';
import type { InputFieldModel, InputValueModel } from './types';

/** Deepest input object nesting the model describes (range bounds, composites in composites). */
const MAX_INPUT_DEPTH = 4;

/**
 * Read access to introspected types for one model build. Every lookup of a
 * type that has not been loaded yet is recorded, so the resolver knows what to
 * fetch next; the build treats such a type as unknown until then.
 */
export interface TypeLookup {
	/** A named type, or null when it is missing or not loaded yet. */
	type(name: string | null | undefined): IntrospectedType | null;
	/** A named type behind a reference. */
	typeOf(ref: IntrospectedTypeRef | null | undefined): IntrospectedType | null;
	/** One field of an output type. */
	field(type: IntrospectedType | null | undefined, name: string): IntrospectedField | null;
	/** Shape of an input position, or null when its type is unknown. */
	inputValue(ref: IntrospectedTypeRef, depth?: number): InputValueModel | null;
	/** Type names looked up before they were loaded. */
	readonly missing: ReadonlySet<string>;
}

export function createTypeLookup(index: SchemaTypeIndex): TypeLookup {
	const missing = new Set<string>();

	const type = (name: string | null | undefined): IntrospectedType | null => {
		if (!name) return null;
		const found = index.get(name);
		if (found === undefined) {
			missing.add(name);
			return null;
		}
		return found;
	};

	const inputValue = (ref: IntrospectedTypeRef, depth = 0): InputValueModel | null => {
		const named = namedTypeOf(ref);
		if (!named) return null;
		const isList = isListTypeRef(ref);
		if (named.kind === 'SCALAR') {
			return { typeName: named.name, shape: 'scalar', isList, enumValues: null, fields: null };
		}
		if (named.kind === 'ENUM') {
			const enumType = type(named.name);
			if (!enumType) return null;
			return {
				typeName: named.name,
				shape: 'enum',
				isList,
				enumValues: (enumType.enumValues ?? []).map((value) => value.name),
				fields: null,
			};
		}
		if (named.kind !== 'INPUT_OBJECT') return null;
		if (depth >= MAX_INPUT_DEPTH) {
			return { typeName: named.name, shape: 'object', isList, enumValues: null, fields: null };
		}
		const objectType = type(named.name);
		if (!objectType) return null;
		const fields: InputFieldModel[] = [];
		for (const field of objectType.inputFields ?? []) {
			const value = inputValue(field.type, depth + 1);
			if (!value) return null;
			fields.push({ name: field.name, required: isRequiredInput(field), value });
		}
		return { typeName: named.name, shape: 'object', isList, enumValues: null, fields };
	};

	return {
		type,
		typeOf: (ref) => type(namedTypeOf(ref)?.name),
		field: (owner, name) => owner?.fields?.find((candidate) => candidate.name === name) ?? null,
		inputValue,
		missing,
	};
}
