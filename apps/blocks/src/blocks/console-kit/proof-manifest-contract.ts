type UnknownRecord = Record<string, unknown>;

function record(value: unknown, label: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as UnknownRecord;
}

export type ProofManifestValidationPhase = 'route-bootstrap' | 'live-suite';

function assertV2Execution(
  value: UnknownRecord,
  phase: ProofManifestValidationPhase
): void {
  const acceptedStatuses = phase === 'route-bootstrap'
    ? ['testing', 'passed', 'failed']
    : ['testing', 'passed'];
  if (!acceptedStatuses.includes(String(value.status))) {
    throw new Error(
      phase === 'route-bootstrap'
        ? 'The integration route requires a testing, passed, or failed Console Kit proof.'
        : 'The live suite requires a testing or passed Console Kit proof.'
    );
  }
  const execution = record(value.execution, 'proof manifest execution');
  if (execution.mode !== 'canonical') {
    throw new Error('The live suite requires a canonical Console Kit proof.');
  }

  const stack = record(execution.stack, 'proof manifest execution.stack');
  if (
    stack.provenanceVerified !== true ||
    (stack.result !== 'started' && stack.result !== 'verified-reuse')
  ) {
    throw new Error('The live suite requires verified backend process provenance.');
  }

  const blocks = record(execution.blocks, 'proof manifest execution.blocks');
  if (phase === 'route-bootstrap') {
    if (
      blocks.requested !== 'full' ||
      (blocks.launch !== 'pending' &&
        blocks.launch !== 'started' &&
        blocks.launch !== 'verified-reuse') ||
      (blocks.result !== 'pending' && blocks.result !== 'passed')
    ) {
      throw new Error('The integration route requires a full Blocks proof launch.');
    }
  } else {
    if (
      blocks.requested !== 'full' ||
      blocks.provenanceVerified !== true ||
      (blocks.launch !== 'started' && blocks.launch !== 'verified-reuse') ||
      (blocks.result !== 'pending' && blocks.result !== 'passed')
    ) {
      throw new Error('The live suite requires a provenance-verified Blocks launch.');
    }
  }

  const coverage = record(execution.coverage, 'proof manifest execution.coverage');
  for (const key of [
    'sourcesValidated',
    'stackOwnedOrVerified',
    'controlPlaneProbes',
    'tenantsProvisioned',
    'tenantSemanticProbes'
  ]) {
    if (coverage[key] !== true) {
      throw new Error(`The live suite requires proof coverage ${key}.`);
    }
  }
}

export function assertSupportedProofManifest(
  value: unknown,
  phase: ProofManifestValidationPhase = 'live-suite'
): asserts value is UnknownRecord {
  const manifest = record(value, 'proof manifest');
  if (
    manifest.version !== 2 ||
    manifest.kind !== 'constructive-console-kit-proof'
  ) {
    throw new Error('The canonical Console Kit proof requires a version 2 manifest.');
  }
  assertV2Execution(manifest, phase);
}
