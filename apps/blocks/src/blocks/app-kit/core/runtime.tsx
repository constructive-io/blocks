'use client';

import * as React from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
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
  type AppQueryDefinition,
  type AppResult,
  type AppScope
} from './contracts';
import {
  createAppScopeFingerprint,
  createAppQueryKey,
  createAppQueryRootKey,
  createAppScopeQueryKey
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
  return useQuery<TOutput, AppRuntimeError>({
    enabled: options.enabled,
    queryKey: createAppQueryKey(scope, definition.id, input),
    queryFn: ({ signal }) =>
      executeApp(() => definition.execute({ input, scope, signal })),
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
  onResult?: (result: AppResult<TOutput>, input: TInput) => void;
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
  variables: TInput | undefined;
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

type AppActionMutationVariables<TInput> = Readonly<{
  controller: AbortController;
  executionId: number;
  input: TInput;
}>;

type AppActionMutationContext<TInput, TOptimistic> = Readonly<{
  executionId: number;
  input: TInput;
  optimisticContext: TOptimistic | undefined;
}>;

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
  const executionCounterRef = React.useRef(0);
  const currentExecutionRef = React.useRef<Readonly<{
    completion: Promise<void>;
    controller: AbortController;
    id: number;
  }> | null>(null);
  const pendingRef = React.useRef(false);

  const mutation = useMutation<
    TOutput,
    AppRuntimeError,
    AppActionMutationVariables<TInput>,
    AppActionMutationContext<TInput, TOptimistic>
  >({
    mutationKey: [...createAppScopeQueryKey(scope), 'action', definition.id],
    mutationFn: async ({ controller, input }) => {
      return executeApp(() =>
        executeWithAbortSignal(controller.signal, () =>
          definition.execute({
            input,
            scope,
            signal: controller.signal
          })
        )
      );
    },
    onMutate: async ({ executionId, input }) => {
      const optimisticContext = await definition.optimistic?.apply({
        input,
        queryClient,
        scope
      });
      return { executionId, input, optimisticContext };
    },
    onError: async (runtimeError, variables, context) => {
      if (
        definition.optimistic &&
        context?.optimisticContext !== undefined
      ) {
        await definition.optimistic.rollback({
          error: runtimeError.appError,
          input: context.input,
          optimisticContext: context.optimisticContext,
          queryClient,
          scope
        });
      }
    },
    onSuccess: async (output, variables, context) => {
      const input = context?.input ?? variables.input;
      const targets =
        typeof definition.invalidate === 'function'
          ? definition.invalidate({ input, output, scope })
          : definition.invalidate ?? [];
      await Promise.all(
        targets.map((target) =>
          queryClient.invalidateQueries({
            exact: target.exact ?? target.input !== undefined,
            queryKey:
              target.input === undefined
                ? createAppQueryRootKey(scope, target.queryId)
                : createAppQueryKey(scope, target.queryId, target.input)
          })
        )
      );
    },
    onSettled: async (output, runtimeError, variables, context) => {
      if (
        definition.optimistic?.settle &&
        context?.optimisticContext !== undefined
      ) {
        const result = runtimeError
          ? appFailure(runtimeError.appError)
          : appSuccess(output as TOutput);
        await definition.optimistic.settle({
          input: context.input,
          optimisticContext: context.optimisticContext,
          queryClient,
          result,
          scope
        });
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
        parsedInput = parseInput(definition.inputSchema, input);
      } catch (error) {
        const appError =
          error instanceof AppRuntimeError
            ? error.appError
            : normalizeAppError(error);
        const result = appFailure(appError);
        options.onResult?.(result, input);
        return result;
      }

      const previousExecution = currentExecutionRef.current;
      if (pendingRef.current) {
        if ((definition.concurrency ?? 'block') !== 'replace') {
          const result = appFailure({
            code: 'ACTION_IN_PROGRESS',
            kind: 'conflict',
            message: 'This action is already in progress.',
            retryable: true
          });
          options.onResult?.(result, input);
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
        id: executionId
      };
      pendingRef.current = true;
      previousExecution?.controller.abort();
      try {
        // Finish the replaced optimistic transaction before applying the next
        // one so its rollback cannot overwrite the newer optimistic state.
        await previousExecution?.completion;
        if (controller.signal.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
        const data = await mutation.mutateAsync({
          controller,
          executionId,
          input: parsedInput
        });
        const result = appSuccess(data);
        options.onResult?.(result, parsedInput);
        return result;
      } catch (error) {
        const appError =
          error instanceof AppRuntimeError
            ? error.appError
            : normalizeAppError(error);
        const result = appFailure(appError);
        options.onResult?.(result, parsedInput);
        return result;
      } finally {
        completeExecution();
        if (currentExecutionRef.current?.id === executionId) {
          currentExecutionRef.current = null;
          pendingRef.current = false;
        }
      }
    },
    [definition.concurrency, definition.inputSchema, mutation, options]
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
      submittedAt: mutation.submittedAt,
      variables: mutation.variables?.input
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
