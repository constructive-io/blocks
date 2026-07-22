import { pluralize } from 'inflekt';
import { cleanTable, pgFieldToCamelCase, type CleanTable, type MetaQuery } from '@constructive-io/data';
import { getJunctionTableNames, isJunctionTablePure } from '../utils/relation-utils';

export type RelationKind = 'belongsTo' | 'hasOne' | 'hasMany' | 'manyToMany';

export interface RelationInfo {
  kind: RelationKind;
  relatedTable?: string;
  displayCandidates: string[];
  relationField?: string;
  foreignKeyField?: string;
  junctionTable?: string;
  junctionLeftKeyField?: string;
  junctionRightKeyField?: string;
  displayName?: string;
}

export interface RelationInfoSlice {
  relationInfoCache: Record<string, Record<string, RelationInfo>>;
  relationInfoMapCache: Record<string, Map<string, RelationInfo>>;
  setRelationInfoForTable: (tableName: string, info: Record<string, RelationInfo>) => void;
  getRelationInfoForTable: (tableName: string) => Record<string, RelationInfo> | undefined;
  getRelationInfoMapForTable: (tableName: string) => Map<string, RelationInfo> | undefined;
  rebuildRelationInfo: (tableName: string, meta: MetaQuery | undefined) => void;
  ensureRelationInfo: (tableName: string, meta: MetaQuery | undefined) => Record<string, RelationInfo>;
  clearRelationInfoCache: () => void;
}

interface RelationInfoState {
  relationInfoCache: Record<string, Record<string, RelationInfo>>;
  relationInfoMapCache: Record<string, Map<string, RelationInfo>>;
}

type RelationInfoSetState = (
  partial: Partial<RelationInfoState> | ((state: RelationInfoState) => Partial<RelationInfoState>),
) => void;

type RelationInfoGetState = () => RelationInfoState;

function toRelationInfoMap(info: Record<string, RelationInfo>): Map<string, RelationInfo> {
  return new Map(Object.entries(info));
}

function setTableRelationInfo(set: RelationInfoSetState, tableName: string, info: Record<string, RelationInfo>): void {
  set((state) => ({
    relationInfoCache: { ...state.relationInfoCache, [tableName]: info },
    relationInfoMapCache: { ...state.relationInfoMapCache, [tableName]: toRelationInfoMap(info) },
  }));
}

export function createRelationInfoSlice(set: RelationInfoSetState, get: RelationInfoGetState): RelationInfoSlice {
  return {
    relationInfoCache: {},
    relationInfoMapCache: {},
    setRelationInfoForTable: (tableName, info) => setTableRelationInfo(set, tableName, info),
    getRelationInfoForTable: (tableName) => get().relationInfoCache[tableName],
    getRelationInfoMapForTable: (tableName) => get().relationInfoMapCache[tableName],
    clearRelationInfoCache: () => set({ relationInfoCache: {}, relationInfoMapCache: {} }),
    rebuildRelationInfo: (tableName: string, meta: MetaQuery | undefined) => {
      try {
        const info = buildRelationInfoFromMeta(tableName, meta);
        if (!info) return;
        setTableRelationInfo(set, tableName, info);
      } catch {
        // ignore
      }
    },
    ensureRelationInfo: (tableName: string, meta: MetaQuery | undefined) => {
      const existing = get().relationInfoCache[tableName];
      if (existing) return existing;
      const info = buildRelationInfoFromMeta(tableName, meta) || {};
      if (Object.keys(info).length) {
        setTableRelationInfo(set, tableName, info);
      }
      return info;
    },
  };
}

type MetaTableNode = NonNullable<NonNullable<NonNullable<MetaQuery['_meta']>['tables']>[number]>;

function toCleanTables(meta: MetaQuery | undefined): CleanTable[] {
  const tables = meta?._meta?.tables ?? [];
  return tables.filter((table): table is MetaTableNode => table != null).map((table) => cleanTable(table));
}

function firstFieldName(fields: Array<{ name: string }>): string | undefined {
  return fields[0]?.name;
}

/**
 * For hasOne/hasMany relations, find the FK field in the RELATED table that
 * references the current table. relation.keys contains the PK of the current
 * table (e.g. "id"), but the relation editor needs the FK in the child table
 * (e.g. "questionnaireId") to link/unlink records.
 *
 * Resolution chain:
 * 1. Related table's belongsTo relations (from cleanTable)
 * 2. Related table's foreignKeyConstraints (from raw _meta)
 */
function findForeignKeyInRelatedTable(
  currentTableName: string,
  relatedTableName: string,
  allTables: CleanTable[],
  rawMetaTables: readonly MetaTableNode[],
): string | undefined {
  // 1. Try belongsTo on the related cleaned table
  const relatedTable = allTables.find((t) => t.name === relatedTableName);
  if (relatedTable) {
    const belongsTo = relatedTable.relations.belongsTo.find(
      (rel) => rel.referencesTable === currentTableName,
    );
    if (belongsTo?.keys?.[0]?.name) return belongsTo.keys[0].name;
  }

  // 2. Fall back to foreignKeyConstraints on the raw _meta related table
  const rawRelated = rawMetaTables.find((t) => t.name === relatedTableName);
  if (rawRelated) {
    // v5 nested: constraints.foreignKey[]
    const v5Fks = Array.isArray(rawRelated.constraints) ? [] : rawRelated.constraints?.foreignKey;
    // v4 flat: foreignKeyConstraints[]
    const fks = v5Fks ?? rawRelated.foreignKeyConstraints ?? [];
    for (const fk of fks) {
      if (!fk) continue;
      const refName = fk.refTable?.name;
      // refTable.name is a codec name (camelCase) — match case-insensitively
      if (refName && refName.toLowerCase() === currentTableName.toLowerCase()) {
        const fieldName = fk.fields?.[0]?.name;
        if (fieldName) return pgFieldToCamelCase(fieldName);
      }
    }
  }

  return undefined;
}

export function buildRelationInfoFromMeta(
  tableName: string,
  meta: MetaQuery | undefined,
): Record<string, RelationInfo> | null {
  const tables = toCleanTables(meta);
  const table = tables.find((candidate) => candidate.name === tableName);
  if (!table) return null;

  const rawMetaTables = (meta?._meta?.tables ?? []).filter(
    (t): t is MetaTableNode => t != null,
  );

  const PRIORITY_FIELDS = [
    'displayName',
    'fullName',
    'preferredName',
    'nickname',
    'firstName',
    'lastName',
    'givenName',
    'familyName',
    'username',
    'handle',
    'email',
    'phone',
    'title',
    'label',
    'slug',
    'code',
    'name',
  ];
  const NAME_PATTERN = /name/i;

  const computeCandidates = (relatedTableName?: string): string[] => {
    if (!relatedTableName) return [];
    const related = tables.find((candidate) => candidate.name === relatedTableName);
    if (!related) return [];

    const fieldNamesSet = new Set<string>(related.fields.map((field) => field.name));
    const explicit = PRIORITY_FIELDS.filter((k) => fieldNamesSet.has(k));
    const explicitSet = new Set(explicit);

    const nameLike: string[] = [];
    for (const name of fieldNamesSet) {
      if (NAME_PATTERN.test(name) && !explicitSet.has(name)) {
        nameLike.push(name);
      }
    }
    nameLike.sort((a, b) => a.length - b.length);

    return Array.from(new Set([...explicit, ...nameLike]));
  };

  const info: Record<string, RelationInfo> = {};
  table.relations.belongsTo.forEach((relation) => {
    const displayCandidates = computeCandidates(relation.referencesTable);
    const foreignKeys = relation.keys.map((key) => key.name).filter(Boolean);
    const primaryForeignKey = foreignKeys[0];

    if (relation.fieldName) {
      info[relation.fieldName] = {
        kind: 'belongsTo',
        relatedTable: relation.referencesTable,
        displayCandidates,
        relationField: relation.fieldName,
        foreignKeyField: primaryForeignKey,
      };
    }

    foreignKeys.forEach((fk) => {
      if (!fk) return;
      info[fk] = {
        kind: 'belongsTo',
        relatedTable: relation.referencesTable,
        displayCandidates,
        relationField: relation.fieldName ?? undefined,
        foreignKeyField: fk,
      };
    });
  });
  table.relations.hasOne.forEach((relation) => {
    if (relation.fieldName) {
      // relation.keys contains the PK of the CURRENT table, not the FK in the
      // related table. Resolve the actual FK field via:
      // 1. Related table's belongsTo (cleanTable)
      // 2. Related table's foreignKeyConstraints (raw _meta)
      const fkInRelated = findForeignKeyInRelatedTable(tableName, relation.referencedByTable, tables, rawMetaTables);
      info[relation.fieldName] = {
        kind: 'hasOne',
        relatedTable: relation.referencedByTable,
        displayCandidates: computeCandidates(relation.referencedByTable),
        relationField: relation.fieldName,
        foreignKeyField: fkInRelated,
      };
    }
  });
  const junctionTableNames = getJunctionTableNames(table.relations, rawMetaTables);

  table.relations.hasMany.forEach((relation) => {
    if (!relation.fieldName) return;
    // Skip hasMany relations pointing to junction tables (M:N covers these)
    if (junctionTableNames.has(relation.referencedByTable)) return;
    const fkInRelated = findForeignKeyInRelatedTable(tableName, relation.referencedByTable, tables, rawMetaTables);
    info[relation.fieldName] = {
      kind: 'hasMany',
      relatedTable: relation.referencedByTable,
      displayCandidates: computeCandidates(relation.referencedByTable),
      relationField: relation.fieldName,
      foreignKeyField: fkInRelated,
    };
  });
  table.relations.manyToMany.forEach((relation) => {
    if (relation.fieldName) {
      // Prefer direct key fields from enriched cleanTable()
      let junctionLeftKeyField = relation.junctionLeftKeyFields?.[0];
      let junctionRightKeyField = relation.junctionRightKeyFields?.[0];

      // Fallback: derive from junction table's belongsTo relations
      if (!junctionLeftKeyField || !junctionRightKeyField) {
        const junctionTableName = relation.junctionTable;
        const junctionTable = junctionTableName
          ? tables.find((candidate) => candidate.name === junctionTableName)
          : undefined;
        const junctionBelongsTo = junctionTable?.relations.belongsTo ?? [];
        if (!junctionLeftKeyField) {
          const leftRelation = junctionBelongsTo.find((entry) => entry.referencesTable === tableName);
          junctionLeftKeyField = firstFieldName(leftRelation?.keys ?? []);
        }
        if (!junctionRightKeyField) {
          const rightRelation = junctionBelongsTo.find((entry) => entry.referencesTable === relation.rightTable);
          junctionRightKeyField = firstFieldName(rightRelation?.keys ?? []);
        }
      }

      // Skip non-pure junction tables — they have required fields beyond the
      // two FK columns, so the manyToMany editor cannot produce valid mutations.
      if (!isJunctionTablePure(relation.junctionTable, junctionLeftKeyField, junctionRightKeyField, rawMetaTables)) {
        return;
      }

      info[relation.fieldName] = {
        kind: 'manyToMany',
        relatedTable: relation.rightTable,
        displayCandidates: computeCandidates(relation.rightTable),
        relationField: relation.fieldName,
        junctionTable: relation.junctionTable,
        junctionLeftKeyField,
        junctionRightKeyField,
        displayName: pluralize(relation.rightTable),
      };
    }
  });

  return info;
}
