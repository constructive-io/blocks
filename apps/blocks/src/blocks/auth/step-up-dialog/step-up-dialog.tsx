'use client';

/**
 * step-up-dialog  (registry: auth-step-up-dialog)
 *
 * Reusable modal dialog that re-verifies user identity before a sensitive action.
 * Renders either a password input (`type='password'`) or a TOTP code input
 * (`type='mfa'`) based on the `type` prop.
 *
 * Binding doctrine (sdk-binding-contract.md §5):
 *   • requireStepUp  — useRequireStepUpQuery (QUERY, enabled on open). If it
 *     returns true the dialog short-circuits: fires onVerify({ ok: true }) with
 *     no UI rendered.
 *   • verifyPassword — useVerifyPasswordMutation, called for type='password'.
 *   • verifyTotp     — useVerifyTotpMutation, called for type='mfa'.
 *   • Override seams: onSubmitPassword / onSubmitTotp fully replace the
 *     respective generated-hook call (hybrid pending mirrors sign-in-card).
 *   • NO fetch, NO GraphQL document string, NO configure()/getClient(), NO
 *     QueryClientProvider in this file.
 *
 * FLAG: allowBackupCode is LOCKED false (backend procedure verify_backup_code
 * is NOT deployed). The prop/branch is wired as false; do NOT implement backup-
 * code verification until the procedure lands. See planning/blocks/auth/
 * auth-step-up-dialog.md §"Backup-code path (backend pending)".
 *
 * NOTE: showPasskeyOption is accepted as a prop but NOT implemented in v1 —
 * auth-passkey-sign-in block is a separate dependency and out of scope for this
 * wave. The prop is declared for API stability; the passkey button is never rendered.
 * TODO: wire auth-passkey-sign-in with stepUpMode=true when that block is available.
 */

import { useEffect, useRef, useState } from 'react';
import { useForm } from '@tanstack/react-form';

import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
} from '@constructive-io/ui/dialog';
import { Button } from '@constructive-io/ui/button';

import { cn } from '@/lib/utils';
import { useRequireStepUpQuery } from '@/generated/auth';
import { useVerifyPasswordMutation } from '@/generated/auth';
import { useVerifyTotpMutation } from '@/generated/auth';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';
import { AuthLoadingButton } from '@/blocks/primitives/auth-loading-button';
import { FormField } from '@/blocks/primitives/form-field';

import { defaultStepUpDialogMessages, type StepUpDialogMessages } from './messages';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StepUpResult =
  | { ok: true }
  | { ok: false; reason: 'cancelled' | 'error'; error?: unknown };

/**
 * Message overrides. Top-level copy is shallow-partial; `errors` is itself
 * partial so a host can localize a single error code without restating the map.
 */
export type StepUpDialogMessageOverrides = Partial<Omit<StepUpDialogMessages, 'errors'>> & {
  errors?: Partial<StepUpDialogMessages['errors']>;
};

export type StepUpDialogProps = {
  /** Controls dialog open state. Parent manages this. */
  open: boolean;
  /** What to verify. 'password' renders password input; 'mfa' renders TOTP input. */
  type: 'password' | 'mfa';
  /**
   * Whether to show the "Sign in with passkey" option.
   *
   * NOT IMPLEMENTED in v1. auth-passkey-sign-in is a separate block dependency
   * not yet available. This prop is declared for API surface stability only —
   * the passkey button is never rendered regardless of this value. When
   * auth-passkey-sign-in lands, wire it with stepUpMode=true and use
   * messages.orLabel / messages.passkeyButton for copy.
   *
   * Default: false (off).
   */
  showPasskeyOption?: boolean | 'auto';
  /**
   * Whether to show a "Use backup code instead" link in the mfa path.
   * LOCKED false in v1 — verify_backup_code procedure is not deployed.
   * Default: false.
   */
  allowBackupCode?: false;
  /** Fired with ok=true on verified, ok=false on cancel or error. Always fires on close. */
  onVerify: (result: StepUpResult) => void;
  /** Override the verify_password call. Fully replaces the generated hook. */
  onSubmitPassword?: (input: { password: string }) => Promise<StepUpResult>;
  /** Override the verify_totp call. Fully replaces the generated hook. */
  onSubmitTotp?: (input: { totpValue: string }) => Promise<StepUpResult>;
  messages?: StepUpDialogMessageOverrides;
  /** Fires after a mapped error. Always fires on error. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success, mapped errors, and non-fatal branches. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Password form data
// ---------------------------------------------------------------------------

type PasswordFormData = { password: string };
type TotpFormData = { totpValue: string };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StepUpDialog({
  open,
  type,
  // showPasskeyOption is accepted but not used (v1 TODO)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  showPasskeyOption: _showPasskeyOption,
  // allowBackupCode is locked false
  allowBackupCode: _allowBackupCode = false,
  onVerify,
  onSubmitPassword: onSubmitPasswordOverride,
  onSubmitTotp: onSubmitTotpOverride,
  messages: messageOverrides,
  onError,
  onMessage,
  className
}: StepUpDialogProps) {
  // Deep merge: top-level copy + errors map merged separately.
  const merged: StepUpDialogMessages = {
    ...defaultStepUpDialogMessages,
    ...messageOverrides,
    errors: { ...defaultStepUpDialogMessages.errors, ...messageOverrides?.errors }
  };

  // -------------------------------------------------------------------------
  // requireStepUp query — fires on open; short-circuits if step-up still valid
  // -------------------------------------------------------------------------

  const requireStepUpQuery = useRequireStepUpQuery({
    variables: { stepUpType: type },
    enabled: open
  });

  // True when the server says the session's step-up is still within the window.
  // Used both to gate the render (no form shown) and to fire the callback.
  const stepUpStillValid = open && requireStepUpQuery.data?.requireStepUp === true;

  // If requireStepUp returns true the dialog short-circuits: fire onVerify({ ok: true })
  // without rendering any form UI. Use a ref so the effect only fires once per open.
  const shortCircuitFiredRef = useRef(false);

  useEffect(() => {
    if (stepUpStillValid && !shortCircuitFiredRef.current) {
      shortCircuitFiredRef.current = true;
      onVerify({ ok: true });
      onMessage?.({ kind: 'success', key: 'stepUp.skipped' });
    }
  }, [stepUpStillValid, onVerify, onMessage]);

  // Reset the short-circuit flag when the dialog closes so the next open re-checks.
  useEffect(() => {
    if (!open) {
      shortCircuitFiredRef.current = false;
    }
  }, [open]);

  // -------------------------------------------------------------------------
  // Mutations — password and TOTP
  // -------------------------------------------------------------------------

  const defaultPasswordMutation = useVerifyPasswordMutation({
    selection: { fields: { result: true } }
  });

  const defaultTotpMutation = useVerifyTotpMutation({
    selection: { fields: { result: true } }
  });

  // Hybrid pending: generated hook tracks its own; override path tracks manually.
  const [overridePending, setOverridePending] = useState(false);

  const isPending =
    type === 'password'
      ? onSubmitPasswordOverride ? overridePending : defaultPasswordMutation.isPending
      : onSubmitTotpOverride ? overridePending : defaultTotpMutation.isPending;

  const [error, setError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Core submit handlers
  // -------------------------------------------------------------------------

  async function runVerifyPassword(vars: PasswordFormData): Promise<StepUpResult> {
    if (onSubmitPasswordOverride) return onSubmitPasswordOverride({ password: vars.password });
    const data = await defaultPasswordMutation.mutateAsync({ input: { password: vars.password } });
    const ok = data.verifyPassword?.result ?? false;
    // Generated hook: a false result means wrong credentials — surface INVALID_CREDENTIALS.
    return ok ? { ok: true } : { ok: false, reason: 'error' };
  }

  async function runVerifyTotp(vars: TotpFormData): Promise<StepUpResult> {
    if (onSubmitTotpOverride) return onSubmitTotpOverride({ totpValue: vars.totpValue });
    const data = await defaultTotpMutation.mutateAsync({ input: { totpValue: vars.totpValue } });
    const ok = data.verifyTotp?.result ?? false;
    // Generated hook: a false result means wrong TOTP code — surface INVALID_TOTP.
    return ok ? { ok: true } : { ok: false, reason: 'error' };
  }

  async function handleVerify(vars: PasswordFormData | TotpFormData) {
    setError(null);
    const usingOverride = type === 'password' ? !!onSubmitPasswordOverride : !!onSubmitTotpOverride;
    if (usingOverride) setOverridePending(true);
    try {
      const result =
        type === 'password'
          ? await runVerifyPassword(vars as PasswordFormData)
          : await runVerifyTotp(vars as TotpFormData);

      if (result.ok) {
        onMessage?.({ kind: 'success', key: 'stepUp.verified' });
        onVerify({ ok: true });
      } else if (result.reason === 'cancelled') {
        // Override returned cancelled — propagate directly without an inline error.
        onVerify(result);
      } else {
        // result.reason === 'error' from either the generated hook or an override.
        // For the generated-hook path the default credential code applies; for an
        // override the caller may have already embedded their own error in result.error,
        // so we only show a mapped inline message (not override the override's reason).
        const defaultCode = type === 'password' ? 'INVALID_CREDENTIALS' : 'INVALID_TOTP';
        const code = defaultCode;
        const message = merged.errors[code] ?? merged.errors.UNKNOWN_ERROR;
        setError(message);
        onMessage?.({ kind: 'error', key: code, message });
        onError?.({ message, code });
        // Propagate the override's full result (preserves reason + error from override).
        onVerify(result);
      }
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
      onVerify({ ok: false, reason: 'error', error: err });
    } finally {
      if (usingOverride) setOverridePending(false);
    }
  }

  // -------------------------------------------------------------------------
  // Cancel handler
  // -------------------------------------------------------------------------

  function handleCancel() {
    setError(null);
    onVerify({ ok: false, reason: 'cancelled' });
  }

  // -------------------------------------------------------------------------
  // Password form
  // -------------------------------------------------------------------------

  const passwordForm = useForm({
    defaultValues: { password: '' } as PasswordFormData,
    onSubmit: async ({ value }) => {
      await handleVerify(value);
    }
  });

  // -------------------------------------------------------------------------
  // TOTP form
  // -------------------------------------------------------------------------

  const totpForm = useForm({
    defaultValues: { totpValue: '' } as TotpFormData,
    onSubmit: async ({ value }) => {
      await handleVerify(value);
    }
  });

  // -------------------------------------------------------------------------
  // Derived copy
  // -------------------------------------------------------------------------

  const title = type === 'password' ? merged.passwordTitle : merged.mfaTitle;
  const description = type === 'password' ? merged.passwordDescription : merged.mfaDescription;
  const submitLabel = type === 'password' ? merged.passwordSubmitButton : merged.mfaSubmitButton;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        // Backdrop click or Escape fires this; treat as cancel.
        if (!isOpen) handleCancel();
      }}
    >
      <DialogPopup
        data-slot="step-up-dialog"
        showCloseButton={false}
        className={cn('max-w-sm', className)}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* When step-up is still valid the parent will close the dialog after
            onVerify fires. Render nothing inside so no form flash occurs. */}
        {!stepUpStillValid && (
        <div className="px-6 pb-2 space-y-4">
          <AuthErrorAlert error={error} />

          {type === 'password' ? (
            <form
              noValidate
              aria-busy={isPending}
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                passwordForm.handleSubmit();
              }}
            >
              <passwordForm.Field
                name="password"
                validators={{
                  onChange: ({ value }) => (!value ? 'Password is required' : undefined)
                }}
              >
                {(field) => (
                  <FormField
                    field={field}
                    label={merged.passwordLabel}
                    placeholder={merged.passwordPlaceholder}
                    type="password"
                    testId="step-up-password"
                  />
                )}
              </passwordForm.Field>

              <DialogFooter variant="bare">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCancel}
                  data-testid="step-up-cancel"
                >
                  {merged.cancelButton}
                </Button>
                <AuthLoadingButton
                  type="submit"
                  isLoading={isPending}
                  loadingText={merged.loadingLabel}
                  data-testid="step-up-submit"
                >
                  {submitLabel}
                </AuthLoadingButton>
              </DialogFooter>
            </form>
          ) : (
            <form
              noValidate
              aria-busy={isPending}
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                totpForm.handleSubmit();
              }}
            >
              <totpForm.Field
                name="totpValue"
                validators={{
                  onChange: ({ value }) => (!value ? 'Authentication code is required' : undefined)
                }}
              >
                {(field) => (
                  <FormField
                    field={field}
                    label={merged.mfaCodeLabel}
                    placeholder={merged.mfaCodePlaceholder}
                    type="text"
                    testId="step-up-totp"
                  />
                )}
              </totpForm.Field>

              <DialogFooter variant="bare">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCancel}
                  data-testid="step-up-cancel"
                >
                  {merged.cancelButton}
                </Button>
                <AuthLoadingButton
                  type="submit"
                  isLoading={isPending}
                  loadingText={merged.loadingLabel}
                  data-testid="step-up-submit"
                >
                  {submitLabel}
                </AuthLoadingButton>
              </DialogFooter>
            </form>
          )}
        </div>
        )}
      </DialogPopup>
    </Dialog>
  );
}
