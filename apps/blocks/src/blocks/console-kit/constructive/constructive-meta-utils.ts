import type { MetaschemaField, MetaschemaTable } from '@constructive-io/data';

import type { ConsoleKitMetadataState } from '../console-kit-contracts';

const GRAPHQL_NAME = /^[_A-Za-z][_0-9A-Za-z]*$/u;

export type ConstructiveMetaTableContract = Readonly<{
  table: MetaschemaTable;
  root: string;
}>;

export function isConstructiveGraphQLName(value: string): boolean {
  return GRAPHQL_NAME.test(value);
}

export function canonicalMetaName(
  value: string | null | undefined
): string {
  return (value ?? '').replace(/[^A-Za-z0-9]/gu, '').toLowerCase();
}

export function compatibleMetaTables(
  metadata: ConsoleKitMetadataState
): MetaschemaTable[] {
  if (metadata.status !== 'compatible') return [];
  return (metadata.meta._meta?.tables ?? []).filter(
    (table): table is MetaschemaTable => Boolean(table)
  );
}

export function readableMetaTable(
  table: MetaschemaTable
): ConstructiveMetaTableContract | null {
  const root = table.query?.all;
  if (!root || !isConstructiveGraphQLName(root)) return null;
  return { table, root };
}

export function metaFields(table: MetaschemaTable): MetaschemaField[] {
  return (table.fields ?? []).filter(
    (field): field is MetaschemaField =>
      field != null && isConstructiveGraphQLName(field.name)
  );
}

export function metaFieldName(
  table: MetaschemaTable,
  aliases: readonly string[]
): string | undefined {
  const candidates = metaFields(table);
  for (const alias of aliases) {
    const match = candidates.find(
      (field) => canonicalMetaName(field.name) === alias
    );
    if (match) return match.name;
  }
  return undefined;
}

export function metaPrimaryKeyField(
  table: MetaschemaTable
): string | undefined {
  const constraints = table.constraints;
  const hasConstraintMetadata = constraints !== undefined && constraints !== null;
  if (constraints && !Array.isArray(constraints)) {
    const current = constraints.primaryKey;
    if (!current) return undefined;
    const fields = (current.fields ?? []).filter(
      (field): field is MetaschemaField =>
        field != null && isConstructiveGraphQLName(field.name)
    );
    return fields.length === 1 ? fields[0]?.name : undefined;
  }

  if (Array.isArray(constraints)) {
    const current = constraints.filter(
      (constraint) => constraint?.__typename === 'MetaPrimaryKeyConstraint'
    );
    if (current.length !== 1) return undefined;
    const fields = (current[0]?.fields ?? []).filter(
      (field): field is MetaschemaField =>
        field != null && isConstructiveGraphQLName(field.name)
    );
    return fields.length === 1 ? fields[0]?.name : undefined;
  }

  const hasLegacyMetadata = table.primaryKeyConstraints !== undefined &&
    table.primaryKeyConstraints !== null;
  const legacy = (table.primaryKeyConstraints ?? []).filter(
    (constraint): constraint is NonNullable<typeof constraint> =>
      constraint != null
  );
  if (legacy.length > 0) {
    if (legacy.length !== 1) return undefined;
    const fields = (legacy[0]?.fields ?? []).filter(
      (field): field is MetaschemaField =>
        field != null && isConstructiveGraphQLName(field.name)
    );
    return fields.length === 1 ? fields[0]?.name : undefined;
  }

  // The id fallback exists only for cached metadata predating PK fields. An
  // explicit no-PK or composite-PK declaration must never be collapsed to id.
  return hasConstraintMetadata || hasLegacyMetadata
    ? undefined
    : metaFieldName(table, ['id']);
}

export function metaTableNames(table: MetaschemaTable): string[] {
  return [
    table.name,
    table.inflection?.tableType,
    table.inflection?.allRows
  ].flatMap((value) => {
    const canonical = canonicalMetaName(value);
    if (!canonical) return [];
    return canonical.endsWith('s')
      ? [canonical, canonical.slice(0, -1)]
      : [canonical];
  });
}

export function metaTableNamespace(table: MetaschemaTable): string {
  return [table.schemaName, table.name].filter(Boolean).join('.') || table.name;
}

export function metaSelection(
  fields: readonly (string | undefined)[]
): string {
  return [...new Set(
    fields.filter((field): field is string => Boolean(field))
  )].join(' ');
}
