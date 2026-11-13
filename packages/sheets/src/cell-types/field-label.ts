import type { RelationModel, TableModel } from '@constructive-io/data';

/** Turn a field name into a readable label (`dueOn` -> `Due on`, `iso_code` -> `Iso code`). */
export function fieldLabel(name: string): string {
	const spaced = name
		.replace(/_/g, ' ')
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.trim()
		.toLowerCase();
	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** A generated relation name: the related records, `By`, then the key fields that link them. */
const GENERATED_RELATION_NAME = /^([a-z][A-Za-z0-9]*?)By([A-Z][A-Za-z0-9]*)$/;

function plural(words: string): string {
	return words.endsWith('s') ? words : `${words}s`;
}

/**
 * A readable label for a relation field. A generated name spells out its key fields
 * (`peopleByManagerId`, `projectsByProjectMemberPersonIdAndProjectId`); the label keeps
 * what a person needs: the related records and what links them, or the link table of a
 * many-to-many relation. Any other name reads like a field name.
 */
export function relationFieldLabel(relation: Pick<RelationModel, 'kind' | 'fieldName' | 'junction'>): string {
	const match = GENERATED_RELATION_NAME.exec(relation.fieldName);
	if (!match) return fieldLabel(relation.fieldName);
	const [, records, link] = match as unknown as [string, string, string];
	if (relation.kind === 'manyToMany' && relation.junction) {
		return `${fieldLabel(records)} via ${plural(fieldLabel(relation.junction.tableName).toLowerCase())}`;
	}
	// `ManagerId` -> `manager`; `WarehouseCodeAndSku` -> `warehouse code and sku`; `OrgIdAndUserId` -> `org and user`.
	const keys = link
		.split(/And(?=[A-Z])/)
		.map((part) => fieldLabel(part.replace(/Id$/, '')).toLowerCase())
		.filter(Boolean);
	return `${fieldLabel(records)} by ${keys.join(' and ')}`;
}

/** The label of any field of a table: a relation reads as a relation, a column as a field. */
export function modelFieldLabel(model: Pick<TableModel, 'relations'> | null | undefined): (name: string) => string {
	const relations = new Map((model?.relations ?? []).map((relation) => [relation.fieldName, relation]));
	return (name) => {
		const relation = relations.get(name);
		return relation ? relationFieldLabel(relation) : fieldLabel(name);
	};
}
