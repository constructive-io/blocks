'use client';

/**
 * StepUpProvider
 *
 * Mounts the StepUpDialog as a controlled portal and provides the Promise-based
 * imperative API via StepUpContext. Consumers call `useStepUp()` to get the
 * `stepUp()` function — they never manage dialog open state themselves.
 *
 * Concurrency contract: only ONE step-up can be active at a time. If `stepUp()`
 * is called while a dialog is already open, it rejects immediately with
 * `StepUpError({ reason: 'error' })`. No silent stacking.
 *
 * NOTE: SSR — the portal renders a <StepUpDialog> which is 'use client'. If
 * targeting Next.js App Router SSR, add `suppressHydrationWarning` on the body
 * or ensure StepUpProvider is mounted below the hydration boundary.
 */

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { StepUpDialog } from '../step-up-dialog/step-up-dialog';
import type { StepUpResult } from '../step-up-dialog/step-up-dialog';
import type { StepUpDialogMessageOverrides } from '../step-up-dialog/step-up-dialog';

import { StepUpError } from './use-step-up';
import type { StepUpOptions } from './use-step-up';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

type StepUpContextValue = {
  /**
   * Imperatively trigger step-up verification.
   * Resolves on success, rejects with StepUpError on cancel or error.
   */
  stepUp: (options: StepUpOptions) => Promise<void>;
};

const StepUpContext = createContext<StepUpContextValue | null>(null);

export function useStepUpContext(): StepUpContextValue {
  const ctx = useContext(StepUpContext);
  if (!ctx) {
    throw new Error('useStepUp() must be called inside <StepUpProvider>. Add <StepUpProvider> to your app root.');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export type StepUpProviderProps = {
  children: ReactNode;
  /**
   * Global message defaults for the step-up dialog.
   * Per-call messages are merged on top.
   */
  messages?: StepUpDialogMessageOverrides;
};

type DialogState = {
  open: boolean;
  type: 'password' | 'mfa';
  messages?: StepUpDialogMessageOverrides;
};

export function StepUpProvider({ children, messages: globalMessages }: StepUpProviderProps) {
  const [dialogState, setDialogState] = useState<DialogState>({
    open: false,
    type: 'password'
  });

  // Pending promise refs — stored in refs to avoid triggering re-renders.
  const pendingResolveRef = useRef<(() => void) | null>(null);
  const pendingRejectRef = useRef<((err: StepUpError) => void) | null>(null);

  const stepUp = useCallback(
    (options: StepUpOptions): Promise<void> => {
      // Reject concurrent calls immediately.
      if (pendingResolveRef.current !== null) {
        return Promise.reject(new StepUpError('error'));
      }

      // Resolve the effective type from options.
      // If both `type` and `tier` are provided, `type` wins (per spec).
      let effectiveType: 'password' | 'mfa';
      if (options.type) {
        effectiveType = options.type;
      } else if (options.tier === 'high') {
        // TODO: In a future enhancement, probe MFA enrollment from cached
        // current_user() TanStack Query data before falling back to 'password'.
        // For now, tier: 'high' defaults to 'password' (safest conservative fallback).
        // The StepUpDialog's requireStepUp query will handle the skip-if-still-valid path.
        effectiveType = 'password';
      } else {
        // tier: 'medium' always means password
        effectiveType = 'password';
      }

      // Merge per-call messages onto global defaults.
      const mergedMessages: StepUpDialogMessageOverrides | undefined =
        options.messages || globalMessages
          ? { ...globalMessages, ...options.messages, errors: { ...globalMessages?.errors, ...options.messages?.errors } }
          : undefined;

      return new Promise<void>((resolve, reject) => {
        pendingResolveRef.current = resolve;
        pendingRejectRef.current = reject;
        setDialogState({ open: true, type: effectiveType, messages: mergedMessages });
      });
    },
    [globalMessages]
  );

  function handleVerify(result: StepUpResult) {
    const resolve = pendingResolveRef.current;
    const reject = pendingRejectRef.current;
    pendingResolveRef.current = null;
    pendingRejectRef.current = null;
    setDialogState((prev) => ({ ...prev, open: false }));

    if (result.ok) {
      resolve?.();
    } else {
      reject?.(new StepUpError(result.reason, result.reason === 'error' ? (result as { error?: unknown }).error : undefined));
    }
  }

  const contextValue: StepUpContextValue = { stepUp };

  return (
    <StepUpContext.Provider value={contextValue}>
      {children}
      <StepUpDialog
        open={dialogState.open}
        type={dialogState.type}
        messages={dialogState.messages}
        onVerify={handleVerify}
      />
    </StepUpContext.Provider>
  );
}
