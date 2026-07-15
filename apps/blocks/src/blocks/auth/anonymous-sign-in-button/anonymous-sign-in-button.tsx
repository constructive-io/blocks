'use client';

/**
 * anonymous-sign-in-button  (registry: auth-anonymous-sign-in-button)
 *
 * Single-click guest session button. Creates an anonymous session
 * (sessions.is_anonymous=true) without requiring any credentials.
 *
 * BACKEND-PENDING — CASE (b):
 * The `anonymous_sign_in` procedure is not yet deployed in
 * `constructive_auth_public`, so `useAnonymousSignInMutation` does NOT exist
 * in the generated `@/generated/auth` SDK yet. To keep tsc clean, the
 * @/generated/auth import is omitted until the proc ships and codegen is re-run.
 *
 * The `onSubmit` override seam is therefore the PRIMARY path (required for
 * production use until backend ships). Once the backend procedure is deployed:
 * 1. Re-run `cnc codegen --api-names auth --react-query --orm -o src/generated`
 * 2. Uncomment the `useAnonymousSignInMutation` import below
 * 3. Remove the compile-time guard block
 *
 * Data-binding doctrine: sdk-binding-contract.md §5, §10 (gap honesty).
 * No fetch, no GraphQL document string, no configure()/getClient(), no
 * QueryClientProvider — all wiring is done by @constructive/blocks-runtime.
 *
 * Anonymous session upgrade (convert to a real account) is a separate flow
 * not provided by this block. Consumers are responsible for hiding this button
 * when app_settings_auth.allow_anonymous_sessions is false.
 */

import { useState } from 'react';

// BACKEND-PENDING: Uncomment this import once the anonymous_sign_in proc ships
// and cnc codegen has been re-run. The hook name (verified by contract) is:
//   useAnonymousSignInMutation  (from @/generated/auth)
// import { useAnonymousSignInMutation } from '@/generated/auth';

import { cn } from '@/lib/utils';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';
import { AuthLoadingButton } from '@/blocks/primitives/auth-loading-button';

import {
  defaultAnonymousSignInButtonMessages,
  type AnonymousSignInButtonMessageOverrides
} from './messages';

/** The result shape returned from the anonymous sign-in call. */
export type AnonymousSignInResult = {
  id: string;
  userId: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  isAnonymous: true;
};

export type AnonymousSignInButtonProps = {
  /** Button text override (uses messages.buttonText by default). */
  children?: React.ReactNode;
  /** Credential kind sent to the API (default `'bearer'`). */
  credentialKind?: 'bearer' | 'cookie';
  /** Whether to create a persistent session (default false for guest). */
  rememberMe?: boolean;
  messages?: AnonymousSignInButtonMessageOverrides;
  /** Button visual variant (passed to the underlying Button). */
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  /**
   * Replace the default `useAnonymousSignInMutation` call.
   * REQUIRED until `anonymous_sign_in` backend procedure ships.
   * The host wires the generated binding after regenerating the SDK.
   */
  onSubmit?: () => Promise<AnonymousSignInResult>;
  /** Fires after a resolved anonymous sign-in. Always fires. */
  onSuccess?: (result: AnonymousSignInResult) => void;
  /** Fires after a mapped error. Always fires. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success and mapped errors. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

export function AnonymousSignInButton({
  children,
  credentialKind = 'bearer',
  rememberMe = false,
  messages: messageOverrides,
  variant = 'outline',
  onSubmit: onSubmitOverride,
  onSuccess,
  onError,
  onMessage,
  className
}: AnonymousSignInButtonProps) {
  // Deep merge: top-level copy + the errors map merged separately.
  const merged = {
    ...defaultAnonymousSignInButtonMessages,
    ...messageOverrides,
    errors: { ...defaultAnonymousSignInButtonMessages.errors, ...messageOverrides?.errors }
  };

  // BACKEND-PENDING (Case b): the generated hook is not yet in the SDK, so we
  // cannot instantiate useAnonymousSignInMutation here. Once the proc ships,
  // replace the stub below with:
  //
  //   const defaultMutation = useAnonymousSignInMutation({
  //     selection: {
  //       fields: {
  //         id: true,
  //         userId: true,
  //         accessToken: true,
  //         accessTokenExpiresAt: true,
  //       }
  //     }
  //   });
  //
  // And update runAnonymousSignIn to:
  //   const data = await defaultMutation.mutateAsync({ input: { rememberMe, credentialKind } });
  //   return data.anonymousSignIn as AnonymousSignInResult;
  //
  // Hybrid pending: onSubmitOverride ? overridePending : defaultMutation.isPending

  const [overridePending, setOverridePending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // While the backend is pending, isPending tracks only the override path.
  // When the default mutation is restored, swap to the hybrid pattern.
  const isPending = overridePending;

  async function handleClick() {
    setError(null);

    if (!onSubmitOverride) {
      // Backend pending — surface PROCEDURE_NOT_FOUND as a clear message.
      const msg = merged.errors.PROCEDURE_NOT_FOUND;
      const code = 'PROCEDURE_NOT_FOUND';
      setError(msg);
      onMessage?.({ kind: 'error', key: code, message: msg });
      onError?.({ message: msg, code });
      return;
    }

    setOverridePending(true);
    try {
      const result = await onSubmitOverride();
      onMessage?.({ kind: 'success', key: 'anonymousSignIn.success', message: merged.successMessage });
      onSuccess?.(result);
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    } finally {
      setOverridePending(false);
    }
  }

  return (
    <div data-slot="anonymous-sign-in-button" className={cn('w-full max-w-sm mx-auto', className)}>
      <AuthErrorAlert error={error} />
      <AuthLoadingButton
        type="button"
        variant={variant}
        className="w-full mt-1"
        isLoading={isPending}
        loadingText={merged.buttonPending}
        aria-busy={isPending}
        onClick={handleClick}
        data-testid="anonymous-sign-in-button"
      >
        {children ?? merged.buttonText}
      </AuthLoadingButton>
    </div>
  );
}
