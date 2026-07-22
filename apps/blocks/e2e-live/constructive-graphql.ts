import {
  META_QUERY_SOURCE,
  assertMetaQuery,
  buildPostGraphileCreate,
  buildPostGraphileDelete,
  buildPostGraphileUpdate,
  buildSelect,
  cleanTable,
  resolveRowIdentity,
  rowIdentityToPrimaryKey,
  toCamelCasePlural,
  toCamelCaseSingular,
  toCreateMutationName,
  toPatchFieldName,
  toUpdateMutationName,
  type CleanTable,
  type MetaQuery,
  type MetaTable,
  type RowIdentityValue
} from '@constructive-io/data';

import { endpointUrl, type ProofCredentials, type ProofTenant } from './proof-context';

type GraphQLError = Readonly<{
  message?: string;
  extensions?: Readonly<{ code?: string; [key: string]: unknown }>;
}>;

export type GraphQLPayload<TData> = Readonly<{
  data?: TData | null;
  errors?: readonly GraphQLError[];
}>;

export type GraphQLRequestFingerprint = Readonly<{
  origin?: string;
  userAgent?: string;
}>;

export type LiveSession = Readonly<{
  token: string;
  userId: string;
  sessionId: string | null;
}>;

export type LiveTable = Readonly<{
  meta: MetaTable;
  clean: CleanTable;
}>;

export type LiveSchema = Readonly<{
  tables: readonly CleanTable[];
  table(name: string): LiveTable;
}>;

const SIGN_IN = /* GraphQL */ `
  mutation ConsoleKitProofSignIn($input: SignInInput!) {
    signIn(input: $input) {
      result { id userId accessToken accessTokenExpiresAt }
    }
  }
`;

const SIGN_UP = /* GraphQL */ `
  mutation ConsoleKitProofSignUp($input: SignUpInput!) {
    signUp(input: $input) {
      result { id userId accessToken accessTokenExpiresAt }
    }
  }
`;

const SIGN_OUT = /* GraphQL */ `
  mutation ConsoleKitProofSignOut($input: SignOutInput!) {
    signOut(input: $input) { clientMutationId }
  }
`;

/**
 * Direct RLS probes keep using `_meta` for table/field/identity facts, but only
 * request the stable subset so they can still diagnose CRUD when the separate
 * Console Kit compatibility test reports a missing July-contract field.
 */
function backendProofMetaQuery(source: string): string {
  let skippingEncoding = false;
  return source.split('\n').filter((line) => {
    const trimmed = line.trim();
    if (trimmed === 'encoding {') {
      skippingEncoding = true;
      return false;
    }
    if (skippingEncoding) {
      if (trimmed === '}') skippingEncoding = false;
      return false;
    }
    return !trimmed.startsWith('scope {');
  }).join('\n');
}

const BACKEND_PROOF_META_QUERY = backendProofMetaQuery(META_QUERY_SOURCE);

function documentSource(document: unknown): string {
  if (typeof document === 'string') return document;
  if (document && typeof document === 'object' && 'toString' in document) {
    return String(document);
  }
  throw new Error('The generated GraphQL document could not be serialized.');
}

function errorSummary(errors: readonly GraphQLError[] | undefined): string {
  if (!errors?.length) return 'unknown GraphQL error';
  return errors.map((error) => {
    const code = error.extensions?.code;
    return typeof code === 'string' ? code : 'GRAPHQL_ERROR';
  }).join(', ');
}

export async function rawGraphQL<TData>(
  url: string,
  document: unknown,
  variables: Readonly<Record<string, unknown>> = {},
  token?: string,
  fingerprint: GraphQLRequestFingerprint = {}
): Promise<GraphQLPayload<TData>> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Origin: fingerprint.origin ?? new URL(process.env.CONSOLE_KIT_BASE_URL!).origin,
      'User-Agent': fingerprint.userAgent ?? 'constructive-console-kit-live-proof',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ query: documentSource(document), variables })
  });
  if (!response.ok) throw new Error(`GraphQL transport returned HTTP ${response.status}.`);

  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('GraphQL transport returned an invalid JSON envelope.');
  }
  return payload as GraphQLPayload<TData>;
}

export async function graphQL<TData>(
  url: string,
  document: unknown,
  variables: Readonly<Record<string, unknown>> = {},
  token?: string
): Promise<TData> {
  const payload = await rawGraphQL<TData>(url, document, variables, token);
  if (payload.errors?.length || payload.data == null) {
    throw new Error(`GraphQL operation failed (${errorSummary(payload.errors)}).`);
  }
  return payload.data;
}

function sessionFrom(data: unknown, field: 'signIn' | 'signUp'): LiveSession {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`${field} returned no session.`);
  }
  const mutation = (data as Record<string, unknown>)[field];
  const result = mutation && typeof mutation === 'object' && !Array.isArray(mutation)
    ? (mutation as Record<string, unknown>).result
    : null;
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error(`${field} returned no session.`);
  }
  const token = (result as Record<string, unknown>).accessToken;
  const userId = (result as Record<string, unknown>).userId;
  const sessionId = (result as Record<string, unknown>).id;
  if (typeof token !== 'string' || !token || typeof userId !== 'string' || !userId) {
    throw new Error(`${field} returned an unusable session.`);
  }
  return {
    token,
    userId,
    sessionId: typeof sessionId === 'string' ? sessionId : null
  };
}

export async function signIn(
  tenant: ProofTenant,
  credentials: ProofCredentials
): Promise<LiveSession> {
  return signInAt(endpointUrl(tenant, 'auth'), credentials);
}

export async function signInAt(
  url: string,
  credentials: ProofCredentials
): Promise<LiveSession> {
  const data = await graphQL<Record<string, unknown>>(
    url,
    SIGN_IN,
    { input: { email: credentials.email, password: credentials.password, rememberMe: false } }
  );
  return sessionFrom(data, 'signIn');
}

export async function signUp(
  tenant: ProofTenant,
  credentials: ProofCredentials
): Promise<LiveSession> {
  const data = await graphQL<Record<string, unknown>>(
    endpointUrl(tenant, 'auth'),
    SIGN_UP,
    { input: { email: credentials.email, password: credentials.password, rememberMe: false } }
  );
  return sessionFrom(data, 'signUp');
}

export async function signOut(tenant: ProofTenant, token: string): Promise<void> {
  await signOutAt(endpointUrl(tenant, 'auth'), token);
}

export async function signOutAt(url: string, token: string): Promise<void> {
  await graphQL(url, SIGN_OUT, { input: {} }, token);
}

export async function loadSchema(tenant: ProofTenant, token: string): Promise<LiveSchema> {
  const data = await graphQL<MetaQuery>(
    endpointUrl(tenant, 'data'),
    BACKEND_PROOF_META_QUERY,
    {},
    token
  );
  assertMetaQuery(data);
  const metaTables = (data._meta?.tables ?? []).filter(
    (table): table is MetaTable => Boolean(table?.name)
  );
  const tables = metaTables.map(cleanTable);

  return {
    tables,
    table(name) {
      const index = metaTables.findIndex((table) => table.name === name);
      if (index < 0 || !tables[index]) throw new Error(`_meta did not expose table ${name}.`);
      return { meta: metaTables[index], clean: tables[index] };
    }
  };
}

export async function listRows(
  tenant: ProofTenant,
  token: string,
  schema: LiveSchema,
  table: LiveTable,
  fields: readonly string[]
): Promise<Readonly<Record<string, unknown>>[]> {
  const document = buildSelect(table.clean, [...schema.tables], {
    fieldSelection: { select: [...fields] }
  });
  const rootField = toCamelCasePlural(table.clean.name, table.clean);
  const data = await graphQL<Record<string, unknown>>(
    endpointUrl(tenant, 'data'),
    document,
    {},
    token
  );
  const connection = data[rootField];
  if (!connection || typeof connection !== 'object' || Array.isArray(connection)) {
    throw new Error(`The ${rootField} query returned no connection.`);
  }
  const nodes = (connection as Record<string, unknown>).nodes;
  if (!Array.isArray(nodes)) throw new Error(`The ${rootField} query returned no nodes.`);
  return nodes.filter(
    (row): row is Readonly<Record<string, unknown>> =>
      Boolean(row) && typeof row === 'object' && !Array.isArray(row)
  );
}

export async function createRow(
  tenant: ProofTenant,
  token: string,
  schema: LiveSchema,
  table: LiveTable,
  input: Readonly<Record<string, unknown>>,
  fields: readonly string[]
): Promise<Readonly<Record<string, unknown>>> {
  const request = createRequest(schema, table, input, fields);
  const data = await graphQL<Record<string, unknown>>(
    endpointUrl(tenant, 'data'),
    request.document,
    request.variables,
    token
  );
  const payload = data[request.mutation];
  const row = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)[request.singular]
    : null;
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    throw new Error(`The ${request.mutation} mutation returned no row.`);
  }
  return row as Readonly<Record<string, unknown>>;
}

export function createRequest(
  schema: LiveSchema,
  table: LiveTable,
  input: Readonly<Record<string, unknown>>,
  fields: readonly string[]
): Readonly<{ document: unknown; variables: Readonly<Record<string, unknown>>; mutation: string; singular: string }> {
  const document = buildPostGraphileCreate(table.clean, [...schema.tables], {
    fieldSelection: { select: [...fields] }
  });
  const singular = toCamelCaseSingular(table.clean.name, table.clean);
  const mutation = toCreateMutationName(table.clean.name, table.clean);
  return {
    document,
    variables: { input: { [singular]: input } },
    mutation,
    singular
  };
}

function primaryKey(table: LiveTable, row: Readonly<Record<string, unknown>>):
Readonly<Record<string, RowIdentityValue>> {
  const resolution = resolveRowIdentity(table.meta, row);
  if (resolution.status !== 'identified') {
    throw new Error(`The ${table.meta.name} row has no usable primary-key identity.`);
  }
  return rowIdentityToPrimaryKey(resolution.identity);
}

export function updateRequest(
  schema: LiveSchema,
  table: LiveTable,
  row: Readonly<Record<string, unknown>>,
  patch: Readonly<Record<string, unknown>>,
  fields: readonly string[]
): Readonly<{ document: unknown; variables: Readonly<Record<string, unknown>>; mutation: string; singular: string }> {
  const document = buildPostGraphileUpdate(table.clean, [...schema.tables], {
    fieldSelection: { select: [...fields] }
  });
  const singular = toCamelCaseSingular(table.clean.name, table.clean);
  const mutation = toUpdateMutationName(table.clean.name, table.clean);
  const patchField = toPatchFieldName(table.clean.name, table.clean);
  return {
    document,
    variables: { input: { ...primaryKey(table, row), [patchField]: patch } },
    mutation,
    singular
  };
}

export function deleteRequest(
  schema: LiveSchema,
  table: LiveTable,
  row: Readonly<Record<string, unknown>>
): Readonly<{ document: unknown; variables: Readonly<Record<string, unknown>> }> {
  return {
    document: buildPostGraphileDelete(table.clean, [...schema.tables]),
    variables: { input: primaryKey(table, row) }
  };
}

export async function updateRow(
  tenant: ProofTenant,
  token: string,
  schema: LiveSchema,
  table: LiveTable,
  row: Readonly<Record<string, unknown>>,
  patch: Readonly<Record<string, unknown>>,
  fields: readonly string[]
): Promise<Readonly<Record<string, unknown>>> {
  const request = updateRequest(schema, table, row, patch, fields);
  const data = await graphQL<Record<string, unknown>>(
    endpointUrl(tenant, 'data'),
    request.document,
    request.variables,
    token
  );
  const payload = data[request.mutation];
  const updated = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)[request.singular]
    : null;
  if (!updated || typeof updated !== 'object' || Array.isArray(updated)) {
    throw new Error(`The ${request.mutation} mutation returned no row.`);
  }
  return updated as Readonly<Record<string, unknown>>;
}

export async function deleteRow(
  tenant: ProofTenant,
  token: string,
  schema: LiveSchema,
  table: LiveTable,
  row: Readonly<Record<string, unknown>>
): Promise<void> {
  const request = deleteRequest(schema, table, row);
  await graphQL(
    endpointUrl(tenant, 'data'),
    request.document,
    request.variables,
    token
  );
}

export function authenticationErrorCodes(payload: GraphQLPayload<unknown>): string[] {
  return (payload.errors ?? []).flatMap((error) =>
    typeof error.extensions?.code === 'string' ? [error.extensions.code] : []
  );
}
