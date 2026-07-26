export const CONSOLE_ENDPOINT_KINDS = [
  'data',
  'auth',
  'admin',
  'billing',
  'storage',
  'notifications'
] as const;

export type ConsoleEndpointKind = (typeof CONSOLE_ENDPOINT_KINDS)[number];

export const CONSTRUCTIVE_API_NAME_BY_CONSOLE_ENDPOINT = {
  data: 'api',
  auth: 'auth',
  admin: 'admin',
  billing: 'usage',
  storage: 'objects',
  notifications: 'notifications'
} as const satisfies Record<ConsoleEndpointKind, string>;

export type ConstructiveApiName =
  (typeof CONSTRUCTIVE_API_NAME_BY_CONSOLE_ENDPOINT)[ConsoleEndpointKind];

export function getConstructiveApiName(
  kind: ConsoleEndpointKind
): ConstructiveApiName {
  return CONSTRUCTIVE_API_NAME_BY_CONSOLE_ENDPOINT[kind];
}

export type ConsoleEndpointInput =
  | string
  | {
      id?: string;
      url: string;
    };

export type ConsoleEndpointMap = Partial<
  Record<ConsoleEndpointKind, ConsoleEndpointInput>
>;

export type ConsoleEndpoint = {
  id: string;
  kind: ConsoleEndpointKind;
  url: string;
};

export type ConsoleEndpointResolutionPolicy = {
  /**
   * Fallbacks are opt-in because silently sending an admin operation to a data
   * endpoint can change its authorization boundary. The requested endpoint is
   * always attempted first, even when it also appears in this list.
   */
  fallbackOrder?: Partial<
    Record<ConsoleEndpointKind, readonly ConsoleEndpointKind[]>
  >;
};

export type ConsoleEndpointResolution =
  | {
      status: 'resolved';
      requestedKind: ConsoleEndpointKind;
      resolvedKind: ConsoleEndpointKind;
      endpoint: ConsoleEndpoint;
      usedFallback: boolean;
      attemptedKinds: readonly ConsoleEndpointKind[];
    }
  | {
      status: 'missing';
      requestedKind: ConsoleEndpointKind;
      attemptedKinds: readonly ConsoleEndpointKind[];
      invalidKinds: readonly ConsoleEndpointKind[];
    };

function uniqueKinds(
  kinds: readonly ConsoleEndpointKind[]
): ConsoleEndpointKind[] {
  return [...new Set(kinds)];
}

function normalizeEndpoint(
  kind: ConsoleEndpointKind,
  input: ConsoleEndpointInput
): ConsoleEndpoint | null {
  const url = typeof input === 'string' ? input.trim() : input.url.trim();
  if (!url) return null;

  const configuredId = typeof input === 'string' ? undefined : input.id?.trim();
  return {
    id: configuredId || `${kind}:${url}`,
    kind,
    url
  };
}

/** Resolves an endpoint from host-supplied configuration without global state. */
export function resolveConsoleEndpoint(
  endpoints: ConsoleEndpointMap,
  requestedKind: ConsoleEndpointKind,
  policy: ConsoleEndpointResolutionPolicy = {}
): ConsoleEndpointResolution {
  const candidateKinds = uniqueKinds([
    requestedKind,
    ...(policy.fallbackOrder?.[requestedKind] ?? [])
  ]);
  const attemptedKinds: ConsoleEndpointKind[] = [];
  const invalidKinds: ConsoleEndpointKind[] = [];

  for (const kind of candidateKinds) {
    attemptedKinds.push(kind);
    const input = endpoints[kind];
    if (input === undefined) continue;

    const endpoint = normalizeEndpoint(kind, input);
    if (!endpoint) {
      invalidKinds.push(kind);
      continue;
    }

    return {
      status: 'resolved',
      requestedKind,
      resolvedKind: kind,
      endpoint,
      usedFallback: kind !== requestedKind,
      attemptedKinds
    };
  }

  return {
    status: 'missing',
    requestedKind,
    attemptedKinds,
    invalidKinds
  };
}
