import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

type JsonRecord = Record<string, unknown>;

export type ConsoleKitReviewPaths = Readonly<{
  completion: string;
  failure: string;
  finalAttestation: string;
}>;

function record(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as JsonRecord;
}

function requiredAbsolutePath(value: string | undefined, name: string): string {
  if (!value || !isAbsolute(value)) {
    throw new Error(`${name} must be an absolute path.`);
  }
  return resolve(value);
}

function readArtifact(path: string, label: string): JsonRecord {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || realpathSync(path) !== path) {
    throw new Error(`${label} must be a real regular file.`);
  }
  return record(JSON.parse(readFileSync(path, 'utf8')), label);
}

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export function reviewPathsFromEnvironment(
  env: NodeJS.ProcessEnv = process.env
): ConsoleKitReviewPaths {
  return {
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
}>): string {
  if (existsSync(paths.failure)) {
    const failure = readArtifact(paths.failure, 'Console Kit review failure receipt');
    if (
      failure.version !== 1 ||
      failure.kind !== 'constructive-console-kit-review-failure' ||
      failure.runId !== runId ||
      failure.status !== 'failed' ||
      typeof failure.completedAt !== 'string'
    ) {
      throw new Error('Console Kit review failure receipt is malformed or belongs to another run.');
    }
    return 'failed';
  }

  const hasCompletion = existsSync(paths.completion);
  const hasAttestation = existsSync(paths.finalAttestation);
  if (!hasCompletion && !hasAttestation) return routeStatus;
  if (hasAttestation && !hasCompletion) {
    throw new Error('Console Kit final attestation exists without its review completion receipt.');
  }
  if (!hasAttestation) return routeStatus;

  const completion = readArtifact(paths.completion, 'Console Kit review completion receipt');
  const attestation = readArtifact(paths.finalAttestation, 'Console Kit final attestation');
  const attestedCompletion = record(
    attestation.reviewCompletion,
    'Console Kit attested review completion'
  );
  const blocksReceipt = record(
    attestation.blocksReceipt,
    'Console Kit attested Blocks receipt'
  );
  const fixtureReceipt = record(
    attestation.verificationFixtureReceipt,
    'Console Kit attested verification fixture receipt'
  );

  if (
    completion.version !== 1 ||
    completion.kind !== 'constructive-console-kit-review-completion' ||
    completion.runId !== runId ||
    completion.status !== 'passed' ||
    typeof completion.completedAt !== 'string' ||
    typeof completion.blocksReceiptHash !== 'string' ||
    typeof completion.verificationFixtureReceiptHash !== 'string' ||
    attestation.version !== 2 ||
    attestation.kind !== 'constructive-console-kit-final-attestation' ||
    attestation.runId !== runId ||
    attestedCompletion.path !== paths.completion ||
    attestedCompletion.hash !== sha256(paths.completion) ||
    blocksReceipt.hash !== completion.blocksReceiptHash ||
    fixtureReceipt.hash !== completion.verificationFixtureReceiptHash
  ) {
    throw new Error('Console Kit review completion is not bound to the final proof attestation.');
  }
  return 'passed';
}
