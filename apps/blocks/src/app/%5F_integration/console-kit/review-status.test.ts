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
const temporaryRoots: string[] = [];

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value)}\n`);
}

function hash(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

type ReviewFixture = Readonly<{
  base: string;
  root: string;
  paths: ConsoleKitReviewPaths;
  blocksReceiptPath: string;
  fixtureReceiptPath: string;
}>;

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
  writeJson(fixture.paths.finalAttestation, {
    version: 2,
    kind: 'constructive-console-kit-final-attestation',
    runId: RUN_ID,
    createdAt: new Date(1).toISOString(),
    proofCoreHash: 'c'.repeat(64),
    routeInput: {
      path: overrides.routeInputPath ?? fixture.paths.routeInput,
      hash: hash(fixture.paths.routeInput)
    },
    reviewCompletion: {
      path: fixture.paths.completion,
      hash: hash(fixture.paths.completion)
    },
    blocksReceipt: {
      path: fixture.blocksReceiptPath,
      hash: hash(fixture.blocksReceiptPath)
    },
    verificationFixtureReceipt: {
      path: fixture.fixtureReceiptPath,
      hash: hash(fixture.fixtureReceiptPath)
    }
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
  const blocksReceiptPath = join(root, 'blocks-receipt.json');
  const fixtureReceiptPath = join(root, 'verification-fixture-receipt.json');

  writeJson(paths.routeInput, {
    version: 2,
    kind: 'constructive-console-kit-proof',
    runId: RUN_ID,
    status: 'testing',
    tenants: [
      {
        preset: 'auth:hardened',
        manifest: { databaseId: DATABASE_ID }
      }
    ]
  });
  writeJson(blocksReceiptPath, {
    version: 1,
    kind: 'constructive-console-kit-blocks-receipt',
    createdAt: new Date(0).toISOString(),
    overallStatus: 'passed',
    workerCount: 1,
    forbidOnly: true,
    projectRetries: [{ name: 'console-kit-live-chromium', retries: 0 }],
    expectedScenarioIds: ['proves the live Console Kit'],
    scenarios: [
      {
        id: 'proves the live Console Kit',
        status: 'passed',
        durationMs: 10
      }
    ]
  });
  writeJson(fixtureReceiptPath, {
    version: 1,
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
    mailpit: {
      purgedAt: new Date(1).toISOString(),
      deletedMessageCount: 1,
      remainingMessageCount: 0
    }
  });

  const fixture = { base, root, paths, blocksReceiptPath, fixtureReceiptPath };
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
    })).toThrow(/evidence drifted/u);
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
    })).toThrow(/evidence drifted/u);

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
