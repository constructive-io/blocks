'use client';

/**
 * account-emails-list  (registry: auth-account-emails-list)
 *
 * Manages the signed-in user's email addresses. Displays all rows from the
 * generated `useEmailsQuery`, lets the user add a new address (via
 * `useCreateEmailMutation` + `useSendVerificationEmailMutation`), promote any
 * verified address to primary (`useUpdateEmailMutation`), and delete non-primary
 * addresses (`useDeleteEmailMutation`). Each row shows verified/unverified
 * badges plus a "Verify" CTA for unverified addresses.
 *
 * ADD-EMAIL PATH: uses `createEmail` first (inserts the row), then
 * `sendVerificationEmail` (queues the verification email). This two-step path
 * is required because `sendVerificationEmail` only sends to an existing address
 * — its `input.email` field is optional and refers to an already-registered row.
 * Using `createEmail` alone (without verification send) would leave the row
 * permanently unverified with no inbox prompt.
 *
 * Binding doctrine:
 *   • All data via generated hooks from `@/generated/auth`. NO fetch, NO GraphQL
 *     document strings, NO `@constructive-io/data`, NO `configure()`/`getClient()`.
 *   • Override seams: `onSubmitAdd`, `onSubmitSetPrimary`, `onSubmitDelete` fully
 *     replace the respective generated-hook call.
 *   • Error mapping via `parseGraphQLError`; inline `<AuthErrorAlert>` for form
 *     errors; per-action errors reported via `onError` / `onMessage`.
 *   • `onMessage`/`onSuccess`-style seams fire on every operation.
 */

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@constructive-io/ui/card';
import { Button } from '@constructive-io/ui/button';
import { Badge } from '@constructive-io/ui/badge';
import { Separator } from '@constructive-io/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
} from '@constructive-io/ui/dialog';

import { cn } from '@/lib/utils';
import {
  useEmailsQuery,
  useCreateEmailMutation,
  useSendVerificationEmailMutation,
  useUpdateEmailMutation,
  useDeleteEmailMutation
} from '@/generated/auth';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { addEmailSchema, type AddEmailFormData } from '@/blocks/lib/schemas';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';
import { AuthLoadingButton } from '@/blocks/primitives/auth-loading-button';
import { FormField } from '@/blocks/primitives/form-field';

import { defaultAccountEmailsListMessages, type AccountEmailsListMessages } from './messages';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EmailRow = {
  id: string;
  email: string;
  isPrimary: boolean;
  isVerified: boolean;
  name: string | null;
  createdAt: string;
};

/**
 * Message overrides. Top-level copy is shallow-partial; `errors` is itself
 * partial so a host can localize a single error code without restating the map.
 */
export type AccountEmailsListMessageOverrides = Partial<Omit<AccountEmailsListMessages, 'errors'>> & {
  errors?: Partial<AccountEmailsListMessages['errors']>;
};

export type AccountEmailsListProps = {
  /** Fires after a new email row is created and verification email queued. */
  onEmailAdded?: (email: EmailRow) => void;
  /** Fires after primary is promoted. */
  onPrimaryChanged?: (email: EmailRow) => void;
  /** Fires after a non-primary email is deleted. */
  onEmailDeleted?: (emailId: string) => void;
  /** Fires after a mapped error. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success, mapped errors, and non-fatal branches. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  /** Override the add-email operation (createEmail + sendVerificationEmail). */
  onSubmitAdd?: (emailAddress: string) => Promise<EmailRow>;
  /** Override the set-primary operation. */
  onSubmitSetPrimary?: (emailId: string) => Promise<EmailRow>;
  /** Override the delete operation. */
  onSubmitDelete?: (emailId: string) => Promise<void>;
  /** Override the resend-verification operation. */
  onSubmitResendVerification?: (emailAddress: string) => Promise<void>;
  messages?: AccountEmailsListMessageOverrides;
  /** Disables add/delete/primary operations. Read-only display mode. */
  readOnly?: boolean;
  /** Max number of email addresses allowed. Default: 10. */
  maxEmails?: number;
  className?: string;
};

// ---------------------------------------------------------------------------
// Email field selection — mirrors EmailRow shape
// ---------------------------------------------------------------------------

const EMAIL_FIELDS = {
  id: true,
  email: true,
  isPrimary: true,
  isVerified: true,
  name: true,
  createdAt: true
} as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AccountEmailsList({
  onEmailAdded,
  onPrimaryChanged,
  onEmailDeleted,
  onError,
  onMessage,
  onSubmitAdd: onSubmitAddOverride,
  onSubmitSetPrimary: onSubmitSetPrimaryOverride,
  onSubmitDelete: onSubmitDeleteOverride,
  onSubmitResendVerification: onSubmitResendVerificationOverride,
  messages: messageOverrides,
  readOnly = false,
  maxEmails = 10,
  className
}: AccountEmailsListProps) {
  // Deep merge: top-level copy + errors map merged separately.
  const merged: AccountEmailsListMessages = {
    ...defaultAccountEmailsListMessages,
    ...messageOverrides,
    errors: { ...defaultAccountEmailsListMessages.errors, ...messageOverrides?.errors }
  };

  // -------------------------------------------------------------------------
  // Query — list emails
  // -------------------------------------------------------------------------

  const emailsQuery = useEmailsQuery({
    selection: {
      fields: EMAIL_FIELDS,
      orderBy: ['CREATED_AT_DESC']
    }
  });

  const emails: EmailRow[] = (emailsQuery.data?.emails?.nodes ?? []) as EmailRow[];

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  const createEmailMutation = useCreateEmailMutation({
    selection: { fields: EMAIL_FIELDS }
  });

  const sendVerificationMutation = useSendVerificationEmailMutation({
    selection: { fields: { result: true } }
  });

  const updateEmailMutation = useUpdateEmailMutation({
    selection: { fields: EMAIL_FIELDS }
  });

  const deleteEmailMutation = useDeleteEmailMutation({
    selection: { fields: { id: true } }
  });

  // -------------------------------------------------------------------------
  // Dialog state — add email
  // -------------------------------------------------------------------------

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addOverridePending, setAddOverridePending] = useState(false);

  const isAddPending = onSubmitAddOverride
    ? addOverridePending
    : createEmailMutation.isPending || sendVerificationMutation.isPending;

  // -------------------------------------------------------------------------
  // Delete confirm state
  // -------------------------------------------------------------------------

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteOverridePending, setDeleteOverridePending] = useState(false);
  const isDeletePending = onSubmitDeleteOverride ? deleteOverridePending : deleteEmailMutation.isPending;

  // -------------------------------------------------------------------------
  // Per-row action pending tracking
  // -------------------------------------------------------------------------

  const [primaryPendingId, setPrimaryPendingId] = useState<string | null>(null);
  const [verifyPendingId, setVerifyPendingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Add email form
  // -------------------------------------------------------------------------

  const addForm = useForm({
    defaultValues: { email: '' } as AddEmailFormData,
    onSubmit: async ({ value }) => {
      await handleAdd(value.email);
    }
  });

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  async function handleAdd(emailAddress: string) {
    setAddError(null);
    if (onSubmitAddOverride) setAddOverridePending(true);
    try {
      addEmailSchema.parse({ email: emailAddress });

      let newRow: EmailRow;
      if (onSubmitAddOverride) {
        newRow = await onSubmitAddOverride(emailAddress);
      } else {
        // Step 1: create the email row
        const createData = await createEmailMutation.mutateAsync({ email: emailAddress });
        newRow = createData.createEmail.email as unknown as EmailRow;
        // Step 2: queue the verification email
        await sendVerificationMutation.mutateAsync({ input: { email: emailAddress } });
      }

      onMessage?.({ kind: 'success', key: 'emailAdded', message: merged.emailAddedMessage });
      onEmailAdded?.(newRow);
      setAddDialogOpen(false);
      addForm.reset();
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setAddError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    } finally {
      if (onSubmitAddOverride) setAddOverridePending(false);
    }
  }

  async function handleSetPrimary(emailId: string) {
    setRowError(null);
    setPrimaryPendingId(emailId);
    try {
      let updatedRow: EmailRow;
      if (onSubmitSetPrimaryOverride) {
        updatedRow = await onSubmitSetPrimaryOverride(emailId);
      } else {
        const data = await updateEmailMutation.mutateAsync({ id: emailId, emailPatch: { isPrimary: true } });
        updatedRow = data.updateEmail.email as unknown as EmailRow;
      }
      onMessage?.({ kind: 'success', key: 'primaryChanged', message: merged.primaryChangedMessage });
      onPrimaryChanged?.(updatedRow);
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setRowError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    } finally {
      setPrimaryPendingId(null);
    }
  }

  async function handleResendVerification(row: EmailRow) {
    setRowError(null);
    setVerifyPendingId(row.id);
    try {
      if (onSubmitResendVerificationOverride) {
        await onSubmitResendVerificationOverride(row.email);
      } else {
        await sendVerificationMutation.mutateAsync({ input: { email: row.email } });
      }
      onMessage?.({ kind: 'info', key: 'verificationSent', message: merged.verificationSentMessage });
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setRowError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    } finally {
      setVerifyPendingId(null);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTargetId) return;
    setRowError(null);
    if (onSubmitDeleteOverride) setDeleteOverridePending(true);
    try {
      if (onSubmitDeleteOverride) {
        await onSubmitDeleteOverride(deleteTargetId);
      } else {
        await deleteEmailMutation.mutateAsync({ id: deleteTargetId });
      }
      const deletedId = deleteTargetId;
      setDeleteTargetId(null);
      onMessage?.({ kind: 'success', key: 'emailDeleted', message: merged.emailDeletedMessage });
      onEmailDeleted?.(deletedId);
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setRowError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
      setDeleteTargetId(null);
    } finally {
      if (onSubmitDeleteOverride) setDeleteOverridePending(false);
    }
  }

  // -------------------------------------------------------------------------
  // Derived
  // -------------------------------------------------------------------------

  const atMax = emails.length >= maxEmails;
  const deleteTarget = emails.find((e) => e.id === deleteTargetId);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      <Card data-slot="account-emails-list" className={cn('w-full', className)}>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{merged.title}</CardTitle>
            <CardDescription>{merged.description}</CardDescription>
          </div>
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              disabled={atMax}
              onClick={() => {
                setAddError(null);
                addForm.reset();
                setAddDialogOpen(true);
              }}
              data-testid="add-email-button"
            >
              {merged.addEmailButton}
            </Button>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {rowError && (
            <div className="px-6 pb-2">
              <AuthErrorAlert error={rowError} />
            </div>
          )}

          {emailsQuery.isLoading ? (
            <div className="px-6 py-4 text-sm text-muted-foreground" data-testid="emails-loading">
              Loading…
            </div>
          ) : emails.length === 0 ? (
            <div className="px-6 py-4 text-sm text-muted-foreground" data-testid="emails-empty">
              No email addresses found.
            </div>
          ) : (
            <ul role="list" className="divide-y divide-border/40 list-none">
              {emails.map((row, idx) => (
                <li key={row.id} data-testid={`email-row-${row.id}`}>
                  {idx > 0 && <Separator />}
                  <div className="flex flex-wrap items-center gap-3 px-6 py-4">
                    {/* Email + badges */}
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="truncate text-sm font-medium" data-testid={`email-address-${row.id}`}>
                        {row.email}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {row.isPrimary && (
                          <Badge variant="default" data-testid={`badge-primary-${row.id}`}>
                            {merged.primaryBadge}
                          </Badge>
                        )}
                        {row.isVerified ? (
                          <Badge variant="success" data-testid={`badge-verified-${row.id}`}>
                            {merged.verifiedBadge}
                          </Badge>
                        ) : (
                          <Badge variant="warning" data-testid={`badge-unverified-${row.id}`}>
                            {merged.unverifiedBadge}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {!readOnly && (
                      <div className="flex shrink-0 items-center gap-2">
                        {/* Resend verification */}
                        {!row.isVerified && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={verifyPendingId === row.id}
                            onClick={() => handleResendVerification(row)}
                            data-testid={`verify-button-${row.id}`}
                          >
                            {merged.verifyButton}
                          </Button>
                        )}

                        {/* Set primary — hidden for already-primary rows */}
                        {!row.isPrimary && row.isVerified && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={primaryPendingId === row.id}
                            onClick={() => handleSetPrimary(row.id)}
                            data-testid={`set-primary-button-${row.id}`}
                          >
                            {merged.setPrimaryButton}
                          </Button>
                        )}

                        {/* Delete — disabled for primary email */}
                        <Button
                          variant="destructive-outline"
                          size="sm"
                          disabled={row.isPrimary}
                          title={row.isPrimary ? merged.cannotDeletePrimary : undefined}
                          onClick={() => !row.isPrimary && setDeleteTargetId(row.id)}
                          data-testid={`delete-button-${row.id}`}
                        >
                          {merged.deleteButton}
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------------
          Add email dialog
      --------------------------------------------------------------- */}
      <Dialog
        open={addDialogOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setAddDialogOpen(false);
            setAddError(null);
          }
        }}
      >
        <DialogContent data-slot="add-email-dialog" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{merged.addEmailDialogTitle}</DialogTitle>
            <DialogDescription aria-live="polite" />
          </DialogHeader>

          <div className="px-6 pb-2 space-y-4">
            <AuthErrorAlert error={addError} />

            <form
              noValidate
              aria-busy={isAddPending}
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addForm.handleSubmit();
              }}
            >
              <addForm.Field
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
                    label={merged.addEmailLabel}
                    placeholder={merged.addEmailPlaceholder}
                    type="email"
                    testId="add-email-input"
                  />
                )}
              </addForm.Field>

              <DialogFooter variant="bare">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setAddDialogOpen(false);
                    setAddError(null);
                  }}
                  data-testid="add-email-cancel"
                >
                  {merged.deleteCancelButton}
                </Button>
                <AuthLoadingButton
                  type="submit"
                  isLoading={isAddPending}
                  loadingText={merged.addEmailSubmitting}
                  data-testid="add-email-submit"
                >
                  {merged.addEmailSubmit}
                </AuthLoadingButton>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---------------------------------------------------------------
          Delete confirm dialog
      --------------------------------------------------------------- */}
      <Dialog
        open={deleteTargetId !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setDeleteTargetId(null);
        }}
      >
        <DialogContent data-slot="delete-email-dialog" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{merged.deleteConfirmTitle}</DialogTitle>
            <DialogDescription>{merged.deleteConfirmDescription}</DialogDescription>
          </DialogHeader>

          <DialogFooter variant="bare">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteTargetId(null)}
              data-testid="delete-email-cancel"
            >
              {merged.deleteCancelButton}
            </Button>
            <AuthLoadingButton
              type="button"
              variant="destructive"
              isLoading={isDeletePending}
              loadingText={merged.deleteConfirmButton}
              onClick={handleDeleteConfirm}
              data-testid="delete-email-confirm"
            >
              {merged.deleteConfirmButton}
            </AuthLoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invisible element to expose deleteTarget for tests */}
      {deleteTarget && (
        <span data-testid="delete-target-email" className="sr-only">
          {deleteTarget.email}
        </span>
      )}
    </>
  );
}
