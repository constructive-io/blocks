'use client';

/**
 * app-memberships  (registry: org-app-memberships)
 *
 * Admin block for managing an org's app-level memberships.
 * CASE-A: all three generated hooks exist in the admin SDK:
 *   - useAppMembershipsQuery    → list org memberships
 *   - useUpdateAppMembershipMutation → approve / profile-update
 *   - useDeleteAppMembershipMutation → revoke
 *
 * Data path follows sdk-binding-contract.md §3–§5 (generated hook, @/generated/admin).
 * No fetch, no GraphQL document, no client bootstrap, no QueryClientProvider.
 * Step-up gates the revoke action at tier:'medium' (password re-verification).
 *
 * PROCEDURE_NOT_FOUND is included in messages.errors because RLS policy coverage
 * for type=2 actor_id is unconfirmed; the hook may surface this code at runtime
 * until the backend is fully deployed. See spec: org-app-memberships.md.
 */

import { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@constructive-io/ui/card';
import { Button } from '@constructive-io/ui/button';
import { Badge } from '@constructive-io/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@constructive-io/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@constructive-io/ui/select';
import { Skeleton } from '@constructive-io/ui/skeleton';

import { cn } from '@/lib/utils';
import { useAppMembershipsQuery } from '@/generated/admin';
import { useUpdateAppMembershipMutation } from '@/generated/admin';
import { useDeleteAppMembershipMutation } from '@/generated/admin';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';
import { useStepUp, StepUpError } from '@/blocks/auth/use-step-up/use-step-up';

import { defaultOrgAppMembershipsMessages, type OrgAppMembershipsMessageOverrides } from './messages';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type OrgAppMembership = {
  id: string;
  /** actorId is the org user id. appId is not exposed by the generated admin SDK
   * (memberships_public.app_memberships does not have a direct app_id column in the
   * currently generated SDK). Pass appName via the consumer to label memberships. */
  actorId: string | null;
  appName?: string;
  isApproved: boolean | null;
  isVerified: boolean | null;
  profileId: string | null;
  createdAt: string | null;
};

/** Variables for the approve/profile-update mutation. */
export type UpdateAppMembershipVars = {
  id: string;
  appMembershipPatch: {
    isApproved?: boolean | null;
    profileId?: string | null;
  };
};

/** Variables for the revoke (delete) mutation. */
export type DeleteAppMembershipVars = {
  id: string;
};

export type OrgAppMembershipsProps = {
  /** The org User id (type=2). Required. */
  orgId: string;
  /** Available app membership profiles (platform-defined). */
  membershipProfiles?: Array<{ id: string; label: string }>;
  messages?: OrgAppMembershipsMessageOverrides;
  /** Replace the default update mutation (approve / profile-update). Receives the same vars. */
  onSubmit?: (vars: UpdateAppMembershipVars) => Promise<OrgAppMembership | null>;
  /** Replace the default delete mutation (revoke). Receives the same vars. */
  onRevoke?: (vars: DeleteAppMembershipVars) => Promise<OrgAppMembership | null>;
  /** Fires after approve, revoke, or profile-update. Always fires. */
  onSuccess?: (action: 'approve' | 'revoke' | 'profile-update', membershipId: string) => void;
  /** Fires after a mapped error. Always fires. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success, errors, and informational events. Always fires. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OrgAppMemberships({
  orgId,
  membershipProfiles = [],
  messages: messageOverrides,
  onSubmit: onSubmitOverride,
  onRevoke: onRevokeOverride,
  onSuccess,
  onError,
  onMessage,
  className
}: OrgAppMembershipsProps) {
  // Deep merge: top-level copy + errors map merged separately.
  const merged = {
    ...defaultOrgAppMembershipsMessages,
    ...messageOverrides,
    errors: { ...defaultOrgAppMembershipsMessages.errors, ...messageOverrides?.errors }
  };

  // ---------------------------------------------------------------------------
  // Generated hooks (CASE-A: all exist in @/generated/admin)
  // ---------------------------------------------------------------------------

  const membershipsQuery = useAppMembershipsQuery({
    selection: {
      fields: {
        id: true,
        actorId: true,
        isApproved: true,
        isVerified: true,
        profileId: true,
        createdAt: true
      },
      where: { actorId: { equalTo: orgId } }
    }
  });

  const updateMutation = useUpdateAppMembershipMutation({
    selection: {
      fields: {
        id: true,
        isApproved: true,
        profileId: true
      }
    }
  });

  const deleteMutation = useDeleteAppMembershipMutation({
    selection: {
      fields: {
        id: true
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Override pending states
  // ---------------------------------------------------------------------------
  const [overrideUpdatePending, setOverrideUpdatePending] = useState(false);
  const [overrideRevokePending, setOverrideRevokePending] = useState(false);
  const isUpdatePending = onSubmitOverride ? overrideUpdatePending : updateMutation.isPending;
  const isRevokePending = onRevokeOverride ? overrideRevokePending : deleteMutation.isPending;

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [actionError, setActionError] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<OrgAppMembership | null>(null);

  const stepUp = useStepUp();

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function handleApprove(membership: OrgAppMembership) {
    setActionError(null);
    if (onSubmitOverride) setOverrideUpdatePending(true);
    try {
      const vars: UpdateAppMembershipVars = {
        id: membership.id,
        appMembershipPatch: { isApproved: true }
      };
      if (onSubmitOverride) {
        await onSubmitOverride(vars);
      } else {
        await updateMutation.mutateAsync({ id: vars.id, appMembershipPatch: vars.appMembershipPatch });
      }
      onMessage?.({ kind: 'success', key: 'approve.success', message: merged.approveSuccessMessage });
      onSuccess?.('approve', membership.id);
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setActionError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    } finally {
      if (onSubmitOverride) setOverrideUpdatePending(false);
    }
  }

  async function handleProfileUpdate(membership: OrgAppMembership, profileId: string) {
    setActionError(null);
    if (onSubmitOverride) setOverrideUpdatePending(true);
    try {
      const vars: UpdateAppMembershipVars = {
        id: membership.id,
        appMembershipPatch: { profileId }
      };
      if (onSubmitOverride) {
        await onSubmitOverride(vars);
      } else {
        await updateMutation.mutateAsync({ id: vars.id, appMembershipPatch: vars.appMembershipPatch });
      }
      onMessage?.({ kind: 'success', key: 'profileUpdate.success', message: merged.profileUpdateSuccessMessage });
      onSuccess?.('profile-update', membership.id);
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setActionError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    } finally {
      if (onSubmitOverride) setOverrideUpdatePending(false);
    }
  }

  async function handleRevokeConfirm() {
    if (!revokeTarget) return;
    setActionError(null);
    try {
      // Step-up: tier:'medium' (password re-verification) required before revoke.
      await stepUp({ tier: 'medium' });
    } catch (err) {
      if (err instanceof StepUpError && err.reason === 'cancelled') {
        setRevokeTarget(null);
        return;
      }
      // Step-up error is a warning (non-fatal branch) — surface it and abort.
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setActionError(message);
      onMessage?.({ kind: 'warning', key, message });
      onError?.({ message, code: key });
      setRevokeTarget(null);
      return;
    }

    const targetId = revokeTarget.id;
    if (onRevokeOverride) setOverrideRevokePending(true);
    try {
      const vars: DeleteAppMembershipVars = { id: targetId };
      if (onRevokeOverride) {
        await onRevokeOverride(vars);
      } else {
        await deleteMutation.mutateAsync({ id: vars.id });
      }
      setRevokeTarget(null);
      onMessage?.({ kind: 'success', key: 'revoke.success', message: merged.revokeSuccessMessage });
      onSuccess?.('revoke', targetId);
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setRevokeTarget(null);
      setActionError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    } finally {
      if (onRevokeOverride) setOverrideRevokePending(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Derive memberships list from query
  // ---------------------------------------------------------------------------
  const rawNodes = membershipsQuery.data?.appMemberships?.nodes ?? null;
  const memberships: OrgAppMembership[] | null = rawNodes
    ? rawNodes.map((m) => ({
        id: m.id,
        actorId: m.actorId ?? null,
        // appName is not a column on the generated query node — it is a host-supplied
        // label (see OrgAppMembership.appName). Carry it through when present so a
        // consumer that joins app metadata onto the node can label memberships.
        appName: (m as { appName?: string }).appName ?? undefined,
        isApproved: m.isApproved ?? null,
        isVerified: m.isVerified ?? null,
        profileId: m.profileId ?? null,
        createdAt: m.createdAt ?? null
      }))
    : null;

  const isLoading = membershipsQuery.isLoading;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <Card data-slot="app-memberships" className={cn('w-full max-w-sm mx-auto', className)}>
      <CardHeader>
        <CardTitle>{merged.title}</CardTitle>
        <CardDescription>{merged.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <AuthErrorAlert error={actionError} />

        {isLoading ? (
          <ul role="list" className="space-y-3 list-none" aria-label={merged.loadingAriaLabel}>
            {[0, 1, 2].map((i) => (
              <li key={i}>
                <Skeleton className="h-16 w-full rounded-md" />
              </li>
            ))}
          </ul>
        ) : memberships && memberships.length > 0 ? (
          <ul role="list" className="space-y-3 list-none">
            {memberships.map((membership) => (
              <li key={membership.id} className="rounded-md border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-sm font-medium text-foreground truncate max-w-[160px]">
                      {membership.appName ?? 'Unknown app'}
                    </span>
                    {membership.isApproved ? (
                      <Badge variant="default" className="text-xs">{merged.approvedBadge}</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">{merged.pendingBadge}</Badge>
                    )}
                    {membership.isVerified && (
                      <Badge variant="outline" className="text-xs">{merged.verifiedBadge}</Badge>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {!membership.isApproved && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isUpdatePending || isRevokePending}
                        onClick={() => handleApprove(membership)}
                        aria-label={`${merged.approveButton}${membership.appName ? ` ${membership.appName}` : ''}`}
                        data-testid="approve-button"
                      >
                        {merged.approveButton}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive-outline"
                      disabled={isUpdatePending || isRevokePending}
                      onClick={() => { setRevokeTarget(membership); setActionError(null); }}
                      aria-label={`${merged.revokeButton}${membership.appName ? ` ${membership.appName}` : ''}`}
                      data-testid="revoke-button"
                    >
                      {merged.revokeButton}
                    </Button>
                  </div>
                </div>

                {membershipProfiles.length > 0 && (
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor={`profile-select-${membership.id}`}
                      className="text-xs text-muted-foreground shrink-0"
                    >
                      {merged.profileLabel}
                    </label>
                    {/* value must be null (not '') when unassigned — an empty string
                        counts as a value and suppresses the SelectValue placeholder */}
                    <Select
                      value={membership.profileId ?? null}
                      onValueChange={(val) => handleProfileUpdate(membership, val)}
                      disabled={isUpdatePending || isRevokePending}
                    >
                      <SelectTrigger id={`profile-select-${membership.id}`} className="h-7 text-xs flex-1">
                        <SelectValue placeholder={merged.profilePlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {membershipProfiles.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : !isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">{merged.emptyState}</p>
        ) : null}
      </CardContent>

      {/* Revoke confirmation dialog */}
      <Dialog open={Boolean(revokeTarget)} onOpenChange={(open) => { if (!open) setRevokeTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{merged.revokeConfirmTitle}</DialogTitle>
            <DialogDescription>{merged.revokeConfirmDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRevokeTarget(null)}
              disabled={isRevokePending}
              data-testid="revoke-cancel-button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevokeConfirm}
              disabled={isRevokePending}
              data-testid="revoke-confirm-button"
            >
              {isRevokePending ? '…' : merged.revokeConfirmButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
