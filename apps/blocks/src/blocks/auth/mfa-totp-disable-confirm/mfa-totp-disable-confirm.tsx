'use client';

/**
 * mfa-totp-disable-confirm  (registry: auth-mfa-totp-disable-confirm)
 *
 * Confirmation dialog for disabling TOTP. Requires high-severity step-up
 * (`tier: 'high'`) before calling `disable_totp`. Shows prominent warnings about
 * the security implications of removing two-factor authentication.
 *
 * BACKEND-PENDING (CASE b): `disable_totp` is NOT yet deployed to
 * `constructive_auth_public`. The generated hook `useDisableTotpMutation` does
 * not exist in the current SDK — importing it would fail tsc. Consequently:
 *   • The `@/generated/auth` import for that hook is OMITTED.
 *   • `onSubmit` is REQUIRED (no default mutation path).
 *   • When the backend deploys and codegen regenerates, the host replaces the
 *     `onSubmit` prop with the generated hook.
 *   • requires.json names `disableTotp` so `check-sdk-fixtures.ts` fails clearly.
 *   • messages.errors.PROCEDURE_NOT_FOUND is present for when the proc first lands.
 *
 * Binding doctrine: sdk-binding-contract.md §5–§7, MASTER-PROMPT §5.
 * Step-up: step-up-contract.md §3 — `tier: 'high'` gates the confirm action.
 * STEP_UP_CANCELLED → silent return (no error callbacks, no toast).
 */

import { useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
} from '@constructive-io/ui/dialog';
import { Button } from '@constructive-io/ui/button';

import { cn } from '@/lib/utils';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';
import { AuthLoadingButton } from '@/blocks/primitives/auth-loading-button';
import { useStepUp, StepUpError } from '@/blocks/auth/use-step-up/use-step-up';

import {
  defaultMfaTotpDisableConfirmMessages,
  type MfaTotpDisableConfirmMessages,
  type MfaTotpDisableConfirmMessageOverrides
} from './messages';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MfaTotpDisableConfirmProps = {
  /** Controlled open state. */
  open: boolean;
  /** Called when the dialog requests open-state change (close on cancel/X). */
  onOpenChange: (open: boolean) => void;
  messages?: MfaTotpDisableConfirmMessageOverrides;
  /**
   * Adapter override — REQUIRED until `disable_totp` is deployed to the backend
   * and codegen regenerates `useDisableTotpMutation`. After the proc ships, the
   * host can wire the generated hook here:
   *   `onSubmit={async () => { await disableTotp.mutateAsync({}); }}`
   * Until then, pass a mock or real implementation.
   */
  onSubmit: () => Promise<void>;
  /** Fires after a successful disable. Always fires. */
  onSuccess?: () => void;
  /** Fires after a mapped error. Always fires. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success and mapped errors. Always fires. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MfaTotpDisableConfirm({
  open,
  onOpenChange,
  messages: messageOverrides,
  onSubmit: onSubmitOverride,
  onSuccess,
  onError,
  onMessage,
  className
}: MfaTotpDisableConfirmProps) {
  // Deep merge: top-level copy + the errors map merged separately.
  const merged: MfaTotpDisableConfirmMessages = {
    ...defaultMfaTotpDisableConfirmMessages,
    ...messageOverrides,
    errors: { ...defaultMfaTotpDisableConfirmMessages.errors, ...messageOverrides?.errors }
  };

  const stepUp = useStepUp();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    try {
      // Step-up must complete before the disable mutation fires.
      // tier:'high' → MFA if enrolled (user has TOTP, so this is correct), else password.
      await stepUp({ tier: 'high' });

      // Proceed with the disable mutation via the override seam (BACKEND-PENDING).
      setIsPending(true);
      await onSubmitOverride();

      onMessage?.({ kind: 'success', key: 'disableTotp.success', message: merged.successMessage });
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      // STEP_UP_CANCELLED: user dismissed the step-up dialog — silent return.
      if (err instanceof StepUpError && err.reason === 'cancelled') return;

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

  function handleCancel() {
    if (isPending) return;
    setError(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleCancel(); }}>
      <DialogContent
        role="alertdialog"
        aria-labelledby="mfa-totp-disable-title"
        aria-describedby="mfa-totp-disable-description"
        data-slot="mfa-totp-disable-confirm"
        className={cn('w-full max-w-sm mx-auto', className)}
        showCloseButton={!isPending}
      >
        <DialogHeader>
          <DialogTitle id="mfa-totp-disable-title">{merged.title}</DialogTitle>
          <DialogDescription id="mfa-totp-disable-description">{merged.description}</DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-2 space-y-3">
          {/* Prominent security warning — both texts visible simultaneously per spec */}
          <div className="rounded-md border border-destructive/30 bg-destructive/8 px-3 py-2.5 space-y-1.5">
            <p className="text-pretty text-sm text-destructive font-medium">{merged.warningText}</p>
            <p className="text-pretty text-sm text-destructive/80">{merged.backupCodesWarning}</p>
          </div>

          {/* Async error alert (aria-live="polite" is inside AuthErrorAlert) */}
          <AuthErrorAlert error={error} />
        </div>

        <DialogFooter>
          {/* Cancel button receives initial focus (safer default for destructive action) */}
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isPending}
            autoFocus
            data-testid="mfa-totp-disable-cancel"
          >
            {merged.cancelButton}
          </Button>

          <AuthLoadingButton
            variant="destructive"
            onClick={handleConfirm}
            isLoading={isPending}
            loadingText={merged.loadingLabel}
            data-testid="mfa-totp-disable-confirm"
          >
            {merged.confirmButton}
          </AuthLoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
