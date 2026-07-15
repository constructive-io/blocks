'use client';

/**
 * email-otp-input  (registry: auth-email-otp-input)
 *
 * Reusable 6-segment OTP code input with countdown timer, resend CTA, and
 * attempt feedback. Designed to be rendered inline by [[auth-email-otp-request-card]]
 * or as a standalone block.
 *
 * BACKEND-PENDING — CASE (b):
 *   `sign_in_email_otp` and `send_email_otp` are not yet deployed in
 *   `constructive_auth_public`. `useSignInEmailOtpMutation` and
 *   `useSendEmailOtpMutation` do NOT exist in the reference SDK (confirmed in
 *   apps/admin/src/graphql/auth-sdk/api/hooks/mutations/). This block therefore:
 *
 *   • Does NOT import from `@/generated/auth` (no hooks to import — tsc would fail).
 *   • Makes `onVerify` the primary/recommended network path: the host wires the
 *     generated binding after running `cnc codegen --api-names auth ...`.
 *   • `onResend` is similarly the primary resend path until `send_email_otp` ships.
 *   • Stub default paths throw typed PROCEDURE_NOT_FOUND errors so the block
 *     behaves gracefully (shows the error message) if mounted without an override.
 *   • `requires.json` names the pending ops so `check-sdk.mjs` fails clearly.
 *   • `PROCEDURE_NOT_FOUND` is in `messages.errors`.
 *
 * When the backend ships and the host regenerates the SDK, replace the stubs with:
 *   import { useSignInEmailOtpMutation, useSendEmailOtpMutation } from '@/generated/auth';
 *   const defaultMutation = useSignInEmailOtpMutation({
 *     selection: {
 *       fields: {
 *         id: true, userId: true, accessToken: true, accessTokenExpiresAt: true,
 *         isVerified: true, mfaRequired: true, mfaChallengeToken: true,
 *       },
 *     },
 *   });
 *   const sendMutation = useSendEmailOtpMutation({ selection: {} });
 *   // Submit: const result = await defaultMutation.mutateAsync({ email, code }).then((d) => d.signInEmailOtp);
 *   // Resend:  await sendMutation.mutateAsync({ email, type: 'sign_in' });
 * and add the hybrid-isPending pattern (sdk-binding-contract.md §5).
 *
 * Pairing: No page block — used as an inline code-entry step rendered by
 * [[auth-email-otp-request-card]] or embedded in a custom page.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@constructive-io/ui/card';
import { Button } from '@constructive-io/ui/button';

import { cn } from '@/lib/utils';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';
import { AuthLoadingButton } from '@/blocks/primitives/auth-loading-button';

import { defaultEmailOtpInputMessages, type EmailOtpInputMessages } from './messages';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_LENGTH = 6;
const DEFAULT_RESEND_COOLDOWN_SECONDS = 60;

// ---------------------------------------------------------------------------
// Simple {{key}} mustache interpolation (no dep needed)
// ---------------------------------------------------------------------------

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''));
}

// ---------------------------------------------------------------------------
// Backend-pending stubs
// Throw PROCEDURE_NOT_FOUND so the error message surfaces in the UI.
// Replace these with the generated hooks once the procedures ship.
// ---------------------------------------------------------------------------

class ProcedureNotFoundError extends Error {
  public readonly extensions = { code: 'PROCEDURE_NOT_FOUND' };
  constructor() {
    super('PROCEDURE_NOT_FOUND');
    this.name = 'ProcedureNotFoundError';
  }
}

async function stubVerify(_email: string, _code: string): Promise<EmailOtpVerifyResult> {
  throw new ProcedureNotFoundError();
}

async function stubResend(_email: string): Promise<void> {
  throw new ProcedureNotFoundError();
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Result of an OTP verification. Mirrors the `signInEmailOtp` payload shape
 * (the fields this block selects); declared here so the public surface and
 * the `onVerify` override do not depend on a generated type name.
 */
export type EmailOtpVerifyResult = {
  id?: string | null;
  userId?: string | null;
  accessToken?: string | null;
  accessTokenExpiresAt?: string | null;
  isVerified?: boolean | null;
  mfaRequired?: boolean | null;
  mfaChallengeToken?: string | null;
  /** For non-sign-in flows: simple success boolean. */
  success?: boolean;
};

/**
 * Message overrides. Top-level copy is shallow-partial; `errors` is itself
 * partial so a host can localize a single error code without restating the map.
 */
export type EmailOtpInputMessageOverrides = Partial<Omit<EmailOtpInputMessages, 'errors'>> & {
  errors?: Partial<EmailOtpInputMessages['errors']>;
};

export type EmailOtpInputProps = {
  /** Email the OTP was sent to (required for the default sign-in hook). */
  email: string;
  /** Number of OTP segments. Default: 6 */
  length?: number;
  /** Countdown timer duration in seconds before resend is enabled. Default: 60 */
  resendCooldownSeconds?: number;
  messages?: EmailOtpInputMessageOverrides;
  /**
   * Custom verify function. Required until `sign_in_email_otp` ships.
   * After codegen, the host wires in `useSignInEmailOtpMutation`.
   * Use for non-sign-in OTP types (verify, reset, change-email).
   */
  onVerify?: (email: string, code: string) => Promise<EmailOtpVerifyResult>;
  /**
   * Custom resend function. Required until `send_email_otp` ships.
   * After codegen, the host wires in `useSendEmailOtpMutation`.
   */
  onResend?: (email: string) => Promise<void>;
  /** Fires after a successful verification. Always fires. */
  onSuccess?: (result: EmailOtpVerifyResult) => void;
  /** Fires after a mapped error. Always fires. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for all events. Always fires. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmailOtpInput({
  email,
  length = DEFAULT_LENGTH,
  resendCooldownSeconds = DEFAULT_RESEND_COOLDOWN_SECONDS,
  messages: messageOverrides,
  onVerify: onVerifyOverride,
  onResend: onResendOverride,
  onSuccess,
  onError,
  onMessage,
  className
}: EmailOtpInputProps) {
  // Deep merge: top-level copy + errors map merged separately.
  const merged: EmailOtpInputMessages = {
    ...defaultEmailOtpInputMessages,
    ...messageOverrides,
    errors: { ...defaultEmailOtpInputMessages.errors, ...messageOverrides?.errors }
  };

  // OTP digits state — array of `length` single-character strings.
  const [digits, setDigits] = useState<string[]>(() => Array(length).fill(''));
  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(length).fill(null));

  // Pending / error state.
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resend state.
  const [isResendPending, setIsResendPending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Countdown timer.
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const verifyFn = onVerifyOverride ?? stubVerify;
  const resendFn = onResendOverride ?? stubResend;

  const startCooldown = useCallback(() => {
    setCooldownRemaining(resendCooldownSeconds);
  }, [resendCooldownSeconds]);

  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timeout = setTimeout(() => {
      setCooldownRemaining((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [cooldownRemaining]);

  // Auto-focus the first input on mount.
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // ---------------------------------------------------------------------------
  // Submit handler
  // ---------------------------------------------------------------------------

  const handleVerify = useCallback(
    async (code: string) => {
      if (isPending) return;
      setError(null);
      setIsPending(true);
      try {
        const result = await verifyFn(email, code);

        if (result.mfaRequired) {
          onMessage?.({ kind: 'warning', key: 'mfaRequired' });
        } else {
          onMessage?.({ kind: 'success', key: 'signInEmailOtp.success' });
        }
        onSuccess?.(result);
      } catch (err) {
        const { code: errCode, message } = parseGraphQLError(err, {
          customMessages: merged.errors,
          defaultMessage: merged.errors.UNKNOWN_ERROR
        });
        const key = errCode ?? 'UNKNOWN_ERROR';
        setError(message);
        onMessage?.({ kind: 'error', key, message });
        onError?.({ message, code: key });
      } finally {
        setIsPending(false);
      }
    },
    [isPending, verifyFn, email, merged.errors, onMessage, onSuccess, onError]
  );

  // ---------------------------------------------------------------------------
  // Digit input handling
  // ---------------------------------------------------------------------------

  function updateDigit(index: number, value: string) {
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    return next;
  }

  function focusNext(currentIndex: number) {
    if (currentIndex < length - 1) {
      inputRefs.current[currentIndex + 1]?.focus();
    }
  }

  function focusPrev(currentIndex: number) {
    if (currentIndex > 0) {
      inputRefs.current[currentIndex - 1]?.focus();
    }
  }

  function handleDigitChange(index: number, value: string) {
    // Strip non-digits.
    const digit = value.replace(/\D/g, '').slice(-1);
    const nextDigits = updateDigit(index, digit);

    if (digit) {
      focusNext(index);
      // Auto-submit when all segments are filled.
      if (nextDigits.every((d) => d !== '')) {
        const code = nextDigits.join('');
        handleVerify(code);
      }
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        updateDigit(index, '');
      } else {
        focusPrev(index);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusPrev(index);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusNext(index);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;

    const nextDigits = Array(length)
      .fill('')
      .map((_, i) => pasted[i] ?? '');
    setDigits(nextDigits);

    // Focus the next empty slot or the last filled one.
    const filledCount = pasted.length;
    const focusIndex = Math.min(filledCount, length - 1);
    inputRefs.current[focusIndex]?.focus();

    // Auto-submit if we pasted a full code.
    if (filledCount >= length) {
      handleVerify(pasted.slice(0, length));
    }
  }

  // ---------------------------------------------------------------------------
  // Form submit (manual — fallback for accessibility)
  // ---------------------------------------------------------------------------

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = digits.join('');
    if (code.length < length) return;
    handleVerify(code);
  }

  // ---------------------------------------------------------------------------
  // Resend handler
  // ---------------------------------------------------------------------------

  async function handleResend() {
    if (isResendPending || cooldownRemaining > 0) return;
    setError(null);
    setResendSuccess(false);
    setIsResendPending(true);
    try {
      await resendFn(email);
      setResendSuccess(true);
      setDigits(Array(length).fill(''));
      inputRefs.current[0]?.focus();
      startCooldown();
      onMessage?.({ kind: 'info', key: 'sendEmailOtp.success', message: merged.resendSuccess });
    } catch (err) {
      const { code: errCode, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = errCode ?? 'UNKNOWN_ERROR';
      setError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    } finally {
      setIsResendPending(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Resend button label
  // ---------------------------------------------------------------------------

  function resendButtonLabel(): string {
    if (isResendPending) return merged.resendPending;
    if (cooldownRemaining > 0) return interpolate(merged.resendCooldown, { seconds: cooldownRemaining });
    return merged.resendButton;
  }

  const isResendDisabled = isResendPending || cooldownRemaining > 0;
  const isSubmitDisabled = isPending || digits.join('').length < length;

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------

  return (
    <Card data-slot="email-otp-input" className={cn('w-full max-w-sm mx-auto', className)}>
      <CardHeader>
        <CardTitle>{merged.title}</CardTitle>
        <CardDescription>
          {interpolate(merged.description, { email })}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <AuthErrorAlert error={error} />

        {resendSuccess && (
          <p aria-live="polite" className="text-sm text-center text-muted-foreground">
            {merged.resendSuccess}
          </p>
        )}

        <form
          noValidate
          aria-busy={isPending}
          className="space-y-4"
          onSubmit={handleFormSubmit}
        >
          <fieldset className="border-0 p-0 m-0">
            <legend className="sr-only">{merged.inputLabel}</legend>

            {/* OTP segment inputs */}
            <div className="flex gap-2 justify-center" role="group" aria-label={merged.inputLabel}>
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  aria-label={`Digit ${index + 1} of ${length}`}
                  data-testid={`otp-digit-${index}`}
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  className={cn(
                    'h-12 w-10 rounded-md border text-center text-lg font-semibold',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                    'transition-colors',
                    digit ? 'border-ring' : 'border-input',
                    'bg-background text-foreground'
                  )}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                />
              ))}
            </div>
          </fieldset>

          <AuthLoadingButton
            type="submit"
            className="w-full"
            isLoading={isPending}
            loadingText={merged.submitButtonPending}
            disabled={isSubmitDisabled}
            data-testid="otp-submit"
          >
            {merged.submitButton}
          </AuthLoadingButton>
        </form>

        {/* Resend CTA */}
        <div className="text-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isResendDisabled}
            data-testid="resend-button"
            onClick={handleResend}
            className="text-muted-foreground hover:text-foreground"
          >
            {resendButtonLabel()}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
