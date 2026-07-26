import { isAbsolute } from 'node:path';

export const NATIVE_FIXTURE_KIND = 'constructive-native-tenant-fixture' as const;
export const NATIVE_FIXTURE_VERSION = 1 as const;
export const OFFICIAL_PRESETS = ['auth:hardened', 'b2b:storage', 'full'] as const;
export const FIXTURE_PROFILES = [
  'auth-hardened',
  'b2b-storage',
  'full',
  'storage-routed'
] as const;

export type OfficialPreset = (typeof OFFICIAL_PRESETS)[number];
export type FixtureProfile = (typeof FIXTURE_PROFILES)[number];

export type NativeEndpoint = Readonly<{
  apiId: string;
  apiName: string;
  domainId: string;
  domain: string;
  subdomain: string;
  url: string;
  schemas: readonly string[];
}>;

export type NativeFixtureTenant = Readonly<{
  profile: FixtureProfile;
  preset: OfficialPreset;
  presetMode: 'official' | 'official-with-storage-route';
  database: Readonly<{
    id: string;
    name: string;
    domain: string;
    subdomain: string;
  }>;
  projects: Readonly<{
    tableId: string;
    tableName: 'projects';
  }>;
  endpoints: readonly NativeEndpoint[];
  capabilityBindings: Readonly<{
    storageApiName?: 'admin';
  }>;
}>;

export type NativeFixtureManifest = Readonly<{
  version: typeof NATIVE_FIXTURE_VERSION;
  kind: typeof NATIVE_FIXTURE_KIND;
  status: 'provisioning' | 'ready' | 'failed' | 'cleaned';
  runId: string;
  createdAt: string;
  constructiveDbPath: string;
  presetModulePath: string;
  platformDatabase: string;
  graphqlOrigin: string;
  membershipFixtureMode: 'auto-approved-and-verified';
  databaseIds: readonly string[];
  cleanedDatabaseIds: readonly string[];
  tenants: readonly NativeFixtureTenant[];
}>;

export type FixtureRecord = Record<string, unknown>;

// PostgreSQL's uuid type validates the canonical 8-4-4-4-12 shape without
// requiring RFC version or variant bits. Constructive's deterministic IDs use
// that full space, so the fixture applies the same contract.
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/iu;
export const FIXTURE_HOST_PART = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?))*$/iu;
const SECRET_KEY = /(?:token|password|secret|authorization|credential|api[_-]?key|private[_-]?key|cookie|session)/iu;

function assertExactKeys(
  value: FixtureRecord,
  allowedKeys: readonly string[],
  label: string
): void {
  const allowed = new Set(allowedKeys);
  const unknownKeys = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknownKeys.length > 0) {
    throw new Error(`${label} contains unknown key ${unknownKeys[0]}.`);
  }
}

export function fixtureRecord(value: unknown, label: string): FixtureRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as FixtureRecord;
}

export function fixtureNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value;
}

export function fixtureUuid(value: unknown, label: string): string {
  const result = fixtureNonEmptyString(value, label);
  if (!UUID.test(result)) throw new Error(`${label} must be a UUID.`);
  return result;
}

function assertSecretFree(value: unknown, label = 'native fixture manifest'): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertSecretFree(entry, `${label}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) throw new Error(`${label} contains forbidden key ${key}.`);
    assertSecretFree(child, `${label}.${key}`);
  }
}

export function endpointUrl(
  graphqlOrigin: string,
  route: Readonly<{ domain: string; subdomain: string }>
): string {
  const base = new URL(graphqlOrigin);
  if (base.protocol !== 'http:' && base.protocol !== 'https:') {
    throw new Error('The GraphQL origin must use HTTP or HTTPS.');
  }
  if (base.pathname !== '/' || base.search || base.hash || base.username || base.password) {
    throw new Error('The GraphQL origin must contain only a scheme, host, and optional port.');
  }
  if (!FIXTURE_HOST_PART.test(route.domain) || !FIXTURE_HOST_PART.test(route.subdomain)) {
    throw new Error('Discovered endpoint metadata contains an invalid domain or subdomain.');
  }
  const hostname = `${route.subdomain}.${route.domain}`;
  return `${base.protocol}//${hostname}${base.port ? `:${base.port}` : ''}/graphql`;
}

export function assertNativeFixtureManifest(value: unknown): asserts value is NativeFixtureManifest {
  assertSecretFree(value);
  const manifest = fixtureRecord(value, 'native fixture manifest');
  assertExactKeys(manifest, [
    'version',
    'kind',
    'status',
    'runId',
    'createdAt',
    'constructiveDbPath',
    'presetModulePath',
    'platformDatabase',
    'graphqlOrigin',
    'membershipFixtureMode',
    'databaseIds',
    'cleanedDatabaseIds',
    'tenants'
  ], 'native fixture manifest');
  if (manifest.version !== NATIVE_FIXTURE_VERSION || manifest.kind !== NATIVE_FIXTURE_KIND) {
    throw new Error('The native fixture manifest version or kind is unsupported.');
  }
  if (!['provisioning', 'ready', 'failed', 'cleaned'].includes(String(manifest.status))) {
    throw new Error('The native fixture manifest has an invalid status.');
  }
  fixtureNonEmptyString(manifest.runId, 'native fixture manifest.runId');
  fixtureNonEmptyString(manifest.createdAt, 'native fixture manifest.createdAt');
  if (!isAbsolute(fixtureNonEmptyString(
    manifest.constructiveDbPath,
    'native fixture manifest.constructiveDbPath'
  ))) {
    throw new Error('native fixture manifest.constructiveDbPath must be absolute.');
  }
  if (!isAbsolute(fixtureNonEmptyString(
    manifest.presetModulePath,
    'native fixture manifest.presetModulePath'
  ))) {
    throw new Error('native fixture manifest.presetModulePath must be absolute.');
  }
  fixtureNonEmptyString(manifest.platformDatabase, 'native fixture manifest.platformDatabase');
  if (manifest.membershipFixtureMode !== 'auto-approved-and-verified') {
    throw new Error('native fixture manifest.membershipFixtureMode is unsupported.');
  }
  endpointUrl(fixtureNonEmptyString(
    manifest.graphqlOrigin,
    'native fixture manifest.graphqlOrigin'
  ), {
    domain: 'localhost',
    subdomain: 'fixture-validation'
  });

  if (!Array.isArray(manifest.databaseIds) || !Array.isArray(manifest.cleanedDatabaseIds)) {
    throw new Error('The native fixture database ID lists must be arrays.');
  }
  const databaseIds = manifest.databaseIds.map((entry, index) =>
    fixtureUuid(entry, `databaseIds[${index}]`)
  );
  const cleanedIds = manifest.cleanedDatabaseIds.map((entry, index) =>
    fixtureUuid(entry, `cleanedDatabaseIds[${index}]`)
  );
  if (new Set(databaseIds).size !== databaseIds.length) {
    throw new Error('The native fixture manifest contains duplicate database IDs.');
  }
  if (
    new Set(cleanedIds).size !== cleanedIds.length ||
    cleanedIds.some((id) => !databaseIds.includes(id))
  ) {
    throw new Error('The cleaned database IDs must be a unique subset of databaseIds.');
  }

  if (!Array.isArray(manifest.tenants)) throw new Error('The native fixture tenants must be an array.');
  const tenantIds: string[] = [];
  const profiles: string[] = [];
  for (const [index, rawTenant] of manifest.tenants.entries()) {
    const tenant = fixtureRecord(rawTenant, `tenants[${index}]`);
    assertExactKeys(tenant, [
      'profile',
      'preset',
      'presetMode',
      'database',
      'projects',
      'endpoints',
      'capabilityBindings'
    ], `tenants[${index}]`);
    const profile = fixtureNonEmptyString(tenant.profile, `tenants[${index}].profile`);
    if (!(FIXTURE_PROFILES as readonly string[]).includes(profile)) {
      throw new Error(`tenants[${index}].profile is unsupported.`);
    }
    profiles.push(profile);
    if (!(OFFICIAL_PRESETS as readonly string[]).includes(String(tenant.preset))) {
      throw new Error(`tenants[${index}].preset is unsupported.`);
    }
    const expectedMode = profile === 'storage-routed' ? 'official-with-storage-route' : 'official';
    if (tenant.presetMode !== expectedMode) {
      throw new Error(`tenants[${index}].presetMode does not match its profile.`);
    }
    const database = fixtureRecord(tenant.database, `tenants[${index}].database`);
    assertExactKeys(database, ['id', 'name', 'domain', 'subdomain'], `tenants[${index}].database`);
    tenantIds.push(fixtureUuid(database.id, `tenants[${index}].database.id`));
    fixtureNonEmptyString(database.name, `tenants[${index}].database.name`);
    fixtureNonEmptyString(database.domain, `tenants[${index}].database.domain`);
    fixtureNonEmptyString(database.subdomain, `tenants[${index}].database.subdomain`);
    const projects = fixtureRecord(tenant.projects, `tenants[${index}].projects`);
    assertExactKeys(projects, ['tableId', 'tableName'], `tenants[${index}].projects`);
    fixtureUuid(projects.tableId, `tenants[${index}].projects.tableId`);
    if (projects.tableName !== 'projects') throw new Error('The native RLS fixture table must be projects.');
    if (!Array.isArray(tenant.endpoints)) {
      throw new Error(`tenants[${index}].endpoints must be an array.`);
    }
    const endpointApiNames: string[] = [];
    for (const [endpointIndex, rawEndpoint] of tenant.endpoints.entries()) {
      const endpoint = fixtureRecord(rawEndpoint, `tenants[${index}].endpoints[${endpointIndex}]`);
      assertExactKeys(endpoint, [
        'apiId',
        'apiName',
        'domainId',
        'domain',
        'subdomain',
        'url',
        'schemas'
      ], `tenants[${index}].endpoints[${endpointIndex}]`);
      fixtureUuid(endpoint.apiId, `tenants[${index}].endpoints[${endpointIndex}].apiId`);
      fixtureUuid(endpoint.domainId, `tenants[${index}].endpoints[${endpointIndex}].domainId`);
      endpointApiNames.push(fixtureNonEmptyString(
        endpoint.apiName,
        `tenants[${index}].endpoints[${endpointIndex}].apiName`
      ));
      const endpointDomain = fixtureNonEmptyString(
        endpoint.domain,
        `tenants[${index}].endpoints[${endpointIndex}].domain`
      );
      const endpointSubdomain = fixtureNonEmptyString(
        endpoint.subdomain,
        `tenants[${index}].endpoints[${endpointIndex}].subdomain`
      );
      const url = new URL(fixtureNonEmptyString(
        endpoint.url,
        `tenants[${index}].endpoints[${endpointIndex}].url`
      ));
      if (url.pathname !== '/graphql') throw new Error('Every discovered endpoint must use /graphql.');
      if (url.toString() !== endpointUrl(String(manifest.graphqlOrigin), {
        domain: endpointDomain,
        subdomain: endpointSubdomain
      })) {
        throw new Error('A discovered endpoint URL does not match its domain metadata.');
      }
      if (
        !Array.isArray(endpoint.schemas) ||
        endpoint.schemas.some((schema) => typeof schema !== 'string')
      ) {
        throw new Error(`tenants[${index}].endpoints[${endpointIndex}].schemas must contain strings.`);
      }
    }
    if (new Set(endpointApiNames).size !== endpointApiNames.length) {
      throw new Error(`tenants[${index}] exposes an API through multiple public domains.`);
    }
    const bindings = fixtureRecord(
      tenant.capabilityBindings,
      `tenants[${index}].capabilityBindings`
    );
    assertExactKeys(bindings, ['storageApiName'], `tenants[${index}].capabilityBindings`);
    if (profile === 'storage-routed' && bindings.storageApiName !== 'admin') {
      throw new Error('The routed Storage fixture must bind Storage to the admin API.');
    }
    if (profile !== 'storage-routed' && bindings.storageApiName !== undefined) {
      throw new Error('Official presets must not invent a Storage endpoint binding.');
    }
  }

  if (new Set(profiles).size !== profiles.length) {
    throw new Error('The native fixture manifest contains duplicate profiles.');
  }
  if (new Set(tenantIds).size !== tenantIds.length) {
    throw new Error('The native fixture manifest contains duplicate tenant database IDs.');
  }
  if (tenantIds.some((id) => !databaseIds.includes(id))) {
    throw new Error('Every tenant database ID must be recorded in databaseIds.');
  }
  if (manifest.status === 'ready') {
    if (cleanedIds.length > 0) {
      throw new Error('A ready native fixture cannot contain cleaned database IDs.');
    }
    for (const profile of FIXTURE_PROFILES) {
      if (profiles.filter((candidate) => candidate === profile).length !== 1) {
        throw new Error(`A ready native fixture requires exactly one ${profile} tenant.`);
      }
    }
    if (
      tenantIds.length !== databaseIds.length ||
      databaseIds.some((id) => !tenantIds.includes(id))
    ) {
      throw new Error('A ready native fixture must describe every provisioned database exactly once.');
    }
  }
  if (manifest.status === 'cleaned' && cleanedIds.length !== databaseIds.length) {
    throw new Error('A cleaned native fixture must record every database ID as cleaned.');
  }
}

export function tenantEndpoint(
  tenant: NativeFixtureTenant,
  apiName: string
): NativeEndpoint | undefined {
  const matches = tenant.endpoints.filter((endpoint) => endpoint.apiName === apiName);
  if (matches.length > 1) {
    throw new Error(`${tenant.profile} exposes ${apiName} through multiple public domains.`);
  }
  return matches[0];
}
