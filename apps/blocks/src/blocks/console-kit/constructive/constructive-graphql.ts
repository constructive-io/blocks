import type {
  ConsoleEndpoint,
  ConsoleEndpointKind,
  IdentityScopedConsoleTransport
} from '../../console-runtime';

/**
 * What the GraphQL helpers need of a host: its endpoints and an
 * identity-scoped transport for each. Console Kit's adapter context is one;
 * a host without Console Kit (scope-access) builds its own.
 */
export type ConstructiveGraphQLRuntime = Readonly<{
  endpoints: Readonly<Partial<Record<ConsoleEndpointKind, ConsoleEndpoint>>>;
  transportFor: (kind: ConsoleEndpointKind) => IdentityScopedConsoleTransport | null;
}>;

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

export type ConstructiveConnectionQuery = Readonly<{
  operationName: string;
  fieldName: string;
  nodeSelection: string;
  pageSize?: number;
  /** Rows whose fields equal these values, e.g. one entity's memberships. */
  equalTo?: Readonly<Record<string, string>>;
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

function rootFields(
  schema: Record<string, unknown>,
  rootKey: 'queryType' | 'mutationType',
  types: Readonly<Record<string, ConstructiveSchemaType>>
): ConstructiveSchemaField[] {
  const root = asRecord(schema[rootKey]);
  const directFields = schemaFields(root?.fields);
  if (directFields.length > 0) return directFields;
  const rootName = typeof root?.name === 'string' ? root.name : null;
  return rootName ? [...(types[rootName]?.fields ?? [])] : [];
}

/**
 * Normalizes either the standard GraphQL introspection response retained by
 * Console Kit metadata or the smaller discovery query used by older hosts.
 */
export function constructiveSchemaSnapshotFromIntrospection(
  endpointKind: ConsoleEndpointKind,
  endpointId: string,
  introspection: unknown
): ConstructiveSchemaSnapshot {
  const payload = asRecord(introspection);
  const schema = asRecord(payload?.__schema);
  if (!schema) {
    throw new Error(
      `The ${endpointKind} endpoint did not return GraphQL schema introspection.`
    );
  }

  const types = schemaTypes(schema.types);
  return {
    endpointKind,
    endpointId,
    queryFields: fieldRecord(rootFields(schema, 'queryType', types)),
    mutationFields: fieldRecord(rootFields(schema, 'mutationType', types)),
    types
  };
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
  runtime: ConstructiveGraphQLRuntime,
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

const GRAPHQL_NAME = /^[_A-Za-z][_0-9A-Za-z]*$/u;

// The `where` argument of a connection, written into the document: field names
// must be GraphQL names, and each value is a JSON string literal, which is a
// valid GraphQL string literal.
function connectionWhere(equalTo: Readonly<Record<string, string>> | undefined): string {
  const entries = Object.entries(equalTo ?? {});
  if (entries.length === 0) return '';
  const conditions = entries.map(([field, value]) => {
    if (!GRAPHQL_NAME.test(field)) throw new Error(`"${field}" is not a GraphQL field name.`);
    return `${field}: { equalTo: ${JSON.stringify(value)} }`;
  });
  return `, where: { ${conditions.join(', ')} }`;
}

/**
 * Reads a PostGraphile Relay connection to exhaustion. Every connection owns
 * its cursor because unrelated tables can advance at different rates.
 */
export async function executeConstructiveConnectionQuery(
  runtime: ConstructiveGraphQLRuntime,
  endpointKind: ConsoleEndpointKind,
  query: ConstructiveConnectionQuery,
  signal?: AbortSignal
): Promise<Record<string, unknown>[]> {
  const where = connectionWhere(query.equalTo);
  const document = `
    query ${query.operationName}($first: Int!, $after: Cursor) {
      ${query.fieldName}(first: $first, after: $after${where}) {
        nodes { ${query.nodeSelection} }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;
  const nodes: Record<string, unknown>[] = [];
  const seenCursors = new Set<string>();
  let after: string | null = null;

  for (;;) {
    const result = await executeConstructiveGraphQL<Record<string, unknown>>(
      runtime,
      endpointKind,
      document,
      { first: query.pageSize ?? 100, after },
      signal
    );
    const connection = asRecord(result[query.fieldName]);
    const pageNodes = Array.isArray(connection?.nodes) ? connection.nodes : [];
    for (const candidate of pageNodes) {
      const node = asRecord(candidate);
      if (node) nodes.push(node);
    }

    const pageInfo = asRecord(connection?.pageInfo);
    if (pageInfo?.hasNextPage !== true) return nodes;
    const endCursor = typeof pageInfo.endCursor === 'string' && pageInfo.endCursor.length > 0
      ? pageInfo.endCursor
      : null;
    if (!endCursor || seenCursors.has(endCursor)) {
      throw new Error(
        `The ${query.fieldName} connection reported another page without a new cursor.`
      );
    }
    seenCursors.add(endCursor);
    after = endCursor;
  }
}

export async function inspectConstructiveSchema(
  runtime: ConstructiveGraphQLRuntime,
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
  return constructiveSchemaSnapshotFromIntrospection(
    endpointKind,
    endpoint.id,
    data
  );
}

export function selectExistingFields(
  schema: ConstructiveSchemaSnapshot,
  typeName: string,
  desired: readonly string[]
): string[] {
  const fields = fieldsForType(schema, typeName);
  return desired.filter((field) => Boolean(fields[field]));
}

export type ConstructiveMutationObjectInput = Readonly<{
  field: string;
  requiredFields: readonly string[];
}>;

/**
 * Confirms the generated mutation input accepts every field an adapter sends.
 * A mutation root alone is not enough: different presets can expose the root
 * while omitting optional modules and their nested input fields.
 */
export function supportsConstructiveMutationInput(
  schema: ConstructiveSchemaSnapshot | undefined,
  mutation: string,
  requiredInputFields: readonly string[],
  objectInput?: ConstructiveMutationObjectInput
): boolean {
  const mutationField = schema?.mutationFields[mutation];
  const inputArgument = mutationField?.args.find((argument) => argument.name === 'input');
  const inputTypeName = namedTypeName(inputArgument?.type);
  const inputType = inputTypeName ? schema?.types[inputTypeName] : undefined;
  if (!inputType) return false;

  const inputFields = new Map(inputType.inputFields.map((field) => [field.name, field]));
  if (!requiredInputFields.every((field) => inputFields.has(field))) return false;
  if (!objectInput) return true;

  const objectField = inputFields.get(objectInput.field);
  const objectTypeName = namedTypeName(objectField?.type);
  const objectType = objectTypeName ? schema?.types[objectTypeName] : undefined;
  if (!objectType) return false;
  const objectFields = new Set(objectType.inputFields.map((field) => field.name));
  return objectInput.requiredFields.every((field) => objectFields.has(field));
}
