'use client';

/**
 * forgot-password-card  (registry: auth-forgot-password-card)
 *
 * Email-only form that initiates the password reset flow. On success it
 * transitions to a "check your email" confirmation panel within the same card
 * — NO navigation/redirect. The confirmation copy interpolates the submitted
 * email address.
 *
 * Data path: the generated `useForgotPasswordMutation` hook imported from
 * `@/generated/auth`. `forgot_password` returns no domain object, so the hook
 * selects the payload's `clientMutationId`. The mutation variables wrap the email
 * in `{ input: { email } }` (confirmed from generated ForgotPasswordVariables).
 *
 * Override seam: `onSubmit` fully replaces the generated-hook call.
 * Resend: the "Resend email" button in the confirmed panel calls the same hook.
 */

import { useRef, useState } from 'react';
import { useForm } from '@tanstack/react-form';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@constructive-io/ui/card';
import { Button } from '@constructive-io/ui/button';

import { cn } from '@/lib/utils';
import { useForgotPasswordMutation } from '@/generated/auth';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/blocks/lib/schemas';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';
import { AuthLoadingButton } from '@/blocks/primitives/auth-loading-button';
import { FormField } from '@/blocks/primitives/form-field';

import { defaultForgotPasswordCardMessages, type ForgotPasswordCardMessages } from './messages';

/** The input shape for the forgot-password call. The override `onSubmit` gets this verbatim. */
export type ForgotPasswordVars = {
  email: string;
};

type CardState = 'form' | 'confirmed';

/**
 * Message overrides. Top-level copy is shallow-partial; `errors` is itself
 * partial so a host can localize a single error code without restating the map.
 */
export type ForgotPasswordCardMessageOverrides = Partial<Omit<ForgotPasswordCardMessages, 'errors'>> & {
  errors?: Partial<ForgotPasswordCardMessages['errors']>;
};

export type ForgotPasswordCardProps = {
  /** Pre-fill the email field (e.g. from a query param). */
  defaultEmail?: string;
  /** Show a "Back to sign in" link. Default: true. */
  showBackLink?: boolean;
  /** Href for the back-to-sign-in link. Rendered as plain `<a>` when provided. */
  signInHref?: string;
  messages?: ForgotPasswordCardMessageOverrides;
  /** Replace the default `useForgotPasswordMutation` call. Receives the same vars. */
  onSubmit?: (vars: ForgotPasswordVars) => Promise<void>;
  /** Fires after a resolved forgot-password request. Always fires on success. */
  onSuccess?: (vars: ForgotPasswordVars) => void;
  /** Fires after a mapped error. Always fires on error. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success, mapped errors, and resend. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

/** Replaces all `{{email}}` tokens in a template string. */
function interpolateEmail(template: string, email: string): string {
  return template.replace(/\{\{email\}\}/g, email);
}

export function ForgotPasswordCard({
  defaultEmail,
  showBackLink = true,
  signInHref,
  messages: messageOverrides,
  onSubmit: onSubmitOverride,
  onSuccess,
  onError,
  onMessage,
  className
}: ForgotPasswordCardProps) {
  // Deep merge: top-level copy + errors map merged separately.
  const merged: ForgotPasswordCardMessages = {
    ...defaultForgotPasswordCardMessages,
    ...messageOverrides,
    errors: { ...defaultForgotPasswordCardMessages.errors, ...messageOverrides?.errors }
  };

  // PostGraphile mutation payloads are composite objects and require at least
  // one selected field even when the procedure itself returns void.
  const defaultMutation = useForgotPasswordMutation({
    selection: { fields: { clientMutationId: true } }
  });

  // Hybrid pending: generated hook tracks its own; override path uses local state.
  const [overridePending, setOverridePending] = useState(false);
  const isPending = onSubmitOverride ? overridePending : defaultMutation.isPending;

  // Resend has its own pending state; it reuses the same mutation.
  const [resendPending, setResendPending] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [cardState, setCardState] = useState<CardState>('form');
  // Track the submitted email so the confirmation panel can show it.
  const submittedEmailRef = useRef<string>('');

  // Block-owned ref on a plain div so focus reliably lands regardless of
  // whether CardTitle forwards its ref (it does not in the current UI package).
  const confirmationFocusRef = useRef<HTMLDivElement>(null);

  async function runForgotPassword(vars: ForgotPasswordVars): Promise<void> {
    if (onSubmitOverride) return onSubmitOverride(vars);
    await defaultMutation.mutateAsync({ input: { email: vars.email } }).then((d) => d.forgotPassword);
  }

  async function handleSubmit(values: ForgotPasswordFormData) {
    setError(null);
    if (onSubmitOverride) setOverridePending(true);
    try {
      forgotPasswordSchema.parse(values);
      await runForgotPassword({ email: values.email });
      submittedEmailRef.current = values.email;
      setCardState('confirmed');
      onMessage?.({ kind: 'success', key: 'forgotPassword.success' });
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
      await runForgotPassword({ email: submittedEmailRef.current });
      onMessage?.({ kind: 'info', key: 'forgotPassword.resend', message: merged.resendSuccessMessage });
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

  if (cardState === 'confirmed') {
    return (
      <Card data-slot="forgot-password-card" className={cn('w-full max-w-sm mx-auto', className)}>
        <CardHeader>
          {/* Block-owned focusable anchor — CardTitle does not forward its ref. */}
          <div ref={confirmationFocusRef} tabIndex={-1} className="outline-hidden">
            <CardTitle data-testid="confirmation-title">{merged.confirmationTitle}</CardTitle>
          </div>
          <CardDescription data-testid="confirmation-description">
            {interpolateEmail(merged.confirmationDescription, submittedEmailRef.current)}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <AuthLoadingButton
            type="button"
            variant="outline"
            className="w-full"
            isLoading={resendPending}
            loadingText={merged.resendLoadingLabel}
            onClick={handleResend}
            data-testid="resend-button"
          >
            {merged.resendLabel}
          </AuthLoadingButton>
        </CardContent>

        {showBackLink && signInHref && (
          <CardFooter className="border-border/40 justify-center border-t pt-5">
            <Button
              variant="link"
              asChild
              className="text-muted-foreground hover:text-foreground hover:no-underline min-h-11 px-2 py-0 text-sm sm:min-h-10"
            >
              <a href={signInHref}>{merged.backToSignInLabel}</a>
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  }

  return (
    <Card data-slot="forgot-password-card" className={cn('w-full max-w-sm mx-auto', className)}>
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
              loadingText={merged.loadingLabel}
              data-testid="forgot-password-submit"
            >
              {merged.submitLabel}
            </AuthLoadingButton>
          </div>
        </form>
      </CardContent>

      {showBackLink && signInHref && (
        <CardFooter className="border-border/40 justify-center border-t pt-5">
          <Button
            variant="link"
            asChild
            className="text-muted-foreground hover:text-foreground hover:no-underline min-h-11 px-2 py-0 text-sm sm:min-h-10"
          >
            <a href={signInHref}>{merged.backToSignInLabel}</a>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
