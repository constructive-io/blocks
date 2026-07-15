'use client';

/**
 * account-deletion-confirm-page  (registry: auth-account-deletion-confirm-page)
 *
 * Next.js page that handles the /auth/delete-account?token=…&user_id=… link
 * from the deletion confirmation email. Calls `confirmDeleteAccount` once on
 * mount and renders three outcome states:
 *
 *   • processing  — spinner while the mutation is in-flight
 *   • success     — account deleted; redirects to sign-in after 2 s
 *   • error       — expired or invalid token (inline state, no redirect)
 *
 * Data path: generated hook `useConfirmDeleteAccountMutation` imported from
 * `@/generated/auth`. No fetch, no GraphQL document string, no client bootstrap.
 *
 * Binding doctrine: sdk-binding-contract.md §3–§7
 * Canonical anatomy: MASTER-PROMPT §5
 *
 * Editable constants after install:
 *   const DEFAULT_REDIRECT        = '/auth/sign-in';
 *   const ACCOUNT_SETTINGS_HREF   = '/account/settings';
 *   const REDIRECT_DELAY_MS       = 2000;
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@constructive-io/ui/card';
import { Button } from '@constructive-io/ui/button';

import { cn } from '@/lib/utils';
import { useConfirmDeleteAccountMutation } from '@/generated/auth';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';

import {
  defaultAccountDeletionConfirmMessages,
  type AccountDeletionConfirmMessages
} from './messages';

// ---------------------------------------------------------------------------
// Editable constants (installed page — consumer modifies these in place)
// ---------------------------------------------------------------------------
const DEFAULT_REDIRECT = '/auth/sign-in';
const ACCOUNT_SETTINGS_HREF = '/account/settings';
const REDIRECT_DELAY_MS = 2000;

// ---------------------------------------------------------------------------
// Outcome states
// ---------------------------------------------------------------------------

type ConfirmStatus = 'pending' | 'success' | 'expired' | 'invalid' | 'error';

// ---------------------------------------------------------------------------
// Error code → status mapping
// ---------------------------------------------------------------------------

const EXPIRED_CODES = new Set(['TOKEN_EXPIRED', 'LINK_EXPIRED', 'DELETION_TOKEN_EXPIRED']);
const INVALID_CODES = new Set([
  'TOKEN_INVALID',
  'LINK_INVALID',
  'INVALID_TOKEN',
  'TOKEN_ALREADY_USED',
  'DELETION_TOKEN_INVALID'
]);

function codeToStatus(code: string | null): 'expired' | 'invalid' | 'error' {
  if (code && EXPIRED_CODES.has(code)) return 'expired';
  if (code && INVALID_CODES.has(code)) return 'invalid';
  return 'error';
}

/**
 * Extract the raw error code from an error object before parseGraphQLError
 * may strip it (parseGraphQLError returns code: null for unknown codes).
 * Used for status routing (expired vs invalid vs generic error).
 */
function extractRawCode(err: unknown): string | null {
  if (!err || typeof err !== 'object') return null;
  const e = err as Record<string, unknown>;
  // extensions.code (GraphQL format)
  if (e.extensions && typeof e.extensions === 'object') {
    const ext = e.extensions as Record<string, unknown>;
    if (typeof ext.code === 'string') return ext.code;
  }
  // .errors[0].extensions.code (GraphQLRequestError format)
  if (Array.isArray(e.errors) && e.errors.length > 0) {
    const first = e.errors[0] as Record<string, unknown>;
    if (first.extensions && typeof first.extensions === 'object') {
      const ext = first.extensions as Record<string, unknown>;
      if (typeof ext.code === 'string') return ext.code;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Message overrides type
// ---------------------------------------------------------------------------

export type AccountDeletionConfirmMessageOverrides = Partial<Omit<AccountDeletionConfirmMessages, 'errors'>> & {
  errors?: Partial<AccountDeletionConfirmMessages['errors']>;
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type AccountDeletionConfirmPageProps = {
  /** Deletion token read from URL query param `token`. */
  token: string;
  /** User id read from URL query param `user_id`. */
  userId: string;
  messages?: AccountDeletionConfirmMessageOverrides;
  /** Path to redirect to after successful deletion. Defaults to `/auth/sign-in`. */
  redirectTo?: string;
  /**
   * Override the account settings href shown in the expired-token CTA.
   * Defaults to `/account/settings`.
   * v1 extension — not in the base spec `AccountDeletionConfirmViewProps`.
   */
  accountSettingsHref?: string;
  /** Replace the default `useConfirmDeleteAccountMutation` call. */
  onSubmit?: (vars: { userId: string; token: string }) => Promise<boolean | null>;
  /** Fires after successful deletion (before redirect). */
  onSuccess?: (result: { userId: string }) => void;
  /** Fires on expired token error. */
  onExpired?: () => void;
  /** Fires on invalid or already-used token error. */
  onInvalid?: () => void;
  /** Fires after a mapped error. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success, errors, and non-fatal branches. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AccountDeletionConfirmPage({
  token,
  userId,
  messages: messageOverrides,
  redirectTo = DEFAULT_REDIRECT,
  accountSettingsHref = ACCOUNT_SETTINGS_HREF,
  onSubmit: onSubmitOverride,
  onSuccess,
  onExpired,
  onInvalid,
  onError,
  onMessage,
  className
}: AccountDeletionConfirmPageProps) {
  // Deep merge
  const merged: AccountDeletionConfirmMessages = {
    ...defaultAccountDeletionConfirmMessages,
    ...messageOverrides,
    errors: { ...defaultAccountDeletionConfirmMessages.errors, ...messageOverrides?.errors }
  };

  const router = useRouter();

  // Track outcome state
  const [status, setStatus] = useState<ConfirmStatus>('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Generated hook — no client bootstrap, no provider
  const defaultMutation = useConfirmDeleteAccountMutation({
    selection: { fields: { result: true } }
  });

  // Override pending state
  const [overridePending, setOverridePending] = useState(false);

  // The irreversible confirmation request is shared across Strict Mode effect
  // replays, while each effect setup owns whether it may commit the result.
  const confirmationPromiseRef = useRef<Promise<boolean | null> | null>(null);

  useEffect(() => {
    let active = true;
    let redirectTimer: ReturnType<typeof setTimeout> | null = null;

    // Guard: missing params → invalid state immediately, no API call
    if (!userId || !token) {
      setStatus('invalid');
      return () => {
        active = false;
        if (redirectTimer !== null) clearTimeout(redirectTimer);
      };
    }

    async function startConfirmation(): Promise<boolean | null> {
      if (onSubmitOverride) {
        setOverridePending(true);
        return onSubmitOverride({ userId, token });
      }

      const data = await defaultMutation.mutateAsync({ input: { userId, token } });
      return data.confirmDeleteAccount?.result ?? null;
    }

    confirmationPromiseRef.current ??= startConfirmation();
    const confirmationPromise = confirmationPromiseRef.current;

    void confirmationPromise
      .then((deleted) => {
        if (!active) return;
        if (onSubmitOverride) setOverridePending(false);

        if (deleted) {
          setStatus('success');
          onMessage?.({ kind: 'success', key: 'confirmDeleteAccount.success' });
          onSuccess?.({ userId });
          // Redirect after a brief delay so the user sees the success state.
          redirectTimer = setTimeout(() => {
            if (active) router.push(redirectTo);
          }, REDIRECT_DELAY_MS);
        } else {
          // Server returned false / null without throwing → treat as invalid
          setStatus('invalid');
          const msg = merged.errors.UNKNOWN_ERROR;
          setErrorMessage(msg);
          onMessage?.({ kind: 'error', key: 'UNKNOWN_ERROR', message: msg });
          onInvalid?.();
          onError?.({ message: msg, code: 'UNKNOWN_ERROR' });
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (onSubmitOverride) setOverridePending(false);
        // extractRawCode reads the code BEFORE parseGraphQLError may strip it
        // for unknown codes (parseGraphQLError returns code: null when the code
        // is not in ERROR_CODES, which means TOKEN_EXPIRED etc. are unknown).
        const rawCode = extractRawCode(err);
        const parsed = parseGraphQLError(err, {
          customMessages: merged.errors,
          defaultMessage: merged.errors.UNKNOWN_ERROR
        });
        // Use rawCode for status routing (covers expired/invalid token codes),
        // but use parsed code as the notification key (fallback to rawCode if null).
        const notifyCode = parsed.code ?? rawCode ?? 'UNKNOWN_ERROR';
        // When there is no recognised code at all, fall back to the UNKNOWN_ERROR
        // message from the messages catalog so overrides work end-to-end.
        const displayMessage =
          parsed.code !== null ? parsed.message : (merged.errors.UNKNOWN_ERROR ?? parsed.message);
        const derivedStatus = codeToStatus(rawCode);
        setStatus(derivedStatus);
        // For expired/invalid, suppress the redundant generic error message
        // — the state already renders its own descriptive heading + description.
        setErrorMessage(derivedStatus === 'expired' || derivedStatus === 'invalid' ? null : displayMessage);
        onMessage?.({ kind: 'error', key: notifyCode, message: displayMessage });
        if (derivedStatus === 'expired') onExpired?.();
        else if (derivedStatus === 'invalid') onInvalid?.();
        onError?.({ message: displayMessage, code: notifyCode });
      });

    return () => {
      active = false;
      if (redirectTimer !== null) clearTimeout(redirectTimer);
    };
    // Intentionally snapshot the initial token, user, mutation, handlers, messages,
    // router, and redirect target: a confirmation link is processed only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isPending = onSubmitOverride ? overridePending : defaultMutation.isPending;

  return (
    <main
      data-slot="account-deletion-confirm-page"
      className={cn('flex min-h-svh w-full flex-col items-center justify-center bg-background px-4 py-12', className)}
    >
      <Card className="w-full max-w-md mx-auto">
        {/* Processing state */}
        {(status === 'pending' || isPending) && (
          <>
            <CardHeader>
              <CardTitle>{merged.processingTitle}</CardTitle>
              <CardDescription>{merged.processingDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                role="status"
                aria-label="Processing deletion"
                className="flex justify-center py-4"
                aria-busy="true"
              >
                <svg
                  className="size-8 animate-spin text-muted-foreground"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              </div>
            </CardContent>
          </>
        )}

        {/* Success state */}
        {status === 'success' && (
          <>
            <CardHeader>
              <CardTitle>{merged.successTitle}</CardTitle>
              <CardDescription>{merged.successDescription}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild className="w-full">
                <a href={redirectTo} data-testid="success-cta">
                  {merged.successButton}
                </a>
              </Button>
            </CardFooter>
          </>
        )}

        {/* Expired state */}
        {status === 'expired' && (
          <>
            <CardHeader>
              <CardTitle>{merged.expiredTitle}</CardTitle>
              <CardDescription>{merged.expiredDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <AuthErrorAlert error={errorMessage} />
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                <a href={accountSettingsHref} data-testid="expired-cta">
                  {merged.expiredButton}
                </a>
              </Button>
            </CardFooter>
          </>
        )}

        {/* Invalid / error state */}
        {(status === 'invalid' || status === 'error') && (
          <>
            <CardHeader>
              <CardTitle>{merged.invalidTitle}</CardTitle>
              <CardDescription>{merged.invalidDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <AuthErrorAlert error={errorMessage} />
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                <a href={redirectTo} data-testid="invalid-cta">
                  {merged.invalidButton}
                </a>
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </main>
  );
}
