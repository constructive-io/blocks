'use client';

/**
 * mfa-backup-codes-regenerate  (registry: auth-mfa-backup-codes-regenerate)
 *
 * Confirmation dialog → step-up → generate_backup_codes() → display new codes
 * via [[auth-mfa-backup-codes-display]]. Used in account security settings when
 * the user wants to rotate their backup codes.
 *
 * BACKEND-PENDING (CASE b): `generate_backup_codes` is NOT yet deployed to
 * `constructive_auth_public`. The generated hook `useGenerateBackupCodesMutation`
 * does not exist in the current SDK — importing it would fail tsc. Consequently:
 *   • The `@/generated/auth` import for that hook is OMITTED.
 *   • `onSubmit` is REQUIRED (no default mutation path until the proc ships).
 *   • When the backend deploys and codegen regenerates, the host replaces the
 *     `onSubmit` prop with the generated hook binding.
 *   • requires.json names `generateBackupCodes` so `check-sdk.mjs` fails clearly.
 *   • messages.errors.PROCEDURE_NOT_FOUND is present for when the proc first lands.
 *
 * Flow:
 *   1. Confirmation state — dialog open; warns that old codes are immediately invalidated.
 *   2. Step-up — `await stepUp({ tier: 'high' })`. Cancel returns silently.
 *   3. Generating — calls onSubmit() (the mutation adapter). Shows loading state.
 *   4. Display — renders [[auth-mfa-backup-codes-display]] with new codes.
 *      onSuccess fires when user confirms codes are saved.
 *
 * Binding doctrine: sdk-binding-contract.md §5–§7, MASTER-PROMPT §5.
 * Step-up: step-up-contract.md §3 — `tier: 'high'` gates the regenerate action.
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
import { MfaBackupCodesDisplay } from '@/blocks/auth/mfa-backup-codes-display/mfa-backup-codes-display';

import {
  defaultMfaBackupCodesRegenerateMessages,
  type MfaBackupCodesRegenerateMessages,
  type MfaBackupCodesRegenerateMessageOverrides
} from './messages';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The result type returned by the onSubmit adapter and passed to onSuccess. */
export type MfaBackupCodesRegenerateResult = {
  codes: string[];
};

export type MfaBackupCodesRegenerateProps = {
  /** Controlled open state. */
  open: boolean;
  /** Called when the dialog requests open-state change (close on cancel/X). */
  onOpenChange: (open: boolean) => void;
  messages?: MfaBackupCodesRegenerateMessageOverrides;
  /**
   * Adapter override — REQUIRED until `generate_backup_codes` is deployed to
   * the backend and codegen regenerates `useGenerateBackupCodesMutation`.
   *
   * Expected signature:
   *   `onSubmit={async () => { const d = await generateBackupCodes.mutateAsync({}); return d.generateBackupCodes; }}`
   *
   * Returns: `{ codes: string[] }` — the newly generated backup codes.
   */
  onSubmit: () => Promise<MfaBackupCodesRegenerateResult>;
  /** Fires after the user confirms codes are saved (clicks Continue in the display step). Always fires. */
  onSuccess?: (result: MfaBackupCodesRegenerateResult) => void;
  /** Fires after a mapped error. Always fires. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success and mapped errors. Always fires. */
  onMessage?: (event: {
    kind: 'success' | 'error' | 'info' | 'warning';
    key: string;
    message?: string;
  }) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MfaBackupCodesRegenerate({
  open,
  onOpenChange,
  messages: messageOverrides,
  onSubmit: onSubmitOverride,
  onSuccess,
  onError,
  onMessage,
  className
}: MfaBackupCodesRegenerateProps) {
  // Deep merge: top-level copy + the errors map merged separately.
  const merged: MfaBackupCodesRegenerateMessages = {
    ...defaultMfaBackupCodesRegenerateMessages,
    ...messageOverrides,
    errors: {
      ...defaultMfaBackupCodesRegenerateMessages.errors,
      ...messageOverrides?.errors
    }
  };

  const stepUp = useStepUp();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Codes returned after a successful regeneration — drives the display step. */
  const [codes, setCodes] = useState<string[] | null>(null);

  async function handleRegenerate() {
    setError(null);
    try {
      // Step-up must complete before the mutation fires.
      // tier:'high' → MFA if enrolled (TOTP is active at this point), else password.
      await stepUp({ tier: 'high' });

      // Proceed with the mutation via the override seam (BACKEND-PENDING).
      setIsPending(true);
      const result = await onSubmitOverride();

      // Transition to display step — show codes via [[auth-mfa-backup-codes-display]].
      setCodes(result.codes);
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

  function handleCodesConfirmed() {
    // User confirmed codes are saved — fire success and close.
    const result: MfaBackupCodesRegenerateResult = { codes: codes! };
    onMessage?.({
      kind: 'success',
      key: 'generateBackupCodes.success',
      message: merged.successMessage
    });
    onSuccess?.(result);
    // Reset dialog state and close.
    setCodes(null);
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleCancel();
      }}
    >
      <DialogContent
        role="alertdialog"
        aria-labelledby="mfa-backup-codes-regenerate-title"
        aria-describedby="mfa-backup-codes-regenerate-description"
        data-slot="mfa-backup-codes-regenerate"
        className={cn('w-full max-w-sm mx-auto', className)}
        showCloseButton={!isPending}
      >
        {codes !== null ? (
          // Display step — show new codes via [[auth-mfa-backup-codes-display]].
          // The display component handles "I have saved these" confirmation gate.
          <MfaBackupCodesDisplay
            codes={codes}
            requireConfirmation={true}
            onConfirm={handleCodesConfirmed}
            onMessage={onMessage}
            // No extra card chrome — embed directly in dialog content.
            className="border-0 shadow-none p-0"
          />
        ) : (
          // Confirmation step — warn about invalidation before regenerating.
          <>
            <DialogHeader>
              <DialogTitle id="mfa-backup-codes-regenerate-title">
                {merged.title}
              </DialogTitle>
              <DialogDescription id="mfa-backup-codes-regenerate-description">
                {merged.description}
              </DialogDescription>
            </DialogHeader>

            <div className="px-6 pb-2 space-y-3">
              {/* Prominent warning — old codes invalidated immediately */}
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
                <p className="text-pretty text-sm text-amber-800 font-medium">{merged.warningText}</p>
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
                data-testid="mfa-backup-codes-regenerate-cancel"
              >
                {merged.cancelButton}
              </Button>

              <AuthLoadingButton
                variant="destructive"
                onClick={handleRegenerate}
                isLoading={isPending}
                loadingText={merged.generatingButton}
                data-testid="mfa-backup-codes-regenerate-confirm"
              >
                {merged.regenerateButton}
              </AuthLoadingButton>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
