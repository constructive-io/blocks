/**
 * Light-weight relation metadata cache with straightforward error handling
 */
import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { pluralize } from 'inflekt';
import { cleanTable, pgFieldToCamelCase, type CleanTable } from '@constructive-io/data';
import { useSheetsMeta } from './use-sheets-meta';
import { useSheetsContext, type SheetsScopeKey } from '../context/sheets-context';
import { sheetsQueryKeys } from './query-keys';
import { getJunctionTableNames, isJunctionTablePure } from '../utils/relation-utils';
import { sheetsLogger } from '../utils/sheets-logger';

/**
 * Simple cache keys for relations
 */
export const RELATION_CACHE_KEYS = {
	tableRelations: (scope: SheetsScopeKey, tableName: string) => sheetsQueryKeys.relations(scope, tableName),
} as const;

/**
 * Cache timing tuned for relation metadata
 */
export const RELATION_CACHE_CONFIG = {
	staleTime: 5 * 60 * 1000, // 5 minutes - reasonable for relation metadata
	gcTime: 30 * 60 * 1000, // 30 minutes - keep in memory longer
	retry: 3, // Retry failed requests
	retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 5000),
} as const;

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

/**
 * Cache and expose relation metadata for a table
 */
export function useRelationMetadataCache(tableName?: string) {
	const queryClient = useQueryClient();
	const { scopeKey } = useSheetsContext();
	const { data: metaData, isError: metaError, error: metaErrorDetails } = useSheetsMeta();

	// Get table relations with improved error handling
	const {
		data: tableRelations,
		isLoading,
		isError,
		error,
	} = useQuery({
		queryKey: RELATION_CACHE_KEYS.tableRelations(scopeKey, tableName || ''),
		queryFn: async (): Promise<CleanTable | null> => {
			if (!metaData?._meta?.tables || !tableName) {
				return null;
			}

			const metaTable = metaData._meta.tables.find((t) => t?.name === tableName);
			if (!metaTable) {
				// Don't throw error for missing table - just return null
				sheetsLogger().debug?.(`Table "${tableName}" not found in metadata`);
				return null;
			}

			return cleanTable(metaTable);
		},
		...RELATION_CACHE_CONFIG,
		refetchOnMount: true, // Respect staleTime and refresh stale relation metadata on mount
		enabled: Boolean(metaData && tableName),
	});

	// Extract relation metadata with error handling
	const { relationFields, foreignKeyFields } = useMemo((): RelationMetadataSet => {
		if (!tableRelations?.relations || isError) {
			return { relationFields: [], foreignKeyFields: [] };
		}

		const relationFieldEntries: RelationMetadata[] = [];
		const foreignKeyEntries: RelationMetadata[] = [];
		const relations = tableRelations.relations;

		try {
			// Process belongsTo relations
			relations.belongsTo.forEach((rel) => {
				if (!rel) return;
				const foreignKeys = rel.keys.map((k) => k.name);
				const primaryForeignKey = foreignKeys[0];
				if (rel.fieldName) {
					relationFieldEntries.push({
						tableName: tableName || '',
						fieldName: rel.fieldName,
						relationKind: 'belongsTo',
						targetTable: rel.referencesTable,
						isOptional: !rel.isUnique,
						foreignKeyFields: foreignKeys,
						relationFieldName: rel.fieldName,
						foreignKeyField: primaryForeignKey,
						sourceField: 'relation',
					});
				}

				foreignKeys.forEach((fk) => {
					if (!fk) return;
					foreignKeyEntries.push({
						tableName: tableName || '',
						fieldName: fk,
						relationKind: 'belongsTo',
						targetTable: rel.referencesTable,
						isOptional: !rel.isUnique,
						foreignKeyFields: foreignKeys,
						relationFieldName: rel.fieldName ?? null,
						foreignKeyField: fk,
						sourceField: 'foreignKey',
					});
				});
			});

			const rawMetaTables = (metaData?._meta?.tables ?? []).filter(
				(t): t is NonNullable<typeof t> => t != null,
			);

			// Resolve FK field in the related table using foreignKeyConstraints from _meta
			const findFk = (relatedTableName: string): string | undefined => {
				const rawRelated = rawMetaTables.find((t) => t?.name === relatedTableName);
				if (!rawRelated) return undefined;
				// v5 nested: constraints.foreignKey[]
				const v5Fks = Array.isArray(rawRelated.constraints) ? [] : rawRelated.constraints?.foreignKey;
				// v4 flat: foreignKeyConstraints[]
				const fks = v5Fks ?? rawRelated.foreignKeyConstraints ?? [];
				for (const fk of fks) {
					if (!fk) continue;
					const refName = fk.refTable?.name;
					if (refName && refName.toLowerCase() === (tableName || '').toLowerCase()) {
						const fieldName = fk.fields?.[0]?.name;
						if (fieldName) return pgFieldToCamelCase(fieldName);
					}
				}
				return undefined;
			};

			// Process hasOne relations
			relations.hasOne.forEach((rel) => {
				if (rel.fieldName) {
					relationFieldEntries.push({
						tableName: tableName || '',
						fieldName: rel.fieldName,
						relationKind: 'hasOne',
						targetTable: rel.referencedByTable,
						isOptional: true,
						foreignKeyFields: rel.keys.map((k) => k.name),
						relationFieldName: rel.fieldName,
						foreignKeyField: findFk(rel.referencedByTable),
						sourceField: 'relation',
					});
				}
			});

			const junctionTableNames = getJunctionTableNames(relations, rawMetaTables);

			// Process hasMany relations (skip those pointing to junction tables)
			relations.hasMany.forEach((rel) => {
				if (!rel.fieldName) return;
				// Skip hasMany relations pointing to junction tables (M:N covers these)
				if (junctionTableNames.has(rel.referencedByTable)) return;
				relationFieldEntries.push({
					tableName: tableName || '',
					fieldName: rel.fieldName,
					relationKind: 'hasMany',
					targetTable: rel.referencedByTable,
					isOptional: true,
					foreignKeyFields: rel.keys.map((k) => k.name),
					relationFieldName: rel.fieldName,
					foreignKeyField: findFk(rel.referencedByTable),
					sourceField: 'relation',
				});
			});

			// Process manyToMany relations (already deduped by rightTable in cleanTable())
			// Skip non-pure junction tables — they have required fields beyond the two FK columns
			relations.manyToMany.forEach((rel) => {
				if (rel.fieldName) {
					const leftFk = rel.junctionLeftKeyFields?.[0];
					const rightFk = rel.junctionRightKeyFields?.[0];
					if (rel.junctionTable && !isJunctionTablePure(rel.junctionTable, leftFk, rightFk, rawMetaTables)) {
						return;
					}
					relationFieldEntries.push({
						tableName: tableName || '',
						fieldName: rel.fieldName,
						relationKind: 'manyToMany',
						targetTable: rel.rightTable,
						isOptional: true,
						foreignKeyFields: [],
						relationFieldName: rel.fieldName,
						foreignKeyField: undefined,
						sourceField: 'relation',
						junctionTable: rel.junctionTable,
						displayName: pluralize(rel.rightTable),
					});
				}
			});
		} catch (processError) {
			sheetsLogger().warn('Error processing relation metadata:', processError);
		}

		return { relationFields: relationFieldEntries, foreignKeyFields: foreignKeyEntries };
	}, [tableRelations, tableName, isError, metaData]);

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

	// Simple cache invalidation
	const invalidateRelationCache = useCallback(async () => {
		if (tableName) {
			await queryClient.invalidateQueries({
				queryKey: RELATION_CACHE_KEYS.tableRelations(scopeKey, tableName),
			});
		}
	}, [queryClient, scopeKey, tableName]);

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

	// Simple cache state
	const cacheState: RelationCacheState = useMemo(
		() => ({
			isLoading: isLoading || (!metaData && !metaError),
			isError: isError || metaError,
			error: error || metaErrorDetails || null,
			hasData: Boolean(tableRelations && relationMetadata.length > 0),
			relationCount: relationMetadata.length,
		}),
		[isLoading, metaData, metaError, isError, error, metaErrorDetails, tableRelations, relationMetadata.length],
	);

	return {
		// Data
		relationMetadata,
		relationFields,
		foreignKeyFields,
		relationMap,
		tableRelations,

		// State
		cacheState,
		isLoading,
		isError,
		error,

		// Utilities
		getRelationInfo,
		isRelationField,
		getRelationKind,
		invalidateRelationCache,
	};
}
