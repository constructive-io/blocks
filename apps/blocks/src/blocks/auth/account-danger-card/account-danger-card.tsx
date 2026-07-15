'use client';

/**
 * account-danger-card  (registry: auth-account-danger-card)
 *
 * Danger zone card that initiates the account-deletion flow. The flow is:
 *   1. User clicks "Delete account" → confirmation dialog opens.
 *   2. User clicks "Send deletion email" in dialog → step-up tier:high fires.
 *   3. Step-up resolves → `sendAccountDeletionEmail` mutation is called.
 *   4. Success → dialog closes; card shows inline success state.
 *
 * Data path: `useSendAccountDeletionEmailMutation` from `@/generated/auth`.
 * The hook name is VERIFIED against the generated SDK source. Input shape is
 * `{ input: SendAccountDeletionEmailInput }` where the input is empty (only
 * optional `clientMutationId`). Payload: `{ sendAccountDeletionEmail: { result } }`.
 *
 * Step-up: `useStepUp()` from the `use-step-up` registry block, tier: 'high'.
 * If the user cancels step-up the dialog re-opens (returns to confirm state).
 *
 * Binding rules (sdk-binding-contract.md §11 — ALL honoured):
 *   • Generated hook only; no fetch, no doc string, no configure()/getClient().
 *   • No QueryClientProvider / QueryClient in this file.
 *   • Override seam: `onSubmit` fully replaces the mutation call.
 *   • `requires.json` co-located.
 */

import { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@constructive-io/ui/card';
import { Button } from '@constructive-io/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@constructive-io/ui/dialog';

import { cn } from '@/lib/utils';
import { useSendAccountDeletionEmailMutation } from '@/generated/auth';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';
import { AuthLoadingButton } from '@/blocks/primitives/auth-loading-button';
import { useStepUp, StepUpError } from '@/blocks/auth/use-step-up/use-step-up';

import { defaultAccountDangerCardMessages, type AccountDangerCardMessages, type AccountDangerCardMessageOverrides } from './messages';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AccountDangerCardProps = {
  messages?: AccountDangerCardMessageOverrides;
  /** Replace the default `useSendAccountDeletionEmailMutation` call. */
  onSubmit?: () => Promise<void>;
  /** Fires after `sendAccountDeletionEmail` succeeds. */
  onDeletionEmailSent?: () => void;
  /** Fires after a mapped error. Always fires. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success, mapped errors. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AccountDangerCard({
  messages: messageOverrides,
  onSubmit: onSubmitOverride,
  onDeletionEmailSent,
  onError,
  onMessage,
  className
}: AccountDangerCardProps) {
  // Deep merge: top-level copy + errors map merged separately.
  const merged: AccountDangerCardMessages = {
    ...defaultAccountDangerCardMessages,
    ...messageOverrides,
    errors: { ...defaultAccountDangerCardMessages.errors, ...messageOverrides?.errors }
  };

  // Generated hook from the host's `auth` SDK.
  // Payload: { sendAccountDeletionEmail: { result?: boolean | null } | null }
  const defaultMutation = useSendAccountDeletionEmailMutation({
    selection: {
      fields: {
        result: true
      }
    }
  });

  // Hybrid pending: generated hook tracks its own; override path does not.
  const [overridePending, setOverridePending] = useState(false);
  const isPending = onSubmitOverride ? overridePending : defaultMutation.isPending;

  const stepUp = useStepUp();

  // Dialog state: 'closed' | 'confirm' (dialog open) | 'done' (email sent)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    try {
      // Step-up gate: tier 'high' → MFA preferred, password fallback.
      await stepUp({ tier: 'high', messages: { passwordDescription: merged.stepUpPrompt } });
    } catch (err) {
      if (err instanceof StepUpError && err.reason === 'cancelled') {
        // Cancelled: keep the dialog open so the user can re-attempt.
        onMessage?.({ kind: 'warning', key: 'STEP_UP_CANCELLED', message: merged.stepUpCancelled });
        return;
      }
      // Step-up error (not cancel) — close dialog, surface error.
      setDialogOpen(false);
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
      return;
    }

    // Step-up passed — fire the mutation.
    try {
      if (onSubmitOverride) {
        setOverridePending(true);
        await onSubmitOverride();
      } else {
        await defaultMutation.mutateAsync({ input: {} }).then((d) => d.sendAccountDeletionEmail);
      }

      setDialogOpen(false);
      setEmailSent(true);
      onMessage?.({ kind: 'success', key: 'sendAccountDeletionEmail.success', message: merged.emailSentTitle });
      onDeletionEmailSent?.();
    } catch (err) {
      setDialogOpen(false);
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

  return (
    <Card
      data-slot="account-danger-card"
      className={cn('w-full max-w-sm mx-auto border-destructive/50', className)}
    >
      <CardHeader>
        <CardTitle className="text-destructive">{merged.title}</CardTitle>
        <CardDescription>{merged.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <AuthErrorAlert error={error} />

        {emailSent ? (
          <div role="status" className="rounded-md bg-muted px-4 py-3 text-sm">
            <p className="font-medium">{merged.emailSentTitle}</p>
            <p className="text-muted-foreground mt-1">{merged.emailSentDescription}</p>
          </div>
        ) : (
          <Button
            variant="destructive"
            aria-label="Delete account permanently"
            onClick={() => {
              setError(null);
              setDialogOpen(true);
            }}
          >
            {merged.deleteButton}
          </Button>
        )}
      </CardContent>

      {/* Confirmation dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false); }}>
        <DialogContent role="alertdialog" aria-labelledby="account-danger-dialog-title">
          <DialogHeader>
            <DialogTitle id="account-danger-dialog-title">{merged.confirmDialogTitle}</DialogTitle>
            <DialogDescription>{merged.confirmDialogDescription}</DialogDescription>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">{merged.confirmDialogBody}</p>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isPending}
            >
              {merged.cancelButton}
            </Button>
            <AuthLoadingButton
              variant="destructive"
              isLoading={isPending}
              loadingText={merged.loadingLabel}
              onClick={handleConfirm}
              data-testid="account-danger-confirm"
            >
              {merged.confirmButton}
            </AuthLoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
