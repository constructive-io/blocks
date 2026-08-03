import { describe, expect, it } from 'vitest';

import {
  createAppScopeFingerprint,
  createAppScopeQueryKey,
  defineQuery,
  defineResource,
  validateAppResource,
  type AppGraphQLIntrospection,
  type AppMetaQuery,
  type AppScope
} from './index';

type Program = Record<string, unknown> & {
  id: string;
  locale: string;
  title: string;
  stage: string;
  tags: string[];
  settings: Record<string, unknown>;
  metric: unknown;
};

const listPrograms = defineQuery<unknown, readonly Program[]>({
  id: 'programs.list',
  execute: () => []
});

function programResource(identity = true) {
  return defineResource<Program, { id: string; locale: string }>({
    id: identity ? 'programs' : 'programs-read-only',
    label: 'Program',
    pluralLabel: 'Programs',
    source: {
      schemaName: 'events',
      tableName: 'programs',
      graphQLTypeName: 'EventProgram',
      listFieldName: 'eventProgramsConnection',
      detailFieldName: 'eventProgramByIdAndLocale',
      createMutationName: identity ? 'createEventProgram' : undefined,
      updateMutationName: identity ? 'updateEventProgramByIdAndLocale' : undefined
    },
    fields: [
      { key: 'id', databaseName: 'id', graphQLName: 'id', kind: 'string', label: 'ID' },
      { key: 'locale', databaseName: 'locale', graphQLName: 'locale', kind: 'string', label: 'Locale' },
      { key: 'title', databaseName: 'title', graphQLName: 'displayTitle', kind: 'string', label: 'Title' },
      {
        key: 'stage',
        databaseName: 'stage',
        graphQLName: 'stage',
        kind: 'enum',
        label: 'Stage',
        options: [
          { label: 'Draft', value: 'DRAFT' },
          { label: 'Published', value: 'PUBLISHED' }
        ]
      },
      { key: 'tags', databaseName: 'tags', graphQLName: 'tags', kind: 'string-array', label: 'Tags' },
      { key: 'settings', databaseName: 'settings', graphQLName: 'settings', kind: 'json', label: 'Settings' },
      { key: 'metric', databaseName: 'metric', graphQLName: 'metric', kind: 'custom', label: 'Metric' }
    ],
    displayField: 'title',
    forms: identity
      ? {
          create: {
            fields: [
              { field: 'title', required: true },
              { field: 'stage', required: true }
            ]
          },
          update: { fields: [{ field: 'title' }, { field: 'stage' }] }
        }
      : undefined,
    identity: identity
      ? {
          fields: ['id', 'locale'],
          read: (record) => ({ id: record.id, locale: record.locale }),
          serialize: (value) => `${value.id}:${value.locale}`
        }
      : undefined,
    queries: { list: listPrograms },
    relations: [
      {
        cardinality: 'many',
        fieldName: 'sessionsByProgramIdAndLocale',
        graphQLName: 'sessionsByProgramIdAndLocale',
        id: 'sessions',
        label: 'Sessions',
        targetTableName: 'sessions',
        targetResourceId: 'sessions'
      }
    ]
  });
}

const meta: AppMetaQuery = {
  _meta: {
    tables: [
      {
        name: 'programs',
        schemaName: 'events',
        query: {
          all: 'eventProgramsConnection',
          create: 'createEventProgram',
          one: 'eventProgramByIdAndLocale',
          update: 'updateEventProgramByIdAndLocale'
        },
        inflection: {
          connection: 'EventProgramConnection',
          tableType: 'EventProgram'
        },
        fields: [
          { name: 'id', isPrimaryKey: true, type: { gqlType: 'ID', pgType: 'uuid' } },
          { name: 'locale', isPrimaryKey: true, type: { gqlType: 'String', pgType: 'text' } },
          { name: 'title', type: { gqlType: 'String', pgType: 'text' } },
          {
            name: 'stage',
            enumValues: { name: 'program_stage', values: ['draft', 'published'] },
            type: { gqlType: 'ProgramStage', pgType: 'program_stage' }
          },
          { name: 'tags', type: { gqlType: 'String', isArray: true, pgType: 'text[]' } },
          { name: 'settings', type: { gqlType: 'JSON', pgType: 'jsonb' } },
          { name: 'metric', type: { gqlType: 'EventMetric', pgType: 'event_metric' } }
        ],
        primaryKeyConstraints: [{ fields: [{ name: 'id' }, { name: 'locale' }] }],
        relations: {
          hasMany: [
            {
              fieldName: 'sessionsByProgramIdAndLocale',
              referencedBy: { name: 'sessions' },
              type: 'Session'
            }
          ]
        }
      }
    ]
  }
};

const scalar = (name: string) => ({ kind: 'SCALAR', name });
const introspection: AppGraphQLIntrospection = {
  __schema: {
    queryType: { name: 'EventsQueryRoot' },
    mutationType: { name: 'EventsMutationRoot' },
    types: [
      {
        kind: 'OBJECT',
        name: 'EventsQueryRoot',
        fields: [
          { name: 'eventProgramsConnection', type: { name: 'EventProgramConnection' } },
          { name: 'eventProgramByIdAndLocale', type: { name: 'EventProgram' } }
        ]
      },
      {
        kind: 'OBJECT',
        name: 'EventsMutationRoot',
        fields: [
          { name: 'createEventProgram', type: { name: 'CreateEventProgramPayload' } },
          { name: 'updateEventProgramByIdAndLocale', type: { name: 'UpdateEventProgramPayload' } }
        ]
      },
      {
        kind: 'OBJECT',
        name: 'EventProgram',
        fields: [
          { name: 'id', type: scalar('ID') },
          { name: 'locale', type: scalar('String') },
          { name: 'displayTitle', type: scalar('String') },
          { name: 'stage', type: { kind: 'ENUM', name: 'ProgramStage' } },
          {
            name: 'tags',
            type: { kind: 'LIST', ofType: scalar('String') }
          },
          { name: 'settings', type: scalar('JSON') },
          { name: 'metric', type: scalar('EventMetric') },
          { name: 'sessionsByProgramIdAndLocale', type: { name: 'SessionConnection' } }
        ]
      },
      {
        kind: 'OBJECT',
        name: 'EventProgramConnection',
        fields: [{ name: 'nodes', type: { kind: 'LIST', ofType: { name: 'EventProgram' } } }]
      },
      {
        kind: 'OBJECT',
        name: 'SessionConnection',
        fields: [{ name: 'nodes', type: { kind: 'LIST', ofType: { name: 'Session' } } }]
      },
      {
        enumValues: [{ name: 'DRAFT' }, { name: 'PUBLISHED' }],
        kind: 'ENUM',
        name: 'ProgramStage'
      }
    ]
  }
};

describe('App Kit resource contracts', () => {
  it('validates final inflected names, custom roots, enums, arrays, custom scalars, composite identity, and relations', () => {
    const result = validateAppResource(programResource(), { introspection, meta });

    expect(result.compatible).toBe(true);
    expect(result.capabilities).toEqual({
      create: true,
      delete: false,
      read: true,
      update: true
    });
    expect(result.issues).toEqual([]);
    expect(result.fields.find((field) => field.key === 'tags')?.editable).toBe(true);
    expect(result.fields.find((field) => field.key === 'settings')).toMatchObject({
      editable: false,
      reason: expect.stringContaining('renderer')
    });
    expect(result.fields.find((field) => field.key === 'metric')?.editable).toBe(false);
  });

  it('keeps resources without identity read-only without rejecting their read contract', () => {
    const originalTable = meta._meta?.tables?.[0];
    const noPrimaryKeyMeta: AppMetaQuery = {
      _meta: {
        tables: originalTable
          ? [
              {
                ...originalTable,
                fields: originalTable.fields?.map((field) =>
                  field ? { ...field, isPrimaryKey: false } : field
                ),
                primaryKeyConstraints: []
              }
            ]
          : []
      }
    };
    const result = validateAppResource(programResource(false), {
      introspection,
      meta: noPrimaryKeyMeta
    });

    expect(result.compatible).toBe(true);
    expect(result.capabilities).toEqual({
      create: false,
      delete: false,
      read: true,
      update: false
    });
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'IDENTITY_MISSING', severity: 'warning' })
    );
  });

  it('rejects final-schema kind, nullability, list, and relation-shape drift', () => {
    const originalTable = meta._meta?.tables?.[0];
    const driftedMeta: AppMetaQuery = {
      _meta: {
        tables: originalTable
          ? [
              {
                ...originalTable,
                fields: originalTable.fields?.map((field) =>
                  field?.name === 'title'
                    ? { ...field, isNotNull: true }
                    : field
                ),
                relations: {
                  hasOne: originalTable.relations?.hasMany,
                  hasMany: []
                }
              }
            ]
          : []
      }
    };
    const driftedSchema: AppGraphQLIntrospection = {
      __schema: {
        ...introspection.__schema,
        types: (introspection.__schema?.types ?? []).map((type) => {
          if (type.name === 'EventsQueryRoot') {
            return {
              ...type,
              fields: type.fields?.map((field) =>
                field.name === 'eventProgramsConnection'
                  ? { ...field, type: { name: 'EventProgram' } }
                  : field
              )
            };
          }
          if (type.name === 'EventProgram') {
            return {
              ...type,
              fields: type.fields?.map((field) => {
                if (field.name === 'displayTitle') {
                  return { ...field, type: scalar('Int') };
                }
                if (field.name === 'sessionsByProgramIdAndLocale') {
                  return { ...field, type: { name: 'Venue' } };
                }
                return field;
              })
            };
          }
          return type;
        })
      }
    };

    const result = validateAppResource(programResource(), {
      introspection: driftedSchema,
      meta: driftedMeta
    });
    expect(result.compatible).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'GRAPHQL_LIST_TYPE_MISMATCH',
        'GRAPHQL_FIELD_TYPE_MISMATCH',
        'GRAPHQL_FIELD_KIND_MISMATCH',
        'GRAPHQL_FIELD_NULLABILITY_MISMATCH',
        'META_RELATION_CARDINALITY_MISMATCH',
        'GRAPHQL_RELATION_TYPE_MISMATCH',
        'GRAPHQL_RELATION_CARDINALITY_MISMATCH'
      ])
    );
  });

  it.each([
    ['BigInt', 'bigint', 'integer'],
    ['Decimal', 'numeric', 'float']
  ] as const)(
    'requires lossless %s values to use string fields',
    (graphQLScalar, pgType, lossyKind) => {
      const originalTable = meta._meta?.tables?.[0];
      const numericMeta: AppMetaQuery = {
        _meta: {
          tables: originalTable
            ? [{
                ...originalTable,
                fields: originalTable.fields?.map((field) =>
                  field?.name === 'metric'
                    ? { ...field, type: { gqlType: graphQLScalar, pgType } }
                    : field
                )
              }]
            : []
        }
      };
      const numericIntrospection: AppGraphQLIntrospection = {
        __schema: {
          ...introspection.__schema,
          types: (introspection.__schema?.types ?? []).map((type) =>
            type.name === 'EventProgram'
              ? {
                  ...type,
                  fields: type.fields?.map((field) =>
                    field.name === 'metric'
                      ? { ...field, type: scalar(graphQLScalar) }
                      : field
                  )
                }
              : type
          )
        }
      };
      const base = programResource();
      const withMetricKind = (kind: 'float' | 'integer' | 'string') =>
        defineResource({
          ...base,
          id: `programs-${graphQLScalar.toLowerCase()}-${kind}`,
          fields: base.fields.map((field) =>
            field.key === 'metric' ? { ...field, kind } : field
          )
        });

      const lossy = validateAppResource(withMetricKind(lossyKind), {
        introspection: numericIntrospection,
        meta: numericMeta
      });
      expect(lossy.compatible).toBe(false);
      expect(lossy.issues.map((issue) => issue.code)).toEqual(
        expect.arrayContaining([
          'META_FIELD_KIND_MISMATCH',
          'GRAPHQL_FIELD_KIND_MISMATCH'
        ])
      );

      const lossless = validateAppResource(withMetricKind('string'), {
        introspection: numericIntrospection,
        meta: numericMeta
      });
      expect(lossless.compatible).toBe(true);
      expect(lossless.fields.find((field) => field.key === 'metric')?.editable)
        .toBe(true);
    }
  );

  it('keeps mutation capabilities independent when one operation is absent', () => {
    const withoutCreate: AppGraphQLIntrospection = {
      __schema: {
        ...introspection.__schema,
        types: (introspection.__schema?.types ?? []).map((type) =>
          type.name === 'EventsMutationRoot'
            ? {
                ...type,
                fields: type.fields?.filter(
                  (field) => field.name !== 'createEventProgram'
                )
              }
            : type
        )
      }
    };

    const result = validateAppResource(programResource(), {
      introspection: withoutCreate,
      meta
    });
    expect(result.compatible).toBe(false);
    expect(result.capabilities).toEqual({
      create: false,
      delete: false,
      read: true,
      update: true
    });
  });

  it('rejects unknown or duplicate typed form fields during definition', () => {
    const base = programResource();
    expect(() =>
      defineResource({
        ...base,
        id: 'programs-invalid-form',
        forms: {
          create: {
            fields: [{ field: 'missing' }, { field: 'missing' }]
          }
        }
      } as never)
    ).toThrow(/form field "missing" is not declared/u);

    expect(() =>
      defineResource({
        ...base,
        id: 'programs-duplicate-form',
        forms: {
          update: { fields: [{ field: 'title' }, { field: 'title' }] }
        }
      })
    ).toThrow(/declares field "title" more than once/u);
  });

  it('reports absent operations, relations, enum tokens, and mismatched composite identities', () => {
    const resource = programResource();
    const originalTable = meta._meta?.tables?.[0];
    const brokenMeta: AppMetaQuery = {
      _meta: {
        tables: originalTable
          ? [
              {
                ...originalTable,
                primaryKeyConstraints: [{ fields: [{ name: 'id' }] }],
                relations: { ...originalTable.relations, hasMany: [] }
              }
            ]
          : []
      }
    };
    const brokenSchema: AppGraphQLIntrospection = {
      __schema: {
        ...introspection.__schema,
        types: (introspection.__schema?.types ?? []).map((type) => {
          if (
            type.name === 'EventsQueryRoot' ||
            type.name === 'EventsMutationRoot'
          ) {
            return { ...type, fields: [] };
          }
          if (type.name === 'ProgramStage') {
            return { ...type, enumValues: [{ name: 'DRAFT' }] };
          }
          return type;
        })
      }
    };

    const result = validateAppResource(resource, {
      introspection: brokenSchema,
      meta: brokenMeta
    });
    expect(result.compatible).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'GRAPHQL_LIST_FIELD_MISSING',
        'GRAPHQL_DETAIL_FIELD_MISSING',
        'GRAPHQL_MUTATION_FIELD_MISSING',
        'GRAPHQL_ENUM_VALUE_MISSING',
        'META_RELATION_MISSING',
        'IDENTITY_PRIMARY_KEY_MISMATCH'
      ])
    );
  });
});

describe('AppScope query partitioning', () => {
  it('changes the key for every security-relevant partition and excludes credentials by construction', () => {
    const base: AppScope = {
      databaseId: 'db-a',
      endpointId: 'endpoint-a',
      organizationId: 'org-a',
      schemaRevision: 'schema-a',
      securityRevision: 'security-a',
      sessionPartition: 'session-a',
      tenantId: 'tenant-a'
    };
    const variants: AppScope[] = [
      base,
      { ...base, endpointId: 'endpoint-b' },
      { ...base, databaseId: 'db-b' },
      { ...base, sessionPartition: 'session-b' },
      { ...base, organizationId: 'org-b' },
      { ...base, tenantId: 'tenant-b' },
      { ...base, schemaRevision: 'schema-b' },
      { ...base, securityRevision: 'security-b' }
    ];
    const serialized = variants.map((scope) =>
      JSON.stringify(createAppScopeQueryKey(scope))
    );
    expect(new Set(serialized).size).toBe(variants.length);
    expect(serialized.join(' ')).not.toContain('token');
  });

  it('requires both schema and security revisions', () => {
    const valid: AppScope = {
      databaseId: 'db-a',
      endpointId: 'endpoint-a',
      schemaRevision: 'schema-a',
      securityRevision: 'security-a',
      sessionPartition: 'session-a'
    };

    expect(() =>
      createAppScopeQueryKey({ ...valid, schemaRevision: '' })
    ).toThrow(/schemaRevision/u);
    expect(() =>
      createAppScopeQueryKey({ ...valid, securityRevision: '' })
    ).toThrow(/securityRevision/u);
  });

  it('fingerprints unusual stable identifiers without delimiter collisions', () => {
    const base: AppScope = {
      databaseId: 'db-a',
      endpointId: 'endpoint-a',
      schemaRevision: 'schema-a',
      securityRevision: 'security-a',
      sessionPartition: 'session-a'
    };
    const first = createAppScopeFingerprint({
      ...base,
      databaseId: 'db-a\u001fdatabase-b',
      endpointId: 'endpoint-a'
    });
    const second = createAppScopeFingerprint({
      ...base,
      databaseId: 'database-b',
      endpointId: 'endpoint-a\u001fdb-a'
    });

    expect(first).not.toBe(second);
  });
});
