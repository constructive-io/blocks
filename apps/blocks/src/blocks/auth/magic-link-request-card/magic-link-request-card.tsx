'use client';

/**
 * magic-link-request-card  (registry: auth-magic-link-request-card)
 *
 * Email-only form that initiates the magic-link sign-in flow. On success it
 * transitions to a "Check your email" confirmation panel within the same card
 * — NO navigation/redirect. The confirmation copy interpolates the submitted
 * email address. Mirrors the `forgot-password-card` pattern exactly.
 *
 * BACKEND-PENDING — CASE (b): `request_magic_link` is not yet deployed in
 * `constructive_auth_public` and the generated `useRequestMagicLinkMutation`
 * hook does NOT exist in the reference SDK. This block therefore:
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
 * `defaultRunRequest` with:
 *   const defaultMutation = useRequestMagicLinkMutation({ selection: { fields: { clientMutationId: true } } });
 *   async function defaultRunRequest(vars: MagicLinkRequestVars) {
 *     await defaultMutation.mutateAsync({ input: { email: vars.email } }).then((d) => d.requestMagicLink);
 *   }
 * and add the hybrid-isPending pattern (see sdk-binding-contract.md §5).
 *
 * Override seam: `onSubmit` fully replaces the default network call.
 * Resend: the "Resend email" button in the confirmed panel calls the same path.
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

import { defaultMagicLinkRequestCardMessages, type MagicLinkRequestCardMessages } from './messages';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Variables the magic-link request call receives. The `onSubmit` override gets these verbatim. */
export type MagicLinkRequestVars = {
  email: string;
};

/**
 * Message overrides. Top-level copy is shallow-partial; `errors` is itself
 * partial so a host can localize a single error code without restating the map.
 */
export type MagicLinkRequestCardMessageOverrides = Partial<Omit<MagicLinkRequestCardMessages, 'errors'>> & {
  errors?: Partial<MagicLinkRequestCardMessages['errors']>;
};

export type MagicLinkRequestCardProps = {
  /** Pre-fill the email field (e.g. from a query param). */
  defaultEmail?: string;
  /** Show a "Back to sign in" link. Default: true. */
  showBackLink?: boolean;
  messages?: MagicLinkRequestCardMessageOverrides;
  /** Href for the back-to-sign-in link. Rendered as plain `<a>` when provided. */
  signInHref?: string;
  /**
   * Replace the default mutation call. Receives the same vars.
   *
   * BACKEND-PENDING: Until `request_magic_link` is deployed and the host has
   * regenerated its auth SDK, this prop is the ONLY way to wire a real network
   * call. After codegen, the host may drop this prop and let the generated hook
   * (`useRequestMagicLinkMutation`) take over via `blocks-runtime`.
   */
  onSubmit?: (vars: MagicLinkRequestVars) => Promise<void>;
  /** Fires after a resolved magic-link request. Always fires on success. */
  onSuccess?: (vars: MagicLinkRequestVars) => void;
  /** Fires after a mapped error. Always fires on error. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success, mapped errors, and resend. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type CardState = 'form' | 'confirmed';

/** Replaces all `{{email}}` tokens in a template string. */
function interpolateEmail(template: string, email: string): string {
  return template.replace(/\{\{email\}\}/g, email);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MagicLinkRequestCard({
  defaultEmail,
  showBackLink = true,
  messages: messageOverrides,
  signInHref,
  onSubmit: onSubmitOverride,
  onSuccess,
  onError,
  onMessage,
  className
}: MagicLinkRequestCardProps) {
  // Deep merge: top-level copy + errors map merged separately.
  const merged: MagicLinkRequestCardMessages = {
    ...defaultMagicLinkRequestCardMessages,
    ...messageOverrides,
    errors: { ...defaultMagicLinkRequestCardMessages.errors, ...messageOverrides?.errors }
  };

  // ---------------------------------------------------------------------------
  // BACKEND-PENDING stub (CASE b)
  //
  // The generated `useRequestMagicLinkMutation` does not exist yet. We provide
  // a stub that throws PROCEDURE_NOT_FOUND so the block is self-describing when
  // mounted without an `onSubmit` override. Replace this section with the real
  // generated hook once the proc ships and the host regenerates its auth SDK.
  // ---------------------------------------------------------------------------
  const [stubPending, setStubPending] = useState(false);

  async function defaultRunRequest(vars: MagicLinkRequestVars): Promise<void> {
    // Throw a typed PROCEDURE_NOT_FOUND error so parseGraphQLError maps it to
    // the human-readable message in merged.errors.
    const err = Object.assign(new Error(merged.errors.PROCEDURE_NOT_FOUND), {
      extensions: { code: 'PROCEDURE_NOT_FOUND' }
    });
    throw err;
  }

  // Hybrid pending state: override path tracks its own; stub uses local state.
  const isPending = onSubmitOverride ? stubPending : stubPending;

  // Resend has its own pending state; it reuses the same run path.
  const [resendPending, setResendPending] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [cardState, setCardState] = useState<CardState>('form');
  const submittedEmailRef = useRef<string>('');
  const confirmationFocusRef = useRef<HTMLDivElement>(null);

  async function runRequest(vars: MagicLinkRequestVars): Promise<void> {
    if (onSubmitOverride) return onSubmitOverride(vars);
    return defaultRunRequest(vars);
  }

  async function handleSubmit(values: ForgotPasswordFormData) {
    setError(null);
    if (onSubmitOverride) setStubPending(true);
    try {
      forgotPasswordSchema.parse(values);
      await runRequest({ email: values.email });
      submittedEmailRef.current = values.email;
      setCardState('confirmed');
      onMessage?.({ kind: 'success', key: 'magicLinkRequest.success' });
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
      if (onSubmitOverride) setStubPending(false);
    }
  }

  async function handleResend() {
    setResendPending(true);
    try {
      await runRequest({ email: submittedEmailRef.current });
      onMessage?.({ kind: 'info', key: 'magicLinkRequest.resend', message: merged.resendSuccess });
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
  // Confirmed state
  // ---------------------------------------------------------------------------

  if (cardState === 'confirmed') {
    return (
      <Card data-slot="magic-link-request-card" className={cn('w-full max-w-sm mx-auto', className)}>
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
            loadingText={merged.resendPending}
            onClick={handleResend}
            data-testid="resend-button"
          >
            {merged.resendButton}
          </AuthLoadingButton>
        </CardContent>

        {showBackLink && signInHref && (
          <CardFooter className="border-border/40 justify-center border-t pt-5">
            <Button
              variant="link"
              asChild
              className="text-muted-foreground hover:text-foreground h-auto p-0 text-sm"
            >
              <a href={signInHref}>{merged.backToSignIn}</a>
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
    <Card data-slot="magic-link-request-card" className={cn('w-full max-w-sm mx-auto', className)}>
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
              data-testid="magic-link-request-submit"
            >
              {merged.submitButton}
            </AuthLoadingButton>
          </div>
        </form>
      </CardContent>

      {showBackLink && signInHref && (
        <CardFooter className="border-border/40 justify-center border-t pt-5">
          <Button
            variant="link"
            asChild
            className="text-muted-foreground hover:text-foreground h-auto p-0 text-sm"
          >
            <a href={signInHref}>{merged.backToSignIn}</a>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
