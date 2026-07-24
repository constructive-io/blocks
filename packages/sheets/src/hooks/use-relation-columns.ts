/**
 * Build data grid columns that understand relation metadata
 */
import { useCallback, useMemo } from 'react';

import { isImageField, resolveCellType, type FieldMetadata } from '../cell-types/cell-type-resolver';
import { getColumnWidthByMeta } from '../grid/sheets.utils';

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

/**
 * Create data grid columns with relation metadata baked in
 */
export function useRelationColumns(tableName?: string, rows?: unknown[]): RelationColumnInfo {
	const { relationMetadata, tableRelations, cacheState, getRelationKind, isRelationField, invalidateRelationCache } =
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

	const baseFieldNames = useMemo(() => {
		if (rows && rows.length > 0) {
			const sample = rows[0] ?? {};
			return Object.keys(sample);
		}

		if (metaFields?.length) {
			const scalarNames = metaFields.map((field) => field?.name).filter((name): name is string => Boolean(name));
			const relationNames: string[] = [];
			relationMetadata.forEach((rel) => {
				if (rel.sourceField === 'relation') relationNames.push(rel.fieldName);
			});
			return Array.from(new Set([...scalarNames, ...relationNames]));
		}

		return [] as string[];
	}, [rows, metaFields, relationMetadata]);

	// Extract column keys from data
	const columnKeys: string[] = useMemo(() => {
		if (baseFieldNames.length === 0) return [];
		const keys = [...baseFieldNames];

		const belongsToForeignKeysToHide = new Set<string>();
		const foreignKeysByRelationField = new Map<string, string[]>();

		relationMetadata.forEach((rel) => {
			if (rel.sourceField === 'foreignKey' && rel.relationFieldName) {
				const existing = foreignKeysByRelationField.get(rel.relationFieldName);
				if (existing) {
					existing.push(rel.fieldName);
				} else {
					foreignKeysByRelationField.set(rel.relationFieldName, [rel.fieldName]);
				}
			}
		});

		relationMetadata.forEach((rel) => {
			if (rel.sourceField !== 'relation' || rel.relationKind !== 'belongsTo' || !rel.relationFieldName) {
				return;
			}

			const foreignKeyEntries = foreignKeysByRelationField.get(rel.relationFieldName);
			if (foreignKeyEntries?.length) {
				foreignKeyEntries.forEach((fieldName) => {
					belongsToForeignKeysToHide.add(fieldName);
				});
			}
		});

		const filteredKeys = keys.filter((key) => !belongsToForeignKeysToHide.has(key));

		// Ensure id comes first if present
		const idIdx = filteredKeys.indexOf('id');
		if (idIdx > -1) {
			filteredKeys.splice(idIdx, 1);
			filteredKeys.unshift('id');
		}
		return filteredKeys;
	}, [baseFieldNames, relationMetadata]);

	// Create relation metadata map for quick lookup
	const relationMetadataMap = useMemo(() => {
		const map: Record<string, RelationMetadata> = {};

		relationMetadata.forEach((rel) => {
			map[rel.fieldName] = rel;
		});

		return map;
	}, [relationMetadata]);

	// Table fields metadata
	// Generate columns with improved error handling
	const columns: RelationGridColumn[] = useMemo(() => {
		return columnKeys.map((fieldName) => {
			const metaField = metaFieldByName.get(fieldName);
			const relationInfo = relationMetadataMap[fieldName];
			const relationDisplayField = relationInfo?.relationFieldName || undefined;
			const isForeignKeyRelationField = relationInfo?.sourceField === 'foreignKey';

			// Use centralized cell type resolution
			const resolution = resolveCellType(fieldName, metaField);
			const cellType = resolution.cellType;

			// For relation fields, use relation kind as type label
			const typeLabel = relationInfo?.relationKind
				? relationInfo.relationKind
				: metaField
					? metaField.type?.pgAlias || metaField.type?.pgType || metaField.type?.gqlType
					: cellType;

			let headerName = fieldName;
			if (relationInfo?.displayName) {
				headerName = relationInfo.displayName;
			} else if (relationDisplayField) {
				headerName = relationDisplayField;
			} else if (isForeignKeyRelationField) {
				const stripped = fieldName.replace(/Id$/i, '');
				headerName = stripped.length > 0 ? stripped : fieldName;
			}

			const titleRaw = typeLabel ? `${headerName} (${typeLabel})` : headerName;

			return {
				id: fieldName,
				title: titleRaw,
				width: metaField ? getColumnWidthByMeta(metaField) : 150,
			} satisfies RelationGridColumn;
		});
	}, [columnKeys, metaFieldByName, relationMetadataMap]);

	// Helper function using centralized image field detection
	const checkIsImageField = useCallback((fieldMeta: FieldMetadata | undefined, fieldName?: string): boolean => {
		return isImageField(fieldMeta, fieldName);
	}, []);

	// Helper function to find the correct column key for image cells
	const findImageColumnKey = useCallback(
		(columnKeys: string[], fieldMetaMap: Map<string, unknown>, currentColKey?: string): string => {
			// If we already have a reliable column key, use it
			if (currentColKey && currentColKey !== 'id' && fieldMetaMap.has(currentColKey)) {
				const fieldMeta = fieldMetaMap.get(currentColKey) as FieldMetadata | undefined;
				if (checkIsImageField(fieldMeta, currentColKey)) {
					return currentColKey;
				}
			}

			// Look through all columns to find image-type fields
			for (const key of columnKeys) {
				const fieldMeta = fieldMetaMap.get(key) as FieldMetadata | undefined;
				if (fieldMeta && checkIsImageField(fieldMeta, key)) {
					return key;
				}
			}

			// Fallback to the current column key or first non-id column
			return currentColKey || columnKeys.find((k) => k !== 'id') || columnKeys[0] || '';
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
