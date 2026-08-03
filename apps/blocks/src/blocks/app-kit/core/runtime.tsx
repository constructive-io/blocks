'use client';

import * as React from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryState,
  type UseQueryResult
} from '@tanstack/react-query';

import {
  appFailure,
  appSuccess,
  isAppResult,
  normalizeAppError,
  type AppActionDefinition,
  type AppError,
  type AppExecutorResult,
  type AppInputSchema,
  type AppQueryCache,
  type AppQueryCacheFilters,
  type AppQueryCacheUpdater,
  type AppQueryDefinition,
  type AppResult,
  type AppScopedQueryKey,
  type AppScope
} from './contracts';
import {
  createAppScopeFingerprint,
  createAppQueryKey,
  createAppQueryRootKey,
  createAppScopeQueryKey,
  findAppCredentialInputPath,
  type AppScopeQueryKey
} from './scope';

const AppScopeContext = React.createContext<AppScope | null>(null);

export class AppRuntimeError extends Error {
  readonly appError: AppError;

  constructor(appError: AppError) {
    super(appError.message);
    this.name = 'AppRuntimeError';
    this.appError = appError;
  }
}

export type AppKitProviderProps = Readonly<{
  scope: AppScope;
  queryClient: QueryClient;
  children: React.ReactNode;
}>;

export function AppKitProvider({
  scope,
  queryClient,
  children
}: AppKitProviderProps) {
  const scopeKey = createAppScopeFingerprint(scope);
  const stableScope = React.useMemo(() => scope, [scopeKey]);
  return (
    <QueryClientProvider client={queryClient}>
      <AppScopeContext.Provider value={stableScope}>
        {children}
      </AppScopeContext.Provider>
    </QueryClientProvider>
  );
}

export function useAppScope(): AppScope {
  const scope = React.useContext(AppScopeContext);
  if (!scope) {
    throw new Error('App Kit hooks must be rendered inside AppKitProvider.');
  }
  return scope;
}

async function unwrapExecutorResult<T>(
  value: AppExecutorResult<T> | Promise<AppExecutorResult<T>>
): Promise<T> {
  const result = await value;
  if (!isAppResult(result)) return result;
  if (result.ok) return result.data;
  throw new AppRuntimeError(result.error);
}

async function executeApp<T>(
  operation: () => AppExecutorResult<T> | Promise<AppExecutorResult<T>>
): Promise<T> {
  try {
    return await unwrapExecutorResult(operation());
  } catch (error) {
    if (error instanceof AppRuntimeError) throw error;
    throw new AppRuntimeError(normalizeAppError(error));
  }
}

async function executeWithAbortSignal<T>(
  signal: AbortSignal,
  operation: () => AppExecutorResult<T> | Promise<AppExecutorResult<T>>
): Promise<AppExecutorResult<T>> {
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  let abort: (() => void) | undefined;
  const aborted = new Promise<never>((_resolve, reject) => {
    abort = () => reject(new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', abort, { once: true });
  });
  try {
    return await Promise.race([Promise.resolve().then(operation), aborted]);
  } finally {
    if (abort) signal.removeEventListener('abort', abort);
  }
}

function credentialInputError(path: string): AppRuntimeError {
  return new AppRuntimeError({
    code: 'CREDENTIAL_IN_INPUT',
    fieldErrors: [
      {
        field: path,
        message: 'Capture credentials in the query or action executor closure.'
      }
    ],
    kind: 'validation',
    message:
      'App Kit inputs must be credential-free. Capture authentication in the executor closure instead.'
  });
}

function inspectCredentialFreeInput(input: unknown): string | undefined {
  try {
    return findAppCredentialInputPath(input);
  } catch (error) {
    throw new AppRuntimeError({
      code: 'UNSUPPORTED_INPUT',
      kind: 'validation',
      message:
        error instanceof Error
          ? error.message
          : 'App Kit inputs must use supported plain values.'
    });
  }
}

function assertCredentialFreeInput(input: unknown): void {
  const credentialPath = inspectCredentialFreeInput(input);
  if (credentialPath) throw credentialInputError(credentialPath);
}

function queryKeyStartsWithScope(
  queryKey: readonly unknown[],
  scopeKey: AppScopeQueryKey
): boolean {
  return scopeKey.every((part, index) => Object.is(queryKey[index], part));
}

type ScopeBoundQueryCacheObserver = Readonly<{
  beforeSet?: (queryKey: AppScopedQueryKey) => void;
}>;

function createScopeBoundQueryCache(
  queryClient: QueryClient,
  scope: AppScope,
  observer: ScopeBoundQueryCacheObserver = {}
): AppQueryCache {
  const scopeKey = createAppScopeQueryKey(scope);
  const assertScopedKey = (queryKey: readonly unknown[]) => {
    if (!queryKeyStartsWithScope(queryKey, scopeKey)) {
      throw new Error(
        'Optimistic cache access must use a key created for the AppScope that started the action.'
      );
    }
  };

  const cache: AppQueryCache = {
    cancelQueries: (filters: AppQueryCacheFilters = {}) => {
      const queryKey = filters.queryKey ?? scopeKey;
      assertScopedKey(queryKey);
      return queryClient.cancelQueries({
        exact: filters.exact,
        queryKey
      });
    },
    getQueryData: <TData = unknown>(queryKey: AppScopedQueryKey) => {
      assertScopedKey(queryKey);
      return queryClient.getQueryData<TData>(queryKey);
    },
    setQueryData: <TData = unknown>(
      queryKey: AppScopedQueryKey,
      updater: AppQueryCacheUpdater<TData>
    ) => {
      assertScopedKey(queryKey);
      observer.beforeSet?.(queryKey);
      return queryClient.setQueryData<TData>(queryKey, updater);
    }
  };
  return Object.freeze(cache);
}

type OptimisticCacheSnapshot = Readonly<{
  queryKey: AppScopedQueryKey;
  state: QueryState<unknown, Error> | null;
}>;

type OptimisticCacheTransaction = Readonly<{
  commit: () => void;
  queryCache: AppQueryCache;
  restore: () => void;
}>;

function createOptimisticCacheTransaction(
  queryClient: QueryClient,
  scope: AppScope
): OptimisticCacheTransaction {
  const snapshots = new Map<string, OptimisticCacheSnapshot>();
  let active = true;
  const snapshotQuery = (queryKey: AppScopedQueryKey) => {
    if (!active) return;
    const fingerprint = JSON.stringify(queryKey);
    if (snapshots.has(fingerprint)) return;
    const query = queryClient.getQueryCache().find({ exact: true, queryKey });
    snapshots.set(fingerprint, {
      queryKey,
      state: query?.state ?? null
    });
  };
  const queryCache = createScopeBoundQueryCache(queryClient, scope, {
    beforeSet: snapshotQuery
  });

  return {
    commit: () => {
      active = false;
      snapshots.clear();
    },
    queryCache,
    restore: () => {
      try {
        for (const snapshot of [...snapshots.values()].reverse()) {
          if (!snapshot.state) {
            queryClient.removeQueries({
              exact: true,
              queryKey: snapshot.queryKey
            });
            continue;
          }
          const query = queryClient.getQueryCache().find({
            exact: true,
            queryKey: snapshot.queryKey
          });
          if (!query) {
            throw new Error(
              'App Kit could not restore an optimistic cache entry that was removed during apply.'
            );
          }
          query.setState(snapshot.state);
        }
      } finally {
        active = false;
        snapshots.clear();
      }
    }
  };
}

export type UseAppQueryOptions = Readonly<{
  enabled?: boolean;
  staleTime?: number;
}>;

export function useAppQuery<TInput, TOutput>(
  definition: AppQueryDefinition<TInput, TOutput>,
  input: TInput,
  options: UseAppQueryOptions = {}
): UseQueryResult<TOutput, AppRuntimeError> {
  const scope = useAppScope();
  const credentialPath = inspectCredentialFreeInput(input);
  return useQuery<TOutput, AppRuntimeError>({
    enabled: options.enabled,
    queryKey: createAppQueryKey(scope, definition.id, input),
    queryFn: ({ signal }) => {
      if (credentialPath) throw credentialInputError(credentialPath);
      return executeApp(() => definition.execute({ input, scope, signal }));
    },
    refetchInterval: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    staleTime: options.staleTime ?? definition.staleTime
  });
}

function validationError<TInput>(schema: AppInputSchema<TInput>, input: unknown) {
  const parsed = schema.safeParse(input);
  if (parsed.success) return parsed.data;
  const fieldErrors = parsed.error.issues?.map((issue) => ({
    field: issue.path?.map(String).join('.') ?? '',
    message: issue.message
  }));
  throw new AppRuntimeError({
    code: 'INVALID_INPUT',
    fieldErrors,
    kind: 'validation',
    message: parsed.error.message ?? fieldErrors?.[0]?.message ?? 'The action input is invalid.'
  });
}

function parseInput<TInput>(
  schema: AppInputSchema<TInput> | undefined,
  input: TInput
): TInput {
  return schema ? validationError(schema, input) : input;
}

export type UseAppActionOptions<TInput, TOutput, TContext = unknown> = Readonly<{
  /** Observes the final result; callback failures never change action execution. */
  onResult?: (result: AppResult<TOutput>, input: TInput) => void;
  /** Reports UI synchronization failures after the server action committed. */
  onPostCommitError?: (context: Readonly<{
    error: AppError;
    input: TInput;
    output: TOutput;
    phase: 'invalidation' | 'settle';
    scope: AppScope;
  }>) => void;
  presentationInput?: TInput;
  presentationContext?: TContext;
}>;

export type AppActionPresentationState = Readonly<{
  visible: boolean;
  disabledReason?: string;
}>;

export type AppActionMutationState<TInput, TOutput> = Readonly<{
  data: TOutput | undefined;
  error: AppRuntimeError | null;
  failureCount: number;
  failureReason: AppRuntimeError | null;
  isError: boolean;
  isIdle: boolean;
  isPaused: boolean;
  isPending: boolean;
  isSuccess: boolean;
  status: 'error' | 'idle' | 'pending' | 'success';
  submittedAt: number;
}>;

export type UseAppActionResult<
  TInput,
  TOutput,
  TOptimistic = unknown,
  TContext = unknown
> = Readonly<{
  execute: (input: TInput) => Promise<AppResult<TOutput>>;
  cancel: () => void;
  reset: () => void;
  evaluatePresentation: (
    input: TInput,
    context?: TContext
  ) => AppActionPresentationState;
  visible: boolean;
  disabledReason?: string;
  confirmation?: NonNullable<
    AppActionDefinition<TInput, TOutput, TOptimistic, TContext>['presentation']
  >['confirmation'];
  mutation: AppActionMutationState<TInput, TOutput>;
}>;

type AppActionMutationVariables = Readonly<{
  executionId: number;
}>;

type AppActionOptimisticMutationContext<TOptimistic> =
  | Readonly<{ applied: false }>
  | Readonly<{ applied: true; value: TOptimistic }>;

type AppActionMutationContext<TOptimistic> = Readonly<{
  executionId: number;
  optimistic: AppActionOptimisticMutationContext<TOptimistic>;
}>;

type AppActionExecution<
  TInput,
  TOutput,
  TOptimistic,
  TContext
> = Readonly<{
  controller: AbortController;
  definition: AppActionDefinition<TInput, TOutput, TOptimistic, TContext>;
  input: TInput;
  onPostCommitError?: UseAppActionOptions<
    TInput,
    TOutput,
    TContext
  >['onPostCommitError'];
  queryCache: AppQueryCache;
  runtimeQueryClient: QueryClient;
  scope: AppScope;
  scopeKey: string;
}>;

function reportPostCommitError<
  TInput,
  TOutput,
  TOptimistic,
  TContext
>(
  execution: AppActionExecution<TInput, TOutput, TOptimistic, TContext>,
  output: TOutput,
  phase: 'invalidation' | 'settle',
  error: unknown
): void {
  const appError = normalizeAppError(
    error,
    phase === 'invalidation'
      ? 'The action committed, but related cached views could not be refreshed.'
      : 'The action committed, but optimistic cleanup could not be completed.'
  );
  try {
    execution.onPostCommitError?.({
      error: appError,
      input: execution.input,
      output,
      phase,
      scope: execution.scope
    });
  } catch {
    // A host diagnostic callback must never change the committed action result.
  }
}

function notifyActionResult<TInput, TOutput>(
  onResult: UseAppActionOptions<TInput, TOutput>['onResult'],
  result: AppResult<TOutput>,
  input: TInput
): void {
  try {
    onResult?.(result, input);
  } catch {
    // A host observer must never change or duplicate the action result.
  }
}

export function useAppAction<
  TInput,
  TOutput,
  TOptimistic = unknown,
  TContext = unknown
>(
  definition: AppActionDefinition<TInput, TOutput, TOptimistic, TContext>,
  options: UseAppActionOptions<TInput, TOutput, TContext> = {}
): UseAppActionResult<TInput, TOutput, TOptimistic, TContext> {
  const scope = useAppScope();
  const queryClient = useQueryClient();
  const scopeKey = createAppScopeFingerprint(scope);
  const queryCache = React.useMemo(
    () => createScopeBoundQueryCache(queryClient, scope),
    [queryClient, scopeKey]
  );
  const executionCounterRef = React.useRef(0);
  const currentExecutionRef = React.useRef<Readonly<{
    completion: Promise<void>;
    controller: AbortController;
    id: number;
    scopeKey: string;
  }> | null>(null);
  const executionsRef = React.useRef(
    new Map<
      number,
      AppActionExecution<TInput, TOutput, TOptimistic, TContext>
    >()
  );
  const pendingRef = React.useRef(false);

  React.useEffect(
    () => () => currentExecutionRef.current?.controller.abort(),
    []
  );

  const getExecution = React.useCallback((executionId: number) => {
    const execution = executionsRef.current.get(executionId);
    if (!execution) {
      throw new AppRuntimeError({
        code: 'ACTION_EXECUTION_MISSING',
        kind: 'unknown',
        message: 'The action execution context is no longer available.'
      });
    }
    return execution;
  }, []);

  const mutation = useMutation<
    TOutput,
    AppRuntimeError,
    AppActionMutationVariables,
    AppActionMutationContext<TOptimistic>
  >({
    mutationKey: [...createAppScopeQueryKey(scope), 'action', definition.id],
    retry: false,
    mutationFn: async ({ executionId }) => {
      const execution = getExecution(executionId);
      return executeApp(() =>
        executeWithAbortSignal(execution.controller.signal, () =>
          execution.definition.execute({
            input: execution.input,
            scope: execution.scope,
            signal: execution.controller.signal
          })
        )
      );
    },
    onMutate: async ({ executionId }) => {
      const execution = getExecution(executionId);
      if (!execution.definition.optimistic) {
        return { executionId, optimistic: { applied: false } };
      }
      const transaction = createOptimisticCacheTransaction(
        execution.runtimeQueryClient,
        execution.scope
      );
      try {
        const value = await execution.definition.optimistic.apply({
          input: execution.input,
          queryClient: transaction.queryCache,
          scope: execution.scope
        });
        transaction.commit();
        return { executionId, optimistic: { applied: true, value } };
      } catch (error) {
        try {
          transaction.restore();
        } catch (recoveryError) {
          throw new AppRuntimeError({
            code: 'OPTIMISTIC_RECOVERY_FAILED',
            details: {
              applyError: normalizeAppError(error),
              recoveryError: normalizeAppError(recoveryError)
            },
            kind: 'unknown',
            message:
              'The optimistic update failed and App Kit could not restore its cache snapshot.'
          });
        }
        if (error instanceof AppRuntimeError) throw error;
        throw new AppRuntimeError(normalizeAppError(error));
      }
    },
    onError: async (runtimeError, variables, context) => {
      const execution = getExecution(variables.executionId);
      if (execution.definition.optimistic && context?.optimistic.applied) {
        await execution.definition.optimistic.rollback({
          error:
            runtimeError instanceof AppRuntimeError
              ? runtimeError.appError
              : normalizeAppError(runtimeError),
          input: execution.input,
          optimisticContext: context.optimistic.value,
          queryClient: execution.queryCache,
          scope: execution.scope
        });
      }
    },
    onSuccess: async (output, variables, context) => {
      const execution = getExecution(variables.executionId);
      try {
        const targets =
          typeof execution.definition.invalidate === 'function'
            ? execution.definition.invalidate({
                input: execution.input,
                output,
                scope: execution.scope
              })
            : execution.definition.invalidate ?? [];
        await Promise.all(
          targets.map((target) =>
            execution.runtimeQueryClient.invalidateQueries({
              exact: target.exact ?? target.input !== undefined,
              queryKey:
                target.input === undefined
                  ? createAppQueryRootKey(execution.scope, target.queryId)
                  : createAppQueryKey(
                      execution.scope,
                      target.queryId,
                      target.input
                    )
            })
          )
        );
      } catch (error) {
        reportPostCommitError(execution, output, 'invalidation', error);
      }
    },
    onSettled: async (output, runtimeError, variables, context) => {
      const execution = getExecution(variables.executionId);
      if (execution.definition.optimistic?.settle && context?.optimistic.applied) {
        const result = runtimeError
          ? appFailure(
              runtimeError instanceof AppRuntimeError
                ? runtimeError.appError
                : normalizeAppError(runtimeError)
            )
          : appSuccess(output as TOutput);
        try {
          await execution.definition.optimistic.settle({
            input: execution.input,
            optimisticContext: context.optimistic.value,
            queryClient: execution.queryCache,
            result,
            scope: execution.scope
          });
        } catch (error) {
          if (!runtimeError) {
            reportPostCommitError(
              execution,
              output as TOutput,
              'settle',
              error
            );
          }
        }
      }
    }
  });

  const evaluatePresentation = React.useCallback(
    (input: TInput, context?: TContext): AppActionPresentationState => ({
      disabledReason: definition.presentation?.disabledReason?.({
        context,
        input,
        scope
      }),
      visible:
        definition.presentation?.visible?.({ context, input, scope }) ?? true
    }),
    [definition.presentation, scope]
  );

  const execute = React.useCallback(
    async (input: TInput): Promise<AppResult<TOutput>> => {
      let parsedInput: TInput;
      try {
        assertCredentialFreeInput(input);
        parsedInput = parseInput(definition.inputSchema, input);
        assertCredentialFreeInput(parsedInput);
      } catch (error) {
        const appError =
          error instanceof AppRuntimeError
            ? error.appError
            : normalizeAppError(error);
        const result = appFailure(appError);
        notifyActionResult(options.onResult, result, input);
        return result;
      }

      const previousExecution = currentExecutionRef.current;
      const previousIsSameScope = previousExecution?.scopeKey === scopeKey;
      if (pendingRef.current && previousIsSameScope) {
        if ((definition.concurrency ?? 'block') !== 'replace') {
          const result = appFailure({
            code: 'ACTION_IN_PROGRESS',
            kind: 'conflict',
            message: 'This action is already in progress.',
            retryable: true
          });
          notifyActionResult(options.onResult, result, input);
          return result;
        }
      }

      const executionId = ++executionCounterRef.current;
      const controller = new AbortController();
      let completeExecution!: () => void;
      const completion = new Promise<void>((resolve) => {
        completeExecution = resolve;
      });
      currentExecutionRef.current = {
        completion,
        controller,
        id: executionId,
        scopeKey
      };
      pendingRef.current = true;
      if (
        previousExecution &&
        (!previousIsSameScope || (definition.concurrency ?? 'block') === 'replace')
      ) {
        previousExecution.controller.abort();
      }
      try {
        // Finish the replaced optimistic transaction before applying the next
        // one so its rollback cannot overwrite the newer optimistic state.
        await previousExecution?.completion;
        if (controller.signal.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
        executionsRef.current.set(executionId, {
          controller,
          definition,
          input: parsedInput,
          onPostCommitError: options.onPostCommitError,
          queryCache,
          runtimeQueryClient: queryClient,
          scope,
          scopeKey
        });
        const data = await mutation.mutateAsync({ executionId });
        const result = appSuccess(data);
        notifyActionResult(options.onResult, result, parsedInput);
        return result;
      } catch (error) {
        const appError =
          error instanceof AppRuntimeError
            ? error.appError
            : normalizeAppError(error);
        const result = appFailure(appError);
        notifyActionResult(options.onResult, result, parsedInput);
        return result;
      } finally {
        executionsRef.current.delete(executionId);
        completeExecution();
        if (currentExecutionRef.current?.id === executionId) {
          currentExecutionRef.current = null;
          pendingRef.current = false;
        }
      }
    },
    [definition, mutation, options, queryCache, queryClient, scope, scopeKey]
  );

  const hasPresentationInput = Object.prototype.hasOwnProperty.call(
    options,
    'presentationInput'
  );
  const presentationState = hasPresentationInput
    ? evaluatePresentation(
        options.presentationInput as TInput,
        options.presentationContext
      )
    : { visible: true };

  return {
    cancel: () => currentExecutionRef.current?.controller.abort(),
    confirmation: definition.presentation?.confirmation,
    disabledReason: presentationState.disabledReason,
    evaluatePresentation,
    execute,
    mutation: {
      data: mutation.data,
      error: mutation.error,
      failureCount: mutation.failureCount,
      failureReason: mutation.failureReason,
      isError: mutation.isError,
      isIdle: mutation.isIdle,
      isPaused: mutation.isPaused,
      isPending: mutation.isPending,
      isSuccess: mutation.isSuccess,
      status: mutation.status,
      submittedAt: mutation.submittedAt
    },
    reset: mutation.reset,
    visible: presentationState.visible
  };
}

export {
  createAppQueryKey,
  createAppQueryRootKey,
  createAppScopeFingerprint,
  createAppScopeQueryKey
};
export type { QueryClient };
