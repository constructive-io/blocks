import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  resolveConsoleKitReviewStatus,
  type ConsoleKitReviewPaths
} from './review-status';

const RUN_ID = 'proof-run';
const DATABASE_ID = '7af254da-12f2-4ec5-a745-dd15181230f9';
const DIGEST = 'a'.repeat(64);
const PRESETS = ['auth:hardened', 'b2b:storage', 'full'] as const;
const ENDPOINT_KINDS = [
  'data',
  'auth',
  'admin',
  'billing',
  'storage',
  'notifications'
] as const;
const SCENARIOS = [
  'switches the tenant-scoped shell, signs in to every preset, and discovers only manifest tables',
  'completes standalone auth and restores the database-scoped session after reload',
  'signs up, sends, and consumes fresh email verification through Console Kit',
  'reads the complete full-preset billing contract through the billing endpoint',
  'loads authoritative memberships and fails closed around organization RLS',
  'rejects invalid, cross-tenant, and revoked bearer tokens at HTTP-200 GraphQL boundaries',
  'binds sign-in and sign-up sessions to their original strict-auth fingerprint',
  'enforces direct-owner RLS across create, read, update, and delete',
  'persists b2b SaaS project CRUD and isolates projects between signed-up app users',
  'round-trips a composite post_tags primary key through _meta-derived mutations',
  'persists UI CRUD and deletes a composite-key post_tags row through Sheets',
  'keeps the live shell usable at the 390px review viewport'
] as const;
const temporaryRoots: string[] = [];

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value)}\n`);
}

function hash(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function dependencyClosure() {
  return {
    nodeVersion: 'v24.0.0',
    pnpmVersion: '10.0.0',
    lockfileHash: DIGEST,
    installedLockfileHash: DIGEST,
    modulesHash: DIGEST,
    storePath: '/tmp/pnpm-store'
  };
}

type ReviewFixture = Readonly<{
  base: string;
  root: string;
  paths: ConsoleKitReviewPaths;
  aggregatePath: string;
  stackProvenancePath: string;
  blocksProvenancePath: string;
  suiteInputPath: string;
  blocksReceiptPath: string;
  fixtureDescriptorPath: string;
  fixtureReceiptPath: string;
  tenantManifestPaths: readonly string[];
  credentialPaths: readonly string[];
}>;

function proofCoreHash(aggregate: Record<string, unknown>): string {
  const execution = aggregate.execution as Record<string, unknown>;
  return createHash('sha256').update(JSON.stringify({
    version: aggregate.version,
    kind: aggregate.kind,
    runId: aggregate.runId,
    controlEndpoint: aggregate.controlEndpoint,
    privateEndpoint: aggregate.privateEndpoint,
    blocksUrl: aggregate.blocksUrl,
    sources: aggregate.sources,
    mode: execution.mode,
    stack: execution.stack,
    blocks: execution.blocks,
    tenantProbes: execution.tenantProbes,
    tenants: aggregate.tenants,
    cleanupTargets: aggregate.cleanupTargets
  })).digest('hex');
}

function writeCompletion(fixture: ReviewFixture): void {
  writeJson(fixture.paths.completion, {
    version: 1,
    kind: 'constructive-console-kit-review-completion',
    runId: RUN_ID,
    status: 'passed',
    completedAt: new Date(0).toISOString(),
    blocksReceiptHash: hash(fixture.blocksReceiptPath),
    verificationFixtureReceiptHash: hash(fixture.fixtureReceiptPath)
  });
}

function writeAttestation(
  fixture: ReviewFixture,
  overrides: Readonly<{ routeInputPath?: string }> = {}
): void {
  const aggregate = JSON.parse(readFileSync(fixture.aggregatePath, 'utf8')) as Record<string, unknown>;
  writeJson(fixture.paths.finalAttestation, {
    version: 2,
    kind: 'constructive-console-kit-final-attestation',
    runId: RUN_ID,
    createdAt: new Date(1).toISOString(),
    proofCoreHash: proofCoreHash(aggregate),
    aggregate: {
      path: fixture.aggregatePath,
      hash: hash(fixture.aggregatePath)
    },
    stackProvenance: {
      path: fixture.stackProvenancePath,
      hash: hash(fixture.stackProvenancePath)
    },
    blocksProvenance: {
      path: fixture.blocksProvenancePath,
      hash: hash(fixture.blocksProvenancePath)
    },
    routeInput: {
      path: overrides.routeInputPath ?? fixture.paths.routeInput,
      hash: hash(fixture.paths.routeInput)
    },
    suiteInput: {
      path: fixture.suiteInputPath,
      hash: hash(fixture.suiteInputPath)
    },
    blocksReceipt: {
      path: fixture.blocksReceiptPath,
      hash: hash(fixture.blocksReceiptPath)
    },
    verificationFixtureDescriptor: {
      path: fixture.fixtureDescriptorPath,
      hash: hash(fixture.fixtureDescriptorPath)
    },
    verificationFixtureReceipt: {
      path: fixture.fixtureReceiptPath,
      hash: hash(fixture.fixtureReceiptPath)
    },
    reviewCompletion: {
      path: fixture.paths.completion,
      hash: hash(fixture.paths.completion)
    },
    tenantManifests: PRESETS.map((preset, index) => ({
      preset,
      path: fixture.tenantManifestPaths[index],
      hash: hash(fixture.tenantManifestPaths[index]!)
    })),
    credentialReceipts: PRESETS.map((preset, index) => ({
      preset,
      path: fixture.credentialPaths[index],
      hash: hash(fixture.credentialPaths[index]!)
    }))
  });
}

function createReviewFixture() {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'console-kit-review-')));
  temporaryRoots.push(base);
  const root = join(base, RUN_ID);
  mkdirSync(root);
  const paths = {
    routeInput: join(root, 'route-input.json'),
    completion: join(root, 'review-completion.json'),
    failure: join(root, 'review-failure.json'),
    finalAttestation: join(root, 'final-attestation.json')
  };
  const aggregatePath = join(root, 'tenants.json');
  const stackProvenancePath = join(root, 'stack-provenance.json');
  const blocksProvenancePath = join(root, 'blocks-provenance.json');
  const suiteInputPath = join(root, 'suite-input.json');
  const blocksReceiptPath = join(root, 'blocks-receipt.json');
  const fixtureDescriptorPath = join(root, 'verification-fixture-descriptor.json');
  const fixtureReceiptPath = join(root, 'verification-fixture-receipt.json');
  const manifestsDirectory = join(root, 'manifests');
  const credentialsDirectory = join(root, 'credentials');
  mkdirSync(manifestsDirectory);
  mkdirSync(credentialsDirectory);
  const tenantManifestPaths = PRESETS.map((preset) =>
    join(manifestsDirectory, `${preset.replace(':', '-')}.json`)
  );
  const credentialPaths = PRESETS.map((preset) =>
    join(credentialsDirectory, `${preset.replace(':', '-')}.credentials.json`)
  );
  const controlEndpoint = 'http://api.localhost:3000/graphql';
  const privateEndpoint = 'http://private.localhost:3002/graphql';
  const blocksUrl = 'http://127.0.0.1:3005/__integration/console-kit';
  const fixtures = [
    { preset: 'auth:hardened', blueprint: 'crm', dataset: 'crm-demo' },
    { preset: 'b2b:storage', blueprint: 'saas', dataset: 'saas-demo' },
    { preset: 'full', blueprint: 'blog', dataset: 'blog-demo' }
  ] as const;
  const requiredKinds = [
    ['data', 'auth', 'admin'],
    ['data', 'auth', 'admin'],
    ['data', 'auth', 'admin', 'billing']
  ] as const;
  const apiNames = {
    data: 'api',
    auth: 'auth',
    admin: 'admin',
    billing: 'usage',
    storage: 'objects',
    notifications: 'notifications'
  } as const;
  const manifests = fixtures.map((fixture, index) => {
    const databaseId = index === 0
      ? DATABASE_ID
      : `${index}af254da-12f2-4ec5-a745-dd15181230f9`;
    const endpoints = Object.fromEntries(ENDPOINT_KINDS.map((kind) => {
      const routable = (requiredKinds[index] as readonly string[]).includes(kind);
      return [kind, {
        apiName: apiNames[kind],
        apiId: routable ? `${kind}-api-${index}` : null,
        url: routable
          ? `http://${apiNames[kind]}-proof-${index}.localhost:3000/graphql`
          : null,
        routable,
        roleName: routable ? `${kind}_authenticated` : null,
        anonRole: routable ? `${kind}_anonymous` : null,
        schemaIds: routable ? [`${kind}-schema-${index}`] : [],
        ...(routable ? {} : { reason: 'not routed' })
      }];
    }));
    return {
      version: 1,
      seedId: `seed-${index}`,
      runStatus: 'completed',
      controlPlaneEndpoint: controlEndpoint,
      preset: fixture.preset,
      blueprint: fixture.blueprint,
      dataset: fixture.dataset,
      tableAllowlist: [`table_${index}`],
      databaseId,
      database: {
        id: databaseId,
        name: `${fixture.preset} proof`,
        domain: 'localhost',
        subdomain: `proof-${index}`
      },
      endpoints
    };
  });
  PRESETS.forEach((preset, index) => {
    const normalized = manifests[index]!;
    writeJson(tenantManifestPaths[index]!, {
      version: 1,
      seederVersion: '0.0.0-test',
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(1).toISOString(),
      runStatus: normalized.runStatus,
      seedId: normalized.seedId,
      controlPlaneEndpoint: normalized.controlPlaneEndpoint,
      provisioningMode: 'preset',
      preset: normalized.preset,
      blueprint: normalized.blueprint,
      dataset: normalized.dataset,
      size: 'small',
      tableAllowlist: normalized.tableAllowlist,
      database: normalized.database,
      ticket: {
        id: `ticket-${index}`,
        status: 'completed',
        bootstrapStatus: 'completed',
        completedAt: new Date(1).toISOString(),
        fulfilledAt: new Date(1).toISOString()
      },
      endpoints: Object.fromEntries(ENDPOINT_KINDS.map((kind) => [kind, {
        ...normalized.endpoints[kind],
        reason: normalized.endpoints[kind].routable ? null : 'not routed'
      }])),
      unroutableApis: []
    });
    writeJson(credentialPaths[index]!, { ownerReadableReceipt: true, preset });
  });

  const sourcePaths = Object.fromEntries([
    'constructive',
    'constructiveDb',
    'constructiveFunctions',
    'dashboard',
    'blocks',
    'hub'
  ].map((key) => [key, join(base, `${key}-source`)]));
  const sources = Object.fromEntries(Object.entries(sourcePaths).map(([key, path]) => [key, {
    path,
    revision: `${key}-revision`,
    dirty: false,
    contentHash: DIGEST
  }]));
  writeJson(stackProvenancePath, {
    version: 2,
    kind: 'constructive-console-kit-stack-provenance',
    runId: RUN_ID,
    createdAt: new Date(0).toISOString(),
    fingerprint: {
      configHash: DIGEST,
      composeHash: DIGEST,
      environmentHash: DIGEST,
      sources: {
        constructive: DIGEST,
        constructiveDb: DIGEST,
        constructiveFunctions: DIGEST
      },
      artifacts: {
        constructive: DIGEST,
        constructiveDbCompute: DIGEST,
        constructiveFunctions: DIGEST
      },
      dependencies: {
        constructive: dependencyClosure(),
        constructiveDb: dependencyClosure(),
        constructiveFunctions: dependencyClosure(),
        dashboard: dependencyClosure()
      },
      toolchain: ['git', 'node', 'pnpm', 'docker', 'psql', 'pg_dump', 'lsof']
        .map((command) => ({
          command,
          path: `/usr/bin/${command}`,
          version: `${command} test-version`,
          binaryHash: DIGEST
        }))
    },
    services: [
      'public-server',
      'private-server',
      'knative-job-service',
      'send-verification-link',
      'console-kit-compute-worker'
    ].map((name, index) => ({
      name,
      port: 3000 + index,
      pid: 1000 + index,
      cwd: root,
      command: `${name} --serve`,
      listenerAddresses: [`127.0.0.1:${3000 + index}`]
    })),
    infrastructure: {
      composeFile: join(base, 'docker-compose.yml'),
      composeHash: DIGEST,
      projectName: 'console-kit-proof',
      dockerDaemon: {
        host: 'unix:///var/run/docker.sock',
        id: 'docker-daemon-id',
        name: 'docker-desktop',
        operatingSystem: 'Docker Desktop',
        serverVersion: '28.0.0'
      },
      containers: [
        {
          service: 'postgres',
          imageRef:
            'ghcr.io/constructive-io/docker/postgres-plus@sha256:7c4a01fe8e2e3716aecb575df6dbc5622973703304492b4c9236f6afa4ea7142'
        },
        {
          service: 'minio',
          imageRef:
            'minio/minio@sha256:29e8e51691d11e779468f275002779b221fd3902518d103e35c8a8bb2ef0f3ea'
        },
        {
          service: 'mailpit',
          imageRef:
            'axllent/mailpit@sha256:37a38e48e9338cd7e89dfeb487f37b02ebfcd9cb23111bed2d345e79d37d6dd6'
        }
      ].map((container, index) => ({
        ...container,
        containerId: `container-${index}`,
        imageId: `sha256:${DIGEST}`,
        repoDigests: [container.imageRef],
        running: true,
        health: index === 0 ? 'healthy' : 'not-configured',
        ...(container.service === 'minio' ? { health: 'healthy' } : {}),
        publishedPorts: container.service === 'postgres'
          ? ['5432/tcp=127.0.0.1:5432']
          : container.service === 'minio'
            ? ['9000/tcp=127.0.0.1:9000', '9001/tcp=127.0.0.1:9001']
            : ['1025/tcp=127.0.0.1:1025', '8025/tcp=127.0.0.1:8025'],
        mounts: container.service === 'mailpit'
          ? []
          : [{
              type: 'volume',
              name: `console-kit-proof_${container.service}-data`,
              source: `/var/lib/docker/volumes/${container.service}`,
              destination: container.service === 'postgres'
                ? '/var/lib/postgresql'
                : '/data',
              readWrite: true
            }]
      })),
      database: {
        database: 'constructive',
        databaseOid: '16384',
        systemIdentifier: '123456789',
        serverVersion: '17.0',
        serverVersionNum: '170000',
        postmasterStartedAt: new Date(0).toISOString(),
        requiredObjects: [
          'metaschema_public.database',
          'services_public.apis',
          'app_jobs.jobs',
          'constructive_users_public.users',
          'constructive_infra_public.db_presets',
          'constructive_compute_public.function_definitions',
          'constructive_compute_public.platform_function_definitions'
        ],
        packages: [
          'constructive-local',
          'constructive-functions',
          'metaschema',
          'pgpm-database-jobs'
        ].map((packageName) => ({
          package: packageName,
          changes: [{ name: 'deploy', scriptHash: DIGEST }]
        })),
        requiredFunctionDefinitions: [
          'database:bootstrap_owner',
          'database:provision',
          'email:send_verification_link'
        ],
        catalogHash: DIGEST,
        schemaDefinitionHash: DIGEST
      }
    }
  });
  const tenants = fixtures.map((fixture, index) => ({
    ...fixture,
    manifestPath: tenantManifestPaths[index],
    credentialRef: `${fixture.preset.replace(':', '-')}.credentials.json`,
    manifest: manifests[index]
  }));
  const cleanupTargets = PRESETS.map((preset, index) => ({
    preset,
    manifestPath: tenantManifestPaths[index],
    credentialRef: `${preset.replace(':', '-')}.credentials.json`,
    credentialHash: hash(credentialPaths[index]!)
  }));
  const coverage = {
    sourcesValidated: true,
    stackOwnedOrVerified: true,
    infrastructureValidated: true,
    controlPlaneProbes: true,
    tenantsProvisioned: true,
    tenantSemanticProbes: true,
    blocksLiveSuite: true
  };
  const tenantProbes = fixtures.map((fixture, index) => ({
    preset: fixture.preset,
    databaseId: manifests[index]!.databaseId,
    requiredKinds: requiredKinds[index],
    endpoints: requiredKinds[index].map((kind) => {
      const endpoint = manifests[index]!.endpoints[kind];
      return {
        kind,
        apiName: endpoint.apiName,
        url: endpoint.url,
        graphqlSucceeded: true,
        invalidBearerRejected: true,
        semanticContract: 'verified',
        queryFieldCount: 1,
        mutationFieldCount: 1,
        schemaRootHash: DIGEST,
        missingFields: []
      };
    })
  }));
  const stackExecution = {
    requested: 'start-or-verify',
    result: 'started',
    ownedByRun: true,
    provenanceVerified: true,
    provenancePath: stackProvenancePath,
    provenanceHash: hash(stackProvenancePath)
  };
  const routeExecution = {
    mode: 'canonical',
    stack: stackExecution,
    blocks: {
      requested: 'full',
      launch: 'pending',
      result: 'pending',
      provenanceVerified: false
    },
    coverage,
    tenantProbes
  };
  const stableProof = {
    version: 2,
    kind: 'constructive-console-kit-proof',
    runId: RUN_ID,
    retainTenants: true,
    controlEndpoint,
    privateEndpoint,
    blocksUrl,
    sources,
    tenants,
    cleanupTargets
  };

  writeJson(paths.routeInput, {
    ...stableProof,
    status: 'testing',
    execution: routeExecution
  });
  writeJson(blocksProvenancePath, {
    version: 2,
    kind: 'constructive-console-kit-blocks-provenance',
    runId: RUN_ID,
    createdAt: new Date(0).toISOString(),
    blocksDir: sourcePaths.blocks,
    blocksSourceHash: DIGEST,
    blocksArtifactsHash: DIGEST,
    dependencyClosure: dependencyClosure(),
    manifestPath: paths.routeInput,
    manifestHash: hash(paths.routeInput),
    blocksUrl,
    parentPid: 1234
  });
  const execution = {
    ...routeExecution,
    blocks: {
      requested: 'full',
      launch: 'started',
      result: 'passed',
      provenanceVerified: true,
      provenancePath: blocksProvenancePath,
      provenanceHash: hash(blocksProvenancePath)
    }
  };
  writeJson(suiteInputPath, {
    ...stableProof,
    status: 'testing',
    execution
  });
  writeJson(aggregatePath, {
    ...stableProof,
    createdAt: new Date(0).toISOString(),
    completedAt: new Date(1).toISOString(),
    status: 'passed',
    execution,
    cleanup: { requested: false, status: 'not-requested' }
  });
  writeJson(blocksReceiptPath, {
    version: 1,
    kind: 'constructive-console-kit-blocks-receipt',
    createdAt: new Date(0).toISOString(),
    overallStatus: 'passed',
    workerCount: 1,
    forbidOnly: true,
    projectRetries: [{ name: 'console-kit-live-chromium', retries: 0 }],
    expectedScenarioIds: SCENARIOS,
    scenarios: SCENARIOS.map((id) => ({ id, status: 'passed', durationMs: 10 }))
  });
  writeJson(fixtureDescriptorPath, {
    version: 1,
    kind: 'constructive-console-kit-verification-fixture-descriptor',
    runId: RUN_ID,
    preset: 'auth:hardened',
    databaseId: DATABASE_ID,
    siteId: '8bf254da-12f2-4ec5-a745-dd15181230f9',
    subdomain: 'auth-proof-mail-deadbeef',
    domain: 'localhost',
    preparedAt: new Date(0).toISOString()
  });
  writeJson(fixtureReceiptPath, {
    version: 2,
    kind: 'constructive-console-kit-verification-fixture-receipt',
    runId: RUN_ID,
    preset: 'auth:hardened',
    databaseId: DATABASE_ID,
    siteId: '8bf254da-12f2-4ec5-a745-dd15181230f9',
    domainId: '9cf254da-12f2-4ec5-a745-dd15181230f9',
    subdomain: 'auth-proof-mail-deadbeef',
    domain: 'localhost',
    createdAt: new Date(0).toISOString(),
    deletedAt: new Date(1).toISOString(),
    suiteStatus: 'passed',
    creationRelationshipVerified: true,
    deletionAbsenceVerified: true,
    descriptorHash: hash(fixtureDescriptorPath),
    deleteAttempts: 1,
    ambiguousDeleteAttempts: 0,
    absenceReadCount: 21,
    absenceQuietPeriodMs: 10_000,
    mailpit: {
      purgedAt: new Date(1).toISOString(),
      deletedMessageCount: 1,
      remainingMessageCount: 0,
      jobTaskIdentifier: 'email:send_verification_link',
      queueSnapshotCount: 11,
      mailpitSnapshotCount: 11,
      settlePeriodMs: 5_000,
      remainingQueuedJobCount: 0
    }
  });

  const fixture = {
    base,
    root,
    paths,
    aggregatePath,
    stackProvenancePath,
    blocksProvenancePath,
    suiteInputPath,
    blocksReceiptPath,
    fixtureDescriptorPath,
    fixtureReceiptPath,
    tenantManifestPaths,
    credentialPaths
  };
  writeCompletion(fixture);
  writeAttestation(fixture);
  return fixture;
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('retained Console Kit review status', () => {
  it('reports passed only for the exact route, completion, and live receipt evidence', () => {
    const fixture = createReviewFixture();

    expect(resolveConsoleKitReviewStatus({
      runId: RUN_ID,
      routeStatus: 'testing',
      paths: fixture.paths
    })).toBe('passed');
  });

  it('rejects truncated attestations and self-declared scenario subsets', () => {
    const truncated = createReviewFixture();
    const attestation = JSON.parse(
      readFileSync(truncated.paths.finalAttestation, 'utf8')
    ) as Record<string, unknown>;
    delete attestation.aggregate;
    writeJson(truncated.paths.finalAttestation, attestation);
    expect(() => resolveConsoleKitReviewStatus({
      runId: RUN_ID,
      routeStatus: 'testing',
      paths: truncated.paths
    })).toThrow(/aggregate proof must be an object/u);

    const subset = createReviewFixture();
    writeJson(subset.blocksReceiptPath, {
      version: 1,
      kind: 'constructive-console-kit-blocks-receipt',
      createdAt: new Date(0).toISOString(),
      overallStatus: 'passed',
      workerCount: 1,
      forbidOnly: true,
      projectRetries: [{ name: 'console-kit-live-chromium', retries: 0 }],
      expectedScenarioIds: [SCENARIOS[0]],
      scenarios: [{ id: SCENARIOS[0], status: 'passed', durationMs: 1 }]
    });
    writeCompletion(subset);
    writeAttestation(subset);
    expect(() => resolveConsoleKitReviewStatus({
      runId: RUN_ID,
      routeStatus: 'testing',
      paths: subset.paths
    })).toThrow(/malformed or did not pass serially/u);
  });

  it('rejects recursively nested secret-bearing evidence keys', () => {
    const fixture = createReviewFixture();
    const descriptor = JSON.parse(
      readFileSync(fixture.fixtureDescriptorPath, 'utf8')
    ) as Record<string, unknown>;
    writeJson(fixture.fixtureDescriptorPath, {
      ...descriptor,
      diagnostics: { accessToken: 'must-never-be-attested' }
    });
    const receipt = JSON.parse(
      readFileSync(fixture.fixtureReceiptPath, 'utf8')
    ) as Record<string, unknown>;
    writeJson(fixture.fixtureReceiptPath, {
      ...receipt,
      descriptorHash: hash(fixture.fixtureDescriptorPath)
    });
    writeCompletion(fixture);
    writeAttestation(fixture);

    expect(() => resolveConsoleKitReviewStatus({
      runId: RUN_ID,
      routeStatus: 'testing',
      paths: fixture.paths
    })).toThrow(/Secret-bearing key is forbidden/u);
  });

  it('rejects self-consistent but fabricated provenance records', () => {
    const fixture = createReviewFixture();
    const stack = JSON.parse(
      readFileSync(fixture.stackProvenancePath, 'utf8')
    ) as Record<string, unknown>;
    writeJson(fixture.stackProvenancePath, {
      ...stack,
      kind: 'fabricated-stack-provenance'
    });
    const aggregate = JSON.parse(
      readFileSync(fixture.aggregatePath, 'utf8')
    ) as Record<string, unknown>;
    const execution = aggregate.execution as Record<string, unknown>;
    execution.stack = {
      ...(execution.stack as Record<string, unknown>),
      provenanceHash: hash(fixture.stackProvenancePath)
    };
    writeJson(fixture.aggregatePath, aggregate);
    writeAttestation(fixture);

    expect(() => resolveConsoleKitReviewStatus({
      runId: RUN_ID,
      routeStatus: 'testing',
      paths: fixture.paths
    })).toThrow(/stack provenance is malformed/u);
  });

  it('rejects incomplete canonical coverage and tenant-probe evidence', () => {
    const incompleteCoverage = createReviewFixture();
    const coverageAggregate = JSON.parse(
      readFileSync(incompleteCoverage.aggregatePath, 'utf8')
    ) as Record<string, unknown>;
    const coverageExecution = coverageAggregate.execution as Record<string, unknown>;
    delete (coverageExecution.coverage as Record<string, unknown>).blocksLiveSuite;
    writeJson(incompleteCoverage.aggregatePath, coverageAggregate);
    writeAttestation(incompleteCoverage);
    expect(() => resolveConsoleKitReviewStatus({
      runId: RUN_ID,
      routeStatus: 'testing',
      paths: incompleteCoverage.paths
    })).toThrow(/not a retained canonical pass/u);

    const incompleteProbes = createReviewFixture();
    const probeAggregate = JSON.parse(
      readFileSync(incompleteProbes.aggregatePath, 'utf8')
    ) as Record<string, unknown>;
    (probeAggregate.execution as Record<string, unknown>).tenantProbes = [];
    writeJson(incompleteProbes.aggregatePath, probeAggregate);
    writeAttestation(incompleteProbes);
    expect(() => resolveConsoleKitReviewStatus({
      runId: RUN_ID,
      routeStatus: 'testing',
      paths: incompleteProbes.paths
    })).toThrow(/exactly three canonical tenant fixtures/u);
  });

  it('binds required endpoints, raw Seeder evidence, and stack sources', () => {
    const unroutable = createReviewFixture();
    const unroutableAggregate = JSON.parse(
      readFileSync(unroutable.aggregatePath, 'utf8')
    ) as Record<string, unknown>;
    const firstTenant = (unroutableAggregate.tenants as Record<string, unknown>[])[0]!;
    const firstManifest = firstTenant.manifest as Record<string, unknown>;
    const firstEndpoints = firstManifest.endpoints as Record<string, Record<string, unknown>>;
    firstEndpoints.data = { ...firstEndpoints.data, routable: false, url: null };
    const firstProbe = ((unroutableAggregate.execution as Record<string, unknown>)
      .tenantProbes as Record<string, unknown>[])[0]!;
    firstProbe.endpoints = (firstProbe.endpoints as Record<string, unknown>[])
      .filter((endpoint) => endpoint.kind !== 'data');
    writeJson(unroutable.aggregatePath, unroutableAggregate);
    writeAttestation(unroutable);
    expect(() => resolveConsoleKitReviewStatus({
      runId: RUN_ID,
      routeStatus: 'testing',
      paths: unroutable.paths
    })).toThrow(/missing its required data endpoint/u);

    const rawDrift = createReviewFixture();
    const rawManifest = JSON.parse(
      readFileSync(rawDrift.tenantManifestPaths[0]!, 'utf8')
    ) as Record<string, unknown>;
    writeJson(rawDrift.tenantManifestPaths[0]!, {
      ...rawManifest,
      seedId: 'different-seed'
    });
    writeAttestation(rawDrift);
    expect(() => resolveConsoleKitReviewStatus({
      runId: RUN_ID,
      routeStatus: 'testing',
      paths: rawDrift.paths
    })).toThrow(/drifted from its aggregate snapshot/u);

    const sourceDrift = createReviewFixture();
    const stack = JSON.parse(
      readFileSync(sourceDrift.stackProvenancePath, 'utf8')
    ) as Record<string, unknown>;
    const fingerprint = stack.fingerprint as Record<string, unknown>;
    fingerprint.sources = {
      ...(fingerprint.sources as Record<string, unknown>),
      constructive: 'b'.repeat(64)
    };
    writeJson(sourceDrift.stackProvenancePath, stack);
    const sourceAggregate = JSON.parse(
      readFileSync(sourceDrift.aggregatePath, 'utf8')
    ) as Record<string, unknown>;
    const sourceExecution = sourceAggregate.execution as Record<string, unknown>;
    sourceExecution.stack = {
      ...(sourceExecution.stack as Record<string, unknown>),
      provenanceHash: hash(sourceDrift.stackProvenancePath)
    };
    writeJson(sourceDrift.aggregatePath, sourceAggregate);
    writeAttestation(sourceDrift);
    expect(() => resolveConsoleKitReviewStatus({
      runId: RUN_ID,
      routeStatus: 'testing',
      paths: sourceDrift.paths
    })).toThrow(/not bound to the aggregate proof/u);
  });

  it('keeps testing during completion publication and gives failure precedence', () => {
    const fixture = createReviewFixture();
    unlinkSync(fixture.paths.finalAttestation);

    expect(resolveConsoleKitReviewStatus({
      runId: RUN_ID,
      routeStatus: 'testing',
      paths: fixture.paths
    })).toBe('testing');

    writeJson(fixture.paths.failure, {
      version: 1,
      kind: 'constructive-console-kit-review-failure',
      runId: RUN_ID,
      status: 'failed',
      completedAt: new Date(0).toISOString()
    });
    expect(resolveConsoleKitReviewStatus({
      runId: RUN_ID,
      routeStatus: 'testing',
      paths: fixture.paths
    })).toBe('failed');
  });

  it('rejects a passed route snapshot before any completion evidence exists', () => {
    const fixture = createReviewFixture();
    unlinkSync(fixture.paths.completion);
    unlinkSync(fixture.paths.finalAttestation);
    writeJson(fixture.paths.routeInput, {
      version: 2,
      kind: 'constructive-console-kit-proof',
      runId: RUN_ID,
      status: 'passed',
      tenants: []
    });

    expect(() => resolveConsoleKitReviewStatus({
      runId: RUN_ID,
      routeStatus: 'passed',
      paths: fixture.paths
    })).toThrow(/may only transition from testing/u);
  });

  it('rejects missing and drifted live receipts', () => {
    const missing = createReviewFixture();
    unlinkSync(missing.blocksReceiptPath);
    expect(() => resolveConsoleKitReviewStatus({
      runId: RUN_ID,
      routeStatus: 'testing',
      paths: missing.paths
    })).toThrow(/Blocks receipt is missing/u);

    const drifted = createReviewFixture();
    const fixtureReceipt = JSON.parse(
      readFileSync(drifted.fixtureReceiptPath, 'utf8')
    ) as Record<string, unknown>;
    writeJson(drifted.fixtureReceiptPath, { ...fixtureReceipt, reviewed: true });
    expect(() => resolveConsoleKitReviewStatus({
      runId: RUN_ID,
      routeStatus: 'testing',
      paths: drifted.paths
    })).toThrow(/evidence drifted|provenance is malformed or unbound/u);

    const descriptorDrift = createReviewFixture();
    const descriptor = JSON.parse(
      readFileSync(descriptorDrift.fixtureDescriptorPath, 'utf8')
    ) as Record<string, unknown>;
    writeJson(descriptorDrift.fixtureDescriptorPath, { ...descriptor, preparedAt: new Date(2) });
    expect(() => resolveConsoleKitReviewStatus({
      runId: RUN_ID,
      routeStatus: 'testing',
      paths: descriptorDrift.paths
    })).toThrow(/malformed or incomplete|evidence drifted/u);
  });

  it('rejects incomplete fixture absence and email-queue settlement evidence', () => {
    const fixture = createReviewFixture();
    const receipt = JSON.parse(
      readFileSync(fixture.fixtureReceiptPath, 'utf8')
    ) as Record<string, unknown>;
    writeJson(fixture.fixtureReceiptPath, {
      ...receipt,
      absenceQuietPeriodMs: 9_999
    });
    writeCompletion(fixture);
    writeAttestation(fixture);

    expect(() => resolveConsoleKitReviewStatus({
      runId: RUN_ID,
      routeStatus: 'testing',
      paths: fixture.paths
    })).toThrow(/malformed or incomplete/u);

    const queued = createReviewFixture();
    const queuedReceipt = JSON.parse(
      readFileSync(queued.fixtureReceiptPath, 'utf8')
    ) as Record<string, unknown>;
    writeJson(queued.fixtureReceiptPath, {
      ...queuedReceipt,
      mailpit: {
        ...(queuedReceipt.mailpit as Record<string, unknown>),
        remainingQueuedJobCount: 1
      }
    });
    writeCompletion(queued);
    writeAttestation(queued);

    expect(() => resolveConsoleKitReviewStatus({
      runId: RUN_ID,
      routeStatus: 'testing',
      paths: queued.paths
    })).toThrow(/malformed or incomplete/u);
  });

  it('rejects route input drift and an attested route path mismatch', () => {
    const drifted = createReviewFixture();
    const routeInput = JSON.parse(
      readFileSync(drifted.paths.routeInput, 'utf8')
    ) as Record<string, unknown>;
    writeJson(drifted.paths.routeInput, { ...routeInput, reviewed: true });
    expect(() => resolveConsoleKitReviewStatus({
      runId: RUN_ID,
      routeStatus: 'testing',
      paths: drifted.paths
    })).toThrow(/evidence drifted|provenance is malformed or unbound/u);

    const mismatched = createReviewFixture();
    writeAttestation(mismatched, { routeInputPath: join(mismatched.root, 'suite-input.json') });
    expect(() => resolveConsoleKitReviewStatus({
      runId: RUN_ID,
      routeStatus: 'testing',
      paths: mismatched.paths
    })).toThrow(/does not identify the canonical run artifact/u);
  });

  it('rejects symlink-escaped, cross-run, and malformed receipts', () => {
    const escaped = createReviewFixture();
    const outside = join(escaped.base, 'outside-blocks-receipt.json');
    writeFileSync(outside, readFileSync(escaped.blocksReceiptPath));
    unlinkSync(escaped.blocksReceiptPath);
    symlinkSync(outside, escaped.blocksReceiptPath);
    expect(() => resolveConsoleKitReviewStatus({
      runId: RUN_ID,
      routeStatus: 'testing',
      paths: escaped.paths
    })).toThrow(/must be a real regular file/u);

    const crossRun = createReviewFixture();
    const fixtureReceipt = JSON.parse(
      readFileSync(crossRun.fixtureReceiptPath, 'utf8')
    ) as Record<string, unknown>;
    writeJson(crossRun.fixtureReceiptPath, { ...fixtureReceipt, runId: 'other-run' });
    writeCompletion(crossRun);
    writeAttestation(crossRun);
    expect(() => resolveConsoleKitReviewStatus({
      runId: RUN_ID,
      routeStatus: 'testing',
      paths: crossRun.paths
    })).toThrow(/malformed or incomplete/u);

    const malformed = createReviewFixture();
    writeJson(malformed.blocksReceiptPath, {});
    writeCompletion(malformed);
    writeAttestation(malformed);
    expect(() => resolveConsoleKitReviewStatus({
      runId: RUN_ID,
      routeStatus: 'testing',
      paths: malformed.paths
    })).toThrow(/malformed or did not pass serially/u);
  });
});
