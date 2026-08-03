export type AppErrorKind =
  | 'authentication'
  | 'authorization'
  | 'cancelled'
  | 'conflict'
  | 'graphql'
  | 'network'
  | 'not-found'
  | 'validation'
  | 'unknown';

export type AppFieldError = Readonly<{
  field: string;
  message: string;
}>;

export type AppError = Readonly<{
  message: string;
  code?: string;
  kind: AppErrorKind;
  retryable?: boolean;
  fieldErrors?: readonly AppFieldError[];
  details?: Readonly<Record<string, unknown>>;
}>;

export const APP_RESULT_DISCRIMINATOR = 'constructive.app-kit/result' as const;
export const APP_RESULT_VERSION = 1 as const;

export type AppResultMetadata = Readonly<{
  kind: typeof APP_RESULT_DISCRIMINATOR;
  version: typeof APP_RESULT_VERSION;
}>;

export type AppResult<T> = (
  | Readonly<{ ok: true; data: T }>
  | Readonly<{ ok: false; error: AppError }>
) &
  Readonly<{ __constructiveAppKitResult: AppResultMetadata }>;

export type AppExecutorResult<T> = T | AppResult<T>;

function appResultMetadata(): AppResultMetadata {
  return {
    kind: APP_RESULT_DISCRIMINATOR,
    version: APP_RESULT_VERSION
  };
}

export function appSuccess<T>(data: T): AppResult<T> {
  return {
    __constructiveAppKitResult: appResultMetadata(),
    data,
    ok: true
  };
}

export function appFailure(error: AppError): AppResult<never> {
  return {
    __constructiveAppKitResult: appResultMetadata(),
    error,
    ok: false
  };
}

export function isAppResult<T = unknown>(value: unknown): value is AppResult<T> {
  if (!value || typeof value !== 'object') return false;
  const metadata = (value as Readonly<Record<string, unknown>>)
    .__constructiveAppKitResult;
  if (!metadata || typeof metadata !== 'object') return false;
  const candidate = metadata as Readonly<Record<string, unknown>>;
  if (
    candidate.kind !== APP_RESULT_DISCRIMINATOR ||
    candidate.version !== APP_RESULT_VERSION
  ) {
    return false;
  }
  if (!('ok' in value) || typeof value.ok !== 'boolean') return false;
  return value.ok
    ? 'data' in value
    : 'error' in value && isAppError(value.error);
}

export function normalizeAppError(
  error: unknown,
  fallback = 'The operation could not be completed.'
): AppError {
  if (isAppError(error)) return error;

  if (
    typeof DOMException !== 'undefined' &&
    error instanceof DOMException &&
    error.name === 'AbortError'
  ) {
    return {
      code: 'CANCELLED',
      kind: 'cancelled',
      message: 'The operation was cancelled.',
      retryable: true
    };
  }

  if (error instanceof Error) {
    return {
      kind: 'unknown',
      message: error.message || fallback
    };
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const candidate = error as {
      message?: unknown;
      code?: unknown;
      retryable?: unknown;
    };
    return {
      code: typeof candidate.code === 'string' ? candidate.code : undefined,
      kind: 'unknown',
      message:
        typeof candidate.message === 'string' && candidate.message.length > 0
          ? candidate.message
          : fallback,
      retryable:
        typeof candidate.retryable === 'boolean'
          ? candidate.retryable
          : undefined
    };
  }

  return { kind: 'unknown', message: fallback };
}

export function isAppError(value: unknown): value is AppError {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { kind?: unknown; message?: unknown };
  return (
    typeof candidate.kind === 'string' &&
    typeof candidate.message === 'string'
  );
}

/**
 * A secret-free identity for a Constructive application data boundary.
 * Credentials and raw session tokens never belong in this value.
 */
export type AppScope = Readonly<{
  endpointId: string;
  databaseId: string;
  sessionPartition: string;
  organizationId?: string | null;
  tenantId?: string | null;
  schemaRevision: string;
  securityRevision: string;
}>;

export type AppExecutionContext<TInput> = Readonly<{
  /** Plain credential-free input; authentication belongs in the executor closure. */
  input: TInput;
  scope: AppScope;
  signal: AbortSignal;
}>;

export type AppQueryDefinition<TInput, TOutput> = Readonly<{
  id: string;
  execute: (
    context: AppExecutionContext<TInput>
  ) => AppExecutorResult<TOutput> | Promise<AppExecutorResult<TOutput>>;
  staleTime?: number;
}>;

export type AppInputSchema<TInput> = Readonly<{
  safeParse: (input: unknown) =>
    | Readonly<{ success: true; data: TInput }>
    | Readonly<{
        success: false;
        error: Readonly<{
          message?: string;
          issues?: readonly Readonly<{
            message: string;
            path?: readonly PropertyKey[];
          }>[];
        }>;
      }>;
}>;

export type AppActionPresentationContext<TInput, TContext = unknown> = Readonly<{
  input: TInput;
  scope: AppScope;
  context?: TContext;
}>;

export type AppActionPresentation<TInput, TContext = unknown> = Readonly<{
  label: string;
  description?: string;
  visible?: (
    context: AppActionPresentationContext<TInput, TContext>
  ) => boolean;
  disabledReason?: (
    context: AppActionPresentationContext<TInput, TContext>
  ) => string | undefined;
  confirmation?: Readonly<{
    title: string;
    description: string;
    confirmLabel?: string;
    destructive?: boolean;
  }>;
}>;

export type AppInvalidationTarget = Readonly<{
  queryId: string;
  input?: unknown;
  exact?: boolean;
}>;

export type AppOptimisticContext<TInput> = Readonly<{
  input: TInput;
  scope: AppScope;
  /** Scope-bound cache access; foreign AppScope keys are rejected at runtime. */
  queryClient: AppQueryCache;
}>;

declare const appScopedQueryKeyBrand: unique symbol;

/** A key produced by App Kit's scope-aware key factories. */
export type AppScopedQueryKey = readonly unknown[] &
  Readonly<{ [appScopedQueryKeyBrand]: true }>;

export type AppQueryCacheFilters = Readonly<{
  exact?: boolean;
  queryKey?: AppScopedQueryKey;
}>;

export type AppQueryCacheUpdater<TData> =
  | TData
  | ((current: TData | undefined) => TData | undefined);

/**
 * The optimistic cache surface deliberately excludes raw QueryClient access.
 * Implementations bind every operation to the AppScope that started the action.
 */
export type AppQueryCache = Readonly<{
  cancelQueries: (filters?: AppQueryCacheFilters) => Promise<void>;
  getQueryData: <TData = unknown>(
    queryKey: AppScopedQueryKey
  ) => TData | undefined;
  setQueryData: <TData = unknown>(
    queryKey: AppScopedQueryKey,
    updater: AppQueryCacheUpdater<TData>
  ) => unknown;
}>;

export type AppActionDefinition<
  TInput,
  TOutput,
  TOptimistic = unknown,
  TContext = unknown
> = Readonly<{
  id: string;
  inputSchema?: AppInputSchema<TInput>;
  execute: (
    context: AppExecutionContext<TInput>
  ) => AppExecutorResult<TOutput> | Promise<AppExecutorResult<TOutput>>;
  presentation?: AppActionPresentation<TInput, TContext>;
  concurrency?: 'block' | 'replace';
  invalidate?:
    | readonly AppInvalidationTarget[]
    | ((context: Readonly<{
        input: TInput;
        output: TOutput;
        scope: AppScope;
      }>) => readonly AppInvalidationTarget[]);
  optimistic?: Readonly<{
    /**
     * App Kit journals scope-bound setQueryData writes until this resolves and
     * restores them automatically if it throws. Treat cached values as
     * immutable and make every optimistic change through setQueryData.
     */
    apply: (
      context: AppOptimisticContext<TInput>
    ) => TOptimistic | Promise<TOptimistic>;
    rollback: (
      context: AppOptimisticContext<TInput> &
        Readonly<{
          optimisticContext: TOptimistic;
          error: AppError;
        }>
    ) => void | Promise<void>;
    settle?: (
      context: AppOptimisticContext<TInput> &
        Readonly<{
          optimisticContext: TOptimistic;
          result: AppResult<TOutput>;
        }>
    ) => void | Promise<void>;
  }>;
}>;

export type AppFieldKind =
  | 'string'
  | 'integer'
  | 'float'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'enum'
  | 'string-array'
  | 'integer-array'
  | 'float-array'
  | 'boolean-array'
  | 'date-array'
  | 'datetime-array'
  | 'enum-array'
  | 'json'
  | 'custom';

export type AppFieldOption = Readonly<{
  label: string;
  value: string;
}>;

export type AppFieldDefinition<
  TRecord extends Record<string, unknown>,
  TKey extends keyof TRecord & string = keyof TRecord & string
> = Readonly<{
  key: TKey;
  databaseName: string;
  graphQLName: string;
  label: string;
  description?: string;
  kind: AppFieldKind;
  nullable?: boolean;
  /**
   * Defaults to false. Set true only for a final `[T]` list and include null
   * in the corresponding record-property element type.
   */
  arrayElementNullable?: boolean;
  readOnly?: boolean;
  options?: readonly AppFieldOption[];
}>;

export type AppIdentityDefinition<
  TRecord extends Record<string, unknown>,
  TIdentity
> = Readonly<{
  fields: readonly (keyof TRecord & string)[];
  read: (record: TRecord) => TIdentity;
  serialize: (identity: TIdentity) => string;
}>;

export type AppRelationCardinality = 'one' | 'many';

export type AppRelationDefinition = Readonly<{
  id: string;
  label: string;
  fieldName: string;
  /** Explicit final-schema name when it differs from a legacy fieldName. */
  graphQLName?: string;
  /** Database target used to reconcile the relation with `_meta`. */
  targetTableName?: string;
  /** Final executable GraphQL target type for strict relation validation. */
  targetGraphQLTypeName: string;
  targetResourceId: string;
  cardinality: AppRelationCardinality;
  linkActionId?: string;
  unlinkActionId?: string;
}>;

export type AppFormFieldDefinition<
  TRecord extends Record<string, unknown>,
  TKey extends keyof TRecord & string = keyof TRecord & string
> = Readonly<{
  field: TKey;
  required?: boolean;
}>;

export type AppResourceFormDefinition<
  TRecord extends Record<string, unknown>
> = Readonly<{
  fields: readonly AppFormFieldDefinition<TRecord>[];
}>;

export type AppResourceFormsDefinition<
  TRecord extends Record<string, unknown>
> = Readonly<{
  create?: AppResourceFormDefinition<TRecord>;
  update?: AppResourceFormDefinition<TRecord>;
}>;

export type AppResourceSource = Readonly<{
  schemaName: string;
  tableName: string;
  graphQLTypeName: string;
  listFieldName: string;
  detailFieldName?: string;
  createMutationName?: string;
  updateMutationName?: string;
  deleteMutationName?: string;
}>;

export type AppResourceDefinition<
  TRecord extends Record<string, unknown>,
  TIdentity = unknown,
  TListInput = unknown,
  TListOutput = unknown,
  TActions extends Readonly<Record<string, unknown>> = Readonly<
    Record<string, never>
  >
> = Readonly<{
  /** Type-only inference anchor; no runtime value is required. */
  __types?: Readonly<{
    record: TRecord;
    identity: TIdentity;
  }>;
  id: string;
  label: string;
  pluralLabel: string;
  source: AppResourceSource;
  fields: readonly AppFieldDefinition<TRecord>[];
  displayField: keyof TRecord & string;
  identity?: AppIdentityDefinition<TRecord, TIdentity>;
  relations?: readonly AppRelationDefinition[];
  forms?: AppResourceFormsDefinition<TRecord>;
  queries: Readonly<{
    list: AppQueryDefinition<TListInput, TListOutput>;
    detail?: AppQueryDefinition<TIdentity, TRecord | null>;
  }>;
  actions?: TActions;
}>;

function assertDefinitionId(kind: string, id: string): void {
  if (!/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/u.test(id)) {
    throw new Error(
      `${kind} id "${id}" must start with a lowercase letter and contain only lowercase letters, numbers, dots, underscores, or hyphens.`
    );
  }
}

export function defineQuery<TInput, TOutput>(
  definition: AppQueryDefinition<TInput, TOutput>
): AppQueryDefinition<TInput, TOutput> {
  assertDefinitionId('Query', definition.id);
  return Object.freeze(definition);
}

export function defineAction<
  TInput,
  TOutput,
  TOptimistic = unknown,
  TContext = unknown
>(
  definition: AppActionDefinition<TInput, TOutput, TOptimistic, TContext>
): AppActionDefinition<TInput, TOutput, TOptimistic, TContext> {
  assertDefinitionId('Action', definition.id);
  return Object.freeze(definition);
}

export function defineResource<
  TRecord extends Record<string, unknown>,
  TIdentity = unknown,
  TListInput = unknown,
  TListOutput = unknown,
  TActions extends Readonly<Record<string, unknown>> = Readonly<
    Record<string, never>
  >
>(
  definition: AppResourceDefinition<
    TRecord,
    TIdentity,
    TListInput,
    TListOutput,
    TActions
  >
): AppResourceDefinition<
  TRecord,
  TIdentity,
  TListInput,
  TListOutput,
  TActions
> {
  assertDefinitionId('Resource', definition.id);

  const fieldKeys = new Set<string>();
  for (const field of definition.fields) {
    if (fieldKeys.has(field.key)) {
      throw new Error(
        `Resource "${definition.id}" declares field "${field.key}" more than once.`
      );
    }
    fieldKeys.add(field.key);
  }

  if (!fieldKeys.has(definition.displayField)) {
    throw new Error(
      `Resource "${definition.id}" displayField "${definition.displayField}" is not declared in fields.`
    );
  }

  for (const identityField of definition.identity?.fields ?? []) {
    if (!fieldKeys.has(identityField)) {
      throw new Error(
        `Resource "${definition.id}" identity field "${identityField}" is not declared in fields.`
      );
    }
  }

  for (const [formKind, form] of Object.entries(definition.forms ?? {})) {
    const formFields = new Set<string>();
    for (const formField of form?.fields ?? []) {
      if (!fieldKeys.has(formField.field)) {
        throw new Error(
          `Resource "${definition.id}" ${formKind} form field "${formField.field}" is not declared in fields.`
        );
      }
      if (formFields.has(formField.field)) {
        throw new Error(
          `Resource "${definition.id}" ${formKind} form declares field "${formField.field}" more than once.`
        );
      }
      formFields.add(formField.field);
    }
  }

  return Object.freeze(definition);
}
