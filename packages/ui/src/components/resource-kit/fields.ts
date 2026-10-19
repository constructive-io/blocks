import type { AnyResource, FieldFormat, ResourceField, ResourceRow } from './types';

/** The display format a field gets when its definition names none. */
export function fieldFormat(field: ResourceField): FieldFormat {
	if (field.format) return field.format;
	// A field with a fixed set of options reads as their badges, whatever control edits it.
	if (field.options?.length && field.input !== 'relation') return 'badge';
	switch (field.input) {
		case 'number':
		case 'integer':
			return 'number';
		case 'currency':
			return 'currency';
		case 'boolean':
			return 'boolean';
		case 'date':
			return 'date';
		case 'datetime':
			return 'datetime';
		case 'select':
			return 'badge';
		default:
			return 'text';
	}
}

/** The named fields that exist and are not hidden, in the given order. */
export function visibleFields(resource: AnyResource, names: readonly string[]): ResourceField[] {
	return names.flatMap((name) => {
		const field = resource.fields[name];
		return field && !field.hidden ? [field] : [];
	});
}

/** Detail fields: the declared list, or every visible field in declaration order. */
export function detailFields(resource: AnyResource): ResourceField[] {
	return visibleFields(resource, resource.detailFields ?? Object.keys(resource.fields));
}

export const isManyRelation = (field: ResourceField) => field.input === 'relation' && Boolean(field.relation?.many);
export const isSingleRelation = (field: ResourceField) => field.input === 'relation' && Boolean(field.relation) && !field.relation?.many;

/** Fields a list can sort by: plain columns, not relations or JSON. */
export const isSortable = (field: ResourceField) => field.input !== 'relation' && field.input !== 'json';

/** The record id as a string. */
export function recordId(resource: AnyResource, row: ResourceRow): string {
	const value = row[resource.primaryKey];
	return value == null ? '' : String(value);
}

/** The text that names a record, falling back to its id. */
export function recordTitle(resource: AnyResource, row: ResourceRow | null | undefined, labelField = resource.titleField): string {
	if (!row) return '';
	const value = row[labelField];
	const text = typeof value === 'string' ? value.trim() : value == null ? '' : String(value);
	return text || recordId(resource, row) || `Untitled ${resource.singular}`;
}

/**
 * The key a source may embed a belongs-to row under: `companyId` and
 * `company_id` read `company`. Lets a list show relation labels without a
 * request per row when the source already joins them.
 */
export function embeddedKey(fieldName: string): string | null {
	const match = /^(.+?)(?:Id|_id)$/.exec(fieldName);
	return match ? match[1]! : null;
}

/** A belongs-to row the source embedded beside the foreign key, if any. */
export function embeddedRow(row: ResourceRow, field: ResourceField): ResourceRow | null {
	const key = embeddedKey(field.name);
	const value = key ? row[key] : undefined;
	return value && typeof value === 'object' && !Array.isArray(value) ? (value as ResourceRow) : null;
}

/** A has-many list on a record: another resource whose belongs-to field points back at it. */
export type HasManyRelation = { resource: AnyResource; field: ResourceField };

export function hasManyRelations(resource: AnyResource, all: readonly AnyResource[]): HasManyRelation[] {
	return all.flatMap((other) =>
		Object.values(other.fields)
			.filter((field) => isSingleRelation(field) && field.relation?.resource === resource.name)
			.map((field) => ({ resource: other, field })),
	);
}

/** Resources whose cached data can change when this one is written: its relation targets and everything pointing at it. */
export function relatedResourceNames(resource: AnyResource, all: readonly AnyResource[]): string[] {
	const names = new Set<string>([resource.name]);
	for (const field of Object.values(resource.fields)) {
		if (field.relation) names.add(field.relation.resource);
	}
	for (const other of all) {
		if (Object.values(other.fields).some((field) => field.relation?.resource === resource.name)) names.add(other.name);
	}
	return [...names];
}

/**
 * Lowercases a display label for use inside a sentence, leaving acronyms
 * ("CRM contacts") and single letters alone.
 */
export function inSentence(label: string): string {
	return /^\p{Lu}\p{Ll}/u.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label;
}
