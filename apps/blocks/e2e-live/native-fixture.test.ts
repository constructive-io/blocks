import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  assertNativeFixtureManifest,
  cleanupDatabasesRequest,
  cleanupInventoryRequest,
  cleanupNativeFixture,
  cleanupVerificationRequest,
  dropFixtureSchemaRequest,
  endpointDiscoveryRequest,
  endpointUrl,
  loadOfficialPresetModules,
  projectProvisionRequest,
  provisionDatabaseRequest,
  provisionNativeFixture,
  routeStorageToAdmin,
  type NativeFixtureDatabase,
  type NativeFixtureManifest,
  type SqlRequest
} from './native-fixture';
import {
  assertNativeFixtureManifestSlotAvailable,
  parseNativeFixtureCliArgs,
  writeNativeFixtureManifest
} from '../scripts/console-kit-native-fixture';

const PLATFORM_ID = '00000000-0000-4000-2000-000000000001';
const OWNER_ID = '00000000-0000-4000-8000-000000000002';

async function fakeConstructiveDb(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'blocks-native-fixture-'));
  const presetDirectory = join(root, 'packages/node-type-registry/src/module-presets');
  await mkdir(presetDirectory, { recursive: true });
  await writeFile(
    join(presetDirectory, 'index.mjs'),
    `export const allModulePresets = [
      { name: 'auth:hardened', modules: ['users_module', ['memberships_module', { scope: 'app' }]] },
      { name: 'b2b:storage', modules: ['users_module', ['memberships_module', { scope: 'app' }], 'storage_module'] },
      { name: 'full', modules: ['users_module', ['memberships_module', { scope: 'app' }], ['storage_module', { has_versioning: true }], 'billing_module'] }
    ];\n`
  );
  return root;
}

function uuidAt(index: number): string {
  return `10000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
}

class FakeDatabase implements NativeFixtureDatabase {
  readonly requests: SqlRequest[] = [];
  readonly executed: SqlRequest[] = [];
  provisionIndex = 0;
  projectIndex = 0;
  cleanupIds: string[] | null = null;
  cleanupInventoryIds: string[] | null = null;
  remainingDatabaseIds: string[] = [];
  remainingSchemaNames: string[] = [];
  failProvisionAt: number | null = null;
  failProjectAt: number | null = null;

  async json<T>(request: SqlRequest): Promise<T> {
    this.requests.push(request);
    if (request.sql.includes("'platformDatabaseId'") && request.sql.includes("'ownerId'")) {
      return { platformDatabaseId: PLATFORM_ID, ownerId: OWNER_ID } as T;
    }
    if (request.sql.includes('metaschema_generators.provision_database')) {
      this.provisionIndex += 1;
      if (this.failProvisionAt === this.provisionIndex) {
        throw new Error('synthetic provision failure');
      }
      return { databaseId: uuidAt(this.provisionIndex) } as T;
    }
    if (request.sql.includes('membership_defaults_table_id')) {
      return { schemaName: 'fixture_memberships_public', tableName: 'app_membership_defaults' } as T;
    }
    if (request.sql.includes('secure_table_provision')) {
      this.projectIndex += 1;
      if (this.failProjectAt === this.projectIndex) throw new Error('synthetic project failure');
      return { tableId: uuidAt(100 + this.projectIndex), tableName: 'projects' } as T;
    }
    if (request.sql.includes('services_public.apis')) {
      const databaseId = request.variables?.database_id;
      const suffix = databaseId?.slice(-1) ?? '0';
      return [
        {
          apiId: uuidAt(200 + Number(suffix)),
          apiName: 'admin',
          domainId: uuidAt(300 + Number(suffix)),
          domain: 'localhost',
          subdomain: `admin-console-kit-${suffix}`,
          schemas: ['admin_public']
        },
        {
          apiId: uuidAt(400 + Number(suffix)),
          apiName: 'api',
          domainId: uuidAt(500 + Number(suffix)),
          domain: 'localhost',
          subdomain: `api-console-kit-${suffix}`,
          schemas: ['app_public']
        },
        {
          apiId: uuidAt(600 + Number(suffix)),
          apiName: 'auth',
          domainId: uuidAt(700 + Number(suffix)),
          domain: 'localhost',
          subdomain: `auth-console-kit-${suffix}`,
          schemas: ['auth_public']
        }
      ] as T;
    }
    if (request.sql.includes('console-kit fixture cleanup inventory')) {
      const requested = JSON.parse(request.variables?.database_ids ?? '[]') as string[];
      const matchedDatabaseIds = this.cleanupInventoryIds ?? requested;
      return {
        requested,
        matchedDatabaseIds,
        platformDatabaseId: PLATFORM_ID,
        schemas: matchedDatabaseIds.map((databaseId, index) => ({
          databaseId,
          schemaName: `console-kit-fixture-${index + 1}-public`
        }))
      } as T;
    }
    if (request.sql.includes('DELETE FROM metaschema_public.database')) {
      const requested = JSON.parse(request.variables?.database_ids ?? '[]') as string[];
      const deleted = this.cleanupIds ?? requested;
      return { requested, deleted } as T;
    }
    if (request.sql.includes('console-kit fixture cleanup verification')) {
      return {
        remainingDatabaseIds: this.remainingDatabaseIds,
        remainingSchemaNames: this.remainingSchemaNames
      } as T;
    }
    throw new Error(`Unhandled SQL request: ${request.sql}`);
  }

  async execute(request: SqlRequest): Promise<void> {
    this.executed.push(request);
  }
}

test('loads the three official module arrays from the supplied Constructive DB checkout', async () => {
  const root = await fakeConstructiveDb();
  const loaded = await loadOfficialPresetModules(root);

  assert.match(loaded.presetModulePath, /node-type-registry\/src\/module-presets\/index\.mjs$/u);
  assert.deepEqual(loaded.presets['auth:hardened'], [
    'users_module',
    ['memberships_module', { scope: 'app' }]
  ]);
  assert.deepEqual(loaded.presets['b2b:storage'].at(-1), 'storage_module');
  assert.deepEqual(loaded.presets.full.at(-1), 'billing_module');
});

test('derives routed Storage without mutating or flattening the official preset', () => {
  const source = [
    'users_module',
    ['storage_module', { has_versioning: true }] as const
  ];
  const routed = routeStorageToAdmin(source);

  assert.deepEqual(routed, [
    'users_module',
    ['storage_module', { has_versioning: true, api_name: 'admin' }]
  ]);
  assert.deepEqual(source, [
    'users_module',
    ['storage_module', { has_versioning: true }]
  ]);
  assert.throws(() => routeStorageToAdmin(['users_module']), /exactly one storage_module/u);
});

test('keeps values in psql variables for provisioning, RLS table creation, and cleanup', () => {
  const provision = provisionDatabaseRequest({
    name: "fixture'; drop table users; --",
    ownerId: OWNER_ID,
    subdomain: 'fixture-safe',
    domain: 'localhost',
    modules: ['users_module']
  });
  assert.doesNotMatch(provision.sql, /drop table users/iu);
  assert.equal(provision.variables?.database_name, "fixture'; drop table users; --");
  assert.match(provision.sql, /:'database_name'/u);

  const projects = projectProvisionRequest(uuidAt(1));
  assert.match(projects.sql, /metaschema_modules_public\.secure_table_provision/u);
  assert.match(
    projects.sql,
    /metaschema_generators\.apply_scope_fields\([\s\S]*v_scope := 'app'/u
  );
  assert.deepEqual(JSON.parse(projects.variables!.nodes), [
    { $type: 'DataId' },
    { $type: 'DataTimestamps' },
    { $type: 'DataDirectOwner' }
  ]);
  assert.deepEqual(JSON.parse(projects.variables!.policies)[0].privileges, [
    'select',
    'insert',
    'update',
    'delete'
  ]);
  assert.deepEqual(JSON.parse(projects.variables!.fields)[2].default, {
    value: false
  });

  const cleanup = cleanupDatabasesRequest([uuidAt(1), uuidAt(2)]);
  assert.match(cleanup.sql, /DELETE FROM metaschema_public\.database/u);
  assert.equal(cleanup.variables?.database_ids, JSON.stringify([uuidAt(1), uuidAt(2)]));
  assert.doesNotMatch(cleanup.sql, new RegExp(uuidAt(1), 'u'));

  const inventory = cleanupInventoryRequest([uuidAt(1), uuidAt(2)]);
  assert.match(inventory.sql, /metaschema_public\.schema/u);
  assert.equal(inventory.variables?.database_ids, JSON.stringify([uuidAt(1), uuidAt(2)]));

  const hostileSchemaName = `fixture\"; DROP SCHEMA public; --`;
  const drop = dropFixtureSchemaRequest(hostileSchemaName);
  assert.equal(
    drop.sql,
    'DROP SCHEMA IF EXISTS "fixture""; DROP SCHEMA public; --" CASCADE'
  );

  const verification = cleanupVerificationRequest([uuidAt(1)], [hostileSchemaName]);
  assert.doesNotMatch(verification.sql, /DROP SCHEMA public/u);
  assert.equal(verification.variables?.schema_names, JSON.stringify([hostileSchemaName]));
});

test('discovers endpoint routes from services metadata instead of constructing sibling API names', () => {
  const request = endpointDiscoveryRequest(uuidAt(1));
  assert.match(request.sql, /services_public\.apis/u);
  assert.match(request.sql, /services_public\.domains/u);
  assert.match(request.sql, /services_public\.api_schemas/u);
  assert.match(request.sql, /domain_record\.api_id = api\.id/u);
  assert.equal(
    endpointUrl('http://localhost:6464', {
      domain: 'localhost',
      subdomain: 'auth-tenant-from-metadata'
    }),
    'http://auth-tenant-from-metadata.localhost:6464/graphql'
  );
});

test('provisions official profiles plus routed Storage and journals every exact database ID', async () => {
  const root = await fakeConstructiveDb();
  const database = new FakeDatabase();
  const journal: NativeFixtureManifest[] = [];
  const manifest = await provisionNativeFixture(database, {
    constructiveDbPath: root,
    platformDatabase: 'constructive-functions-console-kit-blocks',
    runId: '11111111-1111-4111-8111-111111111111',
    now: () => new Date('2026-07-23T00:00:00.000Z'),
    writeManifest: async (value) => {
      journal.push(structuredClone(value));
    }
  });

  assert.equal(manifest.status, 'ready');
  assert.deepEqual(manifest.databaseIds, [uuidAt(1), uuidAt(2), uuidAt(3), uuidAt(4)]);
  assert.deepEqual(manifest.tenants.map((tenant) => tenant.profile), [
    'auth-hardened',
    'b2b-storage',
    'full',
    'storage-routed'
  ]);
  assert.equal(manifest.tenants[3]!.preset, 'b2b:storage');
  assert.deepEqual(manifest.tenants[3]!.capabilityBindings, { storageApiName: 'admin' });
  assert.equal(
    manifest.tenants[0]!.endpoints.find((endpoint) => endpoint.apiName === 'auth')?.url,
    'http://auth-console-kit-1.localhost:6464/graphql'
  );
  assert.equal(database.executed.length, 4);
  assert.ok(database.executed.every((request) => request.sql.includes('is_verified = TRUE')));

  const provisionRequests = database.requests.filter((request) =>
    request.sql.includes('metaschema_generators.provision_database')
  );
  const routedModules = JSON.parse(provisionRequests[3]!.variables!.modules);
  assert.deepEqual(routedModules.at(-1), ['storage_module', { api_name: 'admin' }]);
  assert.equal(journal.at(-1)?.status, 'ready');
  assert.ok(journal.some((entry) => entry.databaseIds.length === 1 && entry.status === 'provisioning'));
  assertNativeFixtureManifest(manifest);
});

test('cleans only the UUIDs recorded by the manifest and records the result', async () => {
  const root = await fakeConstructiveDb();
  const database = new FakeDatabase();
  const manifest = await provisionNativeFixture(database, {
    constructiveDbPath: root,
    platformDatabase: 'fixture-platform',
    runId: '22222222-2222-4222-8222-222222222222'
  });
  const cleaned = await cleanupNativeFixture(database, manifest);

  assert.equal(cleaned.status, 'cleaned');
  assert.deepEqual(cleaned.cleanedDatabaseIds, manifest.databaseIds);
  const cleanupRequest = database.requests.find((request) =>
    request.sql.includes('DELETE FROM metaschema_public.database')
  )!;
  assert.deepEqual(JSON.parse(cleanupRequest.variables!.database_ids), manifest.databaseIds);
  const droppedSchemas = database.executed.filter((request) => request.sql.includes('DROP SCHEMA'));
  assert.equal(droppedSchemas.length, manifest.databaseIds.length);
  assert.ok(droppedSchemas.every((request) => /DROP SCHEMA IF EXISTS "console-kit-fixture-/u.test(request.sql)));
  const verificationRequest = database.requests.find((request) =>
    request.sql.includes('console-kit fixture cleanup verification')
  )!;
  assert.deepEqual(
    JSON.parse(verificationRequest.variables!.schema_names),
    manifest.databaseIds.map((_, index) => `console-kit-fixture-${index + 1}-public`)
  );
  assertNativeFixtureManifest(cleaned);
});

test('fails closed before dropping schemas when cleanup inventory is incomplete', async () => {
  const root = await fakeConstructiveDb();
  const database = new FakeDatabase();
  const manifest = await provisionNativeFixture(database, {
    constructiveDbPath: root,
    platformDatabase: 'fixture-platform',
    runId: '23232323-2323-4323-8323-232323232323'
  });
  database.cleanupInventoryIds = manifest.databaseIds.slice(1);

  await assert.rejects(
    cleanupNativeFixture(database, manifest),
    new RegExp(`cleanup inventory mismatch.*${manifest.databaseIds[0]}`, 'iu')
  );
  assert.equal(database.executed.filter((request) => request.sql.includes('DROP SCHEMA')).length, 0);
});

test('fails closed when exact-ID cleanup does not delete the full journal', async () => {
  const root = await fakeConstructiveDb();
  const database = new FakeDatabase();
  const manifest = await provisionNativeFixture(database, {
    constructiveDbPath: root,
    platformDatabase: 'fixture-platform',
    runId: '33333333-3333-4333-8333-333333333333'
  });
  database.cleanupIds = manifest.databaseIds.slice(1);

  await assert.rejects(
    cleanupNativeFixture(database, manifest),
    new RegExp(`Exact-ID cleanup mismatch.*${manifest.databaseIds[0]}`, 'u')
  );
});

test('does not mark cleanup complete while a physical namespace remains', async () => {
  const root = await fakeConstructiveDb();
  const database = new FakeDatabase();
  const manifest = await provisionNativeFixture(database, {
    constructiveDbPath: root,
    platformDatabase: 'fixture-platform',
    runId: '34343434-3434-4434-8434-343434343434'
  });
  database.remainingSchemaNames = ['console-kit-fixture-1-public'];

  await assert.rejects(
    cleanupNativeFixture(database, manifest),
    /Cleanup verification failed.*console-kit-fixture-1-public/u
  );
});

test('rolls back provisioned IDs on failure unless --keep is selected', async () => {
  const root = await fakeConstructiveDb();
  const rollbackDatabase = new FakeDatabase();
  rollbackDatabase.failProjectAt = 2;
  const rollbackJournal: NativeFixtureManifest[] = [];

  await assert.rejects(
    provisionNativeFixture(rollbackDatabase, {
      constructiveDbPath: root,
      platformDatabase: 'fixture-platform',
      runId: '44444444-4444-4444-8444-444444444444',
      writeManifest: async (manifest) => {
        rollbackJournal.push(structuredClone(manifest));
      }
    }),
    /synthetic project failure/u
  );
  assert.equal(rollbackJournal.at(-1)?.status, 'cleaned');
  assert.deepEqual(rollbackJournal.at(-1)?.cleanedDatabaseIds, [uuidAt(1), uuidAt(2)]);

  const keptDatabase = new FakeDatabase();
  keptDatabase.failProjectAt = 1;
  const keptJournal: NativeFixtureManifest[] = [];
  await assert.rejects(
    provisionNativeFixture(keptDatabase, {
      constructiveDbPath: root,
      platformDatabase: 'fixture-platform',
      runId: '55555555-5555-4555-8555-555555555555',
      keepOnFailure: true,
      writeManifest: async (manifest) => {
        keptJournal.push(structuredClone(manifest));
      }
    }),
    /synthetic project failure/u
  );
  assert.equal(keptJournal.at(-1)?.status, 'failed');
  assert.deepEqual(keptJournal.at(-1)?.databaseIds, [uuidAt(1)]);
  assert.deepEqual(keptJournal.at(-1)?.cleanedDatabaseIds, []);
});

test('marks an empty journal cleaned when the first provision fails', async () => {
  const root = await fakeConstructiveDb();
  const database = new FakeDatabase();
  database.failProvisionAt = 1;
  const journal: NativeFixtureManifest[] = [];

  await assert.rejects(
    provisionNativeFixture(database, {
      constructiveDbPath: root,
      platformDatabase: 'fixture-platform',
      runId: '54545454-5454-4454-8454-545454545454',
      writeManifest: async (manifest) => {
        journal.push(structuredClone(manifest));
      }
    }),
    /synthetic provision failure/u
  );

  assert.deepEqual(
    journal.map((manifest) => manifest.status),
    ['provisioning', 'failed', 'cleaned']
  );
  assert.deepEqual(journal.at(-1)?.databaseIds, []);
  assert.deepEqual(journal.at(-1)?.cleanedDatabaseIds, []);
});

test('cleans the in-memory exact ID when immediate post-provision manifest writes fail', async () => {
  const root = await fakeConstructiveDb();
  const database = new FakeDatabase();
  const journal: NativeFixtureManifest[] = [];
  const postProvisionError = new Error('synthetic post-provision journal failure');
  const failedStatusError = new Error('synthetic failed-status journal failure');

  await assert.rejects(
    provisionNativeFixture(database, {
      constructiveDbPath: root,
      platformDatabase: 'fixture-platform',
      runId: '56565656-5656-4656-8656-565656565656',
      writeManifest: async (manifest) => {
        journal.push(structuredClone(manifest));
        if (manifest.status === 'provisioning' && manifest.databaseIds.length === 1) {
          throw postProvisionError;
        }
        if (manifest.status === 'failed') throw failedStatusError;
      }
    }),
    (error: unknown) => {
      assert.ok(error instanceof AggregateError);
      assert.deepEqual(error.errors, [postProvisionError, failedStatusError]);
      return true;
    }
  );

  const cleanupInventory = database.requests.find((request) =>
    request.sql.includes('console-kit fixture cleanup inventory')
  );
  assert.deepEqual(
    JSON.parse(cleanupInventory?.variables?.database_ids ?? '[]'),
    [uuidAt(1)]
  );
  const cleanupDelete = database.requests.find((request) =>
    request.sql.includes('DELETE FROM metaschema_public.database')
  );
  assert.deepEqual(
    JSON.parse(cleanupDelete?.variables?.database_ids ?? '[]'),
    [uuidAt(1)]
  );
  const droppedSchemas = database.executed.filter((request) =>
    request.sql.includes('DROP SCHEMA')
  );
  assert.equal(droppedSchemas.length, 1);
  assert.match(droppedSchemas[0]!.sql, /console-kit-fixture-1-public/u);
  assert.equal(journal.at(-1)?.status, 'cleaned');
  assert.deepEqual(journal.at(-1)?.cleanedDatabaseIds, [uuidAt(1)]);
});

test('aggregates provisioning, failed-status persistence, and cleanup errors', async () => {
  const root = await fakeConstructiveDb();
  const database = new FakeDatabase();
  database.failProjectAt = 1;
  database.cleanupInventoryIds = [];
  const failedStatusError = new Error('synthetic failed-status journal failure');

  await assert.rejects(
    provisionNativeFixture(database, {
      constructiveDbPath: root,
      platformDatabase: 'fixture-platform',
      runId: '57575757-5757-4757-8757-575757575757',
      writeManifest: async (manifest) => {
        if (manifest.status === 'failed') throw failedStatusError;
      }
    }),
    (error: unknown) => {
      assert.ok(error instanceof AggregateError);
      assert.equal(error.errors.length, 3);
      assert.match(String(error.errors[0]), /synthetic project failure/u);
      assert.equal(error.errors[1], failedStatusError);
      assert.match(String(error.errors[2]), /cleanup inventory mismatch/u);
      return true;
    }
  );
});

test('rejects secret-bearing or structurally incomplete ready manifests', async () => {
  const root = await fakeConstructiveDb();
  const manifest = await provisionNativeFixture(new FakeDatabase(), {
    constructiveDbPath: root,
    platformDatabase: 'fixture-platform',
    runId: '66666666-6666-4666-8666-666666666666'
  });
  assert.throws(
    () => assertNativeFixtureManifest({ ...manifest, accessToken: 'must-not-be-written' }),
    /forbidden key accessToken/u
  );
  assert.throws(
    () => assertNativeFixtureManifest({ ...manifest, verificationToken: 'must-not-be-written' }),
    /forbidden key verificationToken/u
  );
  assert.throws(
    () => assertNativeFixtureManifest({
      ...manifest,
      tenants: [{ ...manifest.tenants[0]!, unexpected: true }, ...manifest.tenants.slice(1)]
    }),
    /tenants\[0\] contains unknown key unexpected/u
  );
  assert.throws(
    () => assertNativeFixtureManifest({
      ...manifest,
      tenants: [
        manifest.tenants[0]!,
        {
          ...manifest.tenants[1]!,
          database: {
            ...manifest.tenants[1]!.database,
            id: manifest.tenants[0]!.database.id
          }
        },
        ...manifest.tenants.slice(2)
      ]
    }),
    /duplicate tenant database IDs/u
  );
  assert.throws(
    () => assertNativeFixtureManifest({ ...manifest, tenants: manifest.tenants.slice(1) }),
    /exactly one auth-hardened tenant/u
  );
});

test('parses explicit fun-up database and Constructive DB inputs for provision and run', () => {
  const provision = parseNativeFixtureCliArgs(
    [
      'provision',
      '--constructive-db',
      '/workspace/constructive-db',
      '--database',
      'constructive-functions-console-kit-blocks',
      '--keep'
    ],
    '/workspace/blocks',
    {}
  );
  assert.equal(provision.platformDatabase, 'constructive-functions-console-kit-blocks');
  assert.equal(provision.manifestPath, '/workspace/blocks/.local/console-kit-native-fixture.json');
  assert.equal(provision.keep, true);
  assert.equal(provision.graphqlOrigin, 'http://localhost:6464');

  const run = parseNativeFixtureCliArgs(
    [
      'run',
      '--constructive-db',
      '/workspace/constructive-db',
      '--db',
      'fixture-db',
      '--',
      'pnpm',
      'test:e2e:live'
    ],
    '/workspace/blocks',
    {}
  );
  assert.deepEqual(run.childCommand, ['pnpm', 'test:e2e:live']);
  assert.throws(
    () => parseNativeFixtureCliArgs(['provision', '--database', 'fixture-db']),
    /--constructive-db is required/u
  );
  assert.throws(
    () => parseNativeFixtureCliArgs(['cleanup', '--manifest', '/tmp/fixture.json']),
    /--database is required/u
  );
});

test('refuses to overwrite an exact-ID journal until it is marked cleaned', async () => {
  const root = await fakeConstructiveDb();
  const manifest = await provisionNativeFixture(new FakeDatabase(), {
    constructiveDbPath: root,
    platformDatabase: 'fixture-platform',
    runId: '77777777-7777-4777-8777-777777777777'
  });
  const directory = await mkdtemp(join(tmpdir(), 'blocks-native-journal-'));
  const path = join(directory, 'fixture.json');
  await writeNativeFixtureManifest(path, manifest);

  await assert.rejects(
    assertNativeFixtureManifestSlotAvailable(path),
    /still owns 4 tenant database ID/u
  );

  await writeNativeFixtureManifest(path, {
    ...manifest,
    status: 'cleaned',
    cleanedDatabaseIds: manifest.databaseIds
  });
  await assert.doesNotReject(assertNativeFixtureManifestSlotAvailable(path));
});
