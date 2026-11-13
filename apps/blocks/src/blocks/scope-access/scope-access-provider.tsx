'use client';

import * as React from 'react';

import type { ScopeRuntime } from './scope-access-load';
import { createScopeRuntime, type ScopeHost } from './scope-runtime';

const ScopeRuntimeContext = React.createContext<ScopeRuntime | null>(null);

/**
 * Gives the scope blocks under it the app's endpoints and session. The
 * runtime changes only when an endpoint or the signed-in user does; the token
 * is read through the latest `getAccessToken` at each request.
 */
export function ScopeAccessProvider({
  host,
  children
}: Readonly<{ host: ScopeHost; children: React.ReactNode }>) {
  const tokenRef = React.useRef(host.getAccessToken);
  tokenRef.current = host.getAccessToken;
  const { admin, auth, data, storage } = host.endpoints;
  const runtime = React.useMemo(
    () => createScopeRuntime({
      endpoints: { admin, auth, data, storage },
      userId: host.userId,
      getAccessToken: () => tokenRef.current(),
      ...(host.fetch ? { fetch: host.fetch } : {})
    }),
    [admin, auth, data, storage, host.userId, host.fetch]
  );
  return <ScopeRuntimeContext.Provider value={runtime}>{children}</ScopeRuntimeContext.Provider>;
}

export function useScopeRuntime(): ScopeRuntime {
  const runtime = React.useContext(ScopeRuntimeContext);
  if (!runtime) throw new Error('Scope blocks need a ScopeAccessProvider above them.');
  return runtime;
}
