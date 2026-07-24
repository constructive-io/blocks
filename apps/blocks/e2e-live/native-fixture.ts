import { randomUUID } from 'node:crypto';
import { access, realpath } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  FIXTURE_HOST_PART as HOST_PART,
  FIXTURE_PROFILES,
  NATIVE_FIXTURE_KIND,
  NATIVE_FIXTURE_VERSION,
  OFFICIAL_PRESETS,
  assertNativeFixtureManifest,
  endpointUrl,
  fixtureNonEmptyString as nonEmptyString,
  fixtureRecord as record,
  fixtureUuid as uuid,
  type FixtureProfile,
  type FixtureRecord as UnknownRecord,
  type NativeEndpoint,
  type NativeFixtureManifest,
  type NativeFixtureTenant,
  type OfficialPreset
} from './native-fixture-contract';

export {
  FIXTURE_PROFILES,
  NATIVE_FIXTURE_KIND,
  NATIVE_FIXTURE_VERSION,
  OFFICIAL_PRESETS,
  assertNativeFixtureManifest,
  endpointUrl,
  tenantEndpoint
} from './native-fixture-contract';
export type {
  FixtureProfile,
  NativeEndpoint,
  NativeFixtureManifest,
  NativeFixtureTenant,
  OfficialPreset
} from './native-fixture-contract';

export type ModuleEntry = string | readonly [string, Readonly<Record<string, unknown>>];

export type SqlRequest = Readonly<{
  sql: string;
  variables?: Readonly<Record<string, string>>;
}>;

export interface NativeFixtureDatabase {
  json<T>(request: SqlRequest): Promise<T>;
  execute(request: SqlRequest): Promise<void>;
}

export type NativeFixtureOptions = Readonly<{
  constructiveDbPath: string;
  platformDatabase: string;
  graphqlOrigin?: string;
  domain?: string;
  keepOnFailure?: boolean;
  runId?: string;
  now?: () => Date;
  writeManifest?: (manifest: NativeFixtureManifest) => Promise<void>;
}>;

type LoadedPreset = Readonly<{
  name: string;
  modules: readonly ModuleEntry[];
}>;

function moduleEntry(value: unknown, label: string): ModuleEntry {
  if (typeof value === 'string' && value.length > 0) return value;
  if (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'string' &&
    value[0].length > 0 &&
    value[1] &&
    typeof value[1] === 'object' &&
    !Array.isArray(value[1])
  ) {
    return [value[0], { ...(value[1] as UnknownRecord) }];
  }
  throw new Error(`${label} is not a Constructive module entry.`);
}

function cloneModules(modules: readonly ModuleEntry[]): ModuleEntry[] {
  return modules.map((entry) =>
    typeof entry === 'string' ? entry : [entry[0], { ...entry[1] }]
  );
}

export function routeStorageToAdmin(modules: readonly ModuleEntry[]): ModuleEntry[] {
  let storageEntries = 0;
  const routed = modules.map((entry): ModuleEntry => {
    const name = typeof entry === 'string' ? entry : entry[0];
    if (name !== 'storage_module') {
      return typeof entry === 'string' ? entry : [entry[0], { ...entry[1] }];
    }
    storageEntries += 1;
    const options = typeof entry === 'string' ? {} : entry[1];
    return ['storage_module', { ...options, api_name: 'admin' }];
  });
  if (storageEntries !== 1) {
    throw new Error(`The b2b:storage preset must contain exactly one storage_module; found ${storageEntries}.`);
  }
  return routed;
}

const PRESET_MODULE_CANDIDATES = [
  'packages/node-type-registry/src/module-presets/index.ts',
  'packages/node-type-registry/src/module-presets/index.js',
  'packages/node-type-registry/src/module-presets/index.mjs',
  'packages/node-type-registry/dist/module-presets/index.js',
  'packages/node-type-registry/lib/module-presets/index.js'
] as const;

export async function resolvePresetModulePath(constructiveDbPath: string): Promise<string> {
  if (!isAbsolute(constructiveDbPath)) {
    throw new Error('--constructive-db must be an absolute path.');
  }
  const root = await realpath(constructiveDbPath);
  for (const relativePath of PRESET_MODULE_CANDIDATES) {
    const candidate = join(root, relativePath);
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next source/runtime layout.
    }
  }
  throw new Error(
    `No node-type-registry preset module was found under ${root}. ` +
      'Build constructive-db or point --constructive-db at its repository root.'
  );
}

export async function loadOfficialPresetModules(
  constructiveDbPath: string
): Promise<Readonly<{ presetModulePath: string; presets: Readonly<Record<OfficialPreset, readonly ModuleEntry[]>> }>> {
  const presetModulePath = await resolvePresetModulePath(constructiveDbPath);
  const imported = await import(`${pathToFileURL(presetModulePath).href}?native-fixture=${Date.now()}`);
  const rawPresets = imported.allModulePresets;
  if (!Array.isArray(rawPresets)) {
    throw new Error(`${presetModulePath} does not export allModulePresets.`);
  }

  const loaded = new Map<string, LoadedPreset>();
  for (const [index, raw] of rawPresets.entries()) {
    const preset = record(raw, `allModulePresets[${index}]`);
    const name = nonEmptyString(preset.name, `allModulePresets[${index}].name`);
    if (!Array.isArray(preset.modules)) {
      throw new Error(`allModulePresets[${index}].modules must be an array.`);
    }
    loaded.set(name, {
      name,
      modules: preset.modules.map((entry, moduleIndex) =>
        moduleEntry(entry, `${name}.modules[${moduleIndex}]`)
      )
    });
  }

  const presets = {} as Record<OfficialPreset, readonly ModuleEntry[]>;
  for (const name of OFFICIAL_PRESETS) {
    const preset = loaded.get(name);
    if (!preset) throw new Error(`${presetModulePath} does not export the ${name} preset.`);
    presets[name] = cloneModules(preset.modules);
  }
  return { presetModulePath, presets };
}

export function platformOwnerRequest(): SqlRequest {
  return {
    sql: `
      SELECT jsonb_build_object(
        'platformDatabaseId', database.id,
        'ownerId', database.owner_id
      )::text
      FROM metaschema_public.database AS database
      WHERE database.id = metaschema_private.platform_database_id()
        AND database.owner_id IS NOT NULL
    `
  };
}

export function provisionDatabaseRequest(input: Readonly<{
  name: string;
  ownerId: string;
  subdomain: string;
  domain: string;
  modules: readonly ModuleEntry[];
}>): SqlRequest {
  return {
    sql: `
      SELECT jsonb_build_object(
        'databaseId',
        metaschema_generators.provision_database(
          v_database_name := :'database_name',
          v_owner_id := :'owner_id'::uuid,
          v_subdomain := :'subdomain',
          v_domain := :'domain',
          v_modules := :'modules'::jsonb,
          v_options := '{}'::jsonb
        )
      )::text
    `,
    variables: {
      database_name: input.name,
      owner_id: input.ownerId,
      subdomain: input.subdomain,
      domain: input.domain,
      modules: JSON.stringify(input.modules)
    }
  };
}

export function membershipDefaultsLookupRequest(databaseId: string): SqlRequest {
  return {
    sql: `
      SELECT jsonb_build_object(
        'schemaName', schema.schema_name,
        'tableName', table_record.name
      )::text
      FROM metaschema_modules_public.memberships_module AS module
      JOIN metaschema_public.table AS table_record
        ON table_record.id = module.membership_defaults_table_id
      JOIN metaschema_public.schema AS schema
        ON schema.id = table_record.schema_id
      WHERE module.database_id = :'database_id'::uuid
        AND module.scope = 'app'
      LIMIT 1
    `,
    variables: { database_id: databaseId }
  };
}

function quoteIdentifier(identifier: string): string {
  if (!identifier || identifier.includes('\u0000')) throw new Error('Invalid PostgreSQL identifier.');
  return `"${identifier.replaceAll('"', '""')}"`;
}

export function enableMembershipDefaultsRequest(schemaName: string, tableName: string): SqlRequest {
  return {
    sql: `
      UPDATE ${quoteIdentifier(schemaName)}.${quoteIdentifier(tableName)}
      SET is_verified = TRUE, is_approved = TRUE
    `
  };
}

export function projectProvisionRequest(databaseId: string): SqlRequest {
  return {
    sql: `
      WITH provisioned AS (
        INSERT INTO metaschema_modules_public.secure_table_provision
          (database_id, table_name, nodes, fields, grants, policies)
        VALUES (
          :'database_id'::uuid,
          'projects',
          :'nodes'::jsonb,
          ARRAY(SELECT value FROM jsonb_array_elements(:'fields'::jsonb)),
          :'grants'::jsonb,
          :'policies'::jsonb
        )
        RETURNING table_id
      ), scoped AS (
        SELECT
          table_id,
          metaschema_generators.apply_scope_fields(
            v_table_id := table_id,
            v_scope := 'app'
          ) AS scope_field_id
        FROM provisioned
      )
      SELECT jsonb_build_object(
        'tableId', table_id,
        'tableName', 'projects'
      )::text
      FROM scoped
    `,
    variables: {
      database_id: databaseId,
      nodes: JSON.stringify([
        { $type: 'DataId' },
        { $type: 'DataTimestamps' },
        { $type: 'DataDirectOwner' }
      ]),
      fields: JSON.stringify([
        { name: 'name', type: { name: 'text' }, is_required: true },
        { name: 'description', type: { name: 'text' } },
        {
          name: 'completed',
          type: { name: 'boolean' },
          default: { value: false },
          is_required: true
        }
      ]),
      grants: JSON.stringify([
        {
          roles: ['authenticated'],
          privileges: [
            ['select', '*'],
            ['insert', '*'],
            ['update', '*'],
            ['delete', '*']
          ]
        }
      ]),
      policies: JSON.stringify([
        {
          $type: 'AuthzDirectOwner',
          data: { entity_field: 'owner_id' },
          privileges: ['select', 'insert', 'update', 'delete'],
          policy_role: 'authenticated',
          permissive: true,
          policy_name: 'console_kit_projects_direct_owner'
        }
      ])
    }
  };
}

export function endpointDiscoveryRequest(databaseId: string): SqlRequest {
  return {
    sql: `
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'apiId', routes.api_id,
            'apiName', routes.api_name,
            'domainId', routes.domain_id,
            'domain', routes.domain,
            'subdomain', routes.subdomain,
            'schemas', routes.schemas
          )
          ORDER BY routes.api_name, routes.subdomain, routes.domain
        ),
        '[]'::jsonb
      )::text
      FROM (
        SELECT
          api.id AS api_id,
          api.name AS api_name,
          domain_record.id AS domain_id,
          domain_record.domain,
          domain_record.subdomain,
          COALESCE(
            jsonb_agg(DISTINCT schema.schema_name)
              FILTER (WHERE schema.id IS NOT NULL),
            '[]'::jsonb
          ) AS schemas
        FROM services_public.apis AS api
        JOIN services_public.domains AS domain_record
          ON domain_record.api_id = api.id
         AND domain_record.database_id = api.database_id
        LEFT JOIN services_public.api_schemas AS api_schema
          ON api_schema.api_id = api.id
         AND api_schema.database_id = api.database_id
        LEFT JOIN metaschema_public.schema AS schema
          ON schema.id = api_schema.schema_id
        WHERE api.database_id = :'database_id'::uuid
          AND api.is_public = TRUE
        GROUP BY
          api.id,
          api.name,
          domain_record.id,
          domain_record.domain,
          domain_record.subdomain
      ) AS routes
    `,
    variables: { database_id: databaseId }
  };
}

export function cleanupDatabasesRequest(databaseIds: readonly string[]): SqlRequest {
  if (databaseIds.length === 0) throw new Error('Cleanup requires at least one database ID.');
  databaseIds.forEach((databaseId, index) => uuid(databaseId, `databaseIds[${index}]`));
  return {
    sql: `
      WITH requested AS (
        SELECT value::uuid AS id
        FROM jsonb_array_elements_text(:'database_ids'::jsonb)
      ), deleted AS (
        DELETE FROM metaschema_public.database AS database
        USING requested
        WHERE database.id = requested.id
        RETURNING database.id
      )
      SELECT jsonb_build_object(
        'requested', (SELECT COALESCE(jsonb_agg(id ORDER BY id), '[]'::jsonb) FROM requested),
        'deleted', (SELECT COALESCE(jsonb_agg(id ORDER BY id), '[]'::jsonb) FROM deleted)
      )::text
    `,
    variables: { database_ids: JSON.stringify(databaseIds) }
  };
}

export function cleanupInventoryRequest(databaseIds: readonly string[]): SqlRequest {
  if (databaseIds.length === 0) throw new Error('Cleanup inventory requires at least one database ID.');
  databaseIds.forEach((databaseId, index) => uuid(databaseId, `databaseIds[${index}]`));
  return {
    sql: `
      /* console-kit fixture cleanup inventory */
      WITH requested AS (
        SELECT value::uuid AS id
        FROM jsonb_array_elements_text(:'database_ids'::jsonb)
      ), matched AS (
        SELECT database.id
        FROM metaschema_public.database AS database
        JOIN requested ON requested.id = database.id
      ), fixture_schemas AS (
        SELECT schema.database_id, schema.schema_name
        FROM metaschema_public.schema AS schema
        JOIN requested ON requested.id = schema.database_id
      )
      SELECT jsonb_build_object(
        'requested', (SELECT COALESCE(jsonb_agg(id ORDER BY id), '[]'::jsonb) FROM requested),
        'matchedDatabaseIds', (SELECT COALESCE(jsonb_agg(id ORDER BY id), '[]'::jsonb) FROM matched),
        'platformDatabaseId', metaschema_private.platform_database_id(),
        'schemas', (
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object('databaseId', database_id, 'schemaName', schema_name)
              ORDER BY database_id, schema_name
            ),
            '[]'::jsonb
          )
          FROM fixture_schemas
        )
      )::text
    `,
    variables: { database_ids: JSON.stringify(databaseIds) }
  };
}

export function dropFixtureSchemaRequest(schemaName: string): SqlRequest {
  return {
    sql: `DROP SCHEMA IF EXISTS ${quoteIdentifier(nonEmptyString(schemaName, 'fixture schema name'))} CASCADE`
  };
}

export function cleanupVerificationRequest(
  databaseIds: readonly string[],
  schemaNames: readonly string[]
): SqlRequest {
  if (databaseIds.length === 0) throw new Error('Cleanup verification requires at least one database ID.');
  databaseIds.forEach((databaseId, index) => uuid(databaseId, `databaseIds[${index}]`));
  schemaNames.forEach((schemaName, index) => nonEmptyString(schemaName, `schemaNames[${index}]`));
  return {
    sql: `
      /* console-kit fixture cleanup verification */
      WITH requested_databases AS (
        SELECT value::uuid AS id
        FROM jsonb_array_elements_text(:'database_ids'::jsonb)
      ), requested_schemas AS (
        SELECT value AS schema_name
        FROM jsonb_array_elements_text(:'schema_names'::jsonb)
      )
      SELECT jsonb_build_object(
        'remainingDatabaseIds', (
          SELECT COALESCE(jsonb_agg(database.id ORDER BY database.id), '[]'::jsonb)
          FROM metaschema_public.database AS database
          JOIN requested_databases ON requested_databases.id = database.id
        ),
        'remainingSchemaNames', (
          SELECT COALESCE(jsonb_agg(namespace.nspname ORDER BY namespace.nspname), '[]'::jsonb)
          FROM pg_catalog.pg_namespace AS namespace
          JOIN requested_schemas ON requested_schemas.schema_name = namespace.nspname
        )
      )::text
    `,
    variables: {
      database_ids: JSON.stringify(databaseIds),
      schema_names: JSON.stringify(schemaNames)
    }
  };
}

function parseDiscoveredEndpoints(value: unknown, graphqlOrigin: string): NativeEndpoint[] {
  if (!Array.isArray(value)) throw new Error('Endpoint discovery did not return an array.');
  return value.map((raw, index): NativeEndpoint => {
    const endpoint = record(raw, `endpoints[${index}]`);
    const schemas = endpoint.schemas;
    if (!Array.isArray(schemas) || schemas.some((schema) => typeof schema !== 'string')) {
      throw new Error(`endpoints[${index}].schemas must be an array of strings.`);
    }
    const domain = nonEmptyString(endpoint.domain, `endpoints[${index}].domain`);
    const subdomain = nonEmptyString(endpoint.subdomain, `endpoints[${index}].subdomain`);
    return {
      apiId: uuid(endpoint.apiId, `endpoints[${index}].apiId`),
      apiName: nonEmptyString(endpoint.apiName, `endpoints[${index}].apiName`),
      domainId: uuid(endpoint.domainId, `endpoints[${index}].domainId`),
      domain,
      subdomain,
      url: endpointUrl(graphqlOrigin, { domain, subdomain }),
      schemas: [...new Set(schemas)].sort()
    };
  });
}

export async function cleanupNativeFixture(
  database: NativeFixtureDatabase,
  manifest: NativeFixtureManifest
): Promise<NativeFixtureManifest> {
  assertNativeFixtureManifest(manifest);
  if (manifest.status === 'cleaned') return manifest;
  if (manifest.databaseIds.length === 0) {
    const cleaned: NativeFixtureManifest = {
      ...manifest,
      status: 'cleaned',
      cleanedDatabaseIds: []
    };
    assertNativeFixtureManifest(cleaned);
    return cleaned;
  }
  const inventory = await database.json<{
    requested?: unknown;
    matchedDatabaseIds?: unknown;
    platformDatabaseId?: unknown;
    schemas?: unknown;
  }>(cleanupInventoryRequest(manifest.databaseIds));
  const matchedDatabaseIds = Array.isArray(inventory.matchedDatabaseIds)
    ? inventory.matchedDatabaseIds.map((entry, index) =>
        uuid(entry, `cleanup.matchedDatabaseIds[${index}]`)
      )
    : [];
  const platformDatabaseId = uuid(inventory.platformDatabaseId, 'cleanup.platformDatabaseId');
  if (manifest.databaseIds.includes(platformDatabaseId)) {
    throw new Error('Cleanup refused because the fixture journal contains the platform database ID.');
  }
  const missingInventory = manifest.databaseIds.filter((id) => !matchedDatabaseIds.includes(id));
  const unexpectedInventory = matchedDatabaseIds.filter((id) => !manifest.databaseIds.includes(id));
  if (missingInventory.length > 0 || unexpectedInventory.length > 0) {
    throw new Error(
      `Exact-ID cleanup inventory mismatch (missing: ${missingInventory.join(', ') || 'none'}; ` +
        `unexpected: ${unexpectedInventory.join(', ') || 'none'}).`
    );
  }
  if (!Array.isArray(inventory.schemas)) {
    throw new Error('Cleanup inventory did not return a schema list.');
  }
  const schemaNames = inventory.schemas.map((entry, index) => {
    const schema = record(entry, `cleanup.schemas[${index}]`);
    const databaseId = uuid(schema.databaseId, `cleanup.schemas[${index}].databaseId`);
    if (!manifest.databaseIds.includes(databaseId)) {
      throw new Error(`Cleanup inventory returned a schema for unexpected database ${databaseId}.`);
    }
    return nonEmptyString(schema.schemaName, `cleanup.schemas[${index}].schemaName`);
  });
  if (new Set(schemaNames).size !== schemaNames.length) {
    throw new Error('Cleanup inventory returned duplicate physical schema names.');
  }
  for (const schemaName of schemaNames) {
    await database.execute(dropFixtureSchemaRequest(schemaName));
  }

  const result = await database.json<{ requested?: unknown; deleted?: unknown }>(
    cleanupDatabasesRequest(manifest.databaseIds)
  );
  const deleted = Array.isArray(result.deleted)
    ? result.deleted.map((entry, index) => uuid(entry, `cleanup.deleted[${index}]`))
    : [];
  const missing = manifest.databaseIds.filter((id) => !deleted.includes(id));
  const unexpected = deleted.filter((id) => !manifest.databaseIds.includes(id));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `Exact-ID cleanup mismatch (missing: ${missing.join(', ') || 'none'}; ` +
        `unexpected: ${unexpected.join(', ') || 'none'}).`
    );
  }
  const verification = await database.json<{
    remainingDatabaseIds?: unknown;
    remainingSchemaNames?: unknown;
  }>(cleanupVerificationRequest(manifest.databaseIds, schemaNames));
  const remainingDatabaseIds = Array.isArray(verification.remainingDatabaseIds)
    ? verification.remainingDatabaseIds.map((entry, index) =>
        uuid(entry, `cleanup.remainingDatabaseIds[${index}]`)
      )
    : [];
  const remainingSchemaNames = Array.isArray(verification.remainingSchemaNames)
    ? verification.remainingSchemaNames.map((entry, index) =>
        nonEmptyString(entry, `cleanup.remainingSchemaNames[${index}]`)
      )
    : [];
  if (remainingDatabaseIds.length > 0 || remainingSchemaNames.length > 0) {
    throw new Error(
      `Cleanup verification failed (database IDs: ${remainingDatabaseIds.join(', ') || 'none'}; ` +
        `schemas: ${remainingSchemaNames.join(', ') || 'none'}).`
    );
  }
  const cleaned: NativeFixtureManifest = {
    ...manifest,
    status: 'cleaned',
    cleanedDatabaseIds: [...manifest.databaseIds]
  };
  assertNativeFixtureManifest(cleaned);
  return cleaned;
}

function fixtureDefinitions(
  presets: Readonly<Record<OfficialPreset, readonly ModuleEntry[]>>
): ReadonlyArray<Readonly<{
  profile: FixtureProfile;
  preset: OfficialPreset;
  presetMode: NativeFixtureTenant['presetMode'];
  modules: readonly ModuleEntry[];
  storageApiName?: 'admin';
}>> {
  return [
    {
      profile: 'auth-hardened',
      preset: 'auth:hardened',
      presetMode: 'official',
      modules: cloneModules(presets['auth:hardened'])
    },
    {
      profile: 'b2b-storage',
      preset: 'b2b:storage',
      presetMode: 'official',
      modules: cloneModules(presets['b2b:storage'])
    },
    {
      profile: 'full',
      preset: 'full',
      presetMode: 'official',
      modules: cloneModules(presets.full)
    },
    {
      profile: 'storage-routed',
      preset: 'b2b:storage',
      presetMode: 'official-with-storage-route',
      modules: routeStorageToAdmin(presets['b2b:storage']),
      storageApiName: 'admin'
    }
  ];
}

export async function provisionNativeFixture(
  database: NativeFixtureDatabase,
  options: NativeFixtureOptions
): Promise<NativeFixtureManifest> {
  const now = options.now ?? (() => new Date());
  const constructiveDbPath = await realpath(options.constructiveDbPath);
  const loaded = await loadOfficialPresetModules(constructiveDbPath);
  const graphqlOrigin = new URL(options.graphqlOrigin ?? 'http://localhost:6464').origin;
  const domain = options.domain ?? 'localhost';
  if (!HOST_PART.test(domain)) throw new Error('--domain must be a valid domain name.');
  const runId = options.runId ?? randomUUID();
  const runSuffix = runId.replaceAll('-', '').slice(0, 12).toLowerCase();
  const platform = await database.json<{ platformDatabaseId?: unknown; ownerId?: unknown }>(
    platformOwnerRequest()
  );
  uuid(platform.platformDatabaseId, 'platform database ID');
  const ownerId = uuid(platform.ownerId, 'platform owner ID');

  let manifest: NativeFixtureManifest = {
    version: NATIVE_FIXTURE_VERSION,
    kind: NATIVE_FIXTURE_KIND,
    status: 'provisioning',
    runId,
    createdAt: now().toISOString(),
    constructiveDbPath,
    presetModulePath: loaded.presetModulePath,
    platformDatabase: options.platformDatabase,
    graphqlOrigin,
    membershipFixtureMode: 'auto-approved-and-verified',
    databaseIds: [],
    cleanedDatabaseIds: [],
    tenants: []
  };
  const persist = async (): Promise<void> => {
    assertNativeFixtureManifest(manifest);
    await options.writeManifest?.(manifest);
  };
  await persist();

  try {
    for (const definition of fixtureDefinitions(loaded.presets)) {
      const slug = definition.profile.replaceAll('-', '_');
      const databaseName = `console_kit_${slug}_${runSuffix}`;
      const subdomain = `console-kit-${definition.profile}-${runSuffix}`;
      const provisioned = await database.json<{ databaseId?: unknown }>(
        provisionDatabaseRequest({
          name: databaseName,
          ownerId,
          subdomain,
          domain,
          modules: definition.modules
        })
      );
      const databaseId = uuid(provisioned.databaseId, `${definition.profile} database ID`);
      manifest = {
        ...manifest,
        databaseIds: [...manifest.databaseIds, databaseId]
      };
      await persist();

      const membershipTable = await database.json<{ schemaName?: unknown; tableName?: unknown }>(
        membershipDefaultsLookupRequest(databaseId)
      );
      await database.execute(
        enableMembershipDefaultsRequest(
          nonEmptyString(membershipTable.schemaName, `${definition.profile} membership defaults schema`),
          nonEmptyString(membershipTable.tableName, `${definition.profile} membership defaults table`)
        )
      );

      const projects = await database.json<{ tableId?: unknown; tableName?: unknown }>(
        projectProvisionRequest(databaseId)
      );
      const tableId = uuid(projects.tableId, `${definition.profile} projects table ID`);
      if (projects.tableName !== 'projects') {
        throw new Error(`${definition.profile} provisioned an unexpected fixture table.`);
      }
      const rawEndpoints = await database.json<unknown>(endpointDiscoveryRequest(databaseId));
      const endpoints = parseDiscoveredEndpoints(rawEndpoints, graphqlOrigin);
      for (const requiredApi of ['api', 'auth', 'admin']) {
        if (endpoints.filter((endpoint) => endpoint.apiName === requiredApi).length !== 1) {
          throw new Error(`${definition.profile} must expose exactly one public ${requiredApi} endpoint.`);
        }
      }
      if (
        definition.storageApiName &&
        endpoints.filter((endpoint) => endpoint.apiName === definition.storageApiName).length !== 1
      ) {
        throw new Error('The routed Storage fixture has no public admin endpoint.');
      }

      const tenant: NativeFixtureTenant = {
        profile: definition.profile,
        preset: definition.preset,
        presetMode: definition.presetMode,
        database: {
          id: databaseId,
          name: databaseName,
          domain,
          subdomain
        },
        projects: { tableId, tableName: 'projects' },
        endpoints,
        capabilityBindings: definition.storageApiName
          ? { storageApiName: definition.storageApiName }
          : {}
      };
      manifest = {
        ...manifest,
        tenants: [...manifest.tenants, tenant]
      };
      await persist();
    }
    manifest = { ...manifest, status: 'ready' };
    await persist();
    return manifest;
  } catch (error) {
    const failures: unknown[] = [error];
    manifest = { ...manifest, status: 'failed' };
    try {
      await persist();
    } catch (persistenceError) {
      failures.push(persistenceError);
    }
    if (!options.keepOnFailure) {
      try {
        manifest = await cleanupNativeFixture(database, manifest);
      } catch (cleanupError) {
        failures.push(cleanupError);
      }
      if (manifest.status === 'cleaned') {
        try {
          await persist();
        } catch (persistenceError) {
          failures.push(persistenceError);
        }
      }
    }
    if (failures.length > 1) {
      throw new AggregateError(
        failures,
        'Fixture provisioning failed and one or more manifest persistence or exact-ID cleanup operations also failed.'
      );
    }
    throw error;
  }
}
