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

type LabelModel = Pick<TableModel, 'key' | 'columns' | 'relations'>;
type LabelRelation = Pick<RelationModel, 'kind' | 'fieldName' | 'junction' | 'keys' | 'targetKey'>;

/**
 * The short name of a generated relation name in its table, or null when its full label is
 * the name: a link names what the row's key field says, without the field it points at
 * (`personByAssigneeEmail` -> `Assignee`), else the linked table (`Warehouse item`); a list
 * names the related records (`Tasks`). A list of the table's own records keeps what links
 * them (`People by manager`), or it would read as every record.
 */
function shortRelationLabel(model: LabelModel, relation: LabelRelation): string | null {
	const match = GENERATED_RELATION_NAME.exec(relation.fieldName);
	if (!match) return null;
	const records = fieldLabel(match[1]!);
	if (relation.kind === 'belongsTo') {
		const pair = relation.keys.length === 1 ? relation.keys[0]! : null;
		const pointsAt = pair ? pair.remote.charAt(0).toUpperCase() + pair.remote.slice(1) : '';
		if (pair && pair.local.length > pointsAt.length && pair.local.endsWith(pointsAt)) return fieldLabel(pair.local.slice(0, -pointsAt.length));
		return records;
	}
	return relation.targetKey === model.key ? null : records;
}

const labelsByModel = new WeakMap<LabelModel, ReadonlyMap<string, string>>();

/** The label of each relation of a table: short where no other field of the table reads the same. */
function relationLabels(model: LabelModel): ReadonlyMap<string, string> {
	const cached = labelsByModel.get(model);
	if (cached) return cached;
	const short = new Map(model.relations.map((relation) => [relation.fieldName, shortRelationLabel(model, relation) ?? relationFieldLabel(relation)]));
	const uses = new Map<string, number>();
	for (const label of [...model.columns.map((column) => fieldLabel(column.name)), ...short.values()]) {
		const key = label.toLowerCase();
		uses.set(key, (uses.get(key) ?? 0) + 1);
	}
	const labels = new Map<string, string>();
	for (const relation of model.relations) {
		const label = short.get(relation.fieldName)!;
		labels.set(relation.fieldName, (uses.get(label.toLowerCase()) ?? 0) > 1 ? relationFieldLabel(relation) : label);
	}
	labelsByModel.set(model, labels);
	return labels;
}

/** The label of a relation of `model`: its short name unless another field of the table reads the same. */
export function relationLabelIn(model: LabelModel | null | undefined, relation: LabelRelation): string {
	return (model && relationLabels(model).get(relation.fieldName)) ?? relationFieldLabel(relation);
}

/** The label of any field of a table: a relation reads as a relation, a column as a field. */
export function modelFieldLabel(model: LabelModel | null | undefined): (name: string) => string {
	const relations = new Map((model?.relations ?? []).map((relation) => [relation.fieldName, relation]));
	return (name) => {
		const relation = relations.get(name);
		return relation ? relationLabelIn(model, relation) : fieldLabel(name);
	};
}
