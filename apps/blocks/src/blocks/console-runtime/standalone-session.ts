import type { ConsoleEndpoint } from './endpoints';
import { SERVER_CONSOLE_SESSION_SNAPSHOT } from './session';
import type {
  AuthenticatedConsoleIdentity,
  ConsoleCredentials,
  ConsoleIdentity,
  ConsoleSessionSnapshot,
  StandaloneConsoleSession
} from './session';

const SESSION_RECORD_VERSION = 2;
const SESSION_STORAGE_PREFIX = 'constructive.console.session.v2';
const LEGACY_SESSION_STORAGE_PREFIX = 'constructive.console.session.v1';

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
  /** Identity captured by the request that observed the authentication error. */
  identity: ConsoleIdentity;
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

export type ConsoleAuthenticationOperation = 'signIn' | 'signUp';

export type ConsoleCsrfTokenRequest = Readonly<{
  databaseId: string;
  authEndpoint: ConsoleEndpoint;
  operation: ConsoleAuthenticationOperation;
}>;

/**
 * Host-owned bootstrap for tenants with require_csrf_for_auth enabled.
 *
 * The provider must create a fresh anonymous backend session and return its
 * exact csrf_secret. Constructive consumes that anonymous session after a
 * successful sign-in or sign-up, so providers must not cache tokens.
 */
export type ConsoleCsrfTokenProvider = (
  request: ConsoleCsrfTokenRequest
) => Promise<string | null | undefined>;

export type DatabaseScopedStandaloneSessionOptions = Readonly<{
  databaseId: string;
  authEndpoint: ConsoleEndpoint;
  csrfTokenProvider?: ConsoleCsrfTokenProvider;
  /** Resolves mutable host configuration without replacing the session. */
  resolveCsrfTokenProvider?: () => ConsoleCsrfTokenProvider | undefined;
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
  /** Retries server revocations retained after a local-first sign-out failure. */
  retryPendingSignOut?(): Promise<void>;
  /** Cancels in-flight work and prevents a detached kit from changing state. */
  dispose?(): void;
  /** React Strict Mode may replay an effect after disposing its first pass. */
  resume?(): void;
}

export class ConsoleMfaRequiredError extends Error {
  readonly code = 'MFA_REQUIRED' as const;
  readonly retryable = false;

  constructor() {
    super('Multi-factor authentication is required to complete sign in.');
    this.name = 'ConsoleMfaRequiredError';
  }
}

type StoredCredential = Readonly<{
  version: typeof SESSION_RECORD_VERSION;
  authEndpointId: string;
  authEndpointUrl: string;
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

function supersededAuthenticationError(): ConsoleSessionOperationError {
  return new ConsoleSessionOperationError(
    'A newer authentication operation replaced this one.',
    'AUTH_OPERATION_SUPERSEDED'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function normalizedEndpointUrl(endpoint: ConsoleEndpoint): string {
  const url = endpoint.url.trim();
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('A standalone session requires an absolute auth endpoint URL.');
  }
  if (
    (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
    parsed.username ||
    parsed.password ||
    parsed.hash
  ) {
    throw new Error('A standalone session requires an absolute HTTP(S) auth endpoint URL without credentials or a fragment.');
  }
  return parsed.toString();
}

function storageKey(databaseId: string): string {
  return `${SESSION_STORAGE_PREFIX}:${encodeURIComponent(databaseId)}`;
}

function legacyStorageKey(databaseId: string): string {
  return `${LEGACY_SESSION_STORAGE_PREFIX}:${encodeURIComponent(databaseId)}`;
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

function parseStoredCredential(
  value: string | null,
  endpoint: ConsoleEndpoint
): StoredCredential | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed) || parsed.version !== SESSION_RECORD_VERSION) return null;
    const accessToken = nonEmptyString(parsed.accessToken);
    const authEndpointId = nonEmptyString(parsed.authEndpointId);
    const authEndpointUrl = nonEmptyString(parsed.authEndpointUrl);
    const userId = nonEmptyString(parsed.userId);
    const cachePartition = nonEmptyString(parsed.cachePartition);
    const expiresAt = parsed.expiresAt === null
      ? null
      : nonEmptyString(parsed.expiresAt);
    const sessionId = parsed.sessionId === null
      ? null
      : nonEmptyString(parsed.sessionId);
    if (
      !accessToken ||
      !authEndpointId ||
      !authEndpointUrl ||
      authEndpointId !== endpoint.id ||
      authEndpointUrl !== normalizedEndpointUrl(endpoint) ||
      !userId ||
      !cachePartition
    ) return null;
    if (parsed.expiresAt !== null && !expiresAt) return null;
    if (parsed.sessionId !== null && !sessionId) return null;
    return {
      version: SESSION_RECORD_VERSION,
      authEndpointId,
      authEndpointUrl,
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

function identifiesAuthenticatedCredential(
  requestIdentity: ConsoleIdentity,
  currentIdentity: AuthenticatedConsoleIdentity
): boolean {
  return requestIdentity.kind === 'authenticated' &&
    requestIdentity.cachePartition === currentIdentity.cachePartition &&
    requestIdentity.subjectId === currentIdentity.subjectId &&
    requestIdentity.sessionId === currentIdentity.sessionId &&
    requestIdentity.tenantId === currentIdentity.tenantId;
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
  const serverMessage = nonEmptyString(first.message);
  const messageCode = serverMessage === 'CSRF_TOKEN_REQUIRED' ||
    serverMessage === 'INVALID_CSRF_TOKEN'
    ? serverMessage
    : null;
  const code = messageCode ?? nonEmptyString(extensions?.code) ?? 'GRAPHQL_ERROR';
  const message = code === 'CSRF_TOKEN_REQUIRED'
    ? 'This tenant requires an anonymous-session CSRF bootstrap before authentication. Configure csrfTokenProvider on the standalone Console Kit session.'
    : code === 'INVALID_CSRF_TOKEN'
      ? 'The authentication CSRF token was rejected. Request a fresh anonymous-session token and try again.'
      : serverMessage ?? 'The authentication operation failed.';
  return new ConsoleSessionOperationError(message, code);
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

  const authEndpoint: ConsoleEndpoint = {
    ...options.authEndpoint,
    url: normalizedEndpointUrl(options.authEndpoint)
  };

  const fetchImpl = options.fetch ?? globalThis.fetch;
  const now = options.now ?? Date.now;
  const key = storageKey(databaseId);
  const legacyKey = legacyStorageKey(databaseId);
  const listeners = new Set<() => void>();
  const stores: Record<ConsoleSessionPersistence, ConsoleSessionStorage | undefined> = {
    session: options.storage?.session ?? browserStorage('session'),
    local: options.storage?.local ?? browserStorage('local')
  };
  let credential: StoredCredential | null = null;
  let restoreAttempted = false;
  let snapshot: ConsoleSessionSnapshot = SERVER_CONSOLE_SESSION_SNAPSHOT;
  let authOperationGeneration = 0;
  let activeAuthController: AbortController | null = null;
  let disposed = false;
  const pendingRevocationTokens = new Set<string>();

  const resolveEffectiveCsrfTokenProvider = () =>
    options.resolveCsrfTokenProvider?.() ?? options.csrfTokenProvider;

  const emit = () => {
    for (const listener of listeners) listener();
  };

  const removePersistedCredentials = () => {
    for (const store of Object.values(stores)) {
      try {
        store?.removeItem(key);
        store?.removeItem(legacyKey);
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
    if (disposed || restoreAttempted) return;
    restoreAttempted = true;

    for (const persistence of ['session', 'local'] as const) {
      const store = stores[persistence];
      try {
        store?.removeItem(legacyKey);
      } catch {
        // Legacy database-only records are never trusted by this session.
      }
      let raw: string | null = null;
      try {
        raw = store?.getItem(key) ?? null;
      } catch {
        raw = null;
      }
      const restored = parseStoredCredential(raw, authEndpoint);
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
    token?: string,
    signal?: AbortSignal
  ): Promise<GraphQLPayload> {
    let response: Response;
    try {
      response = await fetchImpl(authEndpoint.url, {
        method: 'POST',
        credentials: 'omit',
        signal,
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
    if (disposed) {
      throw new ConsoleSessionOperationError(
        'This standalone session is no longer active.',
        'SESSION_DISPOSED'
      );
    }
    activeAuthController?.abort();
    const controller = new AbortController();
    activeAuthController = controller;
    const operationGeneration = ++authOperationGeneration;
    restoreAttempted = true;
    removePersistedCredentials();
    credential = null;
    snapshot = { status: 'loading' };
    emit();

    try {
      const csrfTokenProvider = resolveEffectiveCsrfTokenProvider();
      let csrfToken: string | null = null;
      if (csrfTokenProvider) {
        let providedToken: string | null | undefined;
        try {
          providedToken = await csrfTokenProvider({
            databaseId,
            authEndpoint,
            operation: field
          });
        } catch {
          if (operationGeneration !== authOperationGeneration) {
            throw supersededAuthenticationError();
          }
          throw new ConsoleSessionOperationError(
            'The anonymous-session CSRF bootstrap could not be completed.',
            'CSRF_BOOTSTRAP_FAILED',
            true
          );
        }
        if (operationGeneration !== authOperationGeneration) {
          throw supersededAuthenticationError();
        }
        if (
          resolveEffectiveCsrfTokenProvider() !== csrfTokenProvider
        ) {
          throw supersededAuthenticationError();
        }
        csrfToken = nonEmptyString(providedToken?.trim());
        if (!csrfToken) {
          throw new ConsoleSessionOperationError(
            'The CSRF token provider did not return a usable anonymous-session token.',
            'CSRF_TOKEN_UNAVAILABLE',
            true
          );
        }
      }
      const payload = await executeMutation(
        field === 'signIn' ? SIGN_IN_MUTATION : SIGN_UP_MUTATION,
        {
          input: {
            email: credentials.email.trim(),
            password: credentials.password,
            rememberMe: credentials.rememberMe === true,
            credentialKind: 'bearer',
            ...(csrfToken ? { csrfToken } : {})
          }
        },
        undefined,
        controller.signal
      );
      if (operationGeneration !== authOperationGeneration) {
        throw supersededAuthenticationError();
      }
      if (
        resolveEffectiveCsrfTokenProvider() !== csrfTokenProvider
      ) {
        throw supersededAuthenticationError();
      }
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
        authEndpointId: authEndpoint.id,
        authEndpointUrl: authEndpoint.url,
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
      if (operationGeneration !== authOperationGeneration) {
        throw supersededAuthenticationError();
      }
      removePersistedCredentials();
      setAnonymous();
      throw error;
    } finally {
      if (activeAuthController === controller) activeAuthController = null;
    }
  }

  const getAccessToken: DatabaseScopedStandaloneConsoleSession['getAccessToken'] = ({ identity }) => {
    if (disposed) {
      if (identity.kind === 'authenticated') {
        throw new ConsoleSessionOperationError(
          'The authenticated request scope has been disposed.',
          'SESSION_DISPOSED'
        );
      }
      return null;
    }
    if (!credential || snapshot.status !== 'authenticated') {
      if (identity.kind === 'authenticated') {
        throw new ConsoleSessionOperationError(
          'The request identity no longer owns an authenticated session.',
          'AUTH_IDENTITY_SUPERSEDED'
        );
      }
      return null;
    }
    if (!identifiesAuthenticatedCredential(identity, snapshot.identity)) {
      throw new ConsoleSessionOperationError(
        'The request identity no longer owns the current access token.',
        'AUTH_IDENTITY_SUPERSEDED'
      );
    }
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
      throw new ConsoleSessionOperationError(
        'The session expired.',
        'UNAUTHENTICATED'
      );
    }
    return credential.accessToken;
  };

  const retryPendingSignOut = async (): Promise<void> => {
    if (disposed) {
      throw new ConsoleSessionOperationError(
        'This standalone session is no longer active.',
        'SESSION_DISPOSED'
      );
    }
    let failure: unknown = null;
    for (const pendingToken of [...pendingRevocationTokens]) {
      try {
        const payload = await executeMutation(
          SIGN_OUT_MUTATION,
          { input: {} },
          pendingToken
        );
        if (!isRecord(payload.data) || !isRecord(payload.data.signOut)) {
          throw new ConsoleSessionOperationError(
            'The sign-out operation returned an invalid response.',
            'INVALID_RESPONSE'
          );
        }
        pendingRevocationTokens.delete(pendingToken);
      } catch (error) {
        failure ??= error;
      }
    }
    if (failure) throw failure;
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
        throw new ConsoleMfaRequiredError();
      }
    },
    async beginSignUp(credentials) {
      await authenticate('signUp', credentials);
    },
    signIn: (credentials) => authenticate('signIn', credentials),
    signUp: (credentials) => authenticate('signUp', credentials),
    async signOut() {
      if (disposed) {
        throw new ConsoleSessionOperationError(
          'This standalone session is no longer active.',
          'SESSION_DISPOSED'
        );
      }
      authOperationGeneration += 1;
      activeAuthController?.abort();
      activeAuthController = null;
      restoreAttempted = true;
      const accessToken = credential?.accessToken;
      if (accessToken) pendingRevocationTokens.add(accessToken);
      removePersistedCredentials();
      setAnonymous();
      await retryPendingSignOut();
    },
    retryPendingSignOut,
    refresh() {
      if (snapshot.status !== 'authenticated') return;
      void getAccessToken({ endpoint: authEndpoint, identity: snapshot.identity });
    },
    handleAuthenticationFailure(failure) {
      if (disposed) return;
      restoreAttempted = true;
      if (
        !credential ||
        snapshot.status !== 'authenticated' ||
        !identifiesAuthenticatedCredential(failure.identity, snapshot.identity)
      ) return;
      authOperationGeneration += 1;
      const identity = snapshot.identity;
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
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      authOperationGeneration += 1;
      activeAuthController?.abort();
      activeAuthController = null;
      listeners.clear();
    },
    resume() {
      disposed = false;
    }
  };
}
