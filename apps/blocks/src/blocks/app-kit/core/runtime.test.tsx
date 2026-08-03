import * as React from 'react';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import {
  APP_RESULT_DISCRIMINATOR,
  appFailure,
  appSuccess,
  defineAction,
  defineQuery,
  isAppResult,
  type AppScope
} from './contracts';
import {
  AppKitProvider,
  createAppQueryKey,
  createAppQueryRootKey,
  useAppAction,
  useAppQuery
} from './runtime';
import {
  createAppQueryInputFingerprint,
  findAppCredentialInputPath
} from './scope';

const scope: AppScope = {
  databaseId: 'db-a',
  endpointId: 'graphql-a',
  organizationId: 'org-a',
  schemaRevision: 'schema-a',
  securityRevision: 'security-a',
  sessionPartition: 'session-a'
};

function createClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false }
    }
  });
}

function wrapper(queryClient = createClient(), appScope = scope) {
  return ({ children }: Readonly<{ children: React.ReactNode }>) => (
    <AppKitProvider queryClient={queryClient} scope={appScope}>
      {children}
    </AppKitProvider>
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject, resolve };
}

describe('AppResult transport boundaries', () => {
  it('recognizes helper results after structured clone and JSON round trips', () => {
    const success = appSuccess({ id: 'record-1' });
    const failure = appFailure({
      code: 'FORBIDDEN',
      kind: 'authorization',
      message: 'Denied.'
    });

    const roundTrips = [
      structuredClone(success),
      JSON.parse(JSON.stringify(success)) as unknown,
      structuredClone(failure),
      JSON.parse(JSON.stringify(failure)) as unknown
    ];
    expect(roundTrips.every((result) => isAppResult(result))).toBe(true);
  });

  it('keeps unversioned and wrong-version lookalikes as ordinary records', () => {
    const ordinary = { data: { id: 'record-1' }, ok: true as const };
    const wrongVersion = {
      __constructiveAppKitResult: {
        kind: APP_RESULT_DISCRIMINATOR,
        version: 2
      },
      data: { id: 'record-2' },
      ok: true as const
    };

    expect(isAppResult(ordinary)).toBe(false);
    expect(isAppResult(wrongVersion)).toBe(false);
  });
});

describe('useAppQuery', () => {
  it('keeps the canonical query-input fingerprint stable', () => {
    expect(createAppQueryInputFingerprint(undefined)).toBe(
      '660b96a3639b8562f6c34e81b90d7ac6b6fde3df6cc3374d63e9bf03b110b00c'
    );
    expect(createAppQueryInputFingerprint('abc')).toBe(
      '7f31e07e6f698baf333bc71b2d9637187996447d51e260566c373788381a9340'
    );
    expect(createAppQueryInputFingerprint('Hồ Chí Minh')).toBe(
      'd2de482d75e1304fb488e476bc3f068db77d16da6f619d3917c6842e0b18691a'
    );
    expect(createAppQueryInputFingerprint('a'.repeat(100))).toBe(
      '7f888f7324cc8601671ced1dd7f5b8b0a019546bf58c73173b7d4daa77e62e4e'
    );
  });

  it('keeps complete and credential-shaped input values out of cache keys', () => {
    const first = createAppQueryKey(scope, 'records.secure', {
      authorization: 'Bearer first-secret',
      filter: { status: 'open' },
      nested: { password: 'first-password' }
    });
    const rotated = createAppQueryKey(scope, 'records.secure', {
      authorization: 'Bearer rotated-secret',
      filter: { status: 'open' },
      nested: { password: 'rotated-password' }
    });
    const differentFilter = createAppQueryKey(scope, 'records.secure', {
      authorization: 'Bearer first-secret',
      filter: { status: 'closed' },
      nested: { password: 'first-password' }
    });

    expect(first).toEqual(rotated);
    expect(first).not.toEqual(differentFilter);
    expect(JSON.stringify(first)).not.toMatch(
      /first-secret|first-password|authorization|status|open/u
    );
  });

  it('rejects sparse arrays and hidden or symbolic query-input properties', () => {
    const sparse = Array<string>(1);
    const hidden = Object.defineProperty({}, 'hidden', {
      enumerable: false,
      value: 'value'
    });
    const symbolic = { visible: 'value' } as Record<PropertyKey, unknown>;
    symbolic[Symbol('hidden')] = 'value';
    const decoratedArray = ['value'] as string[] & { label?: string };
    decoratedArray.label = 'extra';

    expect(() => createAppQueryInputFingerprint(sparse)).toThrow(/sparse/u);
    expect(() => createAppQueryInputFingerprint(hidden)).toThrow(
      /non-enumerable/u
    );
    expect(() => createAppQueryInputFingerprint(symbolic)).toThrow(/symbol/u);
    expect(() => createAppQueryInputFingerprint(decoratedArray)).toThrow(
      /dense indexed entries/u
    );
    expect(createAppQueryInputFingerprint([])).not.toBe(
      createAppQueryInputFingerprint([undefined])
    );
  });

  it('recognizes common transport credential field spellings', () => {
    expect(
      findAppCredentialInputPath({ headers: { 'x-api-key': 'secret' } })
    ).toBe('headers.x-api-key');
    expect(findAppCredentialInputPath({ csrf_token: 'secret' })).toBe(
      'csrf_token'
    );
    expect(findAppCredentialInputPath({ private_key: 'secret' })).toBe(
      'private_key'
    );
  });

  it('does not reuse cached data across database or session partitions', async () => {
    const queryClient = createClient();
    const execute = vi.fn(({ scope: currentScope }: { scope: AppScope }) =>
      currentScope.databaseId
    );
    const query = defineQuery<Readonly<{ id: string }>, string>({
      id: 'records.detail',
      execute
    });

    const first = renderHook(() => useAppQuery(query, { id: 'same' }), {
      wrapper: wrapper(queryClient, scope)
    });
    await waitFor(() => expect(first.result.current.data).toBe('db-a'));
    first.unmount();

    const secondScope = {
      ...scope,
      databaseId: 'db-b',
      sessionPartition: 'session-b'
    };
    const second = renderHook(() => useAppQuery(query, { id: 'same' }), {
      wrapper: wrapper(queryClient, secondScope)
    });
    await waitFor(() => expect(second.result.current.data).toBe('db-b'));

    expect(execute).toHaveBeenCalledTimes(2);
    expect(
      queryClient.getQueryData(createAppQueryKey(scope, query.id, { id: 'same' }))
    ).toBe('db-a');
    expect(
      queryClient.getQueryData(
        createAppQueryKey(secondScope, query.id, { id: 'same' })
      )
    ).toBe('db-b');
  });

  it('aborts stale work when AppScope changes', async () => {
    const queryClient = createClient();
    const aborted = vi.fn();
    const query = defineQuery<void, string>({
      id: 'records.slow',
      execute: ({ scope: currentScope, signal }) => {
        if (currentScope.databaseId === 'db-b') return 'db-b';
        return new Promise<string>((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            aborted();
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      }
    });

    function Probe() {
      const result = useAppQuery(query, undefined);
      return <span>{result.data ?? 'loading'}</span>;
    }
    const view = render(
      <AppKitProvider queryClient={queryClient} scope={scope}>
        <Probe />
      </AppKitProvider>
    );
    view.rerender(
      <AppKitProvider
        queryClient={queryClient}
        scope={{ ...scope, databaseId: 'db-b' }}
      >
        <Probe />
      </AppKitProvider>
    );

    await waitFor(() => expect(screen.getByText('db-b')).toBeInTheDocument());
    expect(aborted).toHaveBeenCalledTimes(1);
  });

  it('rejects credential-shaped inputs before the query executor runs', async () => {
    const execute = vi.fn(() => 'should-not-run');
    const query = defineQuery<Readonly<{ headers: { authorization: string } }>, string>({
      id: 'records.credential-input',
      execute
    });
    const hook = renderHook(
      () =>
        useAppQuery(query, {
          headers: { authorization: 'Bearer secret-query-token' }
        }),
      { wrapper: wrapper() }
    );

    await waitFor(() => expect(hook.result.current.isError).toBe(true));
    expect(hook.result.current.error?.appError).toMatchObject({
      code: 'CREDENTIAL_IN_INPUT',
      fieldErrors: [{ field: 'headers.authorization' }],
      kind: 'validation'
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it('does not unwrap ordinary records that happen to use ok and data fields', async () => {
    const record = {
      data: { id: 'record-1' },
      ok: true as const
    };
    const query = defineQuery<void, typeof record>({
      id: 'records.result-shaped',
      execute: () => record
    });
    const hook = renderHook(() => useAppQuery(query, undefined), {
      wrapper: wrapper()
    });

    await waitFor(() => expect(hook.result.current.data).toBe(record));
  });
});

describe('useAppAction', () => {
  it('keeps a successful result when its host observer throws', async () => {
    const onResult = vi.fn(() => {
      throw new Error('Host result observer failed.');
    });
    const action = defineAction<void, string>({
      id: 'records.throwing-success-observer',
      execute: () => 'saved'
    });
    const hook = renderHook(() => useAppAction(action, { onResult }), {
      wrapper: wrapper()
    });

    const result = await act(() => hook.result.current.execute(undefined));

    expect(result).toMatchObject({ data: 'saved', ok: true });
    expect(onResult).toHaveBeenCalledOnce();
    expect(onResult).toHaveBeenCalledWith(result, undefined);
    await waitFor(() =>
      expect(hook.result.current.mutation.status).toBe('success')
    );
  });

  it('keeps a preflight failure when its host observer throws', async () => {
    const onResult = vi.fn(() => {
      throw new Error('Host result observer failed.');
    });
    const execute = vi.fn(() => 'should-not-run');
    const action = defineAction<Readonly<{ accessToken: string }>, string>({
      id: 'records.throwing-preflight-observer',
      execute
    });
    const hook = renderHook(() => useAppAction(action, { onResult }), {
      wrapper: wrapper()
    });

    const result = await act(() =>
      hook.result.current.execute({ accessToken: 'secret-action-token' })
    );

    expect(result).toMatchObject({
      error: { code: 'CREDENTIAL_IN_INPUT', kind: 'validation' },
      ok: false
    });
    expect(onResult).toHaveBeenCalledOnce();
    expect(onResult).toHaveBeenCalledWith(result, {
      accessToken: 'secret-action-token'
    });
    expect(execute).not.toHaveBeenCalled();
    expect(hook.result.current.mutation.status).toBe('idle');
  });

  it('rejects credential-shaped inputs before TanStack creates a mutation', async () => {
    const queryClient = createClient();
    const execute = vi.fn(() => 'should-not-run');
    const action = defineAction<
      Readonly<{ recordId: string; accessToken: string }>,
      string
    >({
      id: 'records.credential-input',
      execute
    });
    const hook = renderHook(() => useAppAction(action), {
      wrapper: wrapper(queryClient)
    });

    const result = await act(() =>
      hook.result.current.execute({
        accessToken: 'secret-action-token',
        recordId: 'record-1'
      })
    );

    expect(result).toMatchObject({
      error: {
        code: 'CREDENTIAL_IN_INPUT',
        fieldErrors: [{ field: 'accessToken' }],
        kind: 'validation'
      },
      ok: false
    });
    expect(execute).not.toHaveBeenCalled();
    expect(queryClient.getMutationCache().getAll()).toHaveLength(0);
  });

  it('fails closed on containers and hidden properties the credential scanner cannot inspect', async () => {
    class CredentialContainer {
      authorization = 'Bearer class-secret';
    }
    const formData = new FormData();
    formData.set('authorization', 'Bearer form-secret');
    const hidden = Object.defineProperty({}, 'authorization', {
      enumerable: false,
      value: 'Bearer hidden-secret'
    });
    const symbolic = {} as Record<PropertyKey, unknown>;
    symbolic[Symbol('authorization')] = 'Bearer symbol-secret';
    const inputs: readonly unknown[] = [
      formData,
      new Map([['authorization', 'Bearer map-secret']]),
      new CredentialContainer(),
      hidden,
      symbolic
    ];
    const queryClient = createClient();
    const execute = vi.fn(() => 'should-not-run');
    const action = defineAction<unknown, string>({
      id: 'records.unsupported-credential-container',
      execute
    });
    const hook = renderHook(() => useAppAction(action), {
      wrapper: wrapper(queryClient)
    });

    for (const input of inputs) {
      expect(await act(() => hook.result.current.execute(input))).toMatchObject({
        error: { code: 'UNSUPPORTED_INPUT', kind: 'validation' },
        ok: false
      });
    }
    expect(execute).not.toHaveBeenCalled();
    expect(queryClient.getMutationCache().getAll()).toHaveLength(0);
  });

  it('rejects credentials introduced by action input parsing', async () => {
    const queryClient = createClient();
    const execute = vi.fn(() => 'should-not-run');
    const action = defineAction<Readonly<{ recordId: string }>, string>({
      id: 'records.transformed-credential-input',
      execute,
      inputSchema: {
        safeParse: () => ({
          data: {
            authorization: 'Bearer transformed-secret',
            recordId: 'record-1'
          } as unknown as Readonly<{ recordId: string }>,
          success: true
        })
      }
    });
    const hook = renderHook(() => useAppAction(action), {
      wrapper: wrapper(queryClient)
    });

    expect(
      await act(() => hook.result.current.execute({ recordId: 'record-1' }))
    ).toMatchObject({
      error: {
        code: 'CREDENTIAL_IN_INPUT',
        fieldErrors: [{ field: 'authorization' }],
        kind: 'validation'
      },
      ok: false
    });
    expect(execute).not.toHaveBeenCalled();
    expect(queryClient.getMutationCache().getAll()).toHaveLength(0);
  });

  it('keeps full action inputs out of TanStack mutation variables and context', async () => {
    const queryClient = createClient();
    const action = defineAction<Readonly<{ note: string; recordId: string }>, string>({
      id: 'records.cache-safe-input',
      execute: ({ input }) => input.recordId
    });
    const hook = renderHook(() => useAppAction(action), {
      wrapper: wrapper(queryClient)
    });

    expect(
      await act(() =>
        hook.result.current.execute({
          note: 'private-domain-value',
          recordId: 'record-1'
        })
      )
    ).toMatchObject({ data: 'record-1', ok: true });

    const mutationState = queryClient.getMutationCache().getAll()[0]?.state;
    expect(mutationState?.variables).toEqual({ executionId: 1 });
    expect(
      JSON.stringify({
        context: mutationState?.context,
        variables: mutationState?.variables
      })
    ).not.toMatch(
      /private-domain-value|record-1|note|recordId/u
    );
  });

  it('treats an ordinary error-shaped record as successful action data', async () => {
    const record = {
      error: { kind: 'domain', message: 'This is record data.' },
      ok: false as const
    };
    const action = defineAction<void, typeof record>({
      id: 'records.error-shaped',
      execute: () => record
    });
    const hook = renderHook(() => useAppAction(action), { wrapper: wrapper() });

    expect(await act(() => hook.result.current.execute(undefined))).toMatchObject({
      data: record,
      ok: true
    });
  });

  it('evaluates typed presentation policy with input, scope, and host context', () => {
    const action = defineAction<
      { ownerId: string },
      string,
      unknown,
      { recordId: string }
    >({
      id: 'sessions.contextual-action',
      execute: () => 'done',
      presentation: {
        disabledReason: ({ context, input, scope: currentScope }) =>
          input.ownerId === currentScope.sessionPartition && context?.recordId
            ? undefined
            : 'Only the owner can run this action.',
        label: 'Run action',
        visible: ({ context }) => context?.recordId !== 'archived'
      }
    });
    const hook = renderHook(
      () =>
        useAppAction(action, {
          presentationContext: { recordId: 'session-1' },
          presentationInput: { ownerId: scope.sessionPartition }
        }),
      { wrapper: wrapper() }
    );

    expect(hook.result.current.visible).toBe(true);
    expect(hook.result.current.disabledReason).toBeUndefined();
    expect(
      hook.result.current.evaluatePresentation(
        { ownerId: 'another-session' },
        { recordId: 'session-1' }
      )
    ).toEqual({
      disabledReason: 'Only the owner can run this action.',
      visible: true
    });
  });

  it('validates input before execution', async () => {
    const execute = vi.fn(() => 'saved');
    const action = defineAction<{ title: string }, string>({
      id: 'programs.save',
      inputSchema: {
        safeParse: () => ({
          error: {
            issues: [{ message: 'Title is required.', path: ['title'] }],
            message: 'Invalid program.'
          },
          success: false
        })
      },
      execute
    });
    const hook = renderHook(() => useAppAction(action), { wrapper: wrapper() });

    const result = await act(() => hook.result.current.execute({ title: '' }));
    expect(result).toMatchObject({
      error: {
        fieldErrors: [{ field: 'title', message: 'Title is required.' }],
        kind: 'validation'
      },
      ok: false
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it('blocks double submission by default', async () => {
    const pending = deferred<string>();
    const action = defineAction<number, string>({
      id: 'sessions.publish',
      execute: () => pending.promise
    });
    const hook = renderHook(() => useAppAction(action), { wrapper: wrapper() });

    let first!: Promise<unknown>;
    let second!: Awaited<ReturnType<typeof hook.result.current.execute>>;
    await act(async () => {
      first = hook.result.current.execute(1);
      second = await hook.result.current.execute(2);
    });
    expect(second).toMatchObject({
      error: { code: 'ACTION_IN_PROGRESS', kind: 'conflict' },
      ok: false
    });

    await act(async () => {
      pending.resolve('published');
      await first;
    });
  });

  it('never inherits host mutation retries for non-idempotent actions', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: 1 },
        queries: { retry: false }
      }
    });
    const execute = vi.fn(() => {
      throw new Error('Network failed after submission.');
    });
    const action = defineAction<void, string>({
      id: 'sessions.non-idempotent',
      execute
    });
    const hook = renderHook(() => useAppAction(action), {
      wrapper: wrapper(queryClient)
    });

    expect(await act(() => hook.result.current.execute(undefined))).toMatchObject({
      error: { message: 'Network failed after submission.' },
      ok: false
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('normalizes cancellation before TanStack callbacks observe the error', async () => {
    const action = defineAction<void, string>({
      id: 'sessions.cancelable',
      execute: ({ signal }) =>
        new Promise<string>((_resolve, reject) => {
          signal.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError'))
          );
        })
    });
    const hook = renderHook(() => useAppAction(action), { wrapper: wrapper() });

    let execution!: Promise<Awaited<ReturnType<typeof hook.result.current.execute>>>;
    await act(async () => {
      execution = hook.result.current.execute(undefined);
      await Promise.resolve();
      hook.result.current.cancel();
    });
    const result = await act(() => execution);
    expect(result).toMatchObject({
      error: { code: 'CANCELLED', kind: 'cancelled' },
      ok: false
    });
    await waitFor(() =>
      expect(hook.result.current.mutation.error?.appError.kind).toBe('cancelled')
    );
  });

  it('preserves GraphQL partial-error and authorization details', async () => {
    const graphqlAction = defineAction<void, string>({
      id: 'sessions.partial',
      execute: () =>
        appFailure({
          code: 'PARTIAL_GRAPHQL_RESULT',
          details: { paths: ['session.venue'] },
          kind: 'graphql',
          message: 'Some requested fields failed.'
        })
    });
    const deniedAction = defineAction<void, string>({
      id: 'sessions.denied',
      execute: () =>
        appFailure({
          code: 'FORBIDDEN',
          kind: 'authorization',
          message: 'Publishing is not allowed.'
        })
    });
    const graphql = renderHook(() => useAppAction(graphqlAction), {
      wrapper: wrapper()
    });
    const denied = renderHook(() => useAppAction(deniedAction), {
      wrapper: wrapper()
    });

    expect(await act(() => graphql.result.current.execute(undefined))).toMatchObject({
      error: { details: { paths: ['session.venue'] }, kind: 'graphql' },
      ok: false
    });
    expect(await act(() => denied.result.current.execute(undefined))).toMatchObject({
      error: { code: 'FORBIDDEN', kind: 'authorization' },
      ok: false
    });
  });

  it('rolls optimistic data back after failure', async () => {
    const queryClient = createClient();
    const queryKey = createAppQueryKey(scope, 'sessions.list', { page: 1 });
    queryClient.setQueryData(queryKey, ['draft']);
    const rollback = vi.fn();
    const action = defineAction<string, string, readonly string[]>({
      id: 'sessions.optimistic-publish',
      execute: () =>
        appFailure({ kind: 'authorization', message: 'Denied by RLS.' }),
      optimistic: {
        apply: ({ queryClient: cache }) => {
          const previous = cache.getQueryData<readonly string[]>(queryKey) ?? [];
          cache.setQueryData(queryKey, ['published']);
          return previous;
        },
        rollback: ({ optimisticContext, queryClient: cache }) => {
          rollback();
          cache.setQueryData(queryKey, optimisticContext);
        }
      }
    });
    const hook = renderHook(() => useAppAction(action), {
      wrapper: wrapper(queryClient)
    });

    const result = await act(() => hook.result.current.execute('session-1'));
    expect(result.ok).toBe(false);
    expect(rollback).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(queryKey)).toEqual(['draft']);
  });

  it('rolls back and settles when a completed optimistic apply returns void', async () => {
    const apply = vi.fn(() => undefined);
    const rollback = vi.fn();
    const settle = vi.fn();
    const action = defineAction<void, string, void>({
      id: 'sessions.void-optimistic-context',
      execute: () =>
        appFailure({ kind: 'authorization', message: 'Denied by RLS.' }),
      optimistic: { apply, rollback, settle }
    });
    const hook = renderHook(() => useAppAction(action), { wrapper: wrapper() });

    expect(await act(() => hook.result.current.execute(undefined))).toMatchObject({
      error: { kind: 'authorization' },
      ok: false
    });
    expect(apply).toHaveBeenCalledTimes(1);
    expect(rollback).toHaveBeenCalledWith(
      expect.objectContaining({ optimisticContext: undefined })
    );
    expect(settle).toHaveBeenCalledWith(
      expect.objectContaining({
        optimisticContext: undefined,
        result: expect.objectContaining({ ok: false })
      })
    );
  });

  it('restores every touched cache entry when optimistic apply throws', async () => {
    const queryClient = createClient();
    const firstKey = createAppQueryKey(scope, 'sessions.detail', { id: 'first' });
    const secondKey = createAppQueryKey(scope, 'sessions.detail', { id: 'second' });
    queryClient.setQueryData(firstKey, 'first-baseline');
    queryClient.setQueryData(secondKey, 'second-baseline');
    const execute = vi.fn(() => 'should-not-run');
    const rollback = vi.fn();
    const settle = vi.fn();
    const action = defineAction<void, string, void>({
      id: 'sessions.partial-optimistic-apply',
      execute,
      optimistic: {
        apply: ({ queryClient: cache }) => {
          cache.setQueryData(firstKey, 'first-optimistic');
          cache.setQueryData(secondKey, 'second-optimistic');
          throw new Error('Optimistic projection failed.');
        },
        rollback,
        settle
      }
    });
    const hook = renderHook(() => useAppAction(action), {
      wrapper: wrapper(queryClient)
    });

    expect(await act(() => hook.result.current.execute(undefined))).toMatchObject({
      error: { message: 'Optimistic projection failed.' },
      ok: false
    });
    expect(queryClient.getQueryData(firstKey)).toBe('first-baseline');
    expect(queryClient.getQueryData(secondKey)).toBe('second-baseline');
    expect(execute).not.toHaveBeenCalled();
    expect(rollback).not.toHaveBeenCalled();
    expect(settle).not.toHaveBeenCalled();
  });

  it('restores local optimistic writes when a later foreign-scope guard throws', async () => {
    const queryClient = createClient();
    const foreignScope: AppScope = {
      ...scope,
      organizationId: 'org-b',
      securityRevision: 'security-b'
    };
    const localKey = createAppQueryKey(scope, 'sessions.list', { page: 1 });
    const foreignKey = createAppQueryKey(foreignScope, 'sessions.list', {
      page: 1
    });
    queryClient.setQueryData(localKey, ['local-baseline']);
    queryClient.setQueryData(foreignKey, ['foreign-baseline']);
    const execute = vi.fn(() => 'should-not-run');
    const action = defineAction<void, string, void>({
      id: 'sessions.partial-foreign-scope-apply',
      execute,
      optimistic: {
        apply: ({ queryClient: cache }) => {
          cache.setQueryData(localKey, ['local-optimistic']);
          cache.setQueryData(foreignKey, ['foreign-breach']);
        },
        rollback: vi.fn()
      }
    });
    const hook = renderHook(() => useAppAction(action), {
      wrapper: wrapper(queryClient)
    });

    expect(await act(() => hook.result.current.execute(undefined))).toMatchObject({
      error: { message: expect.stringMatching(/AppScope/u) },
      ok: false
    });
    expect(queryClient.getQueryData(localKey)).toEqual(['local-baseline']);
    expect(queryClient.getQueryData(foreignKey)).toEqual(['foreign-baseline']);
    expect(execute).not.toHaveBeenCalled();
  });

  it('rejects optimistic reads, writes, and cancellation outside the action scope', async () => {
    const queryClient = createClient();
    const foreignScope: AppScope = {
      ...scope,
      organizationId: 'org-b',
      securityRevision: 'security-b'
    };
    const localKey = createAppQueryKey(scope, 'sessions.list', { page: 1 });
    const foreignKey = createAppQueryKey(foreignScope, 'sessions.list', {
      page: 1
    });
    queryClient.setQueryData(localKey, ['local']);
    queryClient.setQueryData(foreignKey, ['foreign']);
    const action = defineAction<void, string, void>({
      id: 'sessions.scope-bound-cache',
      execute: () => 'saved',
      optimistic: {
        apply: ({ queryClient: cache }) => {
          expect(cache.getQueryData(localKey)).toEqual(['local']);
          expect(() => cache.getQueryData(foreignKey)).toThrow(/AppScope/u);
          expect(() => cache.setQueryData(foreignKey, ['breach'])).toThrow(
            /AppScope/u
          );
          expect(() => cache.cancelQueries({ queryKey: foreignKey })).toThrow(
            /AppScope/u
          );
          cache.setQueryData(localKey, ['optimistic-local']);
        },
        rollback: vi.fn()
      }
    });
    const hook = renderHook(() => useAppAction(action), {
      wrapper: wrapper(queryClient)
    });

    expect(await act(() => hook.result.current.execute(undefined))).toMatchObject({
      data: 'saved',
      ok: true
    });
    expect(queryClient.getQueryData(localKey)).toEqual(['optimistic-local']);
    expect(queryClient.getQueryData(foreignKey)).toEqual(['foreign']);
  });

  it('keeps optimistic writes and invalidation in the scope that started the action', async () => {
    const queryClient = createClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const secondScope: AppScope = {
      ...scope,
      organizationId: 'org-b',
      securityRevision: 'security-b'
    };
    const input = { page: 1 };
    const firstKey = createAppQueryKey(scope, 'sessions.list', input);
    const secondKey = createAppQueryKey(secondScope, 'sessions.list', input);
    queryClient.setQueryData(firstKey, ['scope-a']);
    queryClient.setQueryData(secondKey, ['scope-b']);
    const pending = deferred<string>();
    const action = defineAction<void, string, readonly string[]>({
      id: 'sessions.scoped-optimistic',
      execute: () => pending.promise,
      invalidate: [{ queryId: 'sessions.list' }],
      optimistic: {
        apply: ({ queryClient: cache, scope: actionScope }) => {
          const key = createAppQueryKey(actionScope, 'sessions.list', input);
          const previous = cache.getQueryData<readonly string[]>(key) ?? [];
          cache.setQueryData(key, ['optimistic']);
          return previous;
        },
        rollback: ({ optimisticContext, queryClient: cache, scope: actionScope }) => {
          cache.setQueryData(
            createAppQueryKey(actionScope, 'sessions.list', input),
            optimisticContext
          );
        }
      }
    });
    let activeScope = scope;
    const dynamicWrapper = ({ children }: Readonly<{ children: React.ReactNode }>) => (
      <AppKitProvider queryClient={queryClient} scope={activeScope}>
        {children}
      </AppKitProvider>
    );
    const hook = renderHook(() => useAppAction(action), {
      wrapper: dynamicWrapper
    });

    let execution!: Promise<Awaited<ReturnType<typeof hook.result.current.execute>>>;
    act(() => {
      execution = hook.result.current.execute(undefined);
    });
    await waitFor(() =>
      expect(queryClient.getQueryData(firstKey)).toEqual(['optimistic'])
    );

    activeScope = secondScope;
    hook.rerender();
    expect(queryClient.getQueryData(secondKey)).toEqual(['scope-b']);

    await act(async () => {
      pending.resolve('saved');
      await execution;
    });
    expect(queryClient.getQueryData(secondKey)).toEqual(['scope-b']);
    expect(invalidate).toHaveBeenCalledWith({
      exact: false,
      queryKey: createAppQueryRootKey(scope, 'sessions.list')
    });
    expect(invalidate).not.toHaveBeenCalledWith({
      exact: false,
      queryKey: createAppQueryRootKey(secondScope, 'sessions.list')
    });
  });

  it('invalidates only the declared scoped query targets', async () => {
    const queryClient = createClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const action = defineAction<{ id: string }, string>({
      id: 'sessions.schedule',
      execute: ({ input }) => `scheduled:${input.id}`,
      inputSchema: {
        safeParse: (input) => ({
          data: { id: (input as { id: string }).id.trim() },
          success: true
        })
      },
      invalidate: ({ input }) => [
        { queryId: 'sessions.detail', input: { id: input.id } },
        { queryId: 'sessions.calendar' }
      ]
    });
    const hook = renderHook(() => useAppAction(action), {
      wrapper: wrapper(queryClient)
    });

    await act(() => hook.result.current.execute({ id: '  session-3  ' }));
    expect(invalidate).toHaveBeenCalledWith({
      exact: true,
      queryKey: createAppQueryKey(scope, 'sessions.detail', { id: 'session-3' })
    });
    expect(invalidate).toHaveBeenCalledWith({
      exact: false,
      queryKey: expect.arrayContaining([
        'constructive-app-kit',
        scope.databaseId,
        scope.sessionPartition,
        'sessions.calendar'
      ])
    });
  });

  it('reports invalidation failure without rolling back a committed action', async () => {
    const queryClient = createClient();
    vi.spyOn(queryClient, 'invalidateQueries').mockRejectedValueOnce(
      new Error('Cache refresh failed.')
    );
    const queryKey = createAppQueryKey(scope, 'sessions.detail', {
      id: 'session-1'
    });
    queryClient.setQueryData(queryKey, 'baseline');
    const rollback = vi.fn();
    const onPostCommitError = vi.fn();
    const action = defineAction<void, string, string>({
      id: 'sessions.committed-invalidation-failure',
      execute: () => 'server-committed',
      invalidate: [{ queryId: 'sessions.detail' }],
      optimistic: {
        apply: ({ queryClient: cache }) => {
          const previous = cache.getQueryData<string>(queryKey) ?? 'baseline';
          cache.setQueryData(queryKey, 'optimistic');
          return previous;
        },
        rollback
      }
    });
    const hook = renderHook(
      () => useAppAction(action, { onPostCommitError }),
      { wrapper: wrapper(queryClient) }
    );

    expect(await act(() => hook.result.current.execute(undefined))).toMatchObject({
      data: 'server-committed',
      ok: true
    });
    expect(rollback).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(queryKey)).toBe('optimistic');
    expect(onPostCommitError).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: 'Cache refresh failed.' }),
        phase: 'invalidation'
      })
    );
    await waitFor(() => expect(hook.result.current.mutation.isSuccess).toBe(true));
  });

  it('reports settle failure without changing a committed action to failure', async () => {
    const queryClient = createClient();
    const rollback = vi.fn();
    const onPostCommitError = vi.fn();
    const action = defineAction<void, string, void>({
      id: 'sessions.committed-settle-failure',
      execute: () => 'server-committed',
      optimistic: {
        apply: () => undefined,
        rollback,
        settle: () => {
          throw new Error('Optimistic settle failed.');
        }
      }
    });
    const hook = renderHook(
      () => useAppAction(action, { onPostCommitError }),
      { wrapper: wrapper(queryClient) }
    );

    expect(await act(() => hook.result.current.execute(undefined))).toMatchObject({
      data: 'server-committed',
      ok: true
    });
    expect(rollback).not.toHaveBeenCalled();
    expect(onPostCommitError).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: 'Optimistic settle failed.' }),
        phase: 'settle'
      })
    );
    await waitFor(() => expect(hook.result.current.mutation.isSuccess).toBe(true));
  });

  it('finishes a replaced optimistic transaction before applying its replacement', async () => {
    const firstRollback = deferred<void>();
    const queryClient = createClient();
    const queryKey = createAppQueryKey(scope, 'sessions.detail', { id: 'session-1' });
    queryClient.setQueryData(queryKey, 'baseline');
    const signals = new Map<string, AbortSignal>();
    const apply = vi.fn(({ input }: { input: string }) => {
      const previous = queryClient.getQueryData<string>(queryKey) ?? 'baseline';
      queryClient.setQueryData(queryKey, `optimistic:${input}`);
      return previous;
    });
    const rollback = vi.fn(async ({ input, optimisticContext }: {
      input: string;
      optimisticContext: string;
    }) => {
      if (input === 'first') await firstRollback.promise;
      queryClient.setQueryData(queryKey, optimisticContext);
    });
    const settle = vi.fn();
    const action = defineAction<string, string, string>({
      concurrency: 'replace',
      id: 'sessions.replace-interleaving',
      execute: ({ input, signal }) =>
        new Promise<string>((_resolve, reject) => {
          signals.set(input, signal);
          signal.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
      optimistic: {
        apply,
        rollback,
        settle
      }
    });
    const hook = renderHook(() => useAppAction(action), {
      wrapper: wrapper(queryClient)
    });

    let first!: Promise<Awaited<ReturnType<typeof hook.result.current.execute>>>;
    act(() => {
      first = hook.result.current.execute('first');
    });
    await waitFor(() => expect(signals.has('first')).toBe(true));
    expect(queryClient.getQueryData(queryKey)).toBe('optimistic:first');

    let second!: Promise<Awaited<ReturnType<typeof hook.result.current.execute>>>;
    act(() => {
      second = hook.result.current.execute('second');
    });
    expect(signals.get('first')?.aborted).toBe(true);
    await waitFor(() => expect(rollback).toHaveBeenCalledTimes(1));
    expect(signals.has('second')).toBe(false);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(queryKey)).toBe('optimistic:first');

    await act(async () => {
      firstRollback.resolve();
      await first;
    });
    await waitFor(() => expect(signals.has('second')).toBe(true));
    expect(apply).toHaveBeenCalledTimes(2);
    expect(queryClient.getQueryData(queryKey)).toBe('optimistic:second');
    expect(hook.result.current.mutation.isPending).toBe(true);

    act(() => hook.result.current.cancel());
    expect(await act(() => second)).toMatchObject({
      error: { kind: 'cancelled' },
      ok: false
    });
    expect(signals.get('second')?.aborted).toBe(true);
    expect(queryClient.getQueryData(queryKey)).toBe('baseline');
    expect(settle).toHaveBeenCalledTimes(2);
  });

  it('cancels a pending action before starting a replacement in another AppScope', async () => {
    const queryClient = createClient();
    const secondScope: AppScope = {
      ...scope,
      organizationId: 'org-b',
      securityRevision: 'security-b'
    };
    const execute = vi.fn(
      ({ scope: actionScope, signal }: { scope: AppScope; signal: AbortSignal }) => {
        if (actionScope.organizationId === 'org-b') return 'saved-in-org-b';
        return new Promise<string>((_resolve, reject) => {
          signal.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError'))
          );
        });
      }
    );
    const action = defineAction<void, string>({
      id: 'sessions.scope-transition',
      execute
    });
    let activeScope = scope;
    const dynamicWrapper = ({ children }: Readonly<{ children: React.ReactNode }>) => (
      <AppKitProvider queryClient={queryClient} scope={activeScope}>
        {children}
      </AppKitProvider>
    );
    const hook = renderHook(() => useAppAction(action), {
      wrapper: dynamicWrapper
    });

    let first!: Promise<Awaited<ReturnType<typeof hook.result.current.execute>>>;
    act(() => {
      first = hook.result.current.execute(undefined);
    });
    await waitFor(() => expect(execute).toHaveBeenCalledTimes(1));

    activeScope = secondScope;
    hook.rerender();
    let second!: Promise<Awaited<ReturnType<typeof hook.result.current.execute>>>;
    act(() => {
      second = hook.result.current.execute(undefined);
    });

    expect(await act(() => first)).toMatchObject({
      error: { kind: 'cancelled' },
      ok: false
    });
    expect(await act(() => second)).toMatchObject({
      data: 'saved-in-org-b',
      ok: true
    });
    expect(execute).toHaveBeenCalledTimes(2);
  });

});
