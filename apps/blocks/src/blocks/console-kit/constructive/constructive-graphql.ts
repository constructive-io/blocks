import type { ConsoleEndpointKind } from '../../console-runtime';
import type { ConsoleKitAdapterContext } from '../console-kit-contracts';

export type ConstructiveTypeRef = Readonly<{
  kind: string;
  name?: string | null;
  ofType?: ConstructiveTypeRef | null;
}>;

export type ConstructiveSchemaInput = Readonly<{
  name: string;
  type: ConstructiveTypeRef;
}>;

export type ConstructiveSchemaField = Readonly<{
  name: string;
  args: readonly ConstructiveSchemaInput[];
  type: ConstructiveTypeRef;
}>;

export type ConstructiveSchemaType = Readonly<{
  kind: string;
  name: string;
  fields: readonly ConstructiveSchemaField[];
  inputFields: readonly ConstructiveSchemaInput[];
}>;

export type ConstructiveSchemaSnapshot = Readonly<{
  endpointKind: ConsoleEndpointKind;
  endpointId: string;
  queryFields: Readonly<Record<string, ConstructiveSchemaField>>;
  mutationFields: Readonly<Record<string, ConstructiveSchemaField>>;
  types: Readonly<Record<string, ConstructiveSchemaType>>;
}>;

type IntrospectionField = {
  name?: unknown;
  args?: unknown;
  type?: unknown;
};

type IntrospectionType = {
  kind?: unknown;
  name?: unknown;
  fields?: unknown;
  inputFields?: unknown;
};

const CONSTRUCTIVE_SCHEMA_QUERY = `
  query ConsoleKitConstructiveSchema {
    __schema {
      queryType {
        fields {
          name
          args { name type { ...ConsoleKitTypeRef } }
          type { ...ConsoleKitTypeRef }
        }
      }
      mutationType {
        fields {
          name
          args { name type { ...ConsoleKitTypeRef } }
          type { ...ConsoleKitTypeRef }
        }
      }
      types {
        kind
        name
        fields {
          name
          args { name type { ...ConsoleKitTypeRef } }
          type { ...ConsoleKitTypeRef }
        }
        inputFields { name type { ...ConsoleKitTypeRef } }
      }
    }
  }

  fragment ConsoleKitTypeRef on __Type {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType { kind name }
      }
    }
  }
`;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object'
    ? value as Record<string, unknown>
    : null;
}

function typeRef(value: unknown): ConstructiveTypeRef {
  const record = asRecord(value);
  return {
    kind: typeof record?.kind === 'string' ? record.kind : 'UNKNOWN',
    name: typeof record?.name === 'string' ? record.name : null,
    ofType: record?.ofType ? typeRef(record.ofType) : null
  };
}

function schemaInputs(value: unknown): ConstructiveSchemaInput[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    const record = asRecord(candidate);
    if (!record || typeof record.name !== 'string') return [];
    return [{ name: record.name, type: typeRef(record.type) }];
  });
}

function schemaFields(value: unknown): ConstructiveSchemaField[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    const field = candidate as IntrospectionField;
    if (typeof field?.name !== 'string') return [];
    return [{
      name: field.name,
      args: schemaInputs(field.args),
      type: typeRef(field.type)
    }];
  });
}

function fieldRecord(fields: readonly ConstructiveSchemaField[]): Record<string, ConstructiveSchemaField> {
  return Object.fromEntries(fields.map((field) => [field.name, field]));
}

function schemaTypes(value: unknown): Record<string, ConstructiveSchemaType> {
  if (!Array.isArray(value)) return {};
  return Object.fromEntries(value.flatMap((candidate) => {
    const type = candidate as IntrospectionType;
    if (typeof type?.name !== 'string' || typeof type.kind !== 'string') return [];
    return [[type.name, {
      kind: type.kind,
      name: type.name,
      fields: schemaFields(type.fields),
      inputFields: schemaInputs(type.inputFields)
    } satisfies ConstructiveSchemaType]];
  }));
}

export function namedTypeName(type: ConstructiveTypeRef | undefined): string | null {
  let current = type;
  while (current) {
    if (current.name) return current.name;
    current = current.ofType ?? undefined;
  }
  return null;
}

export function hasSchemaFields(
  schema: ConstructiveSchemaSnapshot | undefined,
  operation: 'query' | 'mutation',
  fields: readonly string[]
): boolean {
  const available = operation === 'query' ? schema?.queryFields : schema?.mutationFields;
  return fields.every((field) => Boolean(available?.[field]));
}

export function fieldsForType(
  schema: ConstructiveSchemaSnapshot,
  typeName: string
): Readonly<Record<string, ConstructiveSchemaField>> {
  return fieldRecord(schema.types[typeName]?.fields ?? []);
}

export async function executeConstructiveGraphQL<T>(
  runtime: ConsoleKitAdapterContext,
  endpointKind: ConsoleEndpointKind,
  document: string,
  variables: Record<string, unknown> | undefined,
  signal?: AbortSignal
): Promise<T> {
  const transport = runtime.transportFor(endpointKind);
  if (!transport) {
    const error = new Error(`The ${endpointKind} endpoint is not configured.`) as Error & { code?: string };
    error.code = 'ENDPOINT_UNAVAILABLE';
    throw error;
  }

  const result = await transport.execute<T>({ document, variables, signal });
  if (result.ok) return result.data;

  const first = result.errors[0];
  const error = new Error(first?.message || 'The GraphQL operation failed.') as Error & {
    code?: string;
    errors?: typeof result.errors;
  };
  const code = first?.extensions?.code;
  if (typeof code === 'string') error.code = code;
  error.errors = result.errors;
  throw error;
}

export async function inspectConstructiveSchema(
  runtime: ConsoleKitAdapterContext,
  endpointKind: ConsoleEndpointKind,
  signal?: AbortSignal
): Promise<ConstructiveSchemaSnapshot> {
  const endpoint = runtime.endpoints[endpointKind];
  if (!endpoint) {
    throw new Error(`The ${endpointKind} endpoint is not configured.`);
  }
  const data = await executeConstructiveGraphQL<{
    __schema?: {
      queryType?: { fields?: unknown } | null;
      mutationType?: { fields?: unknown } | null;
      types?: unknown;
    } | null;
  }>(runtime, endpointKind, CONSTRUCTIVE_SCHEMA_QUERY, undefined, signal);
  const schema = data.__schema;
  if (!schema) throw new Error(`The ${endpointKind} endpoint did not return GraphQL schema introspection.`);

  const queryFields = schemaFields(schema.queryType?.fields);
  const mutationFields = schemaFields(schema.mutationType?.fields);
  return {
    endpointKind,
    endpointId: endpoint.id,
    queryFields: fieldRecord(queryFields),
    mutationFields: fieldRecord(mutationFields),
    types: schemaTypes(schema.types)
  };
}

export function selectExistingFields(
  schema: ConstructiveSchemaSnapshot,
  typeName: string,
  desired: readonly string[]
): string[] {
  const fields = fieldsForType(schema, typeName);
  return desired.filter((field) => Boolean(fields[field]));
}
