// What the record panel lists, in order: the grid's column order (primary key
// first, a shown belongsTo in place of its key columns, then the list relations),
// so the panel and the grid show a record the same way.

import { readCellError, type RelationModel, type TableModel } from '@constructive-io/data';

import type { CellTypeRegistry } from '../cell-types/cell-type-registry';
import type { CellType } from '../cell-types/types';
import type { SheetsCell } from '../cell-model/sheets-cell';
import { MEDIA_TYPES } from '../cell-types/cell-type-groups';
import { buildModelFormSpec, type ModelFormField, type ModelFormMode } from '../forms/model-form';
import { CELL_READ_ERROR_TEXT, relationCellReadOnlyReason, resolveModelCellRoute } from '../grid/cell-routing';
import { gridColumnKeys } from '../relations/relation-columns';

/** Why a file cannot be added to a record that does not exist yet. */
const SAVE_BEFORE_FILES = 'Save the record first, then add files.';

/** What an empty field of a new record gets when the table fills it in itself. */
export const AUTOMATIC_VALUE_TEXT = 'Set automatically when created';

export type RecordLayoutItem =
	| {
			kind: 'field';
			field: ModelFormField;
			cellType: string;
			readOnlyReason: string | null;
			/** What an empty value reads as, when not "Empty" (a new record's field the table fills in). */
			emptyText: string | null;
	  }
	| {
			kind: 'relation';
			relation: RelationModel;
			readOnlyReason: string | null;
			/** A new record cannot be created without this link (a required key field behind it). */
			required: boolean;
	  };

/** A link a new record needs: a belongsTo whose key fields a create must fill. */
function linkRequiredOnCreate(model: TableModel, relation: RelationModel): boolean {
	if (relation.kind !== 'belongsTo') return false;
	return relation.keys.some((pair) => model.columns.find((column) => column.name === pair.local)?.write.requiredOnCreate);
}

export interface RecordLayoutOptions {
	mode: ModelFormMode;
	/** The record's values (for per-cell read errors), or null. */
	row: Readonly<Record<string, unknown>> | null;
	/** True when relations are shown as sections; otherwise their key columns are listed as fields. */
	withRelations: boolean;
	/** Host cell-type overrides (`SheetsConfig.fieldTypeOverrides`). */
	typeOverrides?: Readonly<Record<string, string>>;
	/** Why files cannot be changed here (for example no storage endpoint), as in the grid; null when they can. */
	mediaReason?: string | null;
}

/** The fields and relation sections of one record, each routed exactly like its grid cell. */
export function recordLayout(model: TableModel, options: RecordLayoutOptions): RecordLayoutItem[] {
	const spec = buildModelFormSpec(model, options.mode, { typeOverrides: options.typeOverrides });
	const fields = new Map(spec.fields.map((field) => [field.name, field] as const));
	const relations = new Map(model.relations.map((relation) => [relation.fieldName, relation] as const));
	const lockedFields = new Set(model.primaryKey);
	const order = options.withRelations ? gridColumnKeys(model) : spec.fields.map((field) => field.name);

	const items: RecordLayoutItem[] = [];
	for (const name of order) {
		const field = fields.get(name);
		if (field) {
			// The saved record is routed per row (a value the server could not send is read-only).
			const route = resolveModelCellRoute({
				column: field.column,
				table: model,
				isDraftRow: options.mode === 'create',
				cellError: options.mode === 'update' ? readCellError(options.row, name) : null,
				typeOverride: options.typeOverrides?.[`${model.name}.${name}`] ?? null,
				lockedFields,
			});
			const isMedia = MEDIA_TYPES.has(route.cellType);
			const mediaReason = isMedia ? (options.mode === 'create' ? SAVE_BEFORE_FILES : options.mediaReason ?? null) : null;
			const readOnlyReason = route.readOnlyReason ?? mediaReason;
			items.push({
				kind: 'field',
				field,
				cellType: route.cellType,
				readOnlyReason,
				// A read-only field already says why it is empty (its reason); an editable one says it may stay so.
				emptyText: options.mode === 'create' && field.column.hasDefault && !readOnlyReason ? AUTOMATIC_VALUE_TEXT : null,
			});
			continue;
		}
		const relation = relations.get(name);
		if (relation && options.withRelations) {
			const creating = options.mode === 'create';
			items.push({
				kind: 'relation',
				relation,
				readOnlyReason: relationCellReadOnlyReason(relation, model, creating),
				required: creating && linkRequiredOnCreate(model, relation),
			});
		}
	}
	return items;
}

/** The neutral cell for one field value, from the grid's cell factories (or the unreadable notice). */
export function recordFieldCell(
	registry: CellTypeRegistry,
	model: TableModel,
	item: Extract<RecordLayoutItem, { kind: 'field' }>,
	value: unknown,
	unreadable: boolean,
): SheetsCell {
	if (unreadable) {
		return {
			kind: 'text',
			data: '',
			displayData: CELL_READ_ERROR_TEXT,
			readonly: true,
			styleHint: { unreadable: true },
			meta: { cellType: item.cellType as CellType },
		};
	}
	return registry.toSheetsCell(item.cellType, value, {
		metadata: {
			cellType: item.cellType,
			fieldName: item.field.name,
			column: item.field.column,
			relation: null,
			table: model,
			canEdit: item.readOnlyReason === null,
			isReadonly: item.readOnlyReason !== null,
			activationBehavior: 'double-click',
		},
	});
}
