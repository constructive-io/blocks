'use client';

/**
 * magic-link-sent-page  (registry: auth-magic-link-sent-page)
 *
 * Static confirmation page shown after [[auth-magic-link-request-card]] submits.
 * Provides a "Check your email" affordance with:
 *   • Resend CTA — calls `useRequestMagicLinkMutation` from the host's generated
 *     `auth` SDK (sdk-binding-contract.md §3).
 *   • Resend cooldown — 60-second countdown tracked in component state.
 *   • "Use a different email" / "Back to sign in" navigation links.
 *
 * BACKEND-PENDING — CASE (b): `request_magic_link` is not yet deployed in
 * `constructive_auth_public` and `useRequestMagicLinkMutation` does NOT exist
 * in the reference SDK. This block therefore:
 *   • Does NOT import from `@/generated/auth` (no hook to import — tsc would fail).
 *   • Makes `onSubmit` the primary/recommended network path: the host wires the
 *     generated binding after running `cnc codegen --api-names auth ...`.
 *   • The stub default path throws a typed PROCEDURE_NOT_FOUND error so the
 *     block behaves gracefully (shows the error message) if mounted without the override.
 *   • `requires.json` names the pending op so `check-sdk.mjs` fails clearly.
 *   • `PROCEDURE_NOT_FOUND` is in `messages.errors`.
 *
 * When the backend ships and the host regenerates the SDK, replace the stub
 * `defaultResend` with:
 *   const defaultMutation = useRequestMagicLinkMutation({ selection: {} });
 *   async function defaultResend(vars: RequestMagicLinkVars) {
 *     await defaultMutation.mutateAsync({ email: vars.email });
 *   }
 * and add the hybrid-isPending pattern (see sdk-binding-contract.md §5).
 *
 * Email is read from `?email=` searchParam (via useSearchParams) or
 * sessionStorage (fallback for direct navigation / bookmark).
 *
 * Pages MAY import `next/navigation`; Cards MUST NOT (block-contract.md §6).
 *
 * Editable constants after install:
 *   const MAGIC_LINK_REQUEST_PATH = '/auth/magic-link';
 *   const SIGN_IN_PATH            = '/auth/sign-in';
 *   const RESEND_COOLDOWN_SECONDS = 60;
 */

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@constructive-io/ui/card';
import { Button } from '@constructive-io/ui/button';

import { cn } from '@/lib/utils';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';
import { AuthLoadingButton } from '@/blocks/primitives/auth-loading-button';

import { defaultMagicLinkSentPageMessages, type MagicLinkSentPageMessages } from './messages';

// ---------------------------------------------------------------------------
// Editable constants (installed page — consumer modifies these in place)
// ---------------------------------------------------------------------------
const MAGIC_LINK_REQUEST_PATH = '/auth/magic-link';
const SIGN_IN_PATH = '/auth/sign-in';
const RESEND_COOLDOWN_SECONDS = 60;

// ---------------------------------------------------------------------------
// Simple {{key}} mustache interpolation (no dep needed)
// ---------------------------------------------------------------------------

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''));
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Variables sent to the resend request. The override `onSubmit` gets these. */
export type RequestMagicLinkVars = {
  email: string;
};

/** Result of the resend operation. Void on the wire; null here for the override seam. */
export type RequestMagicLinkResult = null;

export type MagicLinkSentPageMessageOverrides = Partial<Omit<MagicLinkSentPageMessages, 'errors'>> & {
  errors?: Partial<MagicLinkSentPageMessages['errors']>;
};

export type MagicLinkSentPageProps = {
  messages?: MagicLinkSentPageMessageOverrides;
  /**
   * Replace the default resend call.
   * Required until `request_magic_link` ships in `constructive_auth_public`.
   * After codegen, the host wires in `useRequestMagicLinkMutation`.
   */
  onSubmit?: (vars: RequestMagicLinkVars) => Promise<RequestMagicLinkResult>;
  /** Fires after a successful resend. Always fires. */
  onSuccess?: (result: RequestMagicLinkResult) => void;
  /** Fires after a mapped error. Always fires. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success and errors. Always fires. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Stub default path (backend-pending)
// Throws PROCEDURE_NOT_FOUND so the error message surfaces in the UI.
// Replace this with the generated hook once `request_magic_link` ships.
// ---------------------------------------------------------------------------

class ProcedureNotFoundError extends Error {
  public readonly extensions = { code: 'PROCEDURE_NOT_FOUND' };
  constructor() {
    super('PROCEDURE_NOT_FOUND');
    this.name = 'ProcedureNotFoundError';
  }
}

async function stubResend(_vars: RequestMagicLinkVars): Promise<RequestMagicLinkResult> {
  throw new ProcedureNotFoundError();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MagicLinkSentPage({
  messages: messageOverrides,
  onSubmit: onSubmitOverride,
  onSuccess,
  onError,
  onMessage,
  className
}: MagicLinkSentPageProps) {
  // Deep merge: top-level copy + errors map merged separately.
  const merged: MagicLinkSentPageMessages = {
    ...defaultMagicLinkSentPageMessages,
    ...messageOverrides,
    errors: { ...defaultMagicLinkSentPageMessages.errors, ...messageOverrides?.errors }
  };

  const searchParams = useSearchParams();

  // Read email from ?email= searchParam; fall back to sessionStorage for direct nav.
  const [email] = useState<string | null>(() => {
    const param = searchParams.get('email');
    if (param) return decodeURIComponent(param);
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem('magic-link-email');
    }
    return null;
  });

  // The default resend is backend-pending (stub throws PROCEDURE_NOT_FOUND).
  // When the host provides `onSubmit`, that path is used instead.
  const resendFn = onSubmitOverride ?? stubResend;

  // Track pending state manually (stub is sync-throw; override may be async).
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);

  // ---------------------------------------------------------------------------
  // Countdown timer
  // ---------------------------------------------------------------------------

  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const startCooldown = useCallback(() => {
    setCooldownRemaining(RESEND_COOLDOWN_SECONDS);
  }, []);

  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timeout = setTimeout(() => {
      setCooldownRemaining((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [cooldownRemaining]);

  // ---------------------------------------------------------------------------
  // Resend handler
  // ---------------------------------------------------------------------------

  async function handleResend() {
    if (!email || isPending || cooldownRemaining > 0) return;
    setError(null);
    setResendSuccess(false);
    setIsPending(true);
    try {
      await resendFn({ email });
      setResendSuccess(true);
      startCooldown();
      onMessage?.({ kind: 'success', key: 'requestMagicLink.success', message: merged.resendSuccess });
      onSuccess?.(null);
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
      setIsPending(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Resend button label
  // ---------------------------------------------------------------------------

  function resendButtonLabel(): string {
    if (isPending) return merged.resendPending;
    if (cooldownRemaining > 0) return interpolate(merged.resendCooldown, { seconds: cooldownRemaining });
    return merged.resendButton;
  }

  const isResendDisabled = !email || isPending || cooldownRemaining > 0;

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------

  return (
    <main
      data-slot="magic-link-sent-page"
      className={cn('flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12', className)}
    >
      <Card className="w-full max-w-sm mx-auto">
        <CardHeader>
          <CardTitle>{merged.title}</CardTitle>
          {email ? (
            <CardDescription>{interpolate(merged.description, { email })}</CardDescription>
          ) : (
            <CardDescription>{merged.description.replace('{{email}}', 'your email address')}</CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          <AuthErrorAlert error={error} />

          {resendSuccess && (
            <p aria-live="polite" className="text-sm text-center text-muted-foreground">
              {merged.resendSuccess}
            </p>
          )}

          <AuthLoadingButton
            type="button"
            className="w-full"
            isLoading={isPending}
            loadingText={merged.resendPending}
            disabled={isResendDisabled}
            aria-busy={isPending}
            data-testid="resend-button"
            onClick={handleResend}
          >
            {resendButtonLabel()}
          </AuthLoadingButton>

          <div className="flex flex-col gap-2 text-center">
            <Button
              variant="link"
              asChild
              className="text-muted-foreground hover:text-foreground h-auto p-0 text-sm"
              data-testid="different-email-link"
            >
              <a href={MAGIC_LINK_REQUEST_PATH}>{merged.differentEmailLink}</a>
            </Button>
          </div>
        </CardContent>

        <CardFooter className="border-border/40 justify-center border-t pt-5">
          <Button
            variant="link"
            asChild
            className="text-muted-foreground hover:text-foreground h-auto p-0 text-sm"
            data-testid="sign-in-link"
          >
            <a href={SIGN_IN_PATH}>{merged.signInLink}</a>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
