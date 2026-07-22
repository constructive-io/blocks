import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

type JsonRecord = Record<string, unknown>;

type ReadArtifact = Readonly<{
  value: JsonRecord;
  hash: string;
}>;

type ArtifactReference = Readonly<{
  path: string;
  hash: string;
}>;

export type ConsoleKitReviewPaths = Readonly<{
  routeInput: string;
  completion: string;
  failure: string;
  finalAttestation: string;
}>;

const SHA256 = /^[a-f0-9]{64}$/u;
const FORBIDDEN_SECRET_KEY =
  /^(?:access_?token|refresh_?token|token|password|secret|authorization|credentials?)$/iu;
const ENDPOINT_KINDS = [
  'data',
  'auth',
  'admin',
  'billing',
  'storage',
  'notifications'
] as const;
const PROOF_FIXTURES = [
  {
    preset: 'auth:hardened',
    blueprint: 'crm',
    dataset: 'crm-demo',
    requiredKinds: ['data', 'auth', 'admin']
  },
  {
    preset: 'b2b:storage',
    blueprint: 'saas',
    dataset: 'saas-demo',
    requiredKinds: ['data', 'auth', 'admin']
  },
  {
    preset: 'full',
    blueprint: 'blog',
    dataset: 'blog-demo',
    requiredKinds: ['data', 'auth', 'admin', 'billing']
  }
] as const;
const PROOF_PRESETS = PROOF_FIXTURES.map((fixture) => fixture.preset);
const PROOF_COVERAGE_KEYS = [
  'sourcesValidated',
  'stackOwnedOrVerified',
  'infrastructureValidated',
  'controlPlaneProbes',
  'tenantsProvisioned',
  'tenantSemanticProbes',
  'blocksLiveSuite'
] as const;
const PROOF_SOURCE_KEYS = [
  'constructive',
  'constructiveDb',
  'constructiveFunctions',
  'dashboard',
  'blocks',
  'hub'
] as const;
const STACK_SERVICE_NAMES = [
  'public-server',
  'private-server',
  'knative-job-service',
  'send-verification-link',
  'console-kit-compute-worker'
] as const;
const INFRASTRUCTURE_SERVICE_NAMES = ['postgres', 'minio', 'mailpit'] as const;
const TOOLCHAIN_COMMANDS = ['git', 'node', 'pnpm', 'docker', 'psql', 'pg_dump', 'lsof'] as const;
const PINNED_INFRASTRUCTURE_IMAGES = {
  postgres:
    'ghcr.io/constructive-io/docker/postgres-plus@sha256:7c4a01fe8e2e3716aecb575df6dbc5622973703304492b4c9236f6afa4ea7142',
  minio:
    'minio/minio@sha256:29e8e51691d11e779468f275002779b221fd3902518d103e35c8a8bb2ef0f3ea',
  mailpit:
    'axllent/mailpit@sha256:37a38e48e9338cd7e89dfeb487f37b02ebfcd9cb23111bed2d345e79d37d6dd6'
} as const;
const REQUIRED_DATABASE_OBJECTS = [
  'metaschema_public.database',
  'services_public.apis',
  'app_jobs.jobs',
  'constructive_users_public.users',
  'constructive_infra_public.db_presets',
  'constructive_compute_public.function_definitions',
  'constructive_compute_public.platform_function_definitions'
] as const;
const REQUIRED_FUNCTION_DEFINITIONS = [
  'database:bootstrap_owner',
  'database:provision',
  'email:send_verification_link'
] as const;
const DATABASE_PACKAGE_NAMES = [
  'constructive-local',
  'constructive-functions',
  'metaschema',
  'pgpm-database-jobs'
] as const;
const BLOCKS_LIVE_SCENARIO_IDS = [
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

function record(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as JsonRecord;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function stringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${label} must be an array of strings.`);
  }
  return [...value];
}

function nonNegativeInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative safe integer.`);
  }
  return value;
}

function sha256(value: unknown, label: string): string {
  if (typeof value !== 'string' || !SHA256.test(value)) {
    throw new Error(`${label} must be a lowercase SHA-256 digest.`);
  }
  return value;
}

function assertExactOrderedValues(
  actual: unknown,
  expected: readonly string[],
  label: string
): void {
  if (!Array.isArray(actual) || JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} does not match the canonical ordered contract.`);
  }
}

function assertSecretFree(value: unknown, path: string): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSecretFree(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_SECRET_KEY.test(key)) {
      throw new Error(`Secret-bearing key is forbidden at ${path}.${key}.`);
    }
    assertSecretFree(child, `${path}.${key}`);
  }
}

function requiredAbsolutePath(value: string | undefined, name: string): string {
  if (!value || !isAbsolute(value)) {
    throw new Error(`${name} must be an absolute path.`);
  }
  return resolve(value);
}

function readArtifact(path: string, label: string): ReadArtifact {
  if (!existsSync(path)) throw new Error(`${label} is missing.`);
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || realpathSync(path) !== path) {
    throw new Error(`${label} must be a real regular file.`);
  }
  const contents = readFileSync(path);
  let value: unknown;
  try {
    value = JSON.parse(contents.toString('utf8'));
  } catch {
    throw new Error(`${label} must contain valid JSON.`);
  }
  const parsed = record(value, label);
  assertSecretFree(parsed, label);
  return {
    value: parsed,
    hash: createHash('sha256').update(contents).digest('hex')
  };
}

function assertScopedChildFile(path: string, root: string, label: string): string {
  const resolvedPath = resolve(path);
  const fromRoot = relative(resolve(root), resolvedPath);
  if (!fromRoot || fromRoot === '..' || fromRoot.startsWith(`..${sep}`)) {
    throw new Error(`${label} must be a child of the canonical run directory.`);
  }
  return resolvedPath;
}

function hashOpaqueArtifact(path: string, root: string, label: string): string {
  const scopedPath = assertScopedChildFile(path, root, label);
  if (!existsSync(scopedPath)) throw new Error(`${label} is missing.`);
  const stat = lstatSync(scopedPath);
  if (!stat.isFile() || stat.isSymbolicLink() || realpathSync(scopedPath) !== scopedPath) {
    throw new Error(`${label} must be a real regular file.`);
  }
  return createHash('sha256').update(readFileSync(scopedPath)).digest('hex');
}

function assertCanonicalRunPaths(runId: string, paths: ConsoleKitReviewPaths): string {
  const root = dirname(paths.routeInput);
  if (
    basename(root) !== runId ||
    !existsSync(root) ||
    !lstatSync(root).isDirectory() ||
    lstatSync(root).isSymbolicLink() ||
    realpathSync(root) !== root
  ) {
    throw new Error('Console Kit review artifacts must use the real run-bound directory.');
  }

  const expected = {
    routeInput: join(root, 'route-input.json'),
    completion: join(root, 'review-completion.json'),
    failure: join(root, 'review-failure.json'),
    finalAttestation: join(root, 'final-attestation.json')
  } satisfies ConsoleKitReviewPaths;
  for (const name of Object.keys(expected) as Array<keyof ConsoleKitReviewPaths>) {
    if (paths[name] !== expected[name]) {
      throw new Error(`Console Kit ${name} path is not canonical for run ${runId}.`);
    }
  }
  return root;
}

function artifactReference(
  value: unknown,
  expectedPath: string,
  label: string
): ArtifactReference {
  const reference = record(value, label);
  if (
    reference.path !== expectedPath ||
    typeof reference.hash !== 'string' ||
    !SHA256.test(reference.hash)
  ) {
    throw new Error(`${label} does not identify the canonical run artifact.`);
  }
  return reference as ArtifactReference;
}

function assertRouteInput(
  artifact: ReadArtifact,
  runId: string,
  routeStatus: string
): void {
  const route = artifact.value;
  if (
    route.version !== 2 ||
    route.kind !== 'constructive-console-kit-proof' ||
    route.runId !== runId ||
    route.status !== routeStatus
  ) {
    throw new Error('Console Kit route input is malformed or belongs to another run.');
  }
  if (routeStatus !== 'testing') {
    throw new Error('Console Kit retained review status may only transition from testing.');
  }
}

function readReviewCompletion(path: string, runId: string): ReadArtifact {
  const artifact = readArtifact(path, 'Console Kit review completion receipt');
  const completion = artifact.value;
  if (
    completion.version !== 1 ||
    completion.kind !== 'constructive-console-kit-review-completion' ||
    completion.runId !== runId ||
    completion.status !== 'passed' ||
    !nonEmptyString(completion.completedAt) ||
    typeof completion.blocksReceiptHash !== 'string' ||
    !SHA256.test(completion.blocksReceiptHash) ||
    typeof completion.verificationFixtureReceiptHash !== 'string' ||
    !SHA256.test(completion.verificationFixtureReceiptHash)
  ) {
    throw new Error('Console Kit review completion receipt is malformed or belongs to another run.');
  }
  return artifact;
}

function assertBlocksReceipt(receipt: JsonRecord): void {
  const retries = receipt.projectRetries;
  const expectedIds = receipt.expectedScenarioIds;
  const scenarios = receipt.scenarios;
  if (
    receipt.version !== 1 ||
    receipt.kind !== 'constructive-console-kit-blocks-receipt' ||
    !nonEmptyString(receipt.createdAt) ||
    receipt.overallStatus !== 'passed' ||
    receipt.workerCount !== 1 ||
    receipt.forbidOnly !== true ||
    !Array.isArray(retries) ||
    retries.length !== 1 ||
    !Array.isArray(expectedIds) ||
    JSON.stringify(expectedIds) !== JSON.stringify(BLOCKS_LIVE_SCENARIO_IDS) ||
    !Array.isArray(scenarios) ||
    scenarios.length !== BLOCKS_LIVE_SCENARIO_IDS.length
  ) {
    throw new Error('Console Kit Blocks receipt is malformed or did not pass serially.');
  }

  const retry = record(retries[0], 'Console Kit Blocks receipt retry policy');
  if (retry.name !== 'console-kit-live-chromium' || retry.retries !== 0) {
    throw new Error('Console Kit Blocks receipt is malformed or did not pass serially.');
  }
  for (let index = 0; index < BLOCKS_LIVE_SCENARIO_IDS.length; index++) {
    const scenario = record(scenarios[index], `Console Kit Blocks scenario ${index + 1}`);
    if (
      scenario.id !== BLOCKS_LIVE_SCENARIO_IDS[index] ||
      scenario.status !== 'passed' ||
      typeof scenario.durationMs !== 'number' ||
      !Number.isFinite(scenario.durationMs) ||
      scenario.durationMs < 0
    ) {
      throw new Error('Console Kit Blocks receipt is malformed or did not pass serially.');
    }
  }
}

function assertVerificationFixtureDescriptor(
  descriptor: JsonRecord,
  runId: string
): void {
  if (
    descriptor.version !== 1 ||
    descriptor.kind !== 'constructive-console-kit-verification-fixture-descriptor' ||
    descriptor.runId !== runId ||
    descriptor.preset !== 'auth:hardened' ||
    !nonEmptyString(descriptor.databaseId) ||
    !nonEmptyString(descriptor.siteId) ||
    !nonEmptyString(descriptor.subdomain) ||
    !nonEmptyString(descriptor.domain) ||
    !nonEmptyString(descriptor.preparedAt)
  ) {
    throw new Error('Console Kit verification fixture descriptor is malformed or incomplete.');
  }
}

function assertVerificationFixtureReceipt(
  receipt: JsonRecord,
  descriptor: JsonRecord,
  descriptorHash: string,
  runId: string,
  routeInput: JsonRecord
): void {
  const mailpit = record(receipt.mailpit, 'Console Kit verification fixture Mailpit evidence');
  const deleteAttempts = receipt.deleteAttempts;
  const ambiguousDeleteAttempts = receipt.ambiguousDeleteAttempts;
  if (
    receipt.version !== 2 ||
    receipt.kind !== 'constructive-console-kit-verification-fixture-receipt' ||
    receipt.runId !== runId ||
    receipt.preset !== 'auth:hardened' ||
    !nonEmptyString(receipt.databaseId) ||
    !nonEmptyString(receipt.siteId) ||
    !nonEmptyString(receipt.domainId) ||
    !nonEmptyString(receipt.subdomain) ||
    !nonEmptyString(receipt.domain) ||
    !nonEmptyString(receipt.createdAt) ||
    !nonEmptyString(receipt.deletedAt) ||
    receipt.suiteStatus !== 'passed' ||
    receipt.creationRelationshipVerified !== true ||
    receipt.deletionAbsenceVerified !== true ||
    receipt.descriptorHash !== descriptorHash ||
    !Number.isSafeInteger(deleteAttempts) ||
    (deleteAttempts as number) < 1 ||
    !Number.isSafeInteger(ambiguousDeleteAttempts) ||
    (ambiguousDeleteAttempts as number) < 0 ||
    (ambiguousDeleteAttempts as number) > (deleteAttempts as number) ||
    !Number.isSafeInteger(receipt.absenceReadCount) ||
    (receipt.absenceReadCount as number) < 2 ||
    !Number.isSafeInteger(receipt.absenceQuietPeriodMs) ||
    (receipt.absenceQuietPeriodMs as number) < 10_000 ||
    !nonEmptyString(mailpit.purgedAt) ||
    typeof mailpit.deletedMessageCount !== 'number' ||
    !Number.isSafeInteger(mailpit.deletedMessageCount) ||
    mailpit.deletedMessageCount < 0 ||
    mailpit.remainingMessageCount !== 0 ||
    mailpit.jobTaskIdentifier !== 'email:send_verification_link' ||
    !Number.isSafeInteger(mailpit.queueSnapshotCount) ||
    (mailpit.queueSnapshotCount as number) < 2 ||
    !Number.isSafeInteger(mailpit.mailpitSnapshotCount) ||
    (mailpit.mailpitSnapshotCount as number) < 2 ||
    !Number.isSafeInteger(mailpit.settlePeriodMs) ||
    (mailpit.settlePeriodMs as number) < 5_000 ||
    mailpit.remainingQueuedJobCount !== 0 ||
    receipt.databaseId !== descriptor.databaseId ||
    receipt.siteId !== descriptor.siteId ||
    receipt.subdomain !== descriptor.subdomain ||
    receipt.domain !== descriptor.domain
  ) {
    throw new Error('Console Kit verification fixture receipt is malformed or incomplete.');
  }

  const tenants = routeInput.tenants;
  if (!Array.isArray(tenants)) {
    throw new Error('Console Kit route input has no tenant matrix.');
  }
  const matchesTenant = tenants.some((candidate) => {
    const tenant = record(candidate, 'Console Kit route tenant');
    const manifest = record(tenant.manifest, 'Console Kit route tenant manifest');
    return tenant.preset === 'auth:hardened' && manifest.databaseId === receipt.databaseId;
  });
  if (!matchesTenant) {
    throw new Error('Console Kit verification fixture receipt belongs to another tenant run.');
  }
}

function assertSourceRevisions(sources: JsonRecord): JsonRecord {
  if (
    Object.keys(sources).length !== PROOF_SOURCE_KEYS.length ||
    PROOF_SOURCE_KEYS.some((key) => !(key in sources))
  ) {
    throw new Error('Console Kit proof must record exactly six canonical source revisions.');
  }
  let blocksSource: JsonRecord | null = null;
  for (const key of PROOF_SOURCE_KEYS) {
    const source = record(sources[key], `Console Kit ${key} source revision`);
    if (
      !nonEmptyString(source.path) ||
      !isAbsolute(source.path) ||
      !nonEmptyString(source.revision) ||
      typeof source.dirty !== 'boolean'
    ) {
      throw new Error(`Console Kit ${key} source revision is incomplete.`);
    }
    sha256(source.contentHash, `Console Kit ${key} source content hash`);
    if (key === 'blocks') blocksSource = source;
  }
  return blocksSource!;
}

function assertSeederEndpoint(
  value: unknown,
  kind: typeof ENDPOINT_KINDS[number],
  label: string
): JsonRecord {
  const endpoint = record(value, `${label} ${kind} endpoint`);
  if (
    !nonEmptyString(endpoint.apiName) ||
    (endpoint.apiId !== null && !nonEmptyString(endpoint.apiId)) ||
    typeof endpoint.routable !== 'boolean' ||
    (endpoint.url !== null && !nonEmptyString(endpoint.url)) ||
    (endpoint.roleName !== null && !nonEmptyString(endpoint.roleName)) ||
    (endpoint.anonRole !== null && !nonEmptyString(endpoint.anonRole))
  ) {
    throw new Error(`${label} ${kind} endpoint is malformed.`);
  }
  stringArray(endpoint.schemaIds, `${label} ${kind} endpoint schemaIds`);
  if (endpoint.reason !== null && endpoint.reason !== undefined &&
    !nonEmptyString(endpoint.reason)) {
    throw new Error(`${label} ${kind} endpoint reason is malformed.`);
  }
  if (endpoint.routable === true && !nonEmptyString(endpoint.url)) {
    throw new Error(`${label} ${kind} endpoint is routable without a URL.`);
  }
  if (nonEmptyString(endpoint.url)) {
    try {
      new URL(endpoint.url);
    } catch {
      throw new Error(`${label} ${kind} endpoint URL is invalid.`);
    }
  }
  return {
    apiName: endpoint.apiName,
    apiId: endpoint.apiId,
    url: endpoint.url,
    routable: endpoint.routable,
    roleName: endpoint.roleName,
    anonRole: endpoint.anonRole,
    schemaIds: stringArray(endpoint.schemaIds, `${label} ${kind} endpoint schemaIds`),
    ...(nonEmptyString(endpoint.reason) ? { reason: endpoint.reason } : {})
  };
}

function assertSeederManifest(
  value: unknown,
  fixture: typeof PROOF_FIXTURES[number],
  aggregateControlEndpoint: unknown,
  label: string
): Readonly<{
  databaseId: string;
  endpoints: Readonly<Record<typeof ENDPOINT_KINDS[number], JsonRecord>>;
  normalized: JsonRecord;
}> {
  const manifest = record(value, `${label} seeder manifest`);
  const database = record(manifest.database, `${label} database`);
  const endpointsValue = record(manifest.endpoints, `${label} endpoints`);
  const databaseId = nonEmptyString(manifest.databaseId)
    ? manifest.databaseId
    : database.id;
  if (
    manifest.version !== 1 ||
    !nonEmptyString(manifest.seedId) ||
    manifest.runStatus !== 'completed' ||
    manifest.controlPlaneEndpoint !== aggregateControlEndpoint ||
    manifest.preset !== fixture.preset ||
    manifest.blueprint !== fixture.blueprint ||
    manifest.dataset !== fixture.dataset ||
    !nonEmptyString(databaseId) ||
    database.id !== databaseId ||
    !nonEmptyString(database.name) ||
    !nonEmptyString(database.domain) ||
    !nonEmptyString(database.subdomain)
  ) {
    throw new Error(`${label} is not a completed canonical seeder manifest.`);
  }
  const tableAllowlist = stringArray(manifest.tableAllowlist, `${label} table allowlist`);
  const endpoints = {} as Record<typeof ENDPOINT_KINDS[number], JsonRecord>;
  for (const kind of ENDPOINT_KINDS) {
    endpoints[kind] = assertSeederEndpoint(endpointsValue[kind], kind, label);
  }
  for (const kind of fixture.requiredKinds) {
    if (endpoints[kind].routable !== true || !nonEmptyString(endpoints[kind].url)) {
      throw new Error(`${label} is missing its required ${kind} endpoint.`);
    }
  }
  for (const kind of ENDPOINT_KINDS) {
    const endpoint = endpoints[kind];
    if (endpoint.routable !== true) continue;
    const url = new URL(String(endpoint.url));
    const expectedHostname =
      `${String(endpoint.apiName)}-${String(database.subdomain)}.${String(database.domain)}`;
    if (
      url.protocol !== 'http:' ||
      url.hostname !== expectedHostname ||
      url.port !== '3000' ||
      url.pathname !== '/graphql' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error(`${label} ${kind} endpoint is not bound to its tenant identity.`);
    }
  }
  const normalized = {
    version: 1,
    seedId: manifest.seedId,
    runStatus: manifest.runStatus,
    controlPlaneEndpoint: manifest.controlPlaneEndpoint,
    preset: manifest.preset,
    blueprint: manifest.blueprint,
    dataset: manifest.dataset,
    tableAllowlist,
    databaseId,
    database: {
      id: database.id,
      name: database.name,
      domain: database.domain,
      subdomain: database.subdomain
    },
    endpoints
  };
  return { databaseId, endpoints, normalized };
}

function assertTenantProbe(
  value: unknown,
  fixture: typeof PROOF_FIXTURES[number],
  databaseId: string,
  endpoints: Readonly<Record<typeof ENDPOINT_KINDS[number], JsonRecord>>,
  label: string
): void {
  const probe = record(value, label);
  if (probe.preset !== fixture.preset || probe.databaseId !== databaseId) {
    throw new Error(`${label} is bound to the wrong tenant.`);
  }
  assertExactOrderedValues(probe.requiredKinds, fixture.requiredKinds, `${label} required kinds`);
  if (!Array.isArray(probe.endpoints)) {
    throw new Error(`${label} endpoint evidence must be an array.`);
  }
  const routableKinds = ENDPOINT_KINDS.filter((kind) => endpoints[kind].routable === true);
  if (probe.endpoints.length !== routableKinds.length) {
    throw new Error(`${label} must cover every routable endpoint exactly once.`);
  }

  const seenKinds = new Set<string>();
  for (let index = 0; index < probe.endpoints.length; index++) {
    const endpointProbe = record(probe.endpoints[index], `${label} endpoint ${index + 1}`);
    if (
      typeof endpointProbe.kind !== 'string' ||
      !ENDPOINT_KINDS.includes(endpointProbe.kind as typeof ENDPOINT_KINDS[number]) ||
      seenKinds.has(endpointProbe.kind)
    ) {
      throw new Error(`${label} contains duplicate or unknown endpoint evidence.`);
    }
    seenKinds.add(endpointProbe.kind);
    const kind = endpointProbe.kind as typeof ENDPOINT_KINDS[number];
    const endpoint = endpoints[kind];
    const missingFields = stringArray(
      endpointProbe.missingFields,
      `${label} ${kind} missing fields`
    );
    if (
      endpoint.routable !== true ||
      endpointProbe.apiName !== endpoint.apiName ||
      endpointProbe.url !== endpoint.url ||
      endpointProbe.graphqlSucceeded !== true ||
      endpointProbe.invalidBearerRejected !== true ||
      !['verified', 'unavailable'].includes(String(endpointProbe.semanticContract)) ||
      nonNegativeInteger(endpointProbe.queryFieldCount, `${label} ${kind} query count`) < 1
    ) {
      throw new Error(`${label} ${kind} has incomplete or unbound GraphQL evidence.`);
    }
    nonNegativeInteger(endpointProbe.mutationFieldCount, `${label} ${kind} mutation count`);
    sha256(endpointProbe.schemaRootHash, `${label} ${kind} schema-root hash`);
    if (
      (endpointProbe.semanticContract === 'verified' && missingFields.length !== 0) ||
      (endpointProbe.semanticContract === 'unavailable' && missingFields.length === 0) ||
      ((fixture.requiredKinds as readonly string[]).includes(kind) &&
        endpointProbe.semanticContract !== 'verified')
    ) {
      throw new Error(`${label} ${kind} has inconsistent semantic-contract evidence.`);
    }
  }
  if (routableKinds.some((kind) => !seenKinds.has(kind))) {
    throw new Error(`${label} is missing routable endpoint evidence.`);
  }
}

function assertCanonicalFixtureMatrix(
  aggregate: JsonRecord,
  execution: JsonRecord
): void {
  const tenants = aggregate.tenants;
  const cleanupTargets = aggregate.cleanupTargets;
  const probes = execution.tenantProbes;
  if (
    !Array.isArray(tenants) ||
    !Array.isArray(cleanupTargets) ||
    !Array.isArray(probes) ||
    tenants.length !== PROOF_FIXTURES.length ||
    cleanupTargets.length !== PROOF_FIXTURES.length ||
    probes.length !== PROOF_FIXTURES.length
  ) {
    throw new Error('Console Kit proof requires exactly three canonical tenant fixtures.');
  }

  const databaseIds = new Set<string>();
  for (let index = 0; index < PROOF_FIXTURES.length; index++) {
    const fixture = PROOF_FIXTURES[index]!;
    const tenant = record(tenants[index], `Console Kit aggregate tenant ${index + 1}`);
    const target = record(
      cleanupTargets[index],
      `Console Kit aggregate cleanup target ${index + 1}`
    );
    if (
      tenant.preset !== fixture.preset ||
      tenant.blueprint !== fixture.blueprint ||
      tenant.dataset !== fixture.dataset ||
      !nonEmptyString(tenant.manifestPath) ||
      !nonEmptyString(tenant.credentialRef) ||
      target.preset !== tenant.preset ||
      target.manifestPath !== tenant.manifestPath ||
      target.credentialRef !== tenant.credentialRef
    ) {
      throw new Error('Console Kit aggregate tenant and cleanup matrix is malformed.');
    }
    sha256(target.credentialHash, `Console Kit ${fixture.preset} credential hash`);
    const manifest = assertSeederManifest(
      tenant.manifest,
      fixture,
      aggregate.controlEndpoint,
      `Console Kit ${fixture.preset} tenant`
    );
    if (databaseIds.has(manifest.databaseId)) {
      throw new Error('Console Kit proof tenant database IDs must be unique.');
    }
    databaseIds.add(manifest.databaseId);
    assertTenantProbe(
      probes[index],
      fixture,
      manifest.databaseId,
      manifest.endpoints,
      `Console Kit ${fixture.preset} tenant probe`
    );
  }
}

function assertDependencyClosure(value: unknown, label: string): void {
  const closure = record(value, label);
  for (const key of ['nodeVersion', 'pnpmVersion', 'storePath']) {
    if (!nonEmptyString(closure[key])) {
      throw new Error(`${label}.${key} must be a non-empty string.`);
    }
  }
  for (const key of ['lockfileHash', 'installedLockfileHash', 'modulesHash']) {
    sha256(closure[key], `${label}.${key}`);
  }
}

function assertDockerDaemon(value: unknown): void {
  const daemon = record(value, 'Console Kit Docker daemon provenance');
  if (
    daemon.host !== 'unix:///var/run/docker.sock' ||
    !nonEmptyString(daemon.id) ||
    !nonEmptyString(daemon.name) ||
    !nonEmptyString(daemon.operatingSystem) ||
    !nonEmptyString(daemon.serverVersion)
  ) {
    throw new Error('Console Kit Docker daemon provenance is incomplete.');
  }
}

function assertContainerProvenance(
  value: unknown,
  expectedService: typeof INFRASTRUCTURE_SERVICE_NAMES[number],
  projectName: string,
  label: string
): void {
  const container = record(value, label);
  if (
    container.service !== expectedService ||
    !nonEmptyString(container.containerId) ||
    container.imageRef !== PINNED_INFRASTRUCTURE_IMAGES[expectedService] ||
    !nonEmptyString(container.imageId) ||
    container.running !== true ||
    !['healthy', 'not-configured'].includes(String(container.health))
  ) {
    throw new Error(`${label} is incomplete or not pinned.`);
  }
  const repoDigests = stringArray(container.repoDigests, `${label} repo digests`);
  const publishedPorts = stringArray(container.publishedPorts, `${label} published ports`);
  const expectedPorts = {
    postgres: ['5432/tcp=127.0.0.1:5432'],
    minio: ['9000/tcp=127.0.0.1:9000', '9001/tcp=127.0.0.1:9001'],
    mailpit: ['1025/tcp=127.0.0.1:1025', '8025/tcp=127.0.0.1:8025']
  } as const;
  if (
    !repoDigests.includes(PINNED_INFRASTRUCTURE_IMAGES[expectedService]) ||
    JSON.stringify(publishedPorts) !== JSON.stringify(expectedPorts[expectedService]) ||
    ((expectedService === 'postgres' || expectedService === 'minio') &&
      container.health !== 'healthy') ||
    !Array.isArray(container.mounts)
  ) {
    throw new Error(`${label} has incomplete image, port, or mount evidence.`);
  }
  let hasRequiredVolume = expectedService === 'mailpit';
  for (const [index, mountValue] of container.mounts.entries()) {
    const mount = record(mountValue, `${label} mount ${index + 1}`);
    if (
      !nonEmptyString(mount.type) ||
      (mount.name !== null && !nonEmptyString(mount.name)) ||
      !nonEmptyString(mount.source) ||
      !nonEmptyString(mount.destination) ||
      typeof mount.readWrite !== 'boolean'
    ) {
      throw new Error(`${label} mount ${index + 1} is incomplete.`);
    }
    const expectedDestination = expectedService === 'postgres'
      ? '/var/lib/postgresql'
      : expectedService === 'minio'
        ? '/data'
        : null;
    if (
      expectedDestination &&
      mount.type === 'volume' &&
      mount.name === `${projectName}_${expectedService}-data` &&
      mount.destination === expectedDestination &&
      mount.readWrite === true
    ) {
      hasRequiredVolume = true;
    }
  }
  if (!hasRequiredVolume) {
    throw new Error(`${label} is missing its project-scoped writable volume.`);
  }
}

function assertDatabaseProvenance(value: unknown): void {
  const database = record(value, 'Console Kit database provenance');
  for (const key of [
    'database',
    'databaseOid',
    'systemIdentifier',
    'serverVersion',
    'serverVersionNum',
    'postmasterStartedAt'
  ]) {
    if (!nonEmptyString(database[key])) {
      throw new Error(`Console Kit database provenance is missing ${key}.`);
    }
  }
  assertExactOrderedValues(
    database.requiredObjects,
    REQUIRED_DATABASE_OBJECTS,
    'Console Kit required database objects'
  );
  assertExactOrderedValues(
    database.requiredFunctionDefinitions,
    REQUIRED_FUNCTION_DEFINITIONS,
    'Console Kit required function definitions'
  );
  sha256(database.catalogHash, 'Console Kit database catalog hash');
  sha256(database.schemaDefinitionHash, 'Console Kit database schema hash');
  if (!Array.isArray(database.packages) || database.packages.length !== DATABASE_PACKAGE_NAMES.length) {
    throw new Error('Console Kit database package provenance is incomplete.');
  }
  assertExactOrderedValues(
    database.packages.map((candidate) => record(candidate, 'Console Kit database package').package),
    DATABASE_PACKAGE_NAMES,
    'Console Kit database packages'
  );
  for (const packageValue of database.packages) {
    const databasePackage = record(packageValue, 'Console Kit database package');
    if (!Array.isArray(databasePackage.changes) || databasePackage.changes.length === 0) {
      throw new Error('Console Kit database package has no deployed-change evidence.');
    }
    for (const changeValue of databasePackage.changes) {
      const change = record(changeValue, 'Console Kit database package change');
      if (!nonEmptyString(change.name)) {
        throw new Error('Console Kit database package change has no name.');
      }
      sha256(change.scriptHash, 'Console Kit database package script hash');
    }
  }
}

function assertStackProvenance(
  value: JsonRecord,
  runId: string,
  aggregateSources: JsonRecord
): void {
  const fingerprint = record(value.fingerprint, 'Console Kit stack runtime fingerprint');
  const fingerprintSources = record(
    fingerprint.sources,
    'Console Kit stack fingerprint sources'
  );
  const fingerprintArtifacts = record(
    fingerprint.artifacts,
    'Console Kit stack fingerprint artifacts'
  );
  const dependencies = record(
    fingerprint.dependencies,
    'Console Kit stack fingerprint dependencies'
  );
  const infrastructure = record(value.infrastructure, 'Console Kit infrastructure provenance');
  if (
    value.version !== 2 ||
    value.kind !== 'constructive-console-kit-stack-provenance' ||
    value.runId !== runId ||
    !nonEmptyString(value.createdAt)
  ) {
    throw new Error('Console Kit stack provenance is malformed or belongs to another run.');
  }
  for (const key of ['configHash', 'composeHash', 'environmentHash']) {
    sha256(fingerprint[key], `Console Kit stack fingerprint ${key}`);
  }
  if (Object.keys(fingerprintSources).length !== 3 ||
    Object.keys(fingerprintArtifacts).length !== 3) {
    throw new Error('Console Kit stack source or artifact fingerprint is incomplete.');
  }
  for (const key of ['constructive', 'constructiveDb', 'constructiveFunctions']) {
    sha256(fingerprintSources[key], `Console Kit stack source ${key}`);
    const aggregateSource = record(
      aggregateSources[key],
      `Console Kit aggregate ${key} source revision`
    );
    if (fingerprintSources[key] !== aggregateSource.contentHash) {
      throw new Error(`Console Kit stack source ${key} is not bound to the aggregate proof.`);
    }
  }
  for (const key of ['constructive', 'constructiveDbCompute', 'constructiveFunctions']) {
    sha256(fingerprintArtifacts[key], `Console Kit stack artifact ${key}`);
  }
  const dependencyKeys = ['constructive', 'constructiveDb', 'constructiveFunctions', 'dashboard'];
  if (Object.keys(dependencies).length !== dependencyKeys.length) {
    throw new Error('Console Kit stack dependency provenance is incomplete.');
  }
  for (const key of dependencyKeys) {
    assertDependencyClosure(dependencies[key], `Console Kit stack dependency ${key}`);
  }
  if (!Array.isArray(fingerprint.toolchain) ||
    fingerprint.toolchain.length !== TOOLCHAIN_COMMANDS.length) {
    throw new Error('Console Kit stack toolchain provenance is missing.');
  }
  for (let index = 0; index < TOOLCHAIN_COMMANDS.length; index++) {
    const identity = record(
      fingerprint.toolchain[index],
      'Console Kit stack tool identity'
    );
    if (
      identity.command !== TOOLCHAIN_COMMANDS[index] ||
      !nonEmptyString(identity.path) ||
      !isAbsolute(identity.path) ||
      !nonEmptyString(identity.version)
    ) {
      throw new Error('Console Kit stack tool identity is incomplete.');
    }
    sha256(identity.binaryHash, 'Console Kit stack tool binary hash');
  }

  if (!Array.isArray(value.services) || value.services.length !== STACK_SERVICE_NAMES.length) {
    throw new Error('Console Kit stack provenance does not cover every managed service.');
  }
  const serviceNames = new Set<string>();
  for (const serviceValue of value.services) {
    const service = record(serviceValue, 'Console Kit managed service provenance');
    if (
      !STACK_SERVICE_NAMES.includes(service.name as typeof STACK_SERVICE_NAMES[number]) ||
      serviceNames.has(String(service.name)) ||
      nonNegativeInteger(service.port, 'Console Kit managed service port') < 1 ||
      nonNegativeInteger(service.pid, 'Console Kit managed service PID') < 1 ||
      !nonEmptyString(service.cwd) ||
      !nonEmptyString(service.command)
    ) {
      throw new Error('Console Kit managed service provenance is incomplete.');
    }
    stringArray(service.listenerAddresses, 'Console Kit managed service listeners');
    serviceNames.add(String(service.name));
  }

  if (
    !nonEmptyString(infrastructure.composeFile) ||
    !isAbsolute(infrastructure.composeFile) ||
    !nonEmptyString(infrastructure.projectName)
  ) {
    throw new Error('Console Kit infrastructure provenance is incomplete.');
  }
  sha256(infrastructure.composeHash, 'Console Kit infrastructure compose hash');
  if (fingerprint.composeHash !== infrastructure.composeHash) {
    throw new Error('Console Kit compose fingerprint is not bound to infrastructure provenance.');
  }
  assertDockerDaemon(infrastructure.dockerDaemon);
  assertDatabaseProvenance(infrastructure.database);
  if (!Array.isArray(infrastructure.containers) ||
    infrastructure.containers.length !== INFRASTRUCTURE_SERVICE_NAMES.length) {
    throw new Error('Console Kit infrastructure container provenance is incomplete.');
  }
  for (let index = 0; index < INFRASTRUCTURE_SERVICE_NAMES.length; index++) {
    assertContainerProvenance(
      infrastructure.containers[index],
      INFRASTRUCTURE_SERVICE_NAMES[index]!,
      String(infrastructure.projectName),
      `Console Kit ${INFRASTRUCTURE_SERVICE_NAMES[index]} container`
    );
  }
}

function assertBlocksProvenance(
  value: JsonRecord,
  runId: string,
  aggregate: JsonRecord,
  routeInputPath: string,
  routeInputHash: string,
  blocksSource: JsonRecord
): void {
  if (
    value.version !== 2 ||
    value.kind !== 'constructive-console-kit-blocks-provenance' ||
    value.runId !== runId ||
    !nonEmptyString(value.createdAt) ||
    value.blocksDir !== blocksSource.path ||
    value.blocksSourceHash !== blocksSource.contentHash ||
    value.manifestPath !== routeInputPath ||
    value.manifestHash !== routeInputHash ||
    value.blocksUrl !== aggregate.blocksUrl ||
    !nonEmptyString(value.blocksDir) ||
    !isAbsolute(value.blocksDir) ||
    nonNegativeInteger(value.parentPid, 'Console Kit Blocks parent PID') < 1
  ) {
    throw new Error('Console Kit Blocks provenance is malformed or unbound.');
  }
  sha256(value.blocksArtifactsHash, 'Console Kit Blocks generated-artifact hash');
  assertDependencyClosure(value.dependencyClosure, 'Console Kit Blocks dependency closure');
}

function assertCanonicalAggregate(aggregate: JsonRecord, runId: string): void {
  const execution = record(aggregate.execution, 'Console Kit aggregate execution');
  const stack = record(execution.stack, 'Console Kit aggregate stack execution');
  const blocks = record(execution.blocks, 'Console Kit aggregate Blocks execution');
  const coverage = record(execution.coverage, 'Console Kit aggregate coverage');
  const sources = record(aggregate.sources, 'Console Kit aggregate sources');
  const cleanup = record(aggregate.cleanup, 'Console Kit aggregate cleanup');
  if (
    aggregate.version !== 2 ||
    aggregate.kind !== 'constructive-console-kit-proof' ||
    aggregate.runId !== runId ||
    aggregate.status !== 'passed' ||
    aggregate.retainTenants !== true ||
    !nonEmptyString(aggregate.completedAt) ||
    !nonEmptyString(aggregate.controlEndpoint) ||
    !nonEmptyString(aggregate.privateEndpoint) ||
    !nonEmptyString(aggregate.blocksUrl) ||
    execution.mode !== 'canonical' ||
    stack.requested !== 'start-or-verify' ||
    !['started', 'verified-reuse'].includes(String(stack.result)) ||
    typeof stack.ownedByRun !== 'boolean' ||
    stack.provenanceVerified !== true ||
    !nonEmptyString(stack.provenancePath) ||
    typeof stack.provenanceHash !== 'string' ||
    !SHA256.test(stack.provenanceHash) ||
    blocks.requested !== 'full' ||
    blocks.launch !== 'started' ||
    blocks.result !== 'passed' ||
    blocks.provenanceVerified !== true ||
    !nonEmptyString(blocks.provenancePath) ||
    typeof blocks.provenanceHash !== 'string' ||
    !SHA256.test(blocks.provenanceHash) ||
    cleanup.requested !== false ||
    cleanup.status !== 'not-requested' ||
    Object.keys(coverage).length !== PROOF_COVERAGE_KEYS.length ||
    PROOF_COVERAGE_KEYS.some((key) => coverage[key] !== true)
  ) {
    throw new Error('Console Kit aggregate proof is not a retained canonical pass.');
  }
  assertSourceRevisions(sources);
  assertCanonicalFixtureMatrix(aggregate, execution);
}

function proofCoreHash(aggregate: JsonRecord): string {
  const execution = record(aggregate.execution, 'Console Kit aggregate execution');
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

function artifactInDirectory(
  path: unknown,
  directory: string,
  label: string
): string {
  if (!nonEmptyString(path)) throw new Error(`${label} has no path.`);
  const scoped = assertScopedChildFile(path, dirname(directory), label);
  if (dirname(scoped) !== resolve(directory)) {
    throw new Error(`${label} is outside its canonical artifact directory.`);
  }
  return scoped;
}

function attestedPresetArtifacts(
  attested: unknown,
  aggregateRows: unknown,
  root: string,
  kind: 'tenant' | 'credential'
): Array<{ preset: string; path: string; hash: string }> {
  if (!Array.isArray(attested) || !Array.isArray(aggregateRows) ||
    attested.length !== PROOF_PRESETS.length || aggregateRows.length !== PROOF_PRESETS.length) {
    throw new Error(`Console Kit attested ${kind} artifact matrix is incomplete.`);
  }
  return PROOF_PRESETS.map((preset, index) => {
    const reference = record(attested[index], `Console Kit attested ${kind} ${preset}`);
    const aggregateRow = record(aggregateRows[index], `Console Kit aggregate ${kind} ${preset}`);
    if (reference.preset !== preset || aggregateRow.preset !== preset) {
      throw new Error(`Console Kit attested ${kind} matrix is reordered or cross-preset.`);
    }

    const path = kind === 'tenant'
      ? artifactInDirectory(aggregateRow.manifestPath, join(root, 'manifests'), `${preset} manifest`)
      : artifactInDirectory(
          join(root, 'credentials', String(aggregateRow.credentialRef)),
          join(root, 'credentials'),
          `${preset} credential receipt`
        );
    const canonicalReference = artifactReference(
      reference,
      path,
      `Console Kit attested ${kind} ${preset}`
    );
    let actualHash: string;
    if (kind === 'tenant') {
      const manifestArtifact = readArtifact(path, `${preset} tenant manifest`);
      const aggregateManifest = record(
        aggregateRow.manifest,
        `${preset} aggregate tenant manifest`
      );
      const fixture = PROOF_FIXTURES[index]!;
      const aggregateParsed = assertSeederManifest(
        aggregateManifest,
        fixture,
        aggregateManifest.controlPlaneEndpoint,
        `${preset} aggregate tenant manifest`
      );
      const externalParsed = assertSeederManifest(
        manifestArtifact.value,
        fixture,
        aggregateManifest.controlPlaneEndpoint,
        `${preset} external tenant manifest`
      );
      if (
        aggregateParsed.databaseId !== externalParsed.databaseId ||
        JSON.stringify(aggregateParsed.normalized) !==
          JSON.stringify(externalParsed.normalized)
      ) {
        throw new Error(`${preset} tenant manifest drifted from its aggregate snapshot.`);
      }
      actualHash = manifestArtifact.hash;
    } else {
      actualHash = hashOpaqueArtifact(path, root, `${preset} credential receipt`);
    }
    if (
      canonicalReference.hash !== actualHash ||
      (kind === 'credential' && aggregateRow.credentialHash !== actualHash)
    ) {
      throw new Error(`Console Kit attested ${kind} ${preset} drifted after completion.`);
    }
    return { preset, path, hash: actualHash };
  });
}

export function reviewPathsFromEnvironment(
  env: NodeJS.ProcessEnv = process.env
): ConsoleKitReviewPaths {
  return {
    routeInput: requiredAbsolutePath(
      env.CONSOLE_KIT_TENANT_MANIFEST,
      'CONSOLE_KIT_TENANT_MANIFEST'
    ),
    completion: requiredAbsolutePath(
      env.CONSOLE_KIT_REVIEW_COMPLETION,
      'CONSOLE_KIT_REVIEW_COMPLETION'
    ),
    failure: requiredAbsolutePath(
      env.CONSOLE_KIT_REVIEW_FAILURE,
      'CONSOLE_KIT_REVIEW_FAILURE'
    ),
    finalAttestation: requiredAbsolutePath(
      env.CONSOLE_KIT_FINAL_ATTESTATION,
      'CONSOLE_KIT_FINAL_ATTESTATION'
    )
  };
}

export function resolveConsoleKitReviewStatus({
  runId,
  routeStatus,
  paths
}: Readonly<{
  runId: string;
  routeStatus: string;
  paths: ConsoleKitReviewPaths;
}>): 'testing' | 'passed' | 'failed' {
  const root = assertCanonicalRunPaths(runId, paths);
  const routeInput = readArtifact(paths.routeInput, 'Console Kit route input');
  assertRouteInput(routeInput, runId, routeStatus);

  if (existsSync(paths.failure)) {
    const failure = readArtifact(paths.failure, 'Console Kit review failure receipt').value;
    if (
      failure.version !== 1 ||
      failure.kind !== 'constructive-console-kit-review-failure' ||
      failure.runId !== runId ||
      failure.status !== 'failed' ||
      !nonEmptyString(failure.completedAt)
    ) {
      throw new Error('Console Kit review failure receipt is malformed or belongs to another run.');
    }
    return 'failed';
  }

  const hasCompletion = existsSync(paths.completion);
  const hasAttestation = existsSync(paths.finalAttestation);
  if (!hasCompletion && !hasAttestation) return 'testing';
  if (hasAttestation && !hasCompletion) {
    throw new Error('Console Kit final attestation exists without its review completion receipt.');
  }

  const completionArtifact = readReviewCompletion(paths.completion, runId);
  if (!hasAttestation) return 'testing';

  const attestationArtifact = readArtifact(
    paths.finalAttestation,
    'Console Kit final attestation'
  );
  const attestation = attestationArtifact.value;
  if (
    attestation.version !== 2 ||
    attestation.kind !== 'constructive-console-kit-final-attestation' ||
    attestation.runId !== runId ||
    !nonEmptyString(attestation.createdAt) ||
    typeof attestation.proofCoreHash !== 'string' ||
    !SHA256.test(attestation.proofCoreHash)
  ) {
    throw new Error('Console Kit final attestation is malformed or belongs to another run.');
  }

  const aggregatePath = join(root, 'tenants.json');
  const stackProvenancePath = join(root, 'stack-provenance.json');
  const blocksProvenancePath = join(root, 'blocks-provenance.json');
  const suiteInputPath = join(root, 'suite-input.json');
  const blocksPath = join(root, 'blocks-receipt.json');
  const fixtureDescriptorPath = join(root, 'verification-fixture-descriptor.json');
  const fixturePath = join(root, 'verification-fixture-receipt.json');
  const aggregateReference = artifactReference(
    attestation.aggregate,
    aggregatePath,
    'Console Kit attested aggregate proof'
  );
  const stackProvenanceReference = artifactReference(
    attestation.stackProvenance,
    stackProvenancePath,
    'Console Kit attested stack provenance'
  );
  const blocksProvenanceReference = artifactReference(
    attestation.blocksProvenance,
    blocksProvenancePath,
    'Console Kit attested Blocks provenance'
  );
  const routeReference = artifactReference(
    attestation.routeInput,
    paths.routeInput,
    'Console Kit attested route input'
  );
  const suiteInputReference = artifactReference(
    attestation.suiteInput,
    suiteInputPath,
    'Console Kit attested suite input'
  );
  const completionReference = artifactReference(
    attestation.reviewCompletion,
    paths.completion,
    'Console Kit attested review completion'
  );
  const blocksReference = artifactReference(
    attestation.blocksReceipt,
    blocksPath,
    'Console Kit attested Blocks receipt'
  );
  const fixtureDescriptorReference = artifactReference(
    attestation.verificationFixtureDescriptor,
    fixtureDescriptorPath,
    'Console Kit attested verification fixture descriptor'
  );
  const fixtureReference = artifactReference(
    attestation.verificationFixtureReceipt,
    fixturePath,
    'Console Kit attested verification fixture receipt'
  );

  const aggregateArtifact = readArtifact(aggregatePath, 'Console Kit aggregate proof');
  const stackProvenanceArtifact = readArtifact(
    stackProvenancePath,
    'Console Kit stack provenance'
  );
  const blocksProvenanceArtifact = readArtifact(
    blocksProvenancePath,
    'Console Kit Blocks provenance'
  );
  const suiteInputArtifact = readArtifact(suiteInputPath, 'Console Kit suite input');
  const blocksArtifact = readArtifact(blocksPath, 'Console Kit Blocks receipt');
  const fixtureDescriptorArtifact = readArtifact(
    fixtureDescriptorPath,
    'Console Kit verification fixture descriptor'
  );
  const fixtureArtifact = readArtifact(
    fixturePath,
    'Console Kit verification fixture receipt'
  );
  assertCanonicalAggregate(aggregateArtifact.value, runId);
  const aggregateExecution = record(
    aggregateArtifact.value.execution,
    'Console Kit aggregate execution'
  );
  const stackExecution = record(
    aggregateExecution.stack,
    'Console Kit aggregate stack execution'
  );
  const blocksExecution = record(
    aggregateExecution.blocks,
    'Console Kit aggregate Blocks execution'
  );
  if (
    stackExecution.provenancePath !== stackProvenancePath ||
    stackExecution.provenanceHash !== stackProvenanceArtifact.hash ||
    blocksExecution.provenancePath !== blocksProvenancePath ||
    blocksExecution.provenanceHash !== blocksProvenanceArtifact.hash
  ) {
    throw new Error('Console Kit execution provenance is not bound to the attested artifacts.');
  }
  const aggregateSources = record(
    aggregateArtifact.value.sources,
    'Console Kit aggregate sources'
  );
  assertStackProvenance(stackProvenanceArtifact.value, runId, aggregateSources);
  const blocksSource = assertSourceRevisions(aggregateSources);
  assertBlocksProvenance(
    blocksProvenanceArtifact.value,
    runId,
    aggregateArtifact.value,
    paths.routeInput,
    routeInput.hash,
    blocksSource
  );
  assertBlocksReceipt(blocksArtifact.value);
  assertVerificationFixtureDescriptor(fixtureDescriptorArtifact.value, runId);
  assertVerificationFixtureReceipt(
    fixtureArtifact.value,
    fixtureDescriptorArtifact.value,
    fixtureDescriptorArtifact.hash,
    runId,
    routeInput.value
  );

  const stableInputKeys = [
    'controlEndpoint',
    'privateEndpoint',
    'blocksUrl',
    'sources',
    'tenants',
    'cleanupTargets'
  ] as const;
  for (const key of stableInputKeys) {
    if (
      JSON.stringify(routeInput.value[key]) !== JSON.stringify(aggregateArtifact.value[key]) ||
      JSON.stringify(suiteInputArtifact.value[key]) !== JSON.stringify(aggregateArtifact.value[key])
    ) {
      throw new Error(`Console Kit immutable ${key} input drifted from the aggregate proof.`);
    }
  }

  const tenantManifests = attestedPresetArtifacts(
    attestation.tenantManifests,
    aggregateArtifact.value.tenants,
    root,
    'tenant'
  );
  const credentialReceipts = attestedPresetArtifacts(
    attestation.credentialReceipts,
    aggregateArtifact.value.cleanupTargets,
    root,
    'credential'
  );

  const completion = completionArtifact.value;
  if (
    aggregateReference.hash !== aggregateArtifact.hash ||
    stackProvenanceReference.hash !== stackProvenanceArtifact.hash ||
    blocksProvenanceReference.hash !== blocksProvenanceArtifact.hash ||
    routeReference.hash !== routeInput.hash ||
    suiteInputReference.hash !== suiteInputArtifact.hash ||
    completionReference.hash !== completionArtifact.hash ||
    blocksReference.hash !== blocksArtifact.hash ||
    fixtureDescriptorReference.hash !== fixtureDescriptorArtifact.hash ||
    fixtureReference.hash !== fixtureArtifact.hash ||
    completion.blocksReceiptHash !== blocksArtifact.hash ||
    completion.verificationFixtureReceiptHash !== fixtureArtifact.hash
  ) {
    throw new Error('Console Kit review evidence drifted after the final proof attestation.');
  }

  const expectedAttestation = {
    version: 2,
    kind: 'constructive-console-kit-final-attestation',
    runId,
    proofCoreHash: proofCoreHash(aggregateArtifact.value),
    aggregate: { path: aggregatePath, hash: aggregateArtifact.hash },
    stackProvenance: { path: stackProvenancePath, hash: stackProvenanceArtifact.hash },
    blocksProvenance: { path: blocksProvenancePath, hash: blocksProvenanceArtifact.hash },
    routeInput: { path: paths.routeInput, hash: routeInput.hash },
    suiteInput: { path: suiteInputPath, hash: suiteInputArtifact.hash },
    blocksReceipt: { path: blocksPath, hash: blocksArtifact.hash },
    verificationFixtureDescriptor: {
      path: fixtureDescriptorPath,
      hash: fixtureDescriptorArtifact.hash
    },
    verificationFixtureReceipt: { path: fixturePath, hash: fixtureArtifact.hash },
    reviewCompletion: { path: paths.completion, hash: completionArtifact.hash },
    tenantManifests,
    credentialReceipts
  };
  const { createdAt: _createdAt, ...recordedAttestation } = attestation;
  if (JSON.stringify(recordedAttestation) !== JSON.stringify(expectedAttestation)) {
    throw new Error('Console Kit final attestation no longer matches every proof input.');
  }
  return 'passed';
}
