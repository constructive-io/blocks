import type { FieldSelection, SimpleFieldSelection, SortSpec } from '@constructive-io/data';

import type { AdapterListQuery } from '../adapter/sheets-adapter';

/**
 * Relations a legacy `FieldSelection` asks for. The `full` preset selects every
 * readable relation, the other presets none; `includeRelations` and truthy
 * `include` entries name relation fields.
 */
export function relationsFromSelection(select: FieldSelection | undefined): AdapterListQuery['relations'] {
	if (select === 'full') return 'all';
	if (!select || typeof select === 'string') return 'none';
	const selection = select as SimpleFieldSelection;
	const fields = new Set<string>(selection.includeRelations ?? []);
	for (const [field, value] of Object.entries(selection.include ?? {})) if (value) fields.add(field);
	return fields.size > 0 ? [...fields] : 'none';
}

/**
 * The field selection of the grid's relations: the `requested` ones among those the
 * grid shows, or every one it shows when `requested` is omitted.
 */
export function gridRelationSelection(shown: readonly string[], requested: readonly string[] | undefined): FieldSelection {
	const fields = requested ? shown.filter((field) => requested.includes(field)) : shown;
	// The `all` preset selects no relation.
	return fields.length > 0 ? { includeRelations: [...fields] } : 'all';
}

/** The sort the hooks accept, as the adapter takes it. */
export function sortSpecs(
	orderBy: ReadonlyArray<{ field: string; direction: 'asc' | 'desc' }> | undefined,
): readonly SortSpec[] | undefined {
	return orderBy && orderBy.length > 0 ? orderBy.map(({ field, direction }) => ({ field, direction })) : undefined;
}

/** A filter object as the adapter takes it; empty filters are dropped. */
export function whereFilter(where: unknown): Readonly<Record<string, unknown>> | undefined {
	if (!where || typeof where !== 'object') return undefined;
	return Object.keys(where).length > 0 ? (where as Readonly<Record<string, unknown>>) : undefined;
}
