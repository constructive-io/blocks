'use client';

/**
 * verify-email-banner  (registry: auth-verify-email-banner)
 *
 * Dismissible top-of-page banner for authenticated users whose primary email
 * is not yet verified. Includes a "Resend verification email" CTA backed by
 * the host's generated `useSendVerificationEmailMutation` hook.
 *
 * Data path = the generated React-Query hook `useSendVerificationEmailMutation`,
 * imported from `@/generated/auth` and called with a `selection` field-picker.
 * No fetch, no GraphQL document string, no `@constructive-io/data`, no hardcoded
 * URL. No client bootstrap: never calls `configure()`/`getClient()`, never
 * mounts a `QueryClientProvider` — the host's `blocks-runtime` handles all
 * wiring at app root.
 *
 * Override seam: `onResend` fully replaces the generated-hook call, keeping
 * the block portable to non-Constructive backends.
 */

import { useState } from 'react';

import { CheckCircleIcon, MailIcon, XIcon } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';

import { cn } from '@/lib/utils';
import { useSendVerificationEmailMutation } from '@/generated/auth';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';

import {
  defaultVerifyEmailBannerMessages,
  type VerifyEmailBannerMessageOverrides,
  type VerifyEmailBannerMessages
} from './messages';

/** Props for VerifyEmailBanner. */
export type VerifyEmailBannerProps = {
  /** Primary email to resend verification to. Required for the resend CTA. */
  email: string;
  /**
   * Control dismissal externally. When provided the banner uses this as
   * controlled state and does not maintain its own dismissed flag.
   */
  dismissed?: boolean;
  /** Fires when user clicks the dismiss button. */
  onDismiss?: () => void;
  /** Show the resend CTA. Default: true */
  showResendButton?: boolean;
  messages?: VerifyEmailBannerMessageOverrides;
  /** Replace the default `useSendVerificationEmailMutation` call. */
  onResend?: (email: string) => Promise<boolean>;
  /** Fires after resend succeeds. Banner remains visible (user still unverified). */
  onSuccess?: (email: string) => void;
  /** Fires after a mapped error. Always fires. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success and mapped errors. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

export function VerifyEmailBanner({
  email,
  dismissed: dismissedProp,
  onDismiss,
  showResendButton = true,
  messages: messageOverrides,
  onResend: onResendOverride,
  onSuccess,
  onError,
  onMessage,
  className
}: VerifyEmailBannerProps) {
  // Deep merge: top-level copy + the errors map merged separately.
  const merged: VerifyEmailBannerMessages = {
    ...defaultVerifyEmailBannerMessages,
    ...messageOverrides,
    errors: { ...defaultVerifyEmailBannerMessages.errors, ...messageOverrides?.errors }
  };

  // Dismissal: controlled when `dismissed` prop is provided, otherwise internal.
  const [isDismissedInternal, setIsDismissedInternal] = useState(false);
  const isDismissed = dismissedProp !== undefined ? dismissedProp : isDismissedInternal;

  // Generated hook from the host's `auth` SDK.
  // `sendVerificationEmail` returns a payload with `result: boolean | null`.
  const defaultMutation = useSendVerificationEmailMutation({
    selection: {
      fields: {
        result: true
      }
    }
  });

  // Hybrid pending: the generated hook tracks its own; the override path does not.
  const [overridePending, setOverridePending] = useState(false);
  const isPending = onResendOverride ? overridePending : defaultMutation.isPending;

  const [inlineError, setInlineError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);

  if (isDismissed) return null;

  function handleDismiss() {
    if (dismissedProp === undefined) {
      setIsDismissedInternal(true);
    }
    onDismiss?.();
  }

  async function handleResend() {
    setInlineError(null);
    setResendSuccess(false);
    if (onResendOverride) setOverridePending(true);
    try {
      if (onResendOverride) {
        await onResendOverride(email);
      } else {
        // The hook takes `{ input }` with the email nested; payload wraps the
        // boolean under `sendVerificationEmail.result` (verified against the
        // generated `.d.ts`).
        await defaultMutation.mutateAsync({ input: { email } });
      }

      setResendSuccess(true);
      onSuccess?.(email);
      onMessage?.({ kind: 'success', key: 'resendSuccess', message: merged.resendSuccess });
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setInlineError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    } finally {
      if (onResendOverride) setOverridePending(false);
    }
  }

  return (
    <div
      data-slot="verify-email-banner"
      role="status"
      className={cn('w-full max-w-sm mx-auto', className)}
    >
      <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
        <MailIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />

        <div className="flex-1 space-y-2">
          <p className="text-pretty text-sm leading-snug">{merged.text}</p>

          {inlineError && (
            <AuthErrorAlert error={inlineError} />
          )}

          {resendSuccess && (
            <p
              aria-live="polite"
              className="text-pretty flex items-center gap-1.5 text-sm font-medium text-green-700 dark:text-green-400"
            >
              <CheckCircleIcon className="size-3.5 shrink-0" aria-hidden="true" />
              {merged.resendSuccess}
            </p>
          )}

          {showResendButton && !resendSuccess && (
            <Button
              variant="link"
              size="sm"
              className="min-h-11 px-2 py-0 text-sm font-medium text-amber-700 hover:text-amber-900 hover:no-underline dark:text-amber-400 dark:hover:text-amber-200 sm:min-h-10"
              disabled={isPending}
              aria-busy={isPending}
              onClick={handleResend}
              data-testid="resend-button"
            >
              {isPending ? merged.resendPending : merged.resendButton}
            </Button>
          )}
        </div>

        <button
          type="button"
          aria-label={merged.dismissLabel}
          onClick={handleDismiss}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-amber-600 transition-[color,background-color,scale] duration-150 ease-out hover:bg-amber-100 hover:text-amber-900 motion-safe:active:scale-[0.96] motion-reduce:transition-none dark:text-amber-400 dark:hover:bg-amber-900/30 dark:hover:text-amber-200 sm:size-10"
          data-testid="dismiss-button"
        >
          <XIcon className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
