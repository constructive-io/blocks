/**
 * One adapter boundary connects Console Kit runtime state to a presentational
 * feature pack. The adapter owns data loading and action props; the feature
 * pack remains provider-neutral and PostgreSQL grants/RLS remain authoritative.
 */
export type FeatureAvailability =
  | Readonly<{ status: 'checking' }>
  | Readonly<{ status: 'available' }>
  | Readonly<{ status: 'unavailable'; reason: string }>
  | Readonly<{ status: 'unauthorized'; reason: string }>
  | Readonly<{ status: 'incompatible'; reason: string }>
  | Readonly<{ status: 'error'; reason: string }>;

export interface FeatureAdapter<
  TProps,
  TContext,
  TCapability extends string = string
> {
  /**
   * Positive capability evidence supplied by the host adapter. Required
   * manifest capabilities fail closed when this list is absent or incomplete.
   */
  readonly capabilities: readonly TCapability[];

  /** Optional host-specific readiness check evaluated on every subscription update. */
  getAvailability?(context: TContext): FeatureAvailability;

  /** Load the complete props consumed by the presentational feature pack. */
  load(context: TContext, signal: AbortSignal): TProps | Promise<TProps>;

  /**
   * Subscribe to host data, policy, or availability changes. Console Kit owns
   * this subscription above its render gate, so a checking adapter can become
   * available without first being mounted.
   */
  subscribe?(context: TContext, listener: () => void): () => void;
}
