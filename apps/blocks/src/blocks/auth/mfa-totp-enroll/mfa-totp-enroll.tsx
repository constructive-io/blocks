'use client';

/**
 * mfa-totp-enroll  (registry: auth-mfa-totp-enroll)
 *
 * Three-step TOTP enrollment block:
 *   step 1 'setup'       — display QR code + manual entry key
 *   step 2 'verify'      — user enters 6-digit code to confirm
 *   step 3 'backup-codes'— delegates to [[auth-mfa-backup-codes-display]]
 *
 * Registry dependencies: blocks-runtime, card, button, input, label, form,
 *   lib/auth-errors, [[auth-mfa-backup-codes-display]]
 *
 * BACKEND-PENDING — CASE (b):
 *   The three required procedures (`enable_totp`, `confirm_totp_setup`,
 *   `generate_backup_codes`) are NOT yet deployed to `constructive_auth_public`,
 *   so the codegen has NOT produced the corresponding hooks
 *   (`useEnableTotpMutation`, `useConfirmTotpSetupMutation`,
 *   `useGenerateBackupCodesMutation`). Therefore this component does NOT import
 *   from `@/generated/auth` for those hooks — doing so would cause a compile
 *   error. Instead:
 *     • `onSubmit` (the override seam) is the PRIMARY / required path until the
 *       procedures ship and the host regenerates the SDK.
 *     • The default (no `onSubmit`) path surfaces a `PROCEDURE_NOT_FOUND` error
 *       so the host sees a clear message rather than a runtime crash.
 *   Once the backend deploys and the SDK is regenerated, the host wires the
 *   generated binding via `onSubmit` (or this block is updated to import the
 *   new hooks directly).
 *
 * Binding doctrine: sdk-binding-contract.md CASE (b) — no generated-hook
 * import, onSubmit override is the primary seam, PROCEDURE_NOT_FOUND in
 * messages.errors, requires.json names the pending ops.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@constructive-io/ui/card';
import { Button } from '@constructive-io/ui/button';

import { cn } from '@/lib/utils';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';
import { AuthLoadingButton } from '@/blocks/primitives/auth-loading-button';
import { FormField } from '@/blocks/primitives/form-field';

import { MfaBackupCodesDisplay } from '@/blocks/auth/mfa-backup-codes-display/mfa-backup-codes-display';

import {
  defaultMfaTotpEnrollMessages,
  type MfaTotpEnrollMessageOverrides,
  type MfaTotpEnrollMessages
} from './messages';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result returned by the enrollment orchestration to the host. */
export type MfaTotpEnrollResult = {
  backupCodes: string[];
};

/**
 * Override adapter for the full enrollment.
 *
 * When `onSubmit` is provided it replaces the step-1 `enableTotp` call.
 * It must return the QR URL and manual entry key.
 * The host is responsible for wiring steps 2 and 3 via `onConfirm` and
 * `onGenerateBackupCodes` when using the override path, or the block will
 * surface PROCEDURE_NOT_FOUND for those steps.
 */
export type MfaTotpEnrollAdapters = {
  /** Replaces `enableTotp` — called on mount to obtain QR + manual key. */
  onSubmit?: () => Promise<{ qrUrl: string; manualKey: string }>;
  /** Replaces `confirmTotpSetup` — receives the 6-digit code. */
  onConfirm?: (totpCode: string) => Promise<boolean>;
  /** Replaces `generateBackupCodes` — called after successful confirmation. */
  onGenerateCodes?: () => Promise<string[]>;
};

export type MfaTotpEnrollProps = MfaTotpEnrollAdapters & {
  messages?: MfaTotpEnrollMessageOverrides;
  onSuccess?: (result: MfaTotpEnrollResult) => void;
  onError?: (err: { message: string; code: string }) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// TOTP code validation schema
// ---------------------------------------------------------------------------

const totpCodeSchema = z.object({
  totpCode: z
    .string()
    .min(6, 'Code must be 6 digits')
    .max(6, 'Code must be 6 digits')
    .regex(/^\d{6}$/, 'Code must be 6 digits')
});

type TotpCodeFormData = z.infer<typeof totpCodeSchema>;

// ---------------------------------------------------------------------------
// Utility: format manual entry key in groups of 4
// ---------------------------------------------------------------------------

function formatManualKey(key: string): string {
  return key
    .replace(/\s+/g, '')
    .toUpperCase()
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

// ---------------------------------------------------------------------------
// Step states
// ---------------------------------------------------------------------------

type EnrollStep = 'setup' | 'verify' | 'backup-codes';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MfaTotpEnroll({
  onSubmit: onSubmitOverride,
  onConfirm: onConfirmOverride,
  onGenerateCodes: onGenerateCodesOverride,
  messages: messageOverrides,
  onSuccess,
  onError,
  onMessage,
  className
}: MfaTotpEnrollProps) {
  // Deep merge: top-level copy + errors map merged separately.
  const merged = useMemo<MfaTotpEnrollMessages>(
    () => ({
      ...defaultMfaTotpEnrollMessages,
      ...messageOverrides,
      errors: { ...defaultMfaTotpEnrollMessages.errors, ...messageOverrides?.errors }
    }),
    [messageOverrides]
  );

  const [step, setStep] = useState<EnrollStep>('setup');
  const [setupError, setSetupError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [setupPending, setSetupPending] = useState(false);
  const [verifyPending, setVerifyPending] = useState(false);

  // Ref-captured callbacks so useEffect dependency array stays stable.
  const mergedRef = useRef(merged);
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const onSubmitOverrideRef = useRef(onSubmitOverride);

  useEffect(() => {
    mergedRef.current = merged;
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
    onSubmitOverrideRef.current = onSubmitOverride;
  }, [merged, onMessage, onError, onSubmitOverride]);

  // ---------------------------------------------------------------------------
  // Default (no-op) path for backend-pending ops.
  // Returns a PROCEDURE_NOT_FOUND error so the host sees a clear message.
  // ---------------------------------------------------------------------------

  function procedureNotFoundError(): never {
    const err = Object.assign(new Error('Procedure not found'), {
      extensions: { code: 'PROCEDURE_NOT_FOUND' }
    });
    throw err;
  }

  // ---------------------------------------------------------------------------
  // Step 1: load QR code — fires once on mount via useEffect
  // ---------------------------------------------------------------------------

  useEffect(() => {
    async function loadSetup() {
      setSetupError(null);
      setSetupPending(true);
      try {
        const result = onSubmitOverrideRef.current
          ? await onSubmitOverrideRef.current()
          : procedureNotFoundError();
        setQrUrl(result.qrUrl);
        setManualKey(result.manualKey);
        onMessageRef.current?.({ kind: 'info', key: 'qr_ready' });
      } catch (err) {
        const m = mergedRef.current;
        const { code, message } = parseGraphQLError(err, {
          customMessages: m.errors,
          defaultMessage: m.errors.UNKNOWN_ERROR
        });
        const key = code ?? 'UNKNOWN_ERROR';
        setSetupError(message);
        onMessageRef.current?.({ kind: 'error', key, message });
        onErrorRef.current?.({ message, code: key });
      } finally {
        setSetupPending(false);
      }
    }

    loadSetup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentional: run once on mount

  // ---------------------------------------------------------------------------
  // Step 2: verify form
  // ---------------------------------------------------------------------------

  const verifyForm = useForm({
    defaultValues: { totpCode: '' } as TotpCodeFormData,
    onSubmit: async ({ value }) => {
      await handleVerify(value.totpCode);
    }
  });

  async function handleVerify(totpCode: string) {
    setVerifyError(null);
    setVerifyPending(true);
    try {
      totpCodeSchema.parse({ totpCode });

      const confirmed = onConfirmOverride ? await onConfirmOverride(totpCode) : procedureNotFoundError();

      if (!confirmed) {
        const message = merged.errors.INVALID_TOTP;
        setVerifyError(message);
        onMessage?.({ kind: 'error', key: 'INVALID_TOTP', message });
        onError?.({ message, code: 'INVALID_TOTP' });
        return;
      }

      // TOTP is now confirmed/enabled. Generate backup codes in a separate
      // try/catch so that a codes-generation failure does NOT leave the user
      // stuck on step 2 implying their verification code was wrong. On both
      // success and failure we advance to 'backup-codes'; the spec gotcha:
      // "If generateBackupCodes fails, handle gracefully — TOTP is already
      // enabled; user can regenerate via auth-mfa-backup-codes-regenerate".
      let codes: string[] = [];
      try {
        codes = onGenerateCodesOverride ? await onGenerateCodesOverride() : procedureNotFoundError();
      } catch (codesErr) {
        const { code, message } = parseGraphQLError(codesErr, {
          customMessages: merged.errors,
          defaultMessage: merged.errors.UNKNOWN_ERROR
        });
        const key = code ?? 'UNKNOWN_ERROR';
        onMessage?.({ kind: 'error', key, message });
        onError?.({ message, code: key });
        // codes stays [] — MfaBackupCodesDisplay will render an empty list
      }
      setBackupCodes(codes);
      setStep('backup-codes');
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setVerifyError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    } finally {
      setVerifyPending(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Step 3: done
  // ---------------------------------------------------------------------------

  function handleDone() {
    onMessage?.({ kind: 'success', key: 'enrollment_complete' });
    onSuccess?.({ backupCodes });
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function renderSetupStep() {
    return (
      <>
        <CardHeader>
          <CardTitle>{merged.setupTitle}</CardTitle>
          <CardDescription>{merged.setupDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <AuthErrorAlert error={setupError} />

          {setupPending && (
            <div className="flex justify-center py-8" aria-label="Loading QR code">
              <div className="size-8 animate-spin rounded-full border-2 border-current border-t-transparent opacity-60" />
            </div>
          )}

          {qrUrl && !setupPending && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={qrUrl}
                  alt="QR code for authenticator app setup"
                  className="size-48 rounded-md outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
                />
              </div>

              {manualKey && (
                <div className="space-y-1.5">
                  <p className="text-pretty text-muted-foreground text-sm">{merged.qrInstructions}</p>
                  <div className="space-y-1">
                    <p className="text-pretty text-xs font-medium">{merged.manualEntryLabel}</p>
                    <code className="bg-muted block select-all rounded-md px-3 py-2 text-center font-mono text-sm tracking-widest">
                      {formatManualKey(manualKey)}
                    </code>
                  </div>
                </div>
              )}

              <Button
                type="button"
                className="w-full"
                onClick={() => setStep('verify')}
                data-testid="setup-next"
              >
                {merged.nextButton}
              </Button>
            </div>
          )}
        </CardContent>
      </>
    );
  }

  function renderVerifyStep() {
    return (
      <>
        <CardHeader>
          <CardTitle>{merged.verifyTitle}</CardTitle>
          <CardDescription>{merged.verifyDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <AuthErrorAlert error={verifyError} />

          <form
            noValidate
            aria-busy={verifyPending}
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              verifyForm.handleSubmit();
            }}
          >
            <verifyForm.Field
              name="totpCode"
              validators={{
                onChange: ({ value }) => {
                  if (!value) return 'Code is required';
                  if (!/^\d{6}$/.test(value)) return 'Code must be 6 digits';
                  return undefined;
                }
              }}
            >
              {(field) => (
                <FormField
                  field={field}
                  label={merged.codeLabel}
                  placeholder={merged.codePlaceholder}
                  type="text"
                  testId="totp-code"
                />
              )}
            </verifyForm.Field>

            <div className="space-y-2 pt-1">
              <AuthLoadingButton
                type="submit"
                className="w-full"
                isLoading={verifyPending}
                loadingText={merged.verifyingButton}
                data-testid="verify-submit"
              >
                {merged.verifyButton}
              </AuthLoadingButton>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setVerifyError(null);
                  setStep('setup');
                }}
                data-testid="verify-back"
              >
                {merged.backButton}
              </Button>
            </div>
          </form>
        </CardContent>
      </>
    );
  }

  // Step indicator aria-label
  const stepLabel =
    step === 'setup' ? 'Step 1 of 3: Setup' : step === 'verify' ? 'Step 2 of 3: Verify' : 'Step 3 of 3: Backup codes';

  // Step 3 delegates entirely to [[auth-mfa-backup-codes-display]] which
  // renders its own Card. Wrap in a div so data-slot="mfa-totp-enroll" is
  // still present in the DOM for host selectors.
  if (step === 'backup-codes') {
    return (
      <div data-slot="mfa-totp-enroll" aria-label={stepLabel} className={cn('w-full max-w-sm mx-auto', className)}>
        <MfaBackupCodesDisplay codes={backupCodes} onConfirm={handleDone} />
      </div>
    );
  }

  return (
    <Card
      data-slot="mfa-totp-enroll"
      aria-label={stepLabel}
      className={cn('w-full max-w-sm mx-auto', className)}
    >
      {step === 'setup' && renderSetupStep()}
      {step === 'verify' && renderVerifyStep()}
    </Card>
  );
}
