'use client';

/**
 * verify-email-page  (registry: auth-verify-email-page)
 *
 * One-time email verification page. Reads `?email_id=` and `?token=` from the
 * URL (placed there by the link sent from `send_verification_email`). On mount,
 * calls `constructive_auth_public.verify_email` via the generated hook and
 * transitions through: loading → success | expired | invalid | missing-params.
 *
 * DATA PATH:
 *   • `useVerifyEmailMutation`          — from `@/generated/auth`
 *   • `useSendVerificationEmailMutation` — from `@/generated/auth` (resend CTA)
 * No fetch, no GraphQL document, no client bootstrap in this file.
 *
 * NOTES:
 *   • `VerifyEmailPayload.result` is a boolean (not a nested object) — the
 *     block reads `d.verifyEmail?.result` directly.
 *   • `SendVerificationEmailInput.email` accepts `ConstructiveInternalTypeEmail`
 *     (citext). The 'expired' state resend requires the user's email — since
 *     only `email_id` (UUID) is available from the URL, the resend CTA is
 *     conditionally rendered only when `email` is provided via an `email` prop,
 *     or falls back to showing a sign-in link. (See spec TODO: confirm if
 *     send_verification_email accepts email_id directly.)
 *   • Pages may use next/navigation (block-contract.md §2, §6).
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@constructive-io/ui/card';
import { Button } from '@constructive-io/ui/button';

import { cn } from '@/lib/utils';
import { useVerifyEmailMutation } from '@/generated/auth';
import { useSendVerificationEmailMutation } from '@/generated/auth';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';

import { defaultVerifyEmailPageMessages, type VerifyEmailPageMessages } from './messages';

/** Internal page state machine */
type PageState = 'loading' | 'success' | 'expired' | 'invalid' | 'missing-params';

/**
 * Message overrides. Top-level is shallow-partial; `errors` is itself partial.
 */
export type VerifyEmailPageMessageOverrides = Partial<Omit<VerifyEmailPageMessages, 'errors'>> & {
  errors?: Partial<VerifyEmailPageMessages['errors']>;
};

export type VerifyEmailPageProps = {
  /**
   * Optional: the email address to pre-fill for the resend call.
   * When provided, the 'expired' state shows a "Resend" button.
   * When absent, the 'expired' state shows only the sign-in link.
   * (send_verification_email requires an email — the URL only carries email_id.)
   */
  email?: string;
  messages?: VerifyEmailPageMessageOverrides;
  /** Link to the sign-in page; default '/auth/sign-in'. */
  signInHref?: string;
  /** Link to the dashboard for the success CTA; default '/dashboard'. */
  dashboardHref?: string;
  /**
   * Override the verifyEmail call. Receives the same vars.
   * Useful for non-Constructive backends or Storybook states.
   */
  onSubmit?: (vars: { emailId: string; token: string }) => Promise<boolean | null>;
  /** Fires after successful verification. Always fires on success. */
  onSuccess?: () => void;
  /** Fires after a mapped verification error. Always fires. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam. Always fires. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

const SIGN_IN_PATH = '/auth/sign-in';
const DASHBOARD_PATH = '/dashboard';

export function VerifyEmailPage({
  email,
  messages: messageOverrides,
  signInHref = SIGN_IN_PATH,
  dashboardHref = DASHBOARD_PATH,
  onSubmit: onSubmitOverride,
  onSuccess,
  onError,
  onMessage,
  className
}: VerifyEmailPageProps) {
  // Deep merge: top-level copy + errors map merged separately.
  const merged: VerifyEmailPageMessages = {
    ...defaultVerifyEmailPageMessages,
    ...messageOverrides,
    errors: { ...defaultVerifyEmailPageMessages.errors, ...messageOverrides?.errors }
  };

  const searchParams = useSearchParams();
  const emailId = searchParams.get('email_id');
  const token = searchParams.get('token');

  const [pageState, setPageState] = useState<PageState>(() =>
    !emailId || !token ? 'missing-params' : 'loading'
  );
  const [resendStatus, setResendStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  // Hybrid pending for override path.
  const [overridePending, setOverridePending] = useState(false);

  // Generated hooks — always called (React hooks rule), but only used based on state.
  const defaultVerifyMutation = useVerifyEmailMutation({
    selection: { fields: { result: true } }
  });

  const sendVerificationMutation = useSendVerificationEmailMutation({
    selection: { fields: { result: true } }
  });

  // Fire on mount when params are present.
  useEffect(() => {
    if (!emailId || !token) return;

    async function runVerify() {
      if (onSubmitOverride) setOverridePending(true);
      try {
        let result: boolean | null;
        if (onSubmitOverride) {
          result = await onSubmitOverride({ emailId: emailId!, token: token! });
        } else {
          const data = await defaultVerifyMutation.mutateAsync({
            input: { emailId: emailId!, token: token! }
          });
          if (data.verifyEmail == null) throw new Error('UNKNOWN_ERROR');
          result = data.verifyEmail.result ?? null;
        }

        if (result === true) {
          setPageState('success');
          onSuccess?.();
          onMessage?.({ kind: 'success', key: 'verifyEmail.success' });
        } else {
          // result === false → invalid (e.g. already used or mismatched)
          setPageState('invalid');
          const message = merged.errors.INVALID_TOKEN;
          onError?.({ message, code: 'INVALID_TOKEN' });
          onMessage?.({ kind: 'error', key: 'INVALID_TOKEN', message });
        }
      } catch (err) {
        const { code, message } = parseGraphQLError(err, {
          customMessages: merged.errors,
          defaultMessage: merged.errors.UNKNOWN_ERROR
        });
        const key = code ?? 'UNKNOWN_ERROR';

        if (code === 'EXPIRED_TOKEN') {
          setPageState('expired');
          onMessage?.({ kind: 'warning', key, message });
        } else {
          setPageState('invalid');
          onError?.({ message, code: key });
          onMessage?.({ kind: 'error', key, message });
        }
      } finally {
        if (onSubmitOverride) setOverridePending(false);
      }
    }

    runVerify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleResend() {
    if (!email) return;
    setResendStatus('pending');
    setResendMessage(null);
    try {
      await sendVerificationMutation.mutateAsync({
        input: { email }
      });
      setResendStatus('success');
      setResendMessage(merged.expiredResendSuccess);
      onMessage?.({ kind: 'info', key: 'resend.success', message: merged.expiredResendSuccess });
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      setResendStatus('error');
      setResendMessage(message);
      onError?.({ message, code: code ?? 'UNKNOWN_ERROR' });
      onMessage?.({ kind: 'error', key: code ?? 'UNKNOWN_ERROR', message });
    }
  }

  const isVerifying =
    pageState === 'loading' && (onSubmitOverride ? overridePending : defaultVerifyMutation.isPending);
  const isResendPending = sendVerificationMutation.isPending && resendStatus === 'pending';

  return (
    <div
      data-slot="verify-email-page"
      className={cn('w-full max-w-sm mx-auto', className)}
    >
      {pageState === 'loading' && (
        <Card aria-busy={isVerifying}>
          <CardHeader>
            <CardTitle>{merged.loadingTitle}</CardTitle>
            <CardDescription>{merged.loadingDescription}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {pageState === 'success' && (
        <Card>
          <CardHeader>
            <CardTitle>{merged.successTitle}</CardTitle>
            <CardDescription>{merged.successDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={dashboardHref}>{merged.successCta}</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {pageState === 'expired' && (
        <Card>
          <CardHeader>
            <CardTitle>{merged.expiredTitle}</CardTitle>
            <CardDescription>{merged.expiredDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {resendMessage && (
              <p
                role="status"
                aria-live="polite"
                className={cn(
                  'text-sm',
                  resendStatus === 'success' ? 'text-foreground' : 'text-destructive'
                )}
              >
                {resendMessage}
              </p>
            )}
            {email && resendStatus !== 'success' && (
              <Button
                className="w-full"
                disabled={isResendPending}
                onClick={handleResend}
                data-testid="resend-button"
              >
                {isResendPending ? merged.expiredResendPending : merged.expiredResendButton}
              </Button>
            )}
            <Button variant="outline" asChild className="w-full">
              <a href={signInHref}>{merged.invalidSignInLink}</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {pageState === 'invalid' && (
        <Card>
          <CardHeader>
            <CardTitle>{merged.invalidTitle}</CardTitle>
            <CardDescription>{merged.invalidDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full">
              <a href={signInHref}>{merged.invalidSignInLink}</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {pageState === 'missing-params' && (
        <Card>
          <CardHeader>
            <CardTitle>{merged.missingParamsTitle}</CardTitle>
            <CardDescription>{merged.missingParamsDescription}</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
