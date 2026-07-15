'use client';

/**
 * invite-dialog  (registry: org-invite-dialog)
 *
 * Dialog for inviting members to an org by email, with optional role assignment.
 * Shows a list of pending (unclaimed) invites with resend and cancel actions.
 *
 * Data path — generated React Query hooks from the host's `admin` SDK:
 *   • useCreateOrgInviteMutation — create an org invite
 *   • useUpdateOrgInviteMutation — cancel (set inviteValid=false) an existing invite
 *   • useOrgInvitesQuery         — list pending invites for the org
 *
 * All three hooks exist in the generated admin SDK (CASE a). The `resend`
 * operation (resendOrgInviteMutation) is backend-pending; resend is implemented
 * as cancel + re-create until the procedure ships.
 *
 * Override seam: `onSubmit` fully replaces the `useCreateOrgInviteMutation` call.
 * PROCEDURE_NOT_FOUND is in messages.errors in case the backend is misconfigured.
 */

import { useEffect, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';

import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPanel,
  DialogFooter
} from '@constructive-io/ui/dialog';
import { Button } from '@constructive-io/ui/button';
import { Badge } from '@constructive-io/ui/badge';

import { cn } from '@/lib/utils';
import { useCreateOrgInviteMutation, useUpdateOrgInviteMutation, useOrgInvitesQuery } from '@/generated/admin';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';
import { AuthLoadingButton } from '@/blocks/primitives/auth-loading-button';
import { FormField } from '@/blocks/primitives/form-field';

import { defaultOrgInviteDialogMessages, type OrgInviteDialogMessageOverrides, type OrgInviteDialogMessages } from './messages';

const DAY_MS = 1000 * 60 * 60 * 24;

/** Zod schema for the invite form. */
const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  profileId: z.string().nullable()
});

type InviteFormData = z.infer<typeof inviteSchema>;

/** Variables the `useCreateOrgInviteMutation` / override `onSubmit` receives. */
export type OrgInviteInput = {
  email: string;
  profileId: string | null;
  expiryDays: number;
  inviteLimit: number;
};

/** The result shape the override `onSubmit` must return. */
export type OrgInviteResult = {
  inviteId: string;
  email: string;
  profileId: string | null;
};

export type OrgInviteDialogProps = {
  /** The org User id (type=2). Required. */
  orgId: string;
  /** Whether the dialog is open. Controlled by parent. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Available role profiles (from org-roles-editor data). */
  roleProfiles?: Array<{ id: string; label: string }>;
  /** Default profile ID for new invites. */
  defaultProfileId?: string;
  /** Invite expiry in days. Default: 7 */
  expiryDays?: number;
  /** Max uses per invite token. Default: 1 */
  inviteLimit?: number;
  messages?: OrgInviteDialogMessageOverrides;
  /** Adapter override: replaces useCreateOrgInviteMutation. */
  onSubmit?: (input: OrgInviteInput) => Promise<OrgInviteResult>;
  /** Fires after successful invite creation. Always fires. */
  onInviteSent?: (invite: OrgInviteResult) => void;
  /** Fires after a mapped error. Always fires. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success, errors, and informational events. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

/** Simple {{key}} mustache interpolation for message templates. */
function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''));
}

/** Convert expiryDays to an ISO 8601 string from now. */
function computeExpiresAt(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function InviteDialog({
  orgId,
  open,
  onOpenChange,
  roleProfiles = [],
  defaultProfileId,
  expiryDays: expiryDaysProp = 7,
  inviteLimit: inviteLimitProp = 1,
  messages: messageOverrides,
  onSubmit: onSubmitOverride,
  onInviteSent,
  onError,
  onMessage,
  className
}: OrgInviteDialogProps) {
  // Deep merge: top-level copy + the errors map merged separately.
  const merged: OrgInviteDialogMessages = {
    ...defaultOrgInviteDialogMessages,
    ...messageOverrides,
    errors: { ...defaultOrgInviteDialogMessages.errors, ...messageOverrides?.errors }
  };

  // Generated mutation hooks from the host's `admin` SDK.
  const createInvite = useCreateOrgInviteMutation({
    selection: { fields: { id: true, email: true, entityId: true } }
  });

  const updateInvite = useUpdateOrgInviteMutation({
    selection: { fields: { id: true, inviteValid: true } }
  });

  // List of pending invites for this org.
  const pendingInvites = useOrgInvitesQuery({
    selection: {
      fields: { id: true, email: true, inviteValid: true, createdAt: true, expiresAt: true },
      where: {
        entityId: { equalTo: orgId },
        inviteValid: { equalTo: true }
      },
      first: 50
    }
  });

  // Hybrid pending: the generated hook tracks its own; the override path does not.
  const [overridePending, setOverridePending] = useState(false);
  const isPending = onSubmitOverride ? overridePending : createInvite.isPending;

  const [formError, setFormError] = useState<string | null>(null);

  // Confirm-cancel state: the invite whose cancellation is pending user confirmation.
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  // Keep SSR and the first client render deterministic, then take one fresh
  // mount-time reading. Invite day counts do not need a live countdown.
  const [mountedAt, setMountedAt] = useState<number | null>(null);
  useEffect(() => {
    setMountedAt(Date.now());
  }, []);

  async function runCreateInvite(input: OrgInviteInput): Promise<OrgInviteResult> {
    if (onSubmitOverride) return onSubmitOverride(input);
    const expiresAt = computeExpiresAt(input.expiryDays);
    const data = await createInvite.mutateAsync({
      entityId: orgId,
      email: input.email,
      inviteLimit: input.inviteLimit,
      expiresAt,
      ...(input.profileId ? { data: { profileId: input.profileId } } : {})
    });
    const orgInvite = data.createOrgInvite?.orgInvite;
    return {
      inviteId: orgInvite?.id ?? '',
      email: (orgInvite?.email as string | null | undefined) ?? input.email,
      profileId: input.profileId
    };
  }

  async function handleSubmit(values: InviteFormData) {
    setFormError(null);
    if (onSubmitOverride) setOverridePending(true);
    try {
      inviteSchema.parse(values);
      const result = await runCreateInvite({
        email: values.email,
        profileId: values.profileId,
        expiryDays: expiryDaysProp,
        inviteLimit: inviteLimitProp
      });

      const successMsg = interpolate(merged.successToast, { email: values.email });
      onMessage?.({ kind: 'success', key: 'createOrgInvite.success', message: successMsg });
      onInviteSent?.(result);
      await pendingInvites.refetch();
      form.reset();
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      const kind = key === 'INVITE_EXISTS' ? 'warning' : 'error';
      setFormError(message);
      onMessage?.({ kind, key, message });
      onError?.({ message, code: key });
    } finally {
      if (onSubmitOverride) setOverridePending(false);
    }
  }

  async function handleCancelInvite(inviteId: string) {
    try {
      await updateInvite.mutateAsync({
        id: inviteId,
        orgInvitePatch: { inviteValid: false }
      });
      onMessage?.({ kind: 'success', key: 'cancelOrgInvite.success', message: merged.cancelSuccessToast });
      await pendingInvites.refetch();
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    } finally {
      setConfirmCancelId(null);
    }
  }

  async function handleResendInvite(invite: { id: string; email: string }) {
    // Resend = cancel existing + create new (resendOrgInvite procedure is backend-pending).
    try {
      await updateInvite.mutateAsync({
        id: invite.id,
        orgInvitePatch: { inviteValid: false }
      });
      const expiresAt = computeExpiresAt(expiryDaysProp);
      await createInvite.mutateAsync({
        entityId: orgId,
        email: invite.email,
        inviteLimit: inviteLimitProp,
        expiresAt
      });
      const resendMsg = interpolate(merged.resendSuccessToast, { email: invite.email });
      onMessage?.({ kind: 'success', key: 'resendOrgInvite.success', message: resendMsg });
      await pendingInvites.refetch();
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    }
  }

  const form = useForm({
    defaultValues: {
      email: '',
      profileId: defaultProfileId ?? null
    } as InviteFormData,
    onSubmit: async ({ value }) => {
      await handleSubmit(value);
    }
  });

  const nodes = (pendingInvites.data?.orgInvites?.nodes ?? []) as Array<{
    id: string;
    email: string;
    inviteValid: boolean;
    createdAt: string;
    expiresAt: string | null;
  }>;

  const showRoleSelector = roleProfiles.length > 0;

  // Confirm-cancel dialog — the invite whose id matches confirmCancelId.
  const confirmCancelInvite = nodes.find((n) => n.id === confirmCancelId);

  return (
    <div data-slot="invite-dialog" className={cn('w-full max-w-sm mx-auto', className)}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogPopup aria-labelledby="invite-dialog-title">
          <DialogHeader>
            <DialogTitle id="invite-dialog-title">{merged.title}</DialogTitle>
            <DialogDescription>{merged.description}</DialogDescription>
          </DialogHeader>

          <DialogPanel>
            <div className="space-y-5">
              <AuthErrorAlert error={formError} />

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
                      if (!/\S+@\S+\.\S+/.test(value)) return merged.errors.INVALID_EMAIL;
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
                      testId="invite-email"
                    />
                  )}
                </form.Field>

                {showRoleSelector && (
                  <form.Field name="profileId">
                    {(field) => (
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="invite-profile-id" className="text-sm font-medium leading-none">
                          {merged.roleLabel}
                        </label>
                        <select
                          id="invite-profile-id"
                          name={field.name}
                          value={field.state.value ?? ''}
                          onChange={(e) => field.handleChange(e.target.value || null)}
                          onBlur={field.handleBlur}
                          className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">{merged.roleDefaultOption}</option>
                          {roleProfiles.map((profile) => (
                            <option key={profile.id} value={profile.id}>
                              {profile.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </form.Field>
                )}

                <AuthLoadingButton
                  type="submit"
                  className="w-full"
                  isLoading={isPending}
                  loadingText={merged.submitButtonPending}
                  data-testid="invite-submit"
                >
                  {merged.submitButton}
                </AuthLoadingButton>
              </form>

              {/* Pending invites list */}
              {!pendingInvites.isLoading && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">{merged.pendingInvitesTitle}</p>
                  {nodes.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{merged.pendingInvitesEmpty}</p>
                  ) : (
                    <ul role="list" className="space-y-2 list-none">
                      {nodes.map((invite) => {
                        const daysLeft = invite.expiresAt && mountedAt !== null
                          ? Math.max(
                              0,
                              Math.round((new Date(invite.expiresAt).getTime() - mountedAt) / DAY_MS)
                            )
                          : expiryDaysProp;

                        return (
                          <li
                            key={invite.id}
                            role="listitem"
                            className="flex items-center justify-between gap-2 rounded-md border p-2.5 text-sm"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{invite.email}</p>
                              <p className="text-muted-foreground text-xs">
                                {interpolate(merged.expiresIn, { days: daysLeft })}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <Badge variant="secondary" className="text-xs">
                                pending
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResendInvite(invite)}
                                disabled={updateInvite.isPending || createInvite.isPending}
                                aria-label={`Resend invitation to ${invite.email}`}
                                className="h-7 px-2 text-xs"
                              >
                                {merged.resendButton}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmCancelId(invite.id)}
                                disabled={updateInvite.isPending}
                                aria-label={`Cancel invitation to ${invite.email}`}
                                className="text-destructive hover:text-destructive h-7 px-2 text-xs"
                              >
                                {merged.cancelInviteButton}
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </DialogPanel>
        </DialogPopup>
      </Dialog>

      {/* Nested confirm-cancel dialog */}
      {confirmCancelInvite && (
        <Dialog open={Boolean(confirmCancelId)} onOpenChange={(isOpen) => { if (!isOpen) setConfirmCancelId(null); }}>
          <DialogPopup>
            <DialogHeader>
              <DialogTitle>{merged.cancelInviteConfirmTitle}</DialogTitle>
              <DialogDescription>
                {interpolate(merged.cancelInviteConfirmDescription, { email: confirmCancelInvite.email })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter variant="bare">
              <Button variant="outline" onClick={() => setConfirmCancelId(null)}>
                {merged.cancelInviteButton}
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleCancelInvite(confirmCancelInvite.id)}
                disabled={updateInvite.isPending}
              >
                {merged.cancelInviteConfirmButton}
              </Button>
            </DialogFooter>
          </DialogPopup>
        </Dialog>
      )}
    </div>
  );
}
