import { describe, expect, it } from 'vitest';

import { assertSupportedProofManifest } from './proof-manifest-contract';

function canonicalExecution() {
  return {
    mode: 'canonical',
    stack: {
      result: 'started',
      provenanceVerified: true
    },
    blocks: {
      requested: 'full',
      launch: 'started',
      result: 'pending',
      provenanceVerified: true
    },
    coverage: {
      sourcesValidated: true,
      stackOwnedOrVerified: true,
      controlPlaneProbes: true,
      tenantsProvisioned: true,
      tenantSemanticProbes: true,
      blocksLiveSuite: false
    }
  };
}

describe('live proof manifest compatibility', () => {
  it('rejects legacy manifests that cannot carry canonical provenance', () => {
    expect(() => assertSupportedProofManifest({
      version: 1,
      kind: 'constructive-console-kit-proof',
      status: 'testing'
    })).toThrow(/version 2 manifest/u);
  });

  it('allows the integration route to boot before its listener is attested', () => {
    const execution = canonicalExecution();
    execution.blocks.launch = 'pending';
    execution.blocks.provenanceVerified = false;

    expect(() => assertSupportedProofManifest({
      version: 2,
      kind: 'constructive-console-kit-proof',
      status: 'testing',
      execution
    }, 'route-bootstrap')).not.toThrow();
  });

  it('keeps a failed run available for retained visual inspection', () => {
    expect(() => assertSupportedProofManifest({
      version: 2,
      kind: 'constructive-console-kit-proof',
      status: 'failed',
      execution: canonicalExecution()
    }, 'route-bootstrap')).not.toThrow();
  });

  it('accepts a canonical v2 manifest while its live suite is pending', () => {
    expect(() => assertSupportedProofManifest({
      version: 2,
      kind: 'constructive-console-kit-proof',
      status: 'testing',
      execution: canonicalExecution()
    })).not.toThrow();
  });

  it('rejects backend-only v2 evidence before starting Playwright', () => {
    expect(() => assertSupportedProofManifest({
      version: 2,
      kind: 'constructive-console-kit-proof',
      status: 'testing',
      execution: {
        ...canonicalExecution(),
        mode: 'backend-only'
      }
    })).toThrow(/canonical Console Kit proof/u);
  });
});
