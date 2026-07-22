import type { ConsoleEndpoint } from './endpoints';
import { SERVER_CONSOLE_SESSION_SNAPSHOT } from './session';
import type {
  AuthenticatedConsoleIdentity,
  ConsoleCredentials,
  ConsoleSessionSnapshot,
  StandaloneConsoleSession
} from './session';

const SESSION_RECORD_VERSION = 1;
const SESSION_STORAGE_PREFIX = 'constructive.console.session.v1';

const SIGN_IN_MUTATION = /* GraphQL */ `
  mutation ConsoleSignIn($input: SignInInput!) {
    signIn(input: $input) {
      result {
        id
        userId
        accessToken
        accessTokenExpiresAt
        mfaRequired
        mfaChallengeToken
      }
    }
  }
`;

const SIGN_UP_MUTATION = /* GraphQL */ `
  mutation ConsoleSignUp($input: SignUpInput!) {
    signUp(input: $input) {
      result {
        id
        userId
        accessToken
        accessTokenExpiresAt
      }
    }
  }
`;

const SIGN_OUT_MUTATION = /* GraphQL */ `
  mutation ConsoleSignOut($input: SignOutInput!) {
    signOut(input: $input) {
      clientMutationId
    }
  }
`;

export type ConsoleSessionPersistence = 'session' | 'local';

export type ConsoleSessionStorage = Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem'
>;

export type ConsoleAuthenticationFailure = Readonly<{
  message: string;
  code: string;
}>;

export type ConsoleAuthenticationOutcome =
  | Readonly<{
      status: 'authenticated';
      identity: AuthenticatedConsoleIdentity;
    }>
  | Readonly<{
      status: 'mfa-required';
      challengeToken: string;
    }>;

export type DatabaseScopedStandaloneSessionOptions = Readonly<{
  databaseId: string;
  authEndpoint: ConsoleEndpoint;
  fetch?: typeof fetch;
  storage?: Partial<Record<ConsoleSessionPersistence, ConsoleSessionStorage>>;
  now?: () => number;
  /** Defers browser credential restoration until the React tree has hydrated. */
  deferRestore?: boolean;
}>;

export interface DatabaseScopedStandaloneConsoleSession
  extends StandaloneConsoleSession {
  readonly databaseId: string;
  signIn(credentials: ConsoleCredentials): Promise<ConsoleAuthenticationOutcome>;
  signUp(credentials: ConsoleCredentials): Promise<ConsoleAuthenticationOutcome>;
  /** Restores a valid database-scoped credential at most once. */
  restorePersistedSession(): void;
  /** Clears an authenticated credential after an HTTP-200 GraphQL auth error. */
  handleAuthenticationFailure(failure: ConsoleAuthenticationFailure): void;
}

type StoredCredential = Readonly<{
  version: typeof SESSION_RECORD_VERSION;
  accessToken: string;
  expiresAt: string | null;
  userId: string;
  sessionId: string | null;
  cachePartition: string;
}>;

type AuthMutationRecord = {
  id?: unknown;
  userId?: unknown;
  accessToken?: unknown;
  accessTokenExpiresAt?: unknown;
  mfaRequired?: unknown;
  mfaChallengeToken?: unknown;
};

type GraphQLPayload = {
  data?: unknown;
  errors?: unknown;
};

class ConsoleSessionOperationError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, code: string, retryable = false) {
    super(message);
    this.name = 'ConsoleSessionOperationError';
    this.code = code;
    this.retryable = retryable;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function storageKey(databaseId: string): string {
  return `${SESSION_STORAGE_PREFIX}:${encodeURIComponent(databaseId)}`;
}

function createCachePartition(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function browserStorage(
  persistence: ConsoleSessionPersistence
): ConsoleSessionStorage | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return persistence === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return undefined;
  }
}

function parseStoredCredential(value: string | null): StoredCredential | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed) || parsed.version !== SESSION_RECORD_VERSION) return null;
    const accessToken = nonEmptyString(parsed.accessToken);
    const userId = nonEmptyString(parsed.userId);
    const cachePartition = nonEmptyString(parsed.cachePartition);
    const expiresAt = parsed.expiresAt === null
      ? null
      : nonEmptyString(parsed.expiresAt);
    const sessionId = parsed.sessionId === null
      ? null
      : nonEmptyString(parsed.sessionId);
    if (!accessToken || !userId || !cachePartition) return null;
    if (parsed.expiresAt !== null && !expiresAt) return null;
    if (parsed.sessionId !== null && !sessionId) return null;
    return {
      version: SESSION_RECORD_VERSION,
      accessToken,
      expiresAt,
      userId,
      sessionId,
      cachePartition
    };
  } catch {
    return null;
  }
}

function isExpired(credential: StoredCredential, now: number): boolean {
  if (!credential.expiresAt) return false;
  const expiresAt = Date.parse(credential.expiresAt);
  return !Number.isFinite(expiresAt) || expiresAt <= now;
}

function toIdentity(
  databaseId: string,
  credential: StoredCredential
): AuthenticatedConsoleIdentity {
  return {
    kind: 'authenticated',
    subjectId: credential.userId,
    sessionId: credential.sessionId ?? undefined,
    tenantId: databaseId,
    cachePartition: credential.cachePartition
  };
}

function firstGraphQLError(errors: unknown): ConsoleSessionOperationError | null {
  if (!Array.isArray(errors) || errors.length === 0) return null;
  const first = errors[0];
  if (!isRecord(first)) {
    return new ConsoleSessionOperationError(
      'The authentication operation failed.',
      'GRAPHQL_ERROR'
    );
  }
  const extensions = isRecord(first.extensions) ? first.extensions : null;
  return new ConsoleSessionOperationError(
    nonEmptyString(first.message) ?? 'The authentication operation failed.',
    nonEmptyString(extensions?.code) ?? 'GRAPHQL_ERROR'
  );
}

function mutationRecord(payload: GraphQLPayload, field: 'signIn' | 'signUp'):
  AuthMutationRecord | null {
  if (!isRecord(payload.data)) return null;
  const mutation = payload.data[field];
  if (!isRecord(mutation) || !isRecord(mutation.result)) return null;
  return mutation.result;
}

/**
 * Creates a standalone session whose credential and snapshot share one
 * closure-owned source of truth. Browser storage is only a database-scoped
 * persistence mirror and is never exposed through snapshots or cache keys.
 */
export function createDatabaseScopedStandaloneSession(
  options: DatabaseScopedStandaloneSessionOptions
): DatabaseScopedStandaloneConsoleSession {
  const databaseId = options.databaseId.trim();
  if (!databaseId) throw new Error('databaseId is required for a standalone session.');
  if (options.authEndpoint.kind !== 'auth') {
    throw new Error('A standalone session requires an auth endpoint.');
  }

  const fetchImpl = options.fetch ?? globalThis.fetch;
  const now = options.now ?? Date.now;
  const key = storageKey(databaseId);
  const listeners = new Set<() => void>();
  const stores: Record<ConsoleSessionPersistence, ConsoleSessionStorage | undefined> = {
    session: options.storage?.session ?? browserStorage('session'),
    local: options.storage?.local ?? browserStorage('local')
  };
  let credential: StoredCredential | null = null;
  let restoreAttempted = false;
  let snapshot: ConsoleSessionSnapshot = SERVER_CONSOLE_SESSION_SNAPSHOT;

  const emit = () => {
    for (const listener of listeners) listener();
  };

  const removePersistedCredentials = () => {
    for (const store of Object.values(stores)) {
      try {
        store?.removeItem(key);
      } catch {
        // Storage can be unavailable in privacy modes; memory remains canonical.
      }
    }
  };

  const setAnonymous = () => {
    credential = null;
    snapshot = {
      status: 'anonymous',
      identity: {
        kind: 'anonymous',
        tenantId: databaseId,
        cachePartition: createCachePartition()
      }
    };
    emit();
  };

  const setAuthenticated = (
    record: StoredCredential,
    persistence: ConsoleSessionPersistence
  ) => {
    credential = record;
    snapshot = {
      status: 'authenticated',
      identity: toIdentity(databaseId, record)
    };
    removePersistedCredentials();
    try {
      stores[persistence]?.setItem(key, JSON.stringify(record));
    } catch {
      // The authenticated in-memory session remains valid for this page.
    }
    emit();
  };

  const restorePersistedSession = () => {
    if (restoreAttempted) return;
    restoreAttempted = true;

    for (const persistence of ['session', 'local'] as const) {
      const store = stores[persistence];
      let raw: string | null = null;
      try {
        raw = store?.getItem(key) ?? null;
      } catch {
        raw = null;
      }
      const restored = parseStoredCredential(raw);
      if (!restored || isExpired(restored, now())) {
        if (raw !== null) {
          try {
            store?.removeItem(key);
          } catch {
            // An invalid record cannot authorize requests even if removal fails.
          }
        }
        continue;
      }
      credential = restored;
      snapshot = {
        status: 'authenticated',
        identity: toIdentity(databaseId, restored)
      };
      emit();
      return;
    }
    setAnonymous();
  };

  if (!options.deferRestore) restorePersistedSession();

  async function executeMutation(
    document: string,
    variables: Readonly<Record<string, unknown>>,
    token?: string
  ): Promise<GraphQLPayload> {
    let response: Response;
    try {
      response = await fetchImpl(options.authEndpoint.url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ query: document, variables })
      });
    } catch {
      throw new ConsoleSessionOperationError(
        'The authentication endpoint could not be reached.',
        'NETWORK_ERROR',
        true
      );
    }

    let payload: GraphQLPayload | null = null;
    try {
      const candidate: unknown = await response.json();
      if (isRecord(candidate)) payload = candidate;
    } catch {
      payload = null;
    }
    if (!response.ok) {
      throw new ConsoleSessionOperationError(
        `The authentication endpoint returned HTTP ${response.status}.`,
        'HTTP_ERROR',
        response.status >= 500
      );
    }
    const graphQLError = firstGraphQLError(payload?.errors);
    if (graphQLError) throw graphQLError;
    if (!payload) {
      throw new ConsoleSessionOperationError(
        'The authentication endpoint returned an invalid response.',
        'INVALID_RESPONSE'
      );
    }
    return payload;
  }

  async function authenticate(
    field: 'signIn' | 'signUp',
    credentials: ConsoleCredentials
  ): Promise<ConsoleAuthenticationOutcome> {
    restoreAttempted = true;
    removePersistedCredentials();
    credential = null;
    snapshot = { status: 'loading' };
    emit();

    try {
      const payload = await executeMutation(
        field === 'signIn' ? SIGN_IN_MUTATION : SIGN_UP_MUTATION,
        {
          input: {
            email: credentials.email.trim(),
            password: credentials.password,
            rememberMe: credentials.rememberMe === true
          }
        }
      );
      const result = mutationRecord(payload, field);
      if (field === 'signIn' && result?.mfaRequired === true) {
        const challengeToken = nonEmptyString(result.mfaChallengeToken);
        if (!challengeToken) {
          throw new ConsoleSessionOperationError(
            'Multi-factor authentication was required without a challenge token.',
            'INVALID_RESPONSE'
          );
        }
        setAnonymous();
        return { status: 'mfa-required', challengeToken };
      }

      const accessToken = nonEmptyString(result?.accessToken);
      const userId = nonEmptyString(result?.userId);
      if (!accessToken || !userId) {
        throw new ConsoleSessionOperationError(
          'The authentication operation did not return a usable session.',
          'INVALID_CREDENTIALS'
        );
      }
      const record: StoredCredential = {
        version: SESSION_RECORD_VERSION,
        accessToken,
        expiresAt: nonEmptyString(result?.accessTokenExpiresAt),
        userId,
        sessionId: nonEmptyString(result?.id),
        cachePartition: createCachePartition()
      };
      const persistence = credentials.rememberMe === true ? 'local' : 'session';
      setAuthenticated(record, persistence);
      return {
        status: 'authenticated',
        identity: toIdentity(databaseId, record)
      };
    } catch (error) {
      removePersistedCredentials();
      setAnonymous();
      throw error;
    }
  }

  const getAccessToken: DatabaseScopedStandaloneConsoleSession['getAccessToken'] = () => {
    if (!credential) return null;
    if (isExpired(credential, now())) {
      const identity = toIdentity(databaseId, credential);
      removePersistedCredentials();
      credential = null;
      snapshot = {
        status: 'error',
        error: {
          message: 'The session expired.',
          code: 'UNAUTHENTICATED'
        },
        identity
      };
      emit();
      return null;
    }
    return credential.accessToken;
  };

  return {
    mode: 'standalone',
    databaseId,
    getSnapshot: () => snapshot,
    getServerSnapshot: () => SERVER_CONSOLE_SESSION_SNAPSHOT,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getAccessToken,
    restorePersistedSession,
    async beginSignIn(input) {
      if (!input?.credentials) {
        throw new ConsoleSessionOperationError(
          'Email and password are required for standalone sign in.',
          'INVALID_CREDENTIALS'
        );
      }
      const outcome = await authenticate('signIn', input.credentials);
      if (outcome.status === 'mfa-required') {
        throw new ConsoleSessionOperationError(
          'Multi-factor authentication is required to complete sign in.',
          'MFA_REQUIRED'
        );
      }
    },
    async beginSignUp(credentials) {
      await authenticate('signUp', credentials);
    },
    signIn: (credentials) => authenticate('signIn', credentials),
    signUp: (credentials) => authenticate('signUp', credentials),
    async signOut() {
      restoreAttempted = true;
      const accessToken = credential?.accessToken;
      let failure: unknown = null;
      if (accessToken) {
        try {
          const payload = await executeMutation(
            SIGN_OUT_MUTATION,
            { input: {} },
            accessToken
          );
          if (!isRecord(payload.data) || !isRecord(payload.data.signOut)) {
            throw new ConsoleSessionOperationError(
              'The sign-out operation returned an invalid response.',
              'INVALID_RESPONSE'
            );
          }
        } catch (error) {
          failure = error;
        }
      }
      removePersistedCredentials();
      setAnonymous();
      if (failure) throw failure;
    },
    refresh() {
      void getAccessToken({ endpoint: options.authEndpoint });
    },
    handleAuthenticationFailure(failure) {
      restoreAttempted = true;
      if (!credential && snapshot.status !== 'authenticated') return;
      const identity = snapshot.status === 'authenticated'
        ? snapshot.identity
        : undefined;
      removePersistedCredentials();
      credential = null;
      snapshot = {
        status: 'error',
        error: {
          message: failure.message,
          code: failure.code
        },
        identity
      };
      emit();
    }
  };
}
