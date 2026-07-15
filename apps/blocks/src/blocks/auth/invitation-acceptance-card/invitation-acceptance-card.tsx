'use client';

/**
 * invitation-acceptance-card  (registry: auth-invitation-acceptance-card)
 *
 * Card for accepting or declining an invite (app-level or org-level). Calls
 * the host's generated `useSubmitAppInviteCodeMutation` or
 * `useSubmitOrgInviteCodeMutation` from `@/generated/admin` — both ops live
 * in `invites_public` → namespace `admin`.
 *
 * Binding doctrine (sdk-binding-contract.md §2, §5–§7):
 *   • Data path = generated React-Query hooks, no fetch / GraphQL document.
 *   • NO client bootstrap — blocks-runtime wires the QueryClient + configure().
 *   • Override seam: `onSubmit` fully replaces the mutation calls.
 *   • Error mapping via auth-errors; inline alert only (no toast in v1).
 *
 * Both mutations take `{ input: { token?: string } }` and return a payload
 * with `{ result?: boolean | null }`. A boolean `true` means accepted.
 */

import { useState } from 'react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@constructive-io/ui/card';
import { Button } from '@constructive-io/ui/button';
import { Badge } from '@constructive-io/ui/badge';
import { Separator } from '@constructive-io/ui/separator';

import { cn } from '@/lib/utils';
import { useSubmitAppInviteCodeMutation, useSubmitOrgInviteCodeMutation } from '@/generated/admin';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';
import { AuthLoadingButton } from '@/blocks/primitives/auth-loading-button';
import { UserAvatar, type UserAvatarUser } from '@/blocks/user/user-avatar/user-avatar';

import {
  defaultInvitationAcceptanceMessages,
  type InvitationAcceptanceMessageOverrides,
  type InvitationAcceptanceMessages
} from './messages';

// ── Types ────────────────────────────────────────────────────────────────────

/** Minimal invite metadata surfaced as props (caller parses URL/token). */
export type InviteMetadata = {
  /** The invitation token from the URL. */
  token: string;
  /** App-level or org-level invite. */
  kind: 'app' | 'org';
  /** Inviter's user record. Optional — shown in org invites. */
  inviter?: UserAvatarUser | null;
  /** The org being joined. Required when kind === 'org'. */
  org?: UserAvatarUser | null;
  /** Human-readable role label (e.g. "Member", "Admin"). */
  role?: string | null;
  /** ISO-8601 expiry timestamp — for display only. */
  expiresAt?: string | null;
};

/** Result returned from the accept action and passed to `onSuccess`. */
export type InviteAcceptResult = {
  kind: 'app' | 'org';
  /** Populated for org invites if an org was passed as a prop. */
  org?: {
    id: string;
    displayName: string;
  };
  /** Caller routes to this path after acceptance, if provided. */
  redirectTo?: string;
};

export type InvitationAcceptanceCardProps = {
  /** The invite token from the URL (required). */
  token: string;
  /** App-level or org-level invite (default 'app'). */
  kind?: 'app' | 'org';
  /** Optional: inviter user data for display. */
  inviter?: UserAvatarUser | null;
  /** Optional: org user data for display (kind='org'). */
  org?: UserAvatarUser | null;
  /** Optional: role label for display (kind='org'). */
  role?: string | null;
  messages?: InvitationAcceptanceMessageOverrides;
  /**
   * Replace the default mutation calls.
   * Receives `{ token, kind }` and must resolve to `InviteAcceptResult`.
   */
  onSubmit?: (input: { token: string; kind: 'app' | 'org' }) => Promise<InviteAcceptResult>;
  /** Fires after acceptance. Always fires. */
  onSuccess?: (result: InviteAcceptResult) => void;
  /** Fires when Decline is clicked. Caller navigates away. */
  onDecline?: () => void;
  /** Fires after a mapped error. Always fires. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success, mapped errors, and non-fatal branches. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

// ── Simple mustache interpolation for {{key}} tokens ─────────────────────────
function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

// ── Component ─────────────────────────────────────────────────────────────────

export function InvitationAcceptanceCard({
  token,
  kind = 'app',
  inviter,
  org,
  role,
  messages: messageOverrides,
  onSubmit: onSubmitOverride,
  onSuccess,
  onDecline,
  onError,
  onMessage,
  className
}: InvitationAcceptanceCardProps) {
  // Deep merge: top-level copy + errors map merged separately.
  const merged: InvitationAcceptanceMessages = {
    ...defaultInvitationAcceptanceMessages,
    ...messageOverrides,
    errors: { ...defaultInvitationAcceptanceMessages.errors, ...messageOverrides?.errors }
  };

  // Generated hooks from the host's `admin` SDK (invites_public → namespace admin).
  // Both are always instantiated — only one is called based on `kind`.
  const submitApp = useSubmitAppInviteCodeMutation({
    selection: { fields: { result: true } }
  });

  const submitOrg = useSubmitOrgInviteCodeMutation({
    selection: { fields: { result: true } }
  });

  // Hybrid pending: generated hooks track their own; override path does not.
  const [overridePending, setOverridePending] = useState(false);
  const defaultIsPending = kind === 'org' ? submitOrg.isPending : submitApp.isPending;
  const isPending = onSubmitOverride ? overridePending : defaultIsPending;

  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);

  async function handleAccept() {
    if (!token) {
      const msg = merged.missingTokenDescription;
      setError(msg);
      onMessage?.({ kind: 'error', key: 'MISSING_TOKEN', message: msg });
      onError?.({ message: msg, code: 'MISSING_TOKEN' });
      return;
    }

    setError(null);
    if (onSubmitOverride) setOverridePending(true);

    try {
      let result: InviteAcceptResult;

      let serverAccepted: boolean;

      if (onSubmitOverride) {
        result = await onSubmitOverride({ token, kind });
        // B2 compliance: InviteAcceptResult has no accepted field.
        // Derive acceptance from result shape: app invites are always accepted;
        // org invites are accepted when the caller populates result.org.
        serverAccepted = result.kind === 'app' || result.org !== undefined;
      } else {
        if (kind === 'org') {
          const data = await submitOrg.mutateAsync({ input: { token } });
          serverAccepted = data.submitOrgInviteCode?.result ?? false;
        } else {
          const data = await submitApp.mutateAsync({ input: { token } });
          serverAccepted = data.submitAppInviteCode?.result ?? false;
        }

        result = {
          kind,
          org:
            kind === 'org' && org
              ? { id: org.id, displayName: org.displayName }
              : undefined
        };
      }

      if (serverAccepted) {
        setAccepted(true);

        const successKey = kind === 'org' ? 'inviteAccepted.org' : 'inviteAccepted.app';
        const successMsg =
          kind === 'org'
            ? interpolate(merged.orgSuccessTitle, { orgName: org?.displayName ?? '' })
            : merged.appSuccessTitle;

        onMessage?.({ kind: 'success', key: successKey, message: successMsg });
        onSuccess?.(result);
      } else {
        // Server returned result:false — org approval is pending (is_approved=false).
        setPendingApproval(true);
        const orgName = org?.displayName ?? '';
        const pendingMsg = interpolate(merged.pendingApprovalDescription, { orgName });
        onMessage?.({ kind: 'info', key: 'INVITE_PENDING_APPROVAL', message: pendingMsg });
        onSuccess?.(result);
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
    } finally {
      if (onSubmitOverride) setOverridePending(false);
    }
  }

  function handleDecline() {
    onDecline?.();
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (accepted) {
    const orgName = org?.displayName ?? '';

    return (
      <Card data-slot="invitation-acceptance-card" className={cn('w-full max-w-sm mx-auto', className)}>
        <CardHeader>
          <CardTitle>
            {kind === 'org'
              ? interpolate(merged.orgSuccessTitle, { orgName })
              : merged.appSuccessTitle}
          </CardTitle>
          <CardDescription>
            {kind === 'org'
              ? interpolate(merged.orgSuccessDescription, { orgName })
              : merged.appSuccessDescription}
          </CardDescription>
        </CardHeader>
        {kind === 'org' && (
          <CardContent>
            <p className="text-muted-foreground text-sm">{merged.orgSuccessSwitchHint}</p>
          </CardContent>
        )}
      </Card>
    );
  }

  // ── Pending-approval screen (org invite, is_approved=false) ─────────────────
  if (pendingApproval) {
    const orgName = org?.displayName ?? '';

    return (
      <Card data-slot="invitation-acceptance-card" className={cn('w-full max-w-sm mx-auto', className)}>
        <CardHeader>
          <CardTitle>{merged.pendingApprovalTitle}</CardTitle>
          <CardDescription>
            {interpolate(merged.pendingApprovalDescription, { orgName })}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // ── Invite display ──────────────────────────────────────────────────────────
  const orgName = org?.displayName ?? '';
  const inviterName = inviter?.displayName ?? '';

  const title =
    kind === 'org'
      ? interpolate(merged.orgInviteTitle, { orgName })
      : merged.appInviteTitle;

  const description =
    kind === 'org'
      ? interpolate(merged.orgInviteDescription, { orgName, inviterName })
      : merged.appInviteDescription;

  return (
    <Card data-slot="invitation-acceptance-card" className={cn('w-full max-w-sm mx-auto', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <AuthErrorAlert error={error} />

        {/* Org avatar + inviter */}
        {kind === 'org' && (org || inviter) && (
          <div className="space-y-3">
            {org && (
              <div className="flex items-center gap-3">
                <UserAvatar user={org} size="lg" alt={`${org.displayName} organization`} />
                <div>
                  <p className="text-sm font-medium">{org.displayName}</p>
                  {org.username && (
                    <p className="text-muted-foreground text-xs">@{org.username}</p>
                  )}
                </div>
              </div>
            )}

            {org && inviter && <Separator />}

            {inviter && (
              <div className="flex items-center gap-2.5">
                <UserAvatar user={inviter} size="sm" alt={`${inviter.displayName} inviter`} />
                <p className="text-muted-foreground text-sm">
                  <span className="font-medium">{merged.orgInviteFrom}:</span>{' '}
                  {inviter.displayName}
                </p>
              </div>
            )}

            {role && (
              <div className="flex items-center gap-2">
                <p className="text-muted-foreground text-sm font-medium">{merged.orgInviteRole}:</p>
                <Badge variant="secondary">{role}</Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        <AuthLoadingButton
          className="w-full"
          isLoading={isPending}
          loadingText={merged.acceptButtonPending}
          onClick={handleAccept}
          data-testid="accept-invite-submit"
          aria-busy={isPending}
        >
          {merged.acceptButton}
        </AuthLoadingButton>

        <Button
          variant="ghost"
          className="w-full"
          onClick={handleDecline}
          disabled={isPending}
          data-testid="decline-invite-button"
        >
          {merged.declineButton}
        </Button>
      </CardFooter>
    </Card>
  );
}
