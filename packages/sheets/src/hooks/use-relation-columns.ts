/**
 * Grid columns from the table model: which columns and relation fields show,
 * in what order, with what header. See `relations/relation-columns.ts` for
 * the rule. Columns never come from the keys of a loaded row, so values that
 * ride beside a row (relation totals, cell errors) can never become columns.
 * Headers are readable labels (`fieldLabel`); `id` stays the raw field name for
 * saved views, commands and `data-col-key`. The value type belongs to the
 * header's icon or tooltip, not to the label.
 */
import { useCallback, useMemo } from 'react';

import { isImageField, type FieldMetadata } from '../cell-types/cell-type-resolver';
import { fieldLabel, relationFieldLabel } from '../cell-types/field-label';
import { getColumnWidthByMeta } from '../grid/sheets.utils';
import { gridColumnKeys } from '../relations/relation-columns';

import { useRelationMetadataCache, type RelationMetadata } from './use-relation-metadata-cache';

type RelationKind = 'belongsTo' | 'hasOne' | 'hasMany' | 'manyToMany';

/** Native column descriptor — key/title/width, mappable 1:1 to {@link SheetsColumnDescriptor}. */
export interface RelationGridColumn {
	id: string;
	title: string;
	width: number;
}

/**
 * Relation-aware column info with simple error handling
 */
export interface RelationColumnInfo {
	columns: RelationGridColumn[];
	columnKeys: string[];
	relationMetadata: Record<string, RelationMetadata>;
	metaFields?: FieldMetadata[];
	hasRelationErrors: boolean;
	relationCount: number;
	// Helper functions (backward compatible)
	isImageField: (fieldMeta: FieldMetadata | undefined, fieldName?: string) => boolean;
	findImageColumnKey: (columnKeys: string[], fieldMetaMap: Map<string, unknown>, currentColKey?: string) => string;
	getRelationKind: (fieldName: string) => RelationKind | null;
	isRelationField: (fieldName: string) => boolean;
	invalidateRelationCache: () => Promise<void>;
	// For backward compatibility
	relationTypeByField: Map<string, RelationKind>;
}

const SINGLE_RELATION_WIDTH = 160;
const LIST_RELATION_WIDTH = 220;
const DEFAULT_WIDTH = 150;

/**
 * Create data grid columns with relation metadata baked in.
 *
 * @param tableName - table name or `TableModel.key`.
 * @param _rows - ignored; columns come from the table model, not from loaded rows.
 */
export function useRelationColumns(tableName?: string, _rows?: unknown[]): RelationColumnInfo {
	const { model, relationMetadata, tableRelations, cacheState, getRelationKind, isRelationField, invalidateRelationCache } =
		useRelationMetadataCache(tableName);

	const metaFields = useMemo<FieldMetadata[] | undefined>(() => {
		return tableRelations?.fields.map((field) => ({
			name: field.name,
			type: field.type,
		}));
	}, [tableRelations]);

	const metaFieldByName = useMemo(() => {
		const map = new Map<string, FieldMetadata>();
		for (const field of metaFields ?? []) {
			if (field?.name) map.set(field.name, field);
		}
		return map;
	}, [metaFields]);

	const columnKeys = useMemo<string[]>(() => (model ? gridColumnKeys(model) : []), [model]);

	const relationMetadataMap = useMemo(() => {
		const map: Record<string, RelationMetadata> = {};
		relationMetadata.forEach((rel) => {
			map[rel.fieldName] = rel;
		});
		return map;
	}, [relationMetadata]);

	const columns: RelationGridColumn[] = useMemo(() => {
		const relationByField = new Map((model?.relations ?? []).map((relation) => [relation.fieldName, relation]));
		return columnKeys.map((fieldName) => {
			const relation = relationByField.get(fieldName);
			const metaField = metaFieldByName.get(fieldName);
			const width = relation
				? relation.kind === 'hasMany' || relation.kind === 'manyToMany'
					? LIST_RELATION_WIDTH
					: SINGLE_RELATION_WIDTH
				: metaField
					? getColumnWidthByMeta(metaField)
					: DEFAULT_WIDTH;
			return { id: fieldName, title: relation ? relationFieldLabel(relation) : fieldLabel(fieldName), width } satisfies RelationGridColumn;
		});
	}, [columnKeys, metaFieldByName, model]);

	// Helper function using centralized image field detection
	const checkIsImageField = useCallback((fieldMeta: FieldMetadata | undefined, fieldName?: string): boolean => {
		return isImageField(fieldMeta, fieldName);
	}, []);

	// The column key of an image cell: the current column when it holds images, else the first image column.
	const findImageColumnKey = useCallback(
		(keys: string[], fieldMetaMap: Map<string, unknown>, currentColKey?: string): string => {
			if (currentColKey && fieldMetaMap.has(currentColKey)) {
				const fieldMeta = fieldMetaMap.get(currentColKey) as FieldMetadata | undefined;
				if (checkIsImageField(fieldMeta, currentColKey)) return currentColKey;
			}
			for (const key of keys) {
				const fieldMeta = fieldMetaMap.get(key) as FieldMetadata | undefined;
				if (fieldMeta && checkIsImageField(fieldMeta, key)) return key;
			}
			return currentColKey || keys[0] || '';
		},
		[checkIsImageField],
	);

	// Create backward compatibility map
	const relationTypeByField = useMemo(() => {
		const map = new Map<string, RelationKind>();
		Object.entries(relationMetadataMap).forEach(([fieldName, info]) => {
			map.set(fieldName, info.relationKind);
		});
		return map;
	}, [relationMetadataMap]);

	return {
		columns,
		columnKeys,
		relationMetadata: relationMetadataMap,
		metaFields,
		hasRelationErrors: cacheState.isError,
		relationCount: cacheState.relationCount,
		isImageField: checkIsImageField,
		findImageColumnKey,
		getRelationKind,
		isRelationField,
		invalidateRelationCache,
		relationTypeByField, // For backward compatibility
	};
}

/**
 * Drop-in replacement for the original useDataGridColumns hook
 * Maintains complete backward compatibility while providing improvements
 */
export function useDataGridColumns(tableName?: string, rows: unknown[] = []) {
	const enhanced = useRelationColumns(tableName, rows);

	// Return exact same interface as original for backward compatibility
	return {
		columns: enhanced.columns,
		columnKeys: enhanced.columnKeys,
		metaFields: enhanced.metaFields,
		isImageField: enhanced.isImageField,
		findImageColumnKey: enhanced.findImageColumnKey,
		relationTypeByField: enhanced.relationTypeByField,
		// Add new enhanced features for those who want them
		relationMetadata: enhanced.relationMetadata,
		hasRelationErrors: enhanced.hasRelationErrors,
		relationCount: enhanced.relationCount,
		getRelationKind: enhanced.getRelationKind,
		isRelationField: enhanced.isRelationField,
		invalidateRelationCache: enhanced.invalidateRelationCache,
	};
}
