import type { ColumnModel, MetaQuery, RelationModel, TableModel } from '@constructive-io/data';

import { NON_EDITABLE_TYPES } from '../cell-types/cell-type-groups';
import { resolveCellType, type FieldMetadata } from '../cell-types/cell-type-resolver';
import { cellTypeForColumn } from '../cell-types/column-routing';
import { VIEW_ONLY_REASON } from '../cell-types/column-value';
import type { RelationInfo } from '../store/relation-info-slice';

/** Shown on a cell whose value the server could not send. */
export const CELL_READ_ERROR_TEXT = 'This value cannot be shown';
const CELL_READ_ERROR_REASON = 'The server could not send this value, so it cannot be shown or changed here.';
const KEY_LOCKED_REASON = 'This field identifies the record, so it cannot be changed here.';
const UNDESCRIBED_PARTS_REASON = 'The parts of this value are not known, so it cannot be changed here.';

/** Cell types whose editor builds the value from the fields of the column's write input. */
const FIELD_BUILT_TYPES: ReadonlySet<string> = new Set(['composite', 'point', 'range', 'interval']);

export interface ModelCellRouteInput {
	column: ColumnModel;
	table: TableModel;
	/** The row is a draft that has not been created yet. */
	isDraftRow: boolean;
	/** The list read could not serve this cell's value. */
	cellError: string | null;
	/** Host override of the cell type (`SheetsConfig.fieldTypeOverrides`). */
	typeOverride?: string | null;
	/** Fields of saved rows that stay fixed because they identify the row. */
	lockedFields?: ReadonlySet<string>;
}

export interface ModelCellRoute {
	cellType: string;
	/** Why the cell cannot be written, or null when it can. Safe to show to the user. */
	readOnlyReason: string | null;
}

function operationIssue(table: TableModel, operation: 'create' | 'update'): string | null {
	return table.issues.find((issue) => issue.scope === 'operation' && issue.target === operation)?.message ?? null;
}

/** Why a cell of this column cannot be written in this row, from the table model only. */
function modelReadOnlyReason(input: ModelCellRouteInput, cellType: string): string | null {
	const { column, table, isDraftRow, cellError, lockedFields } = input;
	if (cellError) return CELL_READ_ERROR_REASON;
	if (!column.readable) return column.readReason ?? 'This field cannot be read.';
	if (NON_EDITABLE_TYPES.has(cellType)) return VIEW_ONLY_REASON;
	if (FIELD_BUILT_TYPES.has(cellType) && column.value.input && !column.value.input.fields?.length) {
		return UNDESCRIBED_PARTS_REASON;
	}
	if (isDraftRow) {
		if (!table.operations.create) return operationIssue(table, 'create') ?? 'New records cannot be added to this table.';
		return column.write.create ? null : column.write.createReason ?? 'This field cannot be set on a new record.';
	}
	if (!table.operations.update) return operationIssue(table, 'update') ?? 'Records in this table cannot be changed.';
	if (lockedFields?.has(column.name)) return KEY_LOCKED_REASON;
	return column.write.update ? null : column.write.updateReason ?? 'This field cannot be changed.';
}

/**
 * Why a relation cell cannot change its links, or null when the relation editor may
 * (it decides the details per link). A belongsTo writes this table's row, so it also
 * needs the row's create (draft) or update operation; the other kinds write the
 * related or junction table, which the relation editor checks.
 */
export function relationCellReadOnlyReason(relation: RelationModel, table: TableModel | null, isDraftRow: boolean): string | null {
	if (!relation.readable || !relation.editable) return relation.reason ?? 'These links cannot be changed here.';
	if (relation.kind !== 'belongsTo' || !table) return null;
	if (isDraftRow) return table.operations.create ? null : operationIssue(table, 'create') ?? 'New records cannot be added to this table.';
	return table.operations.update ? null : operationIssue(table, 'update') ?? 'Records in this table cannot be changed.';
}

/**
 * Route one column cell from the table model: its cell type and, when it cannot be
 * written in this row, the reason. A host type override changes the cell type only;
 * it never makes a read-only column writable.
 */
export function resolveModelCellRoute(input: ModelCellRouteInput): ModelCellRoute {
	const cellType = input.typeOverride || cellTypeForColumn(input.column);
	return { cellType, readOnlyReason: modelReadOnlyReason(input, cellType) };
}

type MetaTable = NonNullable<NonNullable<MetaQuery['_meta']>['tables']>[number];

export interface GridCellRouteInput {
	colKey: string;
	fieldMeta?: FieldMetadata;
	relationInfo?: RelationInfo;
	isRelationFallback?: boolean;
	isCustomGeometryCell?: boolean;
	isDraftIdCell?: boolean;
	hasForeignKeyField?: boolean;
}

export interface GridCellRoute {
	cellType: string;
	baseCellType: string;
	isRelation: boolean;
	canEdit: boolean;
	canActivate: boolean;
	isReadonly: boolean;
	activationBehavior: 'single-click' | 'double-click';
}

export function buildRelationFieldNameSet(meta: MetaQuery | undefined, tableName?: string): Set<string> {
	if (!tableName) return new Set<string>();

	const table = meta?._meta?.tables?.find((entry): entry is MetaTable => Boolean(entry && entry.name === tableName));
	if (!table?.relations) return new Set<string>();

	const out = new Set<string>();
	const push = (fieldName?: string | null) => {
		if (fieldName) out.add(fieldName);
	};

	table.relations.belongsTo?.forEach((relation) => {
		push(relation?.fieldName);
		relation?.keys?.forEach((key) => push(key?.name));
	});
	table.relations.hasOne?.forEach((relation) => push(relation?.fieldName));
	table.relations.hasMany?.forEach((relation) => push(relation?.fieldName));
	table.relations.manyToMany?.forEach((relation) => push(relation?.fieldName));

	return out;
}

export function resolveGridCellRoute({
	colKey,
	fieldMeta,
	relationInfo,
	isRelationFallback = false,
	isCustomGeometryCell = false,
	isDraftIdCell = false,
	hasForeignKeyField = false,
}: GridCellRouteInput): GridCellRoute {
	const base = resolveCellType(colKey, fieldMeta);
	const isRelation = Boolean(relationInfo) || isRelationFallback;
	const canEditRelationInline = Boolean(
		relationInfo && relationInfo.kind === 'belongsTo' && relationInfo.foreignKeyField && hasForeignKeyField,
	);

	const canEdit = isDraftIdCell ? false : isRelation ? canEditRelationInline : base.canEdit;
	const canActivate = isDraftIdCell ? false : isRelation ? true : base.canActivate;
	const isReadonly = isDraftIdCell ? true : isRelation ? !canEditRelationInline : base.isReadonly;

	let cellType = isRelation ? 'relation' : base.cellType;
	if (!isRelation && isCustomGeometryCell) {
		cellType = 'geometry';
	}

	return {
		cellType,
		baseCellType: base.cellType,
		isRelation,
		canEdit,
		canActivate,
		isReadonly,
		activationBehavior: base.activationBehavior,
	};
}
