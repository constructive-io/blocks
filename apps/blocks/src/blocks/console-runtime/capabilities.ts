import type { ConsoleEndpointKind, ConstructiveApiName } from './endpoints';

export type ConsoleCapabilityEvidence =
  | Readonly<{
      source: 'endpoint';
      endpointKind: ConsoleEndpointKind;
      endpointId: string;
      apiName: ConstructiveApiName;
    }>
  | Readonly<{
      source: 'graphql-operation';
      endpointKind: ConsoleEndpointKind;
      coordinate: string;
    }>
  | Readonly<{
      source: 'host-adapter';
      adapterId: string;
      capability: string;
    }>
  | Readonly<{
      source: 'diagnostic';
      code: string;
      message: string;
    }>;

type AssessedConsolePackCapability = Readonly<{
  packId: string;
  supportedCapabilities: readonly string[];
  evidence: readonly ConsoleCapabilityEvidence[];
}>;

export type ConsolePackCapabilityState =
  | Readonly<{
      status: 'checking';
      packId: string;
    }>
  | (AssessedConsolePackCapability &
      Readonly<{
        status: 'ready';
      }>)
  | (AssessedConsolePackCapability &
      Readonly<{
        status: 'partial';
        missingCapabilities: readonly string[];
      }>)
  | (AssessedConsolePackCapability &
      Readonly<{
        status: 'unavailable';
        missingCapabilities: readonly string[];
        reason: string;
      }>);

export type AssessConsolePackCapabilityInput = Readonly<{
  packId: string;
  requiredCapabilities: readonly string[];
  supportedCapabilities: readonly string[];
  evidence: readonly ConsoleCapabilityEvidence[];
  unavailableReason?: string;
}>;

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export function createCheckingConsolePackCapability(
  packId: string
): ConsolePackCapabilityState {
  return { status: 'checking', packId };
}

/** Derives pack status from positive capability evidence and required operations. */
export function assessConsolePackCapability(
  input: AssessConsolePackCapabilityInput
): ConsolePackCapabilityState {
  const requiredCapabilities = unique(input.requiredCapabilities);
  const supportedCapabilities = unique(input.supportedCapabilities);
  const supported = new Set(supportedCapabilities);
  const missingCapabilities = requiredCapabilities.filter(
    (capability) => !supported.has(capability)
  );
  const common = {
    packId: input.packId,
    supportedCapabilities,
    evidence: [...input.evidence]
  } as const;

  if (missingCapabilities.length === 0) {
    return { status: 'ready', ...common };
  }

  if (supportedCapabilities.length > 0) {
    return {
      status: 'partial',
      ...common,
      missingCapabilities
    };
  }

  return {
    status: 'unavailable',
    ...common,
    missingCapabilities,
    reason:
      input.unavailableReason ??
      'No required capability was discovered on the configured endpoints.'
  };
}
