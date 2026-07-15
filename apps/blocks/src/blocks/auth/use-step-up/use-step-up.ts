/**
 * useStepUp
 *
 * Promise-based imperative step-up hook. Wraps StepUpProvider/StepUpDialog into
 * a single `await stepUp(options)` call pattern. Resolves on success; rejects
 * with StepUpError on cancel or verification failure.
 *
 * Usage:
 *   1. Add <StepUpProvider> once at your app root (or per-route layout).
 *   2. Anywhere in the tree: const stepUp = useStepUp()
 *      await stepUp({ tier: 'high' })  // mfa if enrolled; else password
 *      await stepUp({ type: 'password' })  // always password
 *
 * This file is AUTHORED (utility), not generated. It delegates all data work to
 * StepUpDialog which in turn calls the generated auth SDK hooks. This file has
 * NO direct imports from @/generated/auth.
 */

import type { StepUpDialogMessageOverrides } from '../step-up-dialog/step-up-dialog';
import { useStepUpContext } from './step-up-provider';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Options passed to the stepUp() call.
 * Either `type` OR `tier` must be provided.
 * If both are passed, `type` wins (explicit always overrides shorthand).
 */
export type StepUpOptions = {
  /**
   * Explicit verifier type. Takes precedence over `tier` if both are provided.
   * Pass `type` directly when the caller already knows the user's MFA state —
   * this skips the tier-resolution path entirely.
   */
  type?: 'password' | 'mfa';
  /**
   * Severity tier shorthand. Resolved in StepUpProvider to a concrete `type`.
   *
   * V1 behavior (accepted, intentional):
   * - `'medium'` → always `'password'`. Medium severity never requires MFA.
   * - `'high'`   → `'password'` in v1 (conservative fallback). A future wave
   *                will probe `current_user()` TanStack Query cache for MFA
   *                enrollment and resolve to `'mfa'` when the user has TOTP or
   *                a passkey registered. Wave-2 callers that already know the
   *                user has MFA enrolled should pass `type: 'mfa'` directly to
   *                skip the enrollment check and get the correct dialog.
   *
   * `type` always wins if both are provided — tier is silently ignored.
   */
  tier?: 'high' | 'medium';
  /**
   * Override the dialog messages for this call site.
   * Merged with the StepUpProvider's global messages.
   */
  messages?: StepUpDialogMessageOverrides;
};

/**
 * The error thrown when step-up is cancelled or fails.
 */
export class StepUpError extends Error {
  constructor(
    public readonly reason: 'cancelled' | 'error',
    public readonly cause?: unknown
  ) {
    super(reason === 'cancelled' ? 'Step-up cancelled.' : 'Step-up failed.');
    this.name = 'StepUpError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StepUpError);
    }
  }
}

/**
 * Return type of useStepUp().
 * Call stepUp(options) to imperatively trigger verification.
 * Resolves (void) when verified. Rejects with StepUpError on cancel or failure.
 */
export type UseStepUpReturn = (options: StepUpOptions) => Promise<void>;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useStepUp — imperatively trigger identity re-verification.
 *
 * Must be called inside <StepUpProvider>. Throws if no provider is found.
 *
 * @example
 * ```tsx
 * const stepUp = useStepUp();
 *
 * async function handleSensitiveAction() {
 *   try {
 *     await stepUp({ tier: 'high' });
 *     // ... proceed with action
 *   } catch (err) {
 *     if (err instanceof StepUpError && err.reason === 'cancelled') return; // silent
 *     // handle error
 *   }
 * }
 * ```
 */
export function useStepUp(): UseStepUpReturn {
  const { stepUp } = useStepUpContext();
  return stepUp;
}
