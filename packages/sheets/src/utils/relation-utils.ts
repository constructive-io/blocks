import { singularize } from "inflekt";
import { pgFieldToCamelCase, type CleanTable, type CleanRelations, type MetaQuery } from "@constructive-io/data";

type PrimitiveId = string | number | null;

type MetaTable = NonNullable<NonNullable<NonNullable<MetaQuery["_meta"]>["tables"]>[number]>;


/**
 * Convert a camelCase plural codec name (as used in raw _meta relation references)
 * to PascalCase singular (matching `_meta.tables[].name` format).
 * e.g. "formResponses" → "FormResponse"
 */
function codecNameToTableName(name: string): string {
  if (!name) return name;
  const singular = singularize(name);
  return singular.charAt(0).toUpperCase() + singular.slice(1);
}

/**
 * Derive all relation field names from raw table metadata relations.
 * Filters out hasMany entries that point to junction tables (those are surfaced via manyToMany),
 * and deduplicates manyToMany entries targeting the same table.
 */
export function getAllRelationFields(
  relations: MetaTable["relations"] | null | undefined,
  metaTables?: readonly MetaTable[],
): string[] {
  if (!relations) return [];

  const out: string[] = [];
  const push = (fieldName?: string | null) => {
    if (fieldName) out.push(fieldName);
  };

  relations.belongsTo?.forEach((rel) => push(rel?.fieldName));
  relations.hasOne?.forEach((rel) => push(rel?.fieldName));

  const junctionNames = new Set<string>();
  relations.manyToMany?.forEach((rel) => {
    const jtName = rel?.junctionTable?.name;
    if (!jtName) return;
    // When meta tables are available, skip non-pure junction tables
    if (metaTables) {
      const leftFk = rel?.junctionLeftKeyAttributes?.[0]?.name;
      const rightFk = rel?.junctionRightKeyAttributes?.[0]?.name;
      const leftFkCamel = leftFk ? pgFieldToCamelCase(leftFk) : undefined;
      const rightFkCamel = rightFk ? pgFieldToCamelCase(rightFk) : undefined;
      // Raw _meta codec names need conversion to match MetaTable.name format
      const jtTableName = codecNameToTableName(jtName);
      if (!isJunctionTablePure(jtTableName, leftFkCamel, rightFkCamel, metaTables)) return;
    }
    junctionNames.add(jtName);
  });
  relations.hasMany?.forEach((rel) => {
    const refName = rel?.referencedBy?.name;
    if (refName && junctionNames.has(refName)) return;
    push(rel?.fieldName);
  });

  const seenM2N = new Map<string, { fieldName?: string | null }>();
  relations.manyToMany?.forEach((rel) => {
    const target = rel?.rightTable?.name;
    if (!target) return;
    // Skip non-pure junction table M:N relations
    if (metaTables) {
      const jtName = rel?.junctionTable?.name;
      if (jtName) {
        const leftFk = rel?.junctionLeftKeyAttributes?.[0]?.name;
        const rightFk = rel?.junctionRightKeyAttributes?.[0]?.name;
        const leftFkCamel = leftFk ? pgFieldToCamelCase(leftFk) : undefined;
        const rightFkCamel = rightFk ? pgFieldToCamelCase(rightFk) : undefined;
        const jtTableName = codecNameToTableName(jtName);
        if (!isJunctionTablePure(jtTableName, leftFkCamel, rightFkCamel, metaTables)) return;
      }
    }
    seenM2N.set(target, rel);
  });
  seenM2N.forEach((rel) => push(rel?.fieldName));

  return Array.from(new Set(out));
}

/**
 * Check whether a junction table is "pure" — i.e. it has no required fields
 * beyond the two FK columns that form the M:N link.
 *
 * Rich entity tables that PostGraphile incidentally detects as junction tables
 * (e.g. `form_response` which has FKs to both `form_question` and `form_section`
 * but also requires `entity_id`, `session_id`, etc.) should NOT be treated as
 * simple junction tables because the manyToMany editor can only set the two FK
 * fields and would produce invalid mutations.
 */
export function isJunctionTablePure(
  junctionTableName: string,
  leftFkField: string | undefined,
  rightFkField: string | undefined,
  metaTables: readonly MetaTable[],
): boolean {
  if (!leftFkField || !rightFkField) return true; // Can't verify, assume pure
  const junctionMeta = metaTables.find((t) => t?.name === junctionTableName);
  if (!junctionMeta?.fields) return true; // No field info available, assume pure

  const exemptFields = new Set(['id', leftFkField, rightFkField]);

  for (const field of junctionMeta.fields) {
    if (!field?.name) continue;
    const camelName = pgFieldToCamelCase(field.name);
    if (exemptFields.has(camelName)) continue;
    if (field.isNotNull && !field.hasDefault) return false;
  }
  return true;
}

/**
 * Collect junction table names from M:N relations.
 * Used to suppress hasMany-to-junction columns and hide junction tables from UIs.
 *
 * When `metaTables` is provided, non-pure junction tables (those with extra required
 * fields beyond the two FK columns) are excluded — their hasMany entries should remain
 * visible since the manyToMany editor cannot handle them.
 */
export function getJunctionTableNames(
  relations: CleanRelations,
  metaTables?: readonly MetaTable[],
): Set<string> {
  const names = new Set<string>();
  for (const rel of relations.manyToMany) {
    if (!rel.junctionTable) continue;
    if (metaTables) {
      const leftFk = rel.junctionLeftKeyFields?.[0];
      const rightFk = rel.junctionRightKeyFields?.[0];
      if (!isJunctionTablePure(rel.junctionTable, leftFk, rightFk, metaTables)) continue;
    }
    names.add(rel.junctionTable);
  }
  return names;
}

function extractPrimitiveId(candidate: unknown): PrimitiveId {
  if (candidate === null || candidate === undefined) return null;
  if (typeof candidate === "string" || typeof candidate === "number") {
    return candidate;
  }
  if (typeof candidate === "object") {
    const record = candidate as Record<string, unknown>;
    const id = record.id;
    if (typeof id === "string" || typeof id === "number") {
      return id;
    }
  }
  return null;
}

export function normalizeForeignKeyValue(input: unknown): unknown {
  if (input === undefined) return undefined;
  if (input === null) return null;

  if (Array.isArray(input)) {
    return input
      .map((entry) => extractPrimitiveId(entry))
      .filter((entry): entry is PrimitiveId => entry !== undefined);
  }

  return extractPrimitiveId(input);
}

/**
 * Find the foreign key field in a related table that references the current table
 */
function findForeignKeyField(
  currentTableName: string,
  relatedTableName: string,
  allTables?: CleanTable[],
): string | undefined {
  if (!allTables) return undefined;

  // Find the related table
  const relatedTable = allTables.find((table) => table.name === relatedTableName);
  if (!relatedTable) return undefined;

  // Look for a belongsTo relation in the related table that references our current table
  const belongsToRelation = relatedTable.relations.belongsTo.find(
    (relation) => relation.referencesTable === currentTableName,
  );

  if (belongsToRelation && belongsToRelation.keys?.[0]?.name) {
    return belongsToRelation.keys[0].name;
  }

  return undefined;
}

export interface RelationshipInfo {
  relationType: "belongsTo" | "hasOne" | "hasMany" | "manyToMany";
  relationField: string;
  relatedTableName: string;
  foreignKeyField?: string;
  junctionTableName?: string;
  junctionLeftKey?: string;
  junctionRightKey?: string;
}

/**
 * Extract relationship information from table metadata for a specific field
 * For hasMany/hasOne relations, we need to find the actual foreign key field in the related table
 */
export function getRelationshipInfo(
  currentTable: CleanTable,
  relationFieldName: string,
  allTables?: CleanTable[],
): RelationshipInfo | null {
  const { relations } = currentTable;

  // Check belongsTo relations
  const belongsToRelation = relations.belongsTo.find((rel) => rel.fieldName === relationFieldName);
  if (belongsToRelation) {
    // For belongsTo: get the foreign key field name from the keys array
    const foreignKeyField = belongsToRelation.keys?.[0]?.name;
    return {
      relationType: "belongsTo",
      relationField: relationFieldName,
      relatedTableName: belongsToRelation.referencesTable,
      foreignKeyField: foreignKeyField,
    };
  }

  // Check hasOne relations
  const hasOneRelation = relations.hasOne.find((rel) => rel.fieldName === relationFieldName);
  if (hasOneRelation) {
    // For hasOne: find the foreign key field in the related table that references our current table
    const foreignKeyField = findForeignKeyField(
      currentTable.name,
      hasOneRelation.referencedByTable,
      allTables,
    );
    return {
      relationType: "hasOne",
      relationField: relationFieldName,
      relatedTableName: hasOneRelation.referencedByTable,
      foreignKeyField: foreignKeyField,
    };
  }

  // Check hasMany relations
  const hasManyRelation = relations.hasMany.find((rel) => rel.fieldName === relationFieldName);
  if (hasManyRelation) {
    // For hasMany: find the foreign key field in the related table that references our current table
    const foreignKeyField = findForeignKeyField(
      currentTable.name,
      hasManyRelation.referencedByTable,
      allTables,
    );
    return {
      relationType: "hasMany",
      relationField: relationFieldName,
      relatedTableName: hasManyRelation.referencedByTable,
      foreignKeyField: foreignKeyField,
    };
  }

  // Check manyToMany relations
  const manyToManyRelation = relations.manyToMany.find(
    (rel) => rel.fieldName === relationFieldName,
  );
  if (manyToManyRelation) {
    return {
      relationType: "manyToMany",
      relationField: relationFieldName,
      relatedTableName: manyToManyRelation.rightTable,
      junctionTableName: manyToManyRelation.junctionTable,
      junctionLeftKey: manyToManyRelation.junctionLeftKeyFields?.[0],
      junctionRightKey: manyToManyRelation.junctionRightKeyFields?.[0],
    };
  }

  return null;
}

/**
 * Get a display-friendly label from a record using common field patterns
 */
const DISPLAY_LABEL_FIELDS = [
  "name", "title", "label", "displayName", "fullName",
  "email", "username", "description", "code",
];

export function getRecordDisplayLabel(record: any): string {
  if (!record || typeof record !== "object") {
    return String(record || "");
  }

  // Try common display field patterns
  for (const field of DISPLAY_LABEL_FIELDS) {
    if (record[field] != null && String(record[field]).trim()) {
      return String(record[field]);
    }
  }

  // Fallback to ID
  if (record.id != null) {
    return `Record ${record.id}`;
  }

  return "Unknown Record";
}

/**
 * Get record ID, handling different ID field patterns
 */
export function getRecordId(record: any): string {
  if (!record || typeof record !== "object") {
    return String(record || "");
  }

  // Try common ID field patterns
  const idFields = ["id", "uuid", "_id", "pk"];

  for (const field of idFields) {
    if (record[field] != null) {
      return String(record[field]);
    }
  }

  // Fallback to first field value
  const keys = Object.keys(record);
  if (keys.length > 0) {
    return String(record[keys[0]] || "");
  }

  return "";
}
