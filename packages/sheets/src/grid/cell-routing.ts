import type { MetaQuery } from '@constructive-io/data';

import { resolveCellType, type FieldMetadata } from '../cell-types/cell-type-resolver';
import type { RelationInfo } from '../store/relation-info-slice';

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

export interface ResolveEditorLocationInput {
	cellLocation?: readonly [number, number];
	activeCell?: readonly [number, number] | null;
	columnKeys: string[];
	dataLength: number;
}

export interface ResolvedEditorLocation {
	colIndex: number;
	rowIndex: number;
	colKey: string;
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

export function resolveEditorLocation({
	cellLocation,
	activeCell,
	columnKeys,
	dataLength,
}: ResolveEditorLocationInput): ResolvedEditorLocation | null {
	const source = cellLocation ?? activeCell ?? null;
	if (!source) return null;

	const [colIndex, rowIndex] = source;
	if (!Number.isInteger(colIndex) || !Number.isInteger(rowIndex)) return null;
	if (colIndex < 0 || colIndex >= columnKeys.length) return null;
	if (rowIndex < 0 || rowIndex >= dataLength) return null;

	const colKey = columnKeys[colIndex];
	if (!colKey) return null;

	return {
		colIndex,
		rowIndex,
		colKey,
	};
}
