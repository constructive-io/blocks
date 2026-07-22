import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveConsoleKitReviewStatus } from './review-status';

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value)}\n`);
}

function hash(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

describe('retained Console Kit review status', () => {
  it('reports passed only when completion is bound to the final attestation', () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'console-kit-review-')));
    const paths = {
      completion: join(root, 'review-completion.json'),
      failure: join(root, 'review-failure.json'),
      finalAttestation: join(root, 'final-attestation.json')
    };
    const blocksHash = 'a'.repeat(64);
    const fixtureHash = 'b'.repeat(64);
    writeJson(paths.completion, {
      version: 1,
      kind: 'constructive-console-kit-review-completion',
      runId: 'proof-run',
      status: 'passed',
      completedAt: new Date(0).toISOString(),
      blocksReceiptHash: blocksHash,
      verificationFixtureReceiptHash: fixtureHash
    });
    writeJson(paths.finalAttestation, {
      version: 2,
      kind: 'constructive-console-kit-final-attestation',
      runId: 'proof-run',
      reviewCompletion: { path: paths.completion, hash: hash(paths.completion) },
      blocksReceipt: { hash: blocksHash },
      verificationFixtureReceipt: { hash: fixtureHash }
    });

    expect(resolveConsoleKitReviewStatus({
      runId: 'proof-run',
      routeStatus: 'testing',
      paths
    })).toBe('passed');

    writeJson(paths.completion, {
      version: 1,
      kind: 'constructive-console-kit-review-completion',
      runId: 'proof-run',
      status: 'passed',
      completedAt: new Date(0).toISOString(),
      blocksReceiptHash: 'c'.repeat(64),
      verificationFixtureReceiptHash: fixtureHash
    });
    expect(() => resolveConsoleKitReviewStatus({
      runId: 'proof-run',
      routeStatus: 'testing',
      paths
    })).toThrow(/not bound to the final proof attestation/u);
  });

  it('keeps testing during completion publication and gives a run-bound failure precedence', () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'console-kit-review-')));
    const paths = {
      completion: join(root, 'review-completion.json'),
      failure: join(root, 'review-failure.json'),
      finalAttestation: join(root, 'final-attestation.json')
    };
    writeJson(paths.completion, {
      version: 1,
      kind: 'constructive-console-kit-review-completion',
      runId: 'proof-run',
      status: 'passed',
      completedAt: new Date(0).toISOString(),
      blocksReceiptHash: 'a'.repeat(64),
      verificationFixtureReceiptHash: 'b'.repeat(64)
    });
    expect(resolveConsoleKitReviewStatus({
      runId: 'proof-run',
      routeStatus: 'testing',
      paths
    })).toBe('testing');

    writeJson(paths.failure, {
      version: 1,
      kind: 'constructive-console-kit-review-failure',
      runId: 'proof-run',
      status: 'failed',
      completedAt: new Date(0).toISOString()
    });
    expect(resolveConsoleKitReviewStatus({
      runId: 'proof-run',
      routeStatus: 'testing',
      paths
    })).toBe('failed');
  });
});
