import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';

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

function record(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as JsonRecord;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
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
  return {
    value: record(value, label),
    hash: createHash('sha256').update(contents).digest('hex')
  };
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
    expectedIds.length === 0 ||
    !Array.isArray(scenarios) ||
    scenarios.length !== expectedIds.length ||
    expectedIds.some((id) => !nonEmptyString(id)) ||
    new Set(expectedIds).size !== expectedIds.length
  ) {
    throw new Error('Console Kit Blocks receipt is malformed or did not pass serially.');
  }

  const retry = record(retries[0], 'Console Kit Blocks receipt retry policy');
  if (retry.name !== 'console-kit-live-chromium' || retry.retries !== 0) {
    throw new Error('Console Kit Blocks receipt is malformed or did not pass serially.');
  }
  for (let index = 0; index < expectedIds.length; index++) {
    const scenario = record(scenarios[index], `Console Kit Blocks scenario ${index + 1}`);
    if (
      scenario.id !== expectedIds[index] ||
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

  const blocksPath = join(root, 'blocks-receipt.json');
  const fixtureDescriptorPath = join(root, 'verification-fixture-descriptor.json');
  const fixturePath = join(root, 'verification-fixture-receipt.json');
  const routeReference = artifactReference(
    attestation.routeInput,
    paths.routeInput,
    'Console Kit attested route input'
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

  const blocksArtifact = readArtifact(blocksPath, 'Console Kit Blocks receipt');
  const fixtureDescriptorArtifact = readArtifact(
    fixtureDescriptorPath,
    'Console Kit verification fixture descriptor'
  );
  const fixtureArtifact = readArtifact(
    fixturePath,
    'Console Kit verification fixture receipt'
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

  const completion = completionArtifact.value;
  if (
    routeReference.hash !== routeInput.hash ||
    completionReference.hash !== completionArtifact.hash ||
    blocksReference.hash !== blocksArtifact.hash ||
    fixtureDescriptorReference.hash !== fixtureDescriptorArtifact.hash ||
    fixtureReference.hash !== fixtureArtifact.hash ||
    completion.blocksReceiptHash !== blocksArtifact.hash ||
    completion.verificationFixtureReceiptHash !== fixtureArtifact.hash
  ) {
    throw new Error('Console Kit review evidence drifted after the final proof attestation.');
  }
  return 'passed';
}
