import type { ConsoleEndpoint } from './endpoints';

export type ConsoleRuntimeError = {
  message: string;
  code?: string;
  retryable?: boolean;
  cause?: unknown;
};

type ConsoleIdentityBase = {
  /**
   * An opaque, non-secret partition chosen by the session owner. Rotate it
   * whenever cached data must no longer be visible to the next identity.
   */
  cachePartition: string;
  tenantId?: string;
  organizationId?: string;
};

export type AnonymousConsoleIdentity = ConsoleIdentityBase & {
  kind: 'anonymous';
};

export type AuthenticatedConsoleIdentity = ConsoleIdentityBase & {
  kind: 'authenticated';
  subjectId: string;
  /** Opaque, non-secret session partition. Never pass a bearer token here. */
  sessionId?: string;
};

export type ConsoleIdentity =
  | AnonymousConsoleIdentity
  | AuthenticatedConsoleIdentity;

export type ConsoleSessionSnapshot =
  | { status: 'loading' }
  | { status: 'anonymous'; identity: AnonymousConsoleIdentity }
  | {
      status: 'authenticated';
      identity: AuthenticatedConsoleIdentity;
    }
  | {
      status: 'error';
      error: ConsoleRuntimeError;
      /** Retained for diagnostics and account display; never authorizes requests. */
      identity?: ConsoleIdentity;
    };

export type ConsoleAccessTokenRequest = {
  endpoint: ConsoleEndpoint;
  signal?: AbortSignal;
};

export type GetConsoleAccessToken = (
  request: ConsoleAccessTokenRequest
) =>
  | string
  | null
  | undefined
  | Promise<string | null | undefined>;

export interface ConsoleSessionBase {
  getSnapshot(): ConsoleSessionSnapshot;
  subscribe(listener: () => void): () => void;
  /** Called for every request so token refresh never leaves a stale capture. */
  getAccessToken: GetConsoleAccessToken;
}

/** The host application owns login, logout, routing, and identity changes. */
export interface EmbeddedConsoleSession extends ConsoleSessionBase {
  mode: 'embedded';
}

/** A standalone console may initiate its own authentication lifecycle. */
export interface StandaloneConsoleSession extends ConsoleSessionBase {
  mode: 'standalone';
  beginSignIn(input?: {
    returnTo?: string;
    credentials?: ConsoleCredentials;
  }): void | Promise<void>;
  beginSignUp?(credentials: ConsoleCredentials): void | Promise<void>;
  signOut(): void | Promise<void>;
  refresh?(): void | Promise<void>;
}

export type ConsoleSession =
  | EmbeddedConsoleSession
  | StandaloneConsoleSession;

export function getConsoleSessionIdentity(
  snapshot: ConsoleSessionSnapshot
): ConsoleIdentity | null {
  if (snapshot.status === 'anonymous') return snapshot.identity;
  if (snapshot.status === 'authenticated') return snapshot.identity;
  return null;
}

export type ConsoleCredentials = Readonly<{
  email: string;
  password: string;
  /** Persists across browser restarts when true; defaults to session storage. */
  rememberMe?: boolean;
}>;
