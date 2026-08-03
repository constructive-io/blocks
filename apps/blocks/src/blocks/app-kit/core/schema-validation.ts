import type {
  AppFieldDefinition,
  AppFieldKind,
  AppRelationCardinality,
  AppResourceDefinition
} from './contracts';

export type AppMetaField = Readonly<{
  name?: string | null;
  isNotNull?: boolean | null;
  isPrimaryKey?: boolean | null;
  enumValues?:
    | readonly string[]
    | Readonly<{ name?: string | null; values?: readonly string[] | null }>
    | null;
  type?: Readonly<{
    pgType?: string | null;
    gqlType?: string | null;
    isArray?: boolean | null;
    isNotNull?: boolean | null;
  }> | null;
}>;

export type AppMetaRelation = Readonly<{
  fieldName?: string | null;
  isUnique?: boolean | null;
  type?: string | null;
  references?: Readonly<{ name?: string | null }> | null;
  referencedBy?: Readonly<{ name?: string | null }> | null;
  rightTable?: Readonly<{ name?: string | null }> | null;
}>;

export type AppMetaTable = Readonly<{
  name?: string | null;
  schemaName?: string | null;
  query?: Readonly<{
    all?: string | null;
    one?: string | null;
    create?: string | null;
    update?: string | null;
    delete?: string | null;
  }> | null;
  inflection?: Readonly<{
    tableType?: string | null;
    connection?: string | null;
  }> | null;
  fields?: readonly (AppMetaField | null)[] | null;
  constraints?:
    | Readonly<{
        primaryKey?: Readonly<{
          fields?: readonly (AppMetaField | null)[] | null;
        }> | null;
      }>
    | readonly (Readonly<{
        __typename?: string | null;
        fields?: readonly (AppMetaField | null)[] | null;
      }> | null)[]
    | null;
  primaryKeyConstraints?: readonly (Readonly<{
    fields?: readonly (AppMetaField | null)[] | null;
  }> | null)[] | null;
  relations?: Readonly<{
    belongsTo?: readonly (AppMetaRelation | null)[] | null;
    has?: readonly (AppMetaRelation | null)[] | null;
    hasOne?: readonly (AppMetaRelation | null)[] | null;
    hasMany?: readonly (AppMetaRelation | null)[] | null;
    manyToMany?: readonly (AppMetaRelation | null)[] | null;
  }> | null;
}>;

export type AppMetaQuery = Readonly<{
  _meta?: Readonly<{
    tables?: readonly (AppMetaTable | null)[] | null;
  }> | null;
}>;

export type AppIntrospectionTypeRef = Readonly<{
  name?: string | null;
  kind?: string | null;
  ofType?: AppIntrospectionTypeRef | null;
}>;

export type AppIntrospectionField = Readonly<{
  name: string;
  type?: AppIntrospectionTypeRef | null;
}>;

export type AppIntrospectionType = Readonly<{
  name: string;
  kind?: string | null;
  fields?: readonly AppIntrospectionField[] | null;
  enumValues?: readonly Readonly<{ name: string }>[] | null;
}>;

export type AppGraphQLIntrospection = Readonly<{
  __schema?: Readonly<{
    queryType?: Readonly<{ name?: string | null }> | null;
    mutationType?: Readonly<{ name?: string | null }> | null;
    types?: readonly AppIntrospectionType[] | null;
  }> | null;
}>;

export type AppResourceValidationIssue = Readonly<{
  code: string;
  message: string;
  path: string;
  severity: 'error' | 'warning';
}>;

export type AppValidatedField = Readonly<{
  key: string;
  databaseName: string;
  graphQLName: string;
  editable: boolean;
  reason?: string;
}>;

export type AppResourceValidationResult = Readonly<{
  compatible: boolean;
  capabilities: Readonly<{
    read: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
  }>;
  issues: readonly AppResourceValidationIssue[];
  fields: readonly AppValidatedField[];
}>;

type AppMetaRelationKind =
  | 'belongsTo'
  | 'has'
  | 'hasOne'
  | 'hasMany'
  | 'manyToMany';

type IndexedMetaRelation = Readonly<{
  kind: AppMetaRelationKind;
  relation: AppMetaRelation;
}>;

// GraphQL transports lossless PostgreSQL numerics as strings. Keeping them in
// the string family prevents generated inputs from coercing them through JS
// Number and losing precision.
const STRING_SCALARS = new Set([
  'BigFloat',
  'BigInt',
  'Decimal',
  'ID',
  'String',
  'UUID'
]);
const INTEGER_SCALARS = new Set(['Int']);
const FLOAT_SCALARS = new Set(['Float']);
const BOOLEAN_SCALARS = new Set(['Boolean']);
const DATE_SCALARS = new Set(['Date']);
const DATETIME_SCALARS = new Set(['DateTime', 'Datetime']);
const JSON_SCALARS = new Set(['JSON', 'JSONB', 'JSONValue', 'Json']);
const KNOWN_SCALARS = new Set([
  ...STRING_SCALARS,
  ...INTEGER_SCALARS,
  ...FLOAT_SCALARS,
  ...BOOLEAN_SCALARS,
  ...DATE_SCALARS,
  ...DATETIME_SCALARS,
  ...JSON_SCALARS
]);

function baseTypeName(type: AppIntrospectionTypeRef | null | undefined) {
  let current = type;
  while (current?.ofType) current = current.ofType;
  return current?.name ?? null;
}

function isNonNullType(type: AppIntrospectionTypeRef | null | undefined) {
  return type?.kind === 'NON_NULL';
}

function listType(type: AppIntrospectionTypeRef | null | undefined) {
  let current = type;
  while (current?.kind === 'NON_NULL') current = current.ofType;
  return current?.kind === 'LIST';
}

function namedTypeKind(
  type: AppIntrospectionTypeRef | null | undefined,
  types: ReadonlyMap<string, AppIntrospectionType>
) {
  let current = type;
  while (current?.ofType) current = current.ofType;
  if (current?.kind) return current.kind;
  return current?.name ? types.get(current.name)?.kind ?? null : null;
}

function fieldRequiresCustomRenderer(kind: AppFieldKind): boolean {
  return kind === 'json' || kind === 'custom';
}

function scalarKind(kind: AppFieldKind): AppFieldKind {
  if (kind === 'string-array') return 'string';
  if (kind === 'integer-array') return 'integer';
  if (kind === 'float-array') return 'float';
  return kind;
}

function graphQLScalarSupportsKind(kind: AppFieldKind, scalar: string) {
  switch (scalarKind(kind)) {
    case 'string':
      return STRING_SCALARS.has(scalar);
    case 'integer':
      return INTEGER_SCALARS.has(scalar);
    case 'float':
      return FLOAT_SCALARS.has(scalar);
    case 'boolean':
      return BOOLEAN_SCALARS.has(scalar);
    case 'date':
      return DATE_SCALARS.has(scalar);
    case 'datetime':
      return DATETIME_SCALARS.has(scalar);
    case 'json':
      return JSON_SCALARS.has(scalar);
    case 'custom':
      return !KNOWN_SCALARS.has(scalar);
    case 'enum':
      return false;
    default:
      return false;
  }
}

function normalizedPgType(value: string | null | undefined) {
  return (value ?? '')
    .replace(/\[\]$/u, '')
    .split('.')
    .at(-1)
    ?.replace(/^"|"$/gu, '')
    .toLowerCase() ?? '';
}

function pgTypeSupportsKind(kind: AppFieldKind, pgType: string) {
  const scalar = scalarKind(kind);
  if (scalar === 'custom' || scalar === 'enum') return true;
  if (scalar === 'string') {
    return /^(?:bigint|bigserial|bpchar|char|citext|decimal|inet|int8|name|numeric|serial8|text|uuid|varchar|character varying)$/u.test(pgType);
  }
  if (scalar === 'integer') {
    return /^(?:int2|int4|integer|serial|serial2|serial4|smallint)$/u.test(pgType);
  }
  if (scalar === 'float') {
    return /^(?:double precision|float4|float8|real)$/u.test(pgType);
  }
  if (scalar === 'boolean') return /^(?:bool|boolean)$/u.test(pgType);
  if (scalar === 'date') return pgType === 'date';
  if (scalar === 'datetime') {
    return /^(?:timestamp|timestamp with time zone|timestamp without time zone|timestamptz)$/u.test(pgType);
  }
  if (scalar === 'json') return /^(?:json|jsonb)$/u.test(pgType);
  return true;
}

function primaryKeyNames(table: AppMetaTable): Readonly<{
  ambiguous: boolean;
  names: readonly string[];
}> {
  if (table.constraints && 'primaryKey' in table.constraints) {
    const fields = table.constraints.primaryKey?.fields ?? [];
    return {
      ambiguous: false,
      names: fields.map((field) => field?.name ?? '').filter(Boolean)
    };
  }
  if (table.constraints) {
    const constraints = table.constraints as readonly (Readonly<{
      __typename?: string | null;
      fields?: readonly (AppMetaField | null)[] | null;
    }> | null)[];
    const keys = constraints.filter(
      (constraint) => constraint?.__typename === 'MetaPrimaryKeyConstraint'
    );
    return {
      ambiguous: keys.length > 1,
      names:
        keys[0]?.fields?.map((field) => field?.name ?? '').filter(Boolean) ?? []
    };
  }
  const legacy = table.primaryKeyConstraints?.filter(Boolean) ?? [];
  if (legacy.length > 0) {
    return {
      ambiguous: legacy.length > 1,
      names:
        legacy[0]?.fields?.map((field) => field?.name ?? '').filter(Boolean) ?? []
    };
  }
  return {
    ambiguous: false,
    names:
      table.fields
        ?.filter((field) => field?.isPrimaryKey)
        .map((field) => field?.name ?? '')
        .filter(Boolean) ?? []
  };
}

function indexedRelations(table: AppMetaTable | undefined): IndexedMetaRelation[] {
  if (!table?.relations) return [];
  const result: IndexedMetaRelation[] = [];
  const kinds: readonly AppMetaRelationKind[] = [
    'belongsTo',
    'has',
    'hasOne',
    'hasMany',
    'manyToMany'
  ];
  for (const kind of kinds) {
    for (const relation of table.relations[kind] ?? []) {
      if (relation) result.push({ kind, relation });
    }
  }
  return result;
}

function metaRelationCardinality({
  kind,
  relation
}: IndexedMetaRelation): AppRelationCardinality {
  if (kind === 'belongsTo' || kind === 'hasOne') return 'one';
  if (kind === 'has') return relation.isUnique ? 'one' : 'many';
  return 'many';
}

function metaRelationTarget({ kind, relation }: IndexedMetaRelation) {
  if (kind === 'belongsTo') return relation.references?.name ?? null;
  if (kind === 'manyToMany') return relation.rightTable?.name ?? null;
  return relation.referencedBy?.name ?? null;
}

function isConnectionType(type: AppIntrospectionType | undefined) {
  return Boolean(
    type?.kind === 'OBJECT' &&
      type.fields?.some((field) => field.name === 'nodes' || field.name === 'edges')
  );
}

function relationTargetTypeName(
  field: AppIntrospectionField,
  types: ReadonlyMap<string, AppIntrospectionType>
) {
  const returnedName = baseTypeName(field.type);
  if (listType(field.type)) return returnedName;
  const returnedType = returnedName ? types.get(returnedName) : undefined;
  const nodes = returnedType?.fields?.find((candidate) => candidate.name === 'nodes');
  if (nodes) return baseTypeName(nodes.type);
  const edges = returnedType?.fields?.find((candidate) => candidate.name === 'edges');
  const edgeTypeName = baseTypeName(edges?.type);
  const edgeType = edgeTypeName ? types.get(edgeTypeName) : undefined;
  const node = edgeType?.fields?.find((candidate) => candidate.name === 'node');
  return node ? baseTypeName(node.type) : returnedName;
}

/**
 * Reconciles an explicit resource definition with already-fetched `_meta` and
 * final GraphQL introspection. It performs no network access and is intended
 * for agent generation, CI, and build-time checks.
 */
export function validateAppResource<
  TRecord extends Record<string, unknown>,
  TIdentity,
  TListInput,
  TListOutput,
  TActions extends Readonly<Record<string, unknown>>
>(
  resource: AppResourceDefinition<
    TRecord,
    TIdentity,
    TListInput,
    TListOutput,
    TActions
  >,
  evidence: Readonly<{
    meta: AppMetaQuery;
    introspection: AppGraphQLIntrospection;
  }>
): AppResourceValidationResult {
  const issues: AppResourceValidationIssue[] = [];
  const addIssue = (
    code: string,
    path: string,
    message: string,
    severity: 'error' | 'warning' = 'error'
  ) => issues.push({ code, message, path, severity });

  const tables = evidence.meta._meta?.tables ?? [];
  const table = tables.find(
    (candidate) =>
      candidate?.name === resource.source.tableName &&
      (candidate.schemaName ?? 'public') === resource.source.schemaName
  ) ?? undefined;

  if (!table) {
    addIssue(
      'META_TABLE_MISSING',
      `_meta.tables.${resource.source.schemaName}.${resource.source.tableName}`,
      `The table ${resource.source.schemaName}.${resource.source.tableName} is absent from _meta.`
    );
  }

  if (
    table?.inflection?.tableType &&
    table.inflection.tableType !== resource.source.graphQLTypeName
  ) {
    addIssue(
      'META_TYPE_INFLECTION_MISMATCH',
      `_meta.tables.${resource.source.tableName}.inflection.tableType`,
      `The resource uses ${resource.source.graphQLTypeName}, but _meta inflects the database table to ${table.inflection.tableType}.`
    );
  }
  if (table?.query?.all && table.query.all !== resource.source.listFieldName) {
    addIssue(
      'META_LIST_INFLECTION_MISMATCH',
      `_meta.tables.${resource.source.tableName}.query.all`,
      `The resource uses ${resource.source.listFieldName}, but _meta exposes the list root as ${table.query.all}.`
    );
  }

  const schema = evidence.introspection.__schema;
  const types = new Map(
    (schema?.types ?? []).map((type) => [type.name, type] as const)
  );
  const recordType = types.get(resource.source.graphQLTypeName);
  if (!recordType || recordType.kind !== 'OBJECT') {
    addIssue(
      'GRAPHQL_TYPE_MISSING',
      `__schema.types.${resource.source.graphQLTypeName}`,
      `The final GraphQL schema does not expose ${resource.source.graphQLTypeName} as an object.`
    );
  }

  const queryRootName = schema?.queryType?.name ?? '';
  const queryRoot = types.get(queryRootName);
  if (!queryRoot || queryRoot.kind !== 'OBJECT') {
    addIssue(
      'GRAPHQL_QUERY_ROOT_MISSING',
      '__schema.queryType',
      'The final GraphQL query root is absent.'
    );
  }

  const listField = queryRoot?.fields?.find(
    (field) => field.name === resource.source.listFieldName
  );
  if (!listField) {
    addIssue(
      'GRAPHQL_LIST_FIELD_MISSING',
      `__schema.types.${queryRootName}.fields.${resource.source.listFieldName}`,
      `The configured list field ${resource.source.listFieldName} is absent from the final GraphQL schema.`
    );
  } else {
    const returnedName = baseTypeName(listField.type);
    const expectedConnection = table?.inflection?.connection;
    const returnsRecordList =
      listType(listField.type) && returnedName === resource.source.graphQLTypeName;
    const returnsConnection = isConnectionType(
      returnedName ? types.get(returnedName) : undefined
    );
    if (
      (expectedConnection && returnedName !== expectedConnection) ||
      (!returnsRecordList && !returnsConnection)
    ) {
      addIssue(
        'GRAPHQL_LIST_TYPE_MISMATCH',
        `__schema.types.${queryRootName}.fields.${resource.source.listFieldName}.type`,
        `The list field returns ${returnedName ?? 'an unknown type'}, which is neither the final record list nor the _meta connection ${expectedConnection ?? 'for this resource'}.`
      );
    }
  }

  if (resource.source.detailFieldName) {
    if (
      table?.query?.one &&
      table.query.one !== resource.source.detailFieldName
    ) {
      addIssue(
        'META_DETAIL_INFLECTION_MISMATCH',
        `_meta.tables.${resource.source.tableName}.query.one`,
        `The resource uses ${resource.source.detailFieldName}, but _meta exposes the detail root as ${table.query.one}.`
      );
    }
    const detailField = queryRoot?.fields?.find(
      (field) => field.name === resource.source.detailFieldName
    );
    if (!detailField) {
      addIssue(
        'GRAPHQL_DETAIL_FIELD_MISSING',
        `__schema.types.${queryRootName}.fields.${resource.source.detailFieldName}`,
        `The configured detail field ${resource.source.detailFieldName} is absent from the final GraphQL schema.`
      );
    } else if (baseTypeName(detailField.type) !== resource.source.graphQLTypeName) {
      addIssue(
        'GRAPHQL_DETAIL_TYPE_MISMATCH',
        `__schema.types.${queryRootName}.fields.${resource.source.detailFieldName}.type`,
        `The detail field returns ${baseTypeName(detailField.type) ?? 'an unknown type'} instead of ${resource.source.graphQLTypeName}.`
      );
    }
  }

  const operationEntries = [
    ['create', resource.source.createMutationName],
    ['update', resource.source.updateMutationName],
    ['delete', resource.source.deleteMutationName]
  ] as const;
  const mutationRootName = schema?.mutationType?.name ?? '';
  const mutationRoot = types.get(mutationRootName);
  if (
    operationEntries.some(([, mutationName]) => Boolean(mutationName)) &&
    (!mutationRoot || mutationRoot.kind !== 'OBJECT')
  ) {
    addIssue(
      'GRAPHQL_MUTATION_ROOT_MISSING',
      '__schema.mutationType',
      'The final GraphQL mutation root is absent.'
    );
  }
  for (const [kind, mutationName] of operationEntries) {
    if (!mutationName) continue;
    if (table?.query && table.query[kind] !== mutationName) {
      addIssue(
        'META_MUTATION_INFLECTION_MISMATCH',
        `_meta.tables.${resource.source.tableName}.query.${kind}`,
        `The configured ${kind} mutation ${mutationName} does not match the _meta operation ${table.query[kind] ?? '<absent>'}.`
      );
    }
    if (!mutationRoot?.fields?.some((field) => field.name === mutationName)) {
      addIssue(
        'GRAPHQL_MUTATION_FIELD_MISSING',
        `__schema.types.${mutationRootName || '<mutation>'}.fields.${mutationName}`,
        `The configured mutation ${mutationName} is absent from the final GraphQL schema.`
      );
    }
  }
  if (resource.forms?.create && !resource.source.createMutationName) {
    addIssue(
      'FORM_OPERATION_MISSING',
      'forms.create',
      'The create form has no configured create mutation.'
    );
  }
  if (resource.forms?.update && !resource.source.updateMutationName) {
    addIssue(
      'FORM_OPERATION_MISSING',
      'forms.update',
      'The update form has no configured update mutation.'
    );
  }

  const metaFields = new Map(
    (table?.fields ?? [])
      .filter((field): field is AppMetaField => Boolean(field?.name))
      .map((field) => [field.name as string, field] as const)
  );
  const graphQLFields = new Map(
    (recordType?.fields ?? []).map((field) => [field.name, field] as const)
  );

  const fields: AppValidatedField[] = resource.fields.map((field) => {
    const metaField = metaFields.get(field.databaseName);
    const graphQLField = graphQLFields.get(field.graphQLName);
    if (!metaField) {
      addIssue(
        'META_FIELD_MISSING',
        `_meta.tables.${resource.source.tableName}.fields.${field.databaseName}`,
        `Database field ${field.databaseName} is absent from _meta.`
      );
    }
    if (!graphQLField) {
      addIssue(
        'GRAPHQL_FIELD_MISSING',
        `__schema.types.${resource.source.graphQLTypeName}.fields.${field.graphQLName}`,
        `Final GraphQL field ${field.graphQLName} is absent from ${resource.source.graphQLTypeName}.`
      );
    }

    const graphQLTypeName = baseTypeName(graphQLField?.type);
    if (
      graphQLField &&
      metaField?.type?.gqlType &&
      graphQLTypeName !== metaField.type.gqlType
    ) {
      addIssue(
        'GRAPHQL_FIELD_TYPE_MISMATCH',
        `__schema.types.${resource.source.graphQLTypeName}.fields.${field.graphQLName}.type`,
        `Field ${field.graphQLName} resolves to ${graphQLTypeName ?? 'an unknown type'} instead of the _meta type ${metaField.type.gqlType}.`
      );
    }

    const definitionIsArray = field.kind.endsWith('-array');
    if (
      metaField?.type?.isArray !== undefined &&
      metaField.type.isArray !== null &&
      metaField.type.isArray !== definitionIsArray
    ) {
      addIssue(
        'META_FIELD_ARRAY_MISMATCH',
        `fields.${field.key}.kind`,
        `Field ${field.key} does not agree with the _meta array shape.`
      );
    }
    if (graphQLField && listType(graphQLField.type) !== definitionIsArray) {
      addIssue(
        'GRAPHQL_FIELD_ARRAY_MISMATCH',
        `__schema.types.${resource.source.graphQLTypeName}.fields.${field.graphQLName}.type`,
        `Field ${field.graphQLName} does not agree with the final GraphQL list shape.`
      );
    }

    const pgType = normalizedPgType(metaField?.type?.pgType);
    if (pgType && !pgTypeSupportsKind(field.kind, pgType)) {
      addIssue(
        'META_FIELD_KIND_MISMATCH',
        `fields.${field.key}.kind`,
        `Field ${field.key} is configured as ${field.kind}, which is incompatible with PostgreSQL type ${metaField?.type?.pgType}.`
      );
    }

    if (graphQLField && graphQLTypeName) {
      const finalKind = namedTypeKind(graphQLField.type, types);
      if (field.kind === 'enum') {
        if (finalKind !== 'ENUM') {
          addIssue(
            'GRAPHQL_FIELD_KIND_MISMATCH',
            `__schema.types.${resource.source.graphQLTypeName}.fields.${field.graphQLName}.type`,
            `Enum field ${field.graphQLName} does not resolve to a final GraphQL enum.`
          );
        } else {
          const enumType = types.get(graphQLTypeName);
          const enumValues = new Set(
            enumType?.enumValues?.map((value) => value.name)
          );
          for (const option of field.options ?? []) {
            if (!enumValues.has(option.value)) {
              addIssue(
                'GRAPHQL_ENUM_VALUE_MISSING',
                `__schema.types.${graphQLTypeName}.enumValues.${option.value}`,
                `Enum token ${option.value} is absent from the final GraphQL schema.`
              );
            }
          }
        }
      } else if (
        finalKind !== 'SCALAR' ||
        !graphQLScalarSupportsKind(field.kind, graphQLTypeName)
      ) {
        addIssue(
          'GRAPHQL_FIELD_KIND_MISMATCH',
          `__schema.types.${resource.source.graphQLTypeName}.fields.${field.graphQLName}.type`,
          `Field ${field.graphQLName} is configured as ${field.kind}, which is incompatible with final GraphQL ${finalKind ?? 'type'} ${graphQLTypeName}.`
        );
      }
    }

    const metaNotNull = metaField?.isNotNull ?? metaField?.type?.isNotNull;
    const graphQLNotNull = isNonNullType(graphQLField?.type);
    if (
      graphQLField &&
      metaNotNull !== undefined &&
      metaNotNull !== null &&
      metaNotNull !== graphQLNotNull
    ) {
      addIssue(
        'GRAPHQL_FIELD_NULLABILITY_MISMATCH',
        `__schema.types.${resource.source.graphQLTypeName}.fields.${field.graphQLName}.type`,
        `Field ${field.graphQLName} nullability disagrees with the database fact for ${field.databaseName}.`
      );
    }
    if (
      graphQLField &&
      field.nullable !== undefined &&
      field.nullable === graphQLNotNull
    ) {
      addIssue(
        'RESOURCE_FIELD_NULLABILITY_MISMATCH',
        `fields.${field.key}.nullable`,
        `Field ${field.key} nullability disagrees with the final GraphQL field ${field.graphQLName}.`
      );
    }

    const customReadOnly = fieldRequiresCustomRenderer(field.kind);
    return {
      key: field.key,
      databaseName: field.databaseName,
      graphQLName: field.graphQLName,
      editable: !field.readOnly && !customReadOnly,
      reason: customReadOnly
        ? `${field.kind} fields require an explicit input renderer.`
        : field.readOnly
          ? 'The resource marks this field read-only.'
          : undefined
    };
  });

  const metaRelations = indexedRelations(table);
  for (const relation of resource.relations ?? []) {
    const finalFieldName = relation.graphQLName ?? relation.fieldName;
    const metaRelation = metaRelations.find(
      (candidate) => candidate.relation.fieldName === finalFieldName
    );
    if (!metaRelation) {
      addIssue(
        'META_RELATION_MISSING',
        `_meta.tables.${resource.source.tableName}.relations.${finalFieldName}`,
        `Relation ${finalFieldName} is absent from _meta relation facts.`
      );
    } else {
      if (metaRelationCardinality(metaRelation) !== relation.cardinality) {
        addIssue(
          'META_RELATION_CARDINALITY_MISMATCH',
          `relations.${relation.id}.cardinality`,
          `Relation ${finalFieldName} is ${metaRelationCardinality(metaRelation)} in _meta, not ${relation.cardinality}.`
        );
      }
      const targetTable = metaRelationTarget(metaRelation);
      if (
        relation.targetTableName &&
        targetTable &&
        targetTable !== relation.targetTableName
      ) {
        addIssue(
          'META_RELATION_TARGET_MISMATCH',
          `relations.${relation.id}.targetTableName`,
          `Relation ${finalFieldName} targets database table ${targetTable}, not ${relation.targetTableName}.`
        );
      }
    }

    const graphQLRelation = graphQLFields.get(finalFieldName);
    if (!graphQLRelation) {
      addIssue(
        'GRAPHQL_RELATION_MISSING',
        `__schema.types.${resource.source.graphQLTypeName}.fields.${finalFieldName}`,
        `Relation ${finalFieldName} is absent from the final GraphQL type.`
      );
      continue;
    }
    const relationTypeName = baseTypeName(graphQLRelation.type);
    const relationTargetType = relationTargetTypeName(graphQLRelation, types);
    if (
      metaRelation?.relation.type &&
      relationTargetType !== metaRelation.relation.type
    ) {
      addIssue(
        'GRAPHQL_RELATION_TYPE_MISMATCH',
        `__schema.types.${resource.source.graphQLTypeName}.fields.${finalFieldName}.type`,
        `Relation ${finalFieldName} targets ${relationTargetType ?? 'an unknown type'} instead of the _meta target type ${metaRelation.relation.type}.`
      );
    }
    const relationReturnsMany =
      listType(graphQLRelation.type) ||
      isConnectionType(relationTypeName ? types.get(relationTypeName) : undefined);
    if (
      (relation.cardinality === 'many' && !relationReturnsMany) ||
      (relation.cardinality === 'one' && relationReturnsMany)
    ) {
      addIssue(
        'GRAPHQL_RELATION_CARDINALITY_MISMATCH',
        `__schema.types.${resource.source.graphQLTypeName}.fields.${finalFieldName}.type`,
        `Relation ${finalFieldName} does not have the configured ${relation.cardinality} shape in the final GraphQL schema.`
      );
    }
  }

  const primaryKey = primaryKeyNames(table ?? {});
  if (!resource.identity) {
    addIssue(
      'IDENTITY_MISSING',
      'identity',
      'The resource has no stable identity and will remain read-only.',
      'warning'
    );
  } else {
    const configuredIdentity = resource.identity.fields.map((key) => {
      const field = resource.fields.find((candidate) => candidate.key === key);
      return field?.databaseName ?? key;
    });
    const expected = [...primaryKey.names].sort();
    const actual = [...configuredIdentity].sort();
    if (
      primaryKey.ambiguous ||
      expected.length === 0 ||
      expected.length !== actual.length ||
      expected.some((name, index) => name !== actual[index])
    ) {
      addIssue(
        'IDENTITY_PRIMARY_KEY_MISMATCH',
        'identity.fields',
        'The resource identity does not match one unambiguous _meta primary key, so writes are unsafe.'
      );
    }
  }

  const compatible = issues.every((issue) => issue.severity !== 'error');
  const identitySafe = Boolean(resource.identity) && !issues.some(
    (issue) =>
      issue.severity === 'error' &&
      issue.code === 'IDENTITY_PRIMARY_KEY_MISMATCH'
  );
  const sharedWriteBlockingCodes = new Set([
    'GRAPHQL_FIELD_ARRAY_MISMATCH',
    'GRAPHQL_FIELD_KIND_MISMATCH',
    'GRAPHQL_FIELD_MISSING',
    'GRAPHQL_FIELD_NULLABILITY_MISMATCH',
    'GRAPHQL_FIELD_TYPE_MISMATCH',
    'GRAPHQL_TYPE_MISSING',
    'IDENTITY_PRIMARY_KEY_MISMATCH',
    'META_FIELD_ARRAY_MISMATCH',
    'META_FIELD_KIND_MISMATCH',
    'META_FIELD_MISSING',
    'META_TABLE_MISSING',
    'META_TYPE_INFLECTION_MISMATCH',
    'RESOURCE_FIELD_NULLABILITY_MISMATCH'
  ]);
  const sharedWriteSafe = identitySafe && !issues.some(
    (issue) =>
      issue.severity === 'error' && sharedWriteBlockingCodes.has(issue.code)
  );
  const operationAvailable = (
    kind: 'create' | 'update' | 'delete',
    name: string | undefined
  ) =>
    sharedWriteSafe &&
    Boolean(name) &&
    !issues.some(
      (issue) =>
        issue.severity === 'error' &&
        issue.code === 'GRAPHQL_MUTATION_ROOT_MISSING'
    ) &&
    !issues.some(
      (issue) =>
        issue.severity === 'error' &&
        (issue.path === `forms.${kind}` ||
          issue.path.includes(`query.${kind}`) ||
          (name ? issue.path.includes(`fields.${name}`) : false))
    );
  const read = !issues.some(
    (issue) =>
      issue.severity === 'error' &&
      ![
        'FORM_OPERATION_MISSING',
        'GRAPHQL_MUTATION_FIELD_MISSING',
        'META_MUTATION_INFLECTION_MISMATCH'
      ].includes(issue.code)
  );
  return {
    capabilities: {
      create: operationAvailable('create', resource.source.createMutationName),
      delete: operationAvailable('delete', resource.source.deleteMutationName),
      read,
      update: operationAvailable('update', resource.source.updateMutationName)
    },
    compatible,
    issues,
    fields
  };
}
