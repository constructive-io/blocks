import * as React from 'react';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import {
  appFailure,
  defineAction,
  defineQuery,
  type AppScope
} from './contracts';
import {
  AppKitProvider,
  createAppQueryKey,
  createAppQueryRootKey,
  useAppAction,
  useAppQuery
} from './runtime';

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

describe('useAppQuery', () => {
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
});

describe('useAppAction', () => {
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
});
