'use client';

/**
 * email-otp-request-card  (registry: auth-email-otp-request-card)
 *
 * Email-only form that sends a one-time passcode to the user's email. On success
 * it transitions to a "code sent" confirmation panel within the same card
 * — NO navigation/redirect. The confirmation copy interpolates the submitted
 * email address. A "Resend code" button in the confirmed state calls the same path.
 *
 * BACKEND-PENDING — CASE (b): `send_email_otp` is not yet deployed in
 * `constructive_auth_public` and the generated `useSendEmailOtpMutation` hook
 * does NOT exist in the reference SDK. This block therefore:
 *   • Does NOT import from `@/generated/auth` (no hook to import — tsc would fail).
 *   • Makes `onSubmit` the primary/required network path: the host wires the
 *     generated binding after running `cnc codegen --api-names auth ...`.
 *   • The stub default path throws a typed PROCEDURE_NOT_FOUND error so the
 *     block behaves gracefully (shows the error message) if accidentally mounted
 *     without the override.
 *   • `requires.json` names the pending op so `check-sdk.mjs` fails clearly.
 *   • `PROCEDURE_NOT_FOUND` is in `messages.errors`.
 *
 * When the backend ships and the host regenerates the SDK, replace the stub
 * `defaultRunSend` with:
 *   import { useSendEmailOtpMutation } from '@/generated/auth';
 *   const defaultMutation = useSendEmailOtpMutation({ selection: { fields: { clientMutationId: true } } });
 *   const [overridePending, setOverridePending] = useState(false);
 *   const isPending = onSubmitOverride ? overridePending : defaultMutation.isPending;
 *   async function defaultRunSend(vars: EmailOtpRequestVars): Promise<void> {
 *     await defaultMutation.mutateAsync({ input: vars }).then((d) => d.sendEmailOtp);
 *   }
 * and gate setOverridePending on onSubmitOverride (see sign-in-card.tsx).
 *
 * (`send_email_otp` returns void — no payload fields to select.)
 *
 * NO QueryClientProvider, NO configure(), NO fetch, NO GraphQL document strings.
 * The host mounts `blocks-runtime` once at app root; that is the single wiring
 * point. This block joins it as soon as the generated hook ships.
 */

import { useRef, useState } from 'react';
import { useForm } from '@tanstack/react-form';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@constructive-io/ui/card';
import { Button } from '@constructive-io/ui/button';

import { cn } from '@/lib/utils';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/blocks/lib/schemas';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';
import { AuthLoadingButton } from '@/blocks/primitives/auth-loading-button';
import { FormField } from '@/blocks/primitives/form-field';
import { EmailOtpInput } from '../email-otp-input/email-otp-input';

import { defaultEmailOtpRequestCardMessages, type EmailOtpRequestCardMessages } from './messages';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * OTP type discriminator. Passed as the `type` param to send_email_otp.
 * Server-defined semantics; the block surfaces them via `otpType`.
 */
export type OtpType = 'sign_in' | 'verify' | 'reset' | 'change_email';

/** Variables the send-OTP call receives. The `onSubmit` override gets these verbatim. */
export type EmailOtpRequestVars = {
  email: string;
  type: OtpType;
};

/**
 * Message overrides. Top-level copy is shallow-partial; `errors` is itself
 * partial so a host can localize a single error code without restating the map.
 */
export type EmailOtpRequestCardMessageOverrides = Partial<Omit<EmailOtpRequestCardMessages, 'errors'>> & {
  errors?: Partial<EmailOtpRequestCardMessages['errors']>;
};

export type EmailOtpRequestCardProps = {
  /**
   * OTP type discriminator. Passed as 'type' param to send_email_otp.
   * Default: 'sign_in'
   */
  otpType?: OtpType;
  /** Pre-fill the email field (e.g. from a query param). */
  defaultEmail?: string;
  /**
   * When true (default), renders [[auth-email-otp-input]] inline in the
   * code-sent state, passing `email` down for code entry.
   * When false, only shows confirmation message + resend button; the host
   * handles navigation to code entry via `onSuccess`.
   * Default: true
   */
  showOtpInputInline?: boolean;
  messages?: EmailOtpRequestCardMessageOverrides;
  /** Href for the back-to-sign-in link. Rendered as plain `<a>` when provided. */
  signInHref?: string;
  /**
   * Replace the default mutation call. Receives the same vars.
   *
   * BACKEND-PENDING: Until `send_email_otp` is deployed and the host has
   * regenerated its auth SDK, this prop is the ONLY way to wire a real network
   * call. After codegen, the host may drop this prop and let the generated hook
   * (`useSendEmailOtpMutation`) take over via `blocks-runtime`.
   */
  onSubmit?: (vars: EmailOtpRequestVars) => Promise<void>;
  /** Fires after a resolved send-OTP call. Always fires on success. */
  onSuccess?: (vars: { email: string }) => void;
  /** Fires after a mapped error. Always fires on error. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success, mapped errors, and resend. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type CardState = 'form' | 'code-sent';

/** Replaces all `{{email}}` tokens in a template string. */
function interpolateEmail(template: string, email: string): string {
  return template.replace(/\{\{email\}\}/g, email);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmailOtpRequestCard({
  otpType = 'sign_in',
  defaultEmail,
  showOtpInputInline = true,
  messages: messageOverrides,
  signInHref,
  onSubmit: onSubmitOverride,
  onSuccess,
  onError,
  onMessage,
  className
}: EmailOtpRequestCardProps) {
  // Deep merge: top-level copy + errors map merged separately.
  const merged: EmailOtpRequestCardMessages = {
    ...defaultEmailOtpRequestCardMessages,
    ...messageOverrides,
    errors: { ...defaultEmailOtpRequestCardMessages.errors, ...messageOverrides?.errors }
  };

  // ---------------------------------------------------------------------------
  // BACKEND-PENDING stub (CASE b)
  //
  // The generated `useSendEmailOtpMutation` does not exist yet. We provide a
  // stub that throws PROCEDURE_NOT_FOUND so the block is self-describing when
  // mounted without an `onSubmit` override. Replace this section with the real
  // generated hook once the proc ships and the host regenerates its auth SDK.
  // ---------------------------------------------------------------------------
  const [overridePending, setOverridePending] = useState(false);

  // Hybrid pending: when override is provided, track it; otherwise the stub always
  // returns synchronously (PROCEDURE_NOT_FOUND), so pending is always false.
  const isPending = onSubmitOverride ? overridePending : false;

  // Resend has its own pending state; it reuses the same run path.
  const [resendPending, setResendPending] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [cardState, setCardState] = useState<CardState>('form');
  const submittedEmailRef = useRef<string>('');
  const confirmationFocusRef = useRef<HTMLDivElement>(null);

  async function defaultRunSend(_vars: EmailOtpRequestVars): Promise<void> {
    // Throw a typed PROCEDURE_NOT_FOUND error so parseGraphQLError maps it to
    // the human-readable message in merged.errors.
    const err = Object.assign(new Error(merged.errors.PROCEDURE_NOT_FOUND), {
      extensions: { code: 'PROCEDURE_NOT_FOUND' }
    });
    throw err;
  }

  async function runSend(vars: EmailOtpRequestVars): Promise<void> {
    if (onSubmitOverride) return onSubmitOverride(vars);
    return defaultRunSend(vars);
  }

  async function handleSubmit(values: ForgotPasswordFormData) {
    setError(null);
    if (onSubmitOverride) setOverridePending(true);
    try {
      forgotPasswordSchema.parse(values);
      await runSend({ email: values.email, type: otpType });
      submittedEmailRef.current = values.email;
      setCardState('code-sent');
      onMessage?.({ kind: 'success', key: 'emailOtpRequest.success' });
      onSuccess?.({ email: values.email });
      // Move focus to the confirmation panel for accessibility.
      setTimeout(() => confirmationFocusRef.current?.focus(), 0);
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
      if (onSubmitOverride) setOverridePending(false);
    }
  }

  async function handleResend() {
    setResendPending(true);
    try {
      await runSend({ email: submittedEmailRef.current, type: otpType });
      onMessage?.({ kind: 'info', key: 'emailOtpRequest.resend', message: merged.resendSuccess });
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    } finally {
      setResendPending(false);
    }
  }

  const form = useForm({
    defaultValues: {
      email: defaultEmail ?? ''
    } as ForgotPasswordFormData,
    onSubmit: async ({ value }) => {
      await handleSubmit(value);
    }
  });

  // ---------------------------------------------------------------------------
  // Code-sent state (confirmed)
  // ---------------------------------------------------------------------------

  if (cardState === 'code-sent') {
    // When showOtpInputInline is true (default), render the OTP input inline.
    // The EmailOtpInput block is a full card itself — render it standalone, not
    // nested inside another Card, to avoid double-card appearance.
    if (showOtpInputInline) {
      return (
        <EmailOtpInput
          email={submittedEmailRef.current}
          onSuccess={(result) => onSuccess?.({ email: submittedEmailRef.current })}
          onError={onError}
          onMessage={onMessage}
          className={className}
        />
      );
    }

    // showOtpInputInline=false: show confirmation + resend only; host navigates.
    return (
      <Card data-slot="email-otp-request-card" className={cn('w-full max-w-sm mx-auto', className)}>
        <CardHeader>
          {/* Block-owned focusable anchor — CardTitle does not forward its ref. */}
          <div ref={confirmationFocusRef} tabIndex={-1} className="outline-hidden">
            <CardTitle data-testid="code-sent-title">{merged.title}</CardTitle>
          </div>
          <CardDescription data-testid="code-sent-description">
            {interpolateEmail(merged.codeSentMessage, submittedEmailRef.current)}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <AuthLoadingButton
            type="button"
            variant="outline"
            className="w-full"
            isLoading={resendPending}
            loadingText={merged.resendPending}
            onClick={handleResend}
            data-testid="resend-button"
          >
            {merged.resendButton}
          </AuthLoadingButton>
        </CardContent>

        {signInHref && (
          <CardFooter className="border-border/40 justify-center border-t pt-5">
            <Button
              variant="link"
              asChild
              className="text-muted-foreground hover:text-foreground hover:no-underline min-h-11 px-2 py-0 text-sm sm:min-h-10"
            >
              <a href={signInHref}>← Back to sign in</a>
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  }

  // ---------------------------------------------------------------------------
  // Form state
  // ---------------------------------------------------------------------------

  return (
    <Card data-slot="email-otp-request-card" className={cn('w-full max-w-sm mx-auto', className)}>
      <CardHeader>
        <CardTitle>{merged.title}</CardTitle>
        <CardDescription>{merged.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <AuthErrorAlert error={error} />

        <form
          noValidate
          aria-busy={isPending}
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <form.Field
            name="email"
            validators={{
              onChange: ({ value }) => {
                if (!value) return 'Email is required';
                if (!/\S+@\S+\.\S+/.test(value)) return 'Please enter a valid email';
                return undefined;
              }
            }}
          >
            {(field) => (
              <FormField
                field={field}
                label={merged.emailLabel}
                placeholder={merged.emailPlaceholder}
                type="email"
              />
            )}
          </form.Field>

          <div className="space-y-3 pt-2">
            <AuthLoadingButton
              type="submit"
              className="w-full"
              isLoading={isPending}
              loadingText={merged.submitButtonPending}
              data-testid="email-otp-request-submit"
            >
              {merged.submitButton}
            </AuthLoadingButton>
          </div>
        </form>
      </CardContent>

      {signInHref && (
        <CardFooter className="border-border/40 justify-center border-t pt-5">
          <Button
            variant="link"
            asChild
            className="text-muted-foreground hover:text-foreground hover:no-underline min-h-11 px-2 py-0 text-sm sm:min-h-10"
          >
            <a href={signInHref}>← Back to sign in</a>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
