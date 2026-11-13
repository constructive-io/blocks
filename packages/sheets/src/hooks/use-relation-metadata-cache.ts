/**
 * Relation metadata for a table's columns, read from the table model.
 *
 * Keys come from the model (proven key pairs), never from table-name guesses.
 * The entries follow the grid's column rule (`gridRelations`), so they are
 * rebuilt whenever the model is (a `_meta` refetch builds a new model).
 */
import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { cleanTable, type CleanTable, type TableModel } from '@constructive-io/data';
import { useSheetsContext } from '../context/sheets-context';
import { gridRelations } from '../relations/relation-columns';
import { sheetsQueryKeys, tableKeySegments } from './query-keys';
import { useTableModel } from './use-table-model';

export type RelationMetadataSource = 'relation' | 'foreignKey';

export interface RelationMetadata {
	tableName: string;
	fieldName: string;
	relationKind: 'belongsTo' | 'hasOne' | 'hasMany' | 'manyToMany';
	targetTable: string;
	isOptional: boolean;
	foreignKeyFields: string[];
	/** Headline relation field name when this metadata originates from a foreign key */
	relationFieldName?: string | null;
	/** Primary foreign key field associated with the relation */
	foreignKeyField?: string;
	/** Indicates whether the metadata entry is for the relation field or the FK column */
	sourceField: RelationMetadataSource;
	junctionTable?: string;
	displayName?: string;
}

/**
 * Simple error state tracking
 */
export interface RelationCacheState {
	isLoading: boolean;
	isError: boolean;
	error: Error | null;
	hasData: boolean;
	relationCount: number;
}

export interface RelationMetadataSet {
	relationFields: RelationMetadata[];
	foreignKeyFields: RelationMetadata[];
}

const NO_RELATIONS: RelationMetadataSet = { relationFields: [], foreignKeyFields: [] };

/** Relation and foreign-key column entries for one model. */
function relationMetadataOf(model: TableModel, tableName: string): RelationMetadataSet {
	const relationFields: RelationMetadata[] = [];
	const foreignKeyFields: RelationMetadata[] = [];

	for (const relation of gridRelations(model)) {
		const base = { tableName, relationKind: relation.kind, targetTable: relation.targetName, sourceField: 'relation' as const };
		if (relation.kind === 'belongsTo') {
			const keys = relation.keys.map((pair) => pair.local);
			relationFields.push({
				...base,
				fieldName: relation.fieldName,
				isOptional: relation.unlinkable,
				foreignKeyFields: keys,
				relationFieldName: relation.fieldName,
				foreignKeyField: keys[0],
			});
			for (const key of keys) {
				foreignKeyFields.push({
					...base,
					fieldName: key,
					isOptional: relation.unlinkable,
					foreignKeyFields: keys,
					relationFieldName: relation.fieldName,
					foreignKeyField: key,
					sourceField: 'foreignKey',
				});
			}
		} else if (relation.kind === 'manyToMany') {
			relationFields.push({
				...base,
				fieldName: relation.fieldName,
				isOptional: relation.unlinkable,
				foreignKeyFields: [],
				relationFieldName: relation.fieldName,
				junctionTable: relation.junction?.tableName,
			});
		} else {
			relationFields.push({
				...base,
				fieldName: relation.fieldName,
				isOptional: relation.unlinkable,
				foreignKeyFields: relation.keys.map((pair) => pair.local),
				relationFieldName: relation.fieldName,
				foreignKeyField: relation.keys[0]?.remote,
			});
		}
	}
	return { relationFields, foreignKeyFields };
}

/**
 * Cache and expose relation metadata for a table
 */
export function useRelationMetadataCache(tableName?: string) {
	const queryClient = useQueryClient();
	const { scopeKey } = useSheetsContext();
	const { model, metaTable, tableKey, isLoading, error } = useTableModel(tableName);

	const tableRelations = useMemo<CleanTable | null>(() => (metaTable ? cleanTable(metaTable) : null), [metaTable]);
	const { relationFields, foreignKeyFields } = useMemo(
		() => (model ? relationMetadataOf(model, tableName ?? model.name) : NO_RELATIONS),
		[model, tableName],
	);

	const relationMetadata = useMemo(() => relationFields.concat(foreignKeyFields), [relationFields, foreignKeyFields]);

	const relationMap = useMemo(() => {
		const map = new Map<string, RelationMetadata>();
		relationFields.forEach((rel) => {
			map.set(rel.fieldName, rel);
		});
		foreignKeyFields.forEach((rel) => {
			map.set(rel.fieldName, rel);
		});
		return map;
	}, [relationFields, foreignKeyFields]);

	// Rebuild the table model (and with it this metadata) from fresh types.
	const invalidateRelationCache = useCallback(async () => {
		if (!tableKey) return;
		await queryClient.invalidateQueries({
			queryKey: [...sheetsQueryKeys.scope(scopeKey), 'table-model', ...tableKeySegments(tableKey)],
		});
	}, [queryClient, scopeKey, tableKey]);

	// Get relation info for a specific field
	const getRelationInfo = useCallback(
		(fieldName: string): RelationMetadata | null => {
			return relationMap.get(fieldName) || null;
		},
		[relationMap],
	);

	// Check if field is a relation
	const isRelationField = useCallback(
		(fieldName: string): boolean => {
			return relationMap.has(fieldName);
		},
		[relationMap],
	);

	// Get relation kind for backward compatibility
	const getRelationKind = useCallback(
		(fieldName: string): 'belongsTo' | 'hasOne' | 'hasMany' | 'manyToMany' | null => {
			const relation = relationMap.get(fieldName);
			return relation?.relationKind || null;
		},
		[relationMap],
	);

	const cacheState: RelationCacheState = useMemo(
		() => ({
			isLoading,
			isError: Boolean(error),
			error,
			hasData: relationMetadata.length > 0,
			relationCount: relationMetadata.length,
		}),
		[isLoading, error, relationMetadata.length],
	);

	return {
		// Data
		model,
		relationMetadata,
		relationFields,
		foreignKeyFields,
		relationMap,
		tableRelations,

		// State
		cacheState,
		isLoading,
		isError: Boolean(error),
		error,

		// Utilities
		getRelationInfo,
		isRelationField,
		getRelationKind,
		invalidateRelationCache,
	};
}
