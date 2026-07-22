export type FeaturePackError = Readonly<{
  message: string;
  code?: string;
  retryable?: boolean;
}>;

export type FeaturePackResource<T> =
  | Readonly<{ status: 'loading' }>
  | Readonly<{ status: 'empty' }>
  | Readonly<{
      status: 'error';
      error: FeaturePackError;
      retry?: () => void | Promise<void>;
    }>
  | Readonly<{
      status: 'ready';
      data: T;
      asOf?: string;
      quality?: 'authoritative' | 'estimated' | 'stale';
    }>;

export type FeatureActionPolicy<Action extends string = string> = Readonly<
  Partial<Record<Action, boolean>>
>;

export type FeatureActionResult = void | Promise<void>;

export function canPerform<Action extends string>(
  policy: FeatureActionPolicy<Action> | undefined,
  action: Action
): boolean {
  return policy?.[action] === true;
}

export function normalizeFeaturePackError(
  error: unknown,
  fallback: string
): FeaturePackError {
  if (error && typeof error === 'object' && 'message' in error) {
    const candidate = error as {
      message?: unknown;
      code?: unknown;
      retryable?: unknown;
    };

    return {
      message:
        typeof candidate.message === 'string' && candidate.message.length > 0
          ? candidate.message
          : fallback,
      code: typeof candidate.code === 'string' ? candidate.code : undefined,
      retryable:
        typeof candidate.retryable === 'boolean'
          ? candidate.retryable
          : undefined
    };
  }

  return { message: fallback };
}
