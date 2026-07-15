import { Suspense, useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import type { GraphQLAdapter, OrmClientConfig } from '@/generated/auth';

// Capture each namespace's generated configure() so we can assert the runtime
// wires it (and inspect the adapter it builds). vi.hoisted keeps the fns
// available to the hoisted vi.mock factories.
const { configureAuth, configureAdmin } = vi.hoisted(() => ({
  configureAuth: vi.fn(),
  configureAdmin: vi.fn()
}));
vi.mock('@/generated/auth', () => ({ configure: configureAuth }));
vi.mock('@/generated/admin', () => ({ configure: configureAdmin }));

const AUTH_ENDPOINT = 'http://auth.test/graphql';
const NEXT_AUTH_ENDPOINT = 'http://auth-next.test/graphql';

beforeEach(() => {
  vi.resetModules();
  configureAuth.mockClear();
  configureAdmin.mockClear();
  process.env.NEXT_PUBLIC_AUTH_GRAPHQL_ENDPOINT = AUTH_ENDPOINT;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// Re-import after resetModules so the module-level ENDPOINTS map re-reads env.
async function loadRuntime() {
  return import('./blocks-runtime');
}

function adapterFromLastConfigure(mock: typeof configureAuth): GraphQLAdapter {
  const config = mock.mock.calls.at(-1)?.[0] as OrmClientConfig;
  if (!config?.adapter) throw new Error('configure() was not called with an adapter');
  return config.adapter;
}

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, statusText: 'OK', json: async () => body };
}

describe('BlocksRuntime wiring', () => {
  // First loadRuntime() call pays the full dynamic-import cost of the runtime and
  // can exceed the 5s default on a loaded machine (flaky under parallel CI/local runs).
  it('configures only the named namespaces, pointing at the env endpoint', { timeout: 15000 }, async () => {
    const { BlocksRuntime } = await loadRuntime();
    render(
      <BlocksRuntime namespaces={['auth']} getToken={() => 'tok'}>
        <span>child</span>
      </BlocksRuntime>
    );

    await screen.findByText('child');
    expect(configureAuth).toHaveBeenCalledTimes(1);
    expect(configureAdmin).not.toHaveBeenCalled();
    expect(adapterFromLastConfigure(configureAuth).getEndpoint?.()).toBe(AUTH_ENDPOINT);
  });

  it('renders children', async () => {
    const { BlocksRuntime } = await loadRuntime();
    render(
      <BlocksRuntime namespaces={['auth']} getToken={() => 'tok'}>
        <span>hello-blocks</span>
      </BlocksRuntime>
    );
    expect(await screen.findByText('hello-blocks')).toBeInTheDocument();
  });

  it('does not configure an abandoned suspended render', async () => {
    const { BlocksRuntime } = await loadRuntime();
    const never = new Promise<never>(() => undefined);

    function SuspendForever(): never {
      throw never;
    }

    render(
      <Suspense fallback={<span>suspended-fallback</span>}>
        <BlocksRuntime namespaces={['auth']} getToken={() => 'tok'}>
          <span>runtime-child</span>
        </BlocksRuntime>
        <SuspendForever />
      </Suspense>
    );

    expect(await screen.findByText('suspended-fallback')).toBeInTheDocument();
    expect(configureAuth).not.toHaveBeenCalled();
  });

  it('reconfigures for endpoint changes but not equivalent endpoint inputs', async () => {
    const { BlocksRuntime } = await loadRuntime();
    const getToken = () => 'tok';
    const view = render(
      <BlocksRuntime namespaces={['auth']} endpoints={{ auth: AUTH_ENDPOINT }} getToken={getToken}>
        <span>endpoint-child</span>
      </BlocksRuntime>
    );

    await screen.findByText('endpoint-child');
    expect(configureAuth).toHaveBeenCalledTimes(1);

    view.rerender(
      <BlocksRuntime namespaces={['auth']} endpoints={{ auth: AUTH_ENDPOINT }} getToken={getToken}>
        <span>endpoint-child</span>
      </BlocksRuntime>
    );
    expect(configureAuth).toHaveBeenCalledTimes(1);

    view.rerender(
      <BlocksRuntime namespaces={['auth']} endpoints={{ auth: NEXT_AUTH_ENDPOINT }} getToken={getToken}>
        <span>endpoint-child</span>
      </BlocksRuntime>
    );

    await waitFor(() => expect(configureAuth).toHaveBeenCalledTimes(2));
    expect(adapterFromLastConfigure(configureAuth).getEndpoint?.()).toBe(NEXT_AUTH_ENDPOINT);
    expect(screen.getByText('endpoint-child')).toBeInTheDocument();
  });

  it('withholds children when a required endpoint is no longer configured', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { BlocksRuntime } = await loadRuntime();
    const getToken = () => 'tok';
    const view = render(
      <BlocksRuntime namespaces={['auth']} endpoints={{ auth: AUTH_ENDPOINT }} getToken={getToken}>
        <span>guarded-child</span>
      </BlocksRuntime>
    );

    await screen.findByText('guarded-child');
    expect(configureAuth).toHaveBeenCalledTimes(1);

    view.rerender(
      <BlocksRuntime namespaces={['auth']} endpoints={{ auth: '' }} getToken={getToken}>
        <span>guarded-child</span>
      </BlocksRuntime>
    );

    await waitFor(() => expect(screen.queryByText('guarded-child')).not.toBeInTheDocument());
    expect(configureAuth).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('No endpoint for "auth"'));
  });

  it('reconfigures when the token callback identity changes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: {} }));
    vi.stubGlobal('fetch', fetchMock);
    const { BlocksRuntime } = await loadRuntime();
    const firstGetToken = () => 'first-token';
    const secondGetToken = () => 'second-token';
    const view = render(
      <BlocksRuntime namespaces={['auth']} getToken={firstGetToken}>
        <span>token-child</span>
      </BlocksRuntime>
    );

    await screen.findByText('token-child');
    const firstAdapter = adapterFromLastConfigure(configureAuth);
    await firstAdapter.execute('query { me }');

    view.rerender(
      <BlocksRuntime namespaces={['auth']} getToken={secondGetToken}>
        <span>token-child</span>
      </BlocksRuntime>
    );

    await waitFor(() => expect(configureAuth).toHaveBeenCalledTimes(2));
    const secondAdapter = adapterFromLastConfigure(configureAuth);
    await secondAdapter.execute('query { me }');

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer first-token');
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer second-token');
  });

  it('withholds request-making children until the matching endpoint is committed', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: {} }));
    vi.stubGlobal('fetch', fetchMock);
    const { BlocksRuntime } = await loadRuntime();
    const getToken = () => 'tok';

    function RequestOnMount({ requestName }: { requestName: string }) {
      useEffect(() => {
        void adapterFromLastConfigure(configureAuth).execute(`query ${requestName} { me }`);
      }, [requestName]);
      return <span>{requestName}</span>;
    }

    const view = render(
      <BlocksRuntime namespaces={['auth']} endpoints={{ auth: AUTH_ENDPOINT }} getToken={getToken}>
        <RequestOnMount requestName='first-request' />
      </BlocksRuntime>
    );

    await screen.findByText('first-request');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    view.rerender(
      <BlocksRuntime namespaces={['auth']} endpoints={{ auth: NEXT_AUTH_ENDPOINT }} getToken={getToken}>
        <RequestOnMount requestName='second-request' />
      </BlocksRuntime>
    );

    await screen.findByText('second-request');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([AUTH_ENDPOINT, NEXT_AUTH_ENDPOINT]);
  });
});

describe('BearerFetchAdapter (via configure)', () => {
  async function mountAndGetAdapter(getToken: () => string | null) {
    const { BlocksRuntime } = await loadRuntime();
    render(
      <BlocksRuntime namespaces={['auth']} getToken={getToken}>
        <span>child</span>
      </BlocksRuntime>
    );
    return adapterFromLastConfigure(configureAuth);
  }

  it('POSTs the operation with a Bearer header and unwraps data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { signIn: { token: 'jwt' } } }));
    vi.stubGlobal('fetch', fetchMock);

    const adapter = await mountAndGetAdapter(() => 'tok-123');
    const result = await adapter.execute('mutation SignIn { signIn { token } }', { email: 'a@b.co' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(AUTH_ENDPOINT);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer tok-123');
    const body = JSON.parse(init.body);
    expect(body.query).toContain('signIn');
    expect(body.variables).toEqual({ email: 'a@b.co' });
    expect(result).toEqual({ ok: true, data: { signIn: { token: 'jwt' } }, errors: undefined });
  });

  it('reads the token fresh on every request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: {} }));
    vi.stubGlobal('fetch', fetchMock);

    let token = 'first';
    const adapter = await mountAndGetAdapter(() => token);

    await adapter.execute('query { me }');
    token = 'second';
    await adapter.execute('query { me }');

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer first');
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer second');
  });

  it('omits Authorization when there is no token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: {} }));
    vi.stubGlobal('fetch', fetchMock);

    const adapter = await mountAndGetAdapter(() => null);
    await adapter.execute('query { me }');

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('surfaces GraphQL errors as an ok:false result', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ errors: [{ message: 'boom' }] }));
    vi.stubGlobal('fetch', fetchMock);

    const adapter = await mountAndGetAdapter(() => 'tok');
    const result = await adapter.execute('query { me }');

    expect(result).toEqual({ ok: false, data: null, errors: [{ message: 'boom' }] });
  });

  it('maps a non-OK HTTP response to an ok:false result', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503, statusText: 'Service Unavailable' });
    vi.stubGlobal('fetch', fetchMock);

    const adapter = await mountAndGetAdapter(() => 'tok');
    const result = await adapter.execute('query { me }');

    expect(result.ok).toBe(false);
    expect(result.errors?.[0].message).toContain('503');
  });
});
