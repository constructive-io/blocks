'use client';

/**
 * members-list  (registry: org-members-list)
 *
 * Paginated list of org members with role chips and remove/transfer actions.
 * Renders each row with a UserAvatar, display name, role badge, optional
 * inline role-change, and a Remove button (gated by viewerIsOwner/viewerIsAdmin).
 *
 * Data path (sdk-binding-contract.md §5):
 *   • Query  — useOrgMembershipsQuery from @/generated/admin (EXISTS — Case a).
 *              Override seam: adapter prop.
 *   • Role change  — useUpdateOrgMembershipMutation (EXISTS — Case a).
 *                   Override seam: onRoleChange prop.
 *   • Remove member — useDeleteOrgMembershipMutation (EXISTS as table-direct fallback).
 *                    Override seam: onRemoveMember prop (primary, so host can wire
 *                    the future removeOrgMember procedure once it ships).
 *   • Transfer ownership — backend-pending (useTransferOrgOwnershipMutation does NOT
 *                         exist in the current admin SDK). Override seam: onTransferOwnership
 *                         prop is required/primary. When absent, transfer button is hidden.
 *
 * PROCEDURE_NOT_FOUND is in messages.errors to surface a clear message when
 * backend procedures are not yet deployed.
 *
 * No client bootstrap, no fetch, no GraphQL documents, no QueryClientProvider.
 * blocks-runtime wires the single QueryClient + admin configure() once at app root.
 */

import { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@constructive-io/ui/card';
import { Button } from '@constructive-io/ui/button';
import { Badge } from '@constructive-io/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@constructive-io/ui/dialog';
import { Skeleton } from '@constructive-io/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@constructive-io/ui/select';

import { cn } from '@/lib/utils';
import { useOrgMembershipsQuery } from '@/generated/admin';
import { useUpdateOrgMembershipMutation } from '@/generated/admin';
import { useDeleteOrgMembershipMutation } from '@/generated/admin';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';
import { UserAvatar } from '@/blocks/user/user-avatar/user-avatar';
import { useStepUp, StepUpError } from '@/blocks/auth/use-step-up/use-step-up';

import {
  defaultOrgMembersListMessages,
  type OrgMembersListMessageOverrides,
  type OrgMembersListMessages
} from './messages';

// ─── Public types ──────────────────────────────────────────────────────────────

/**
 * A normalized member record — shape consumed by the component and returned
 * from the default query. The host `adapter` must produce this shape.
 */
export type OrgMember = {
  /** The membership row id (used as key + for mutations). */
  membershipId: string;
  userId: string;
  displayName: string;
  username: string | null;
  profilePicture: string | null;
  isOwner: boolean;
  isAdmin: boolean;
  isApproved: boolean;
  profileId: string | null;
  /** Derived display label: 'Owner' | 'Admin' | 'Member' or profile name. */
  roleLabel: string;
};

export type OrgMembersListProps = {
  /** The org user-id (type=organization). Required. */
  orgId: string;
  /** Page size. Default: 25. */
  pageSize?: number;
  /** Whether the current viewer is owner (controls edit/remove visibility). */
  viewerIsOwner?: boolean;
  /** Whether the current viewer is admin. */
  viewerIsAdmin?: boolean;
  /** Available role profiles from [[org-roles-editor]]. Shows role selector when provided. */
  roleProfiles?: Array<{ id: string; label: string }>;
  messages?: OrgMembersListMessageOverrides;
  /**
   * Override: replaces the useOrgMembershipsQuery call entirely.
   * Provide when the host SDK does not expose this query or when testing.
   */
  adapter?: () => { members: OrgMember[]; isLoading: boolean; error: unknown };
  /**
   * Override: replaces the useDeleteOrgMembershipMutation call for member removal.
   * Called with the membershipId to delete. The host wires this to the future
   * removeOrgMember procedure (PROCEDURE_NOT_FOUND in messages.errors) once it ships.
   */
  onRemoveMember?: (membershipId: string) => Promise<void>;
  /**
   * Override: replaces the useUpdateOrgMembershipMutation call for role change.
   * Called with membershipId + new profileId (null = clear custom profile).
   */
  onRoleChange?: (membershipId: string, profileId: string | null) => Promise<void>;
  /**
   * Backend-pending: transfer-ownership procedure is not yet deployed.
   * When provided, a "Transfer ownership" button appears for non-owner rows.
   * When absent, the transfer UI is hidden (graceful degradation).
   */
  onTransferOwnership?: (membershipId: string) => Promise<void>;
  /** Fires after a member is successfully removed. Arg is the removed user's userId. */
  onRemoveSuccess?: (removedUserId: string) => void;
  /** Fires after a role change is successfully applied. First arg is userId. */
  onRoleChangeSuccess?: (userId: string, newProfileId: string | null) => void;
  /** Fires after ownership is successfully transferred. Arg is the new owner's userId. */
  onTransferOwnershipSuccess?: (newOwnerId: string) => void;
  /** Fires after a mapped error. Always fires. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success, warning, and error events. Always fires. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

function deriveRoleLabel(
  m: { isOwner: boolean | null; isAdmin: boolean | null; profileId: string | null },
  merged: OrgMembersListMessages,
  roleProfiles?: Array<{ id: string; label: string }>
): string {
  if (m.isOwner) return merged.roleOwner;
  if (m.isAdmin) return merged.roleAdmin;
  if (m.profileId && roleProfiles) {
    const found = roleProfiles.find((p) => p.id === m.profileId);
    if (found) return found.label;
  }
  return merged.roleMember;
}

// ─── Default query adapter ─────────────────────────────────────────────────────

function useDefaultAdapter(orgId: string, pageSize: number) {
  const query = useOrgMembershipsQuery({
    selection: {
      fields: {
        id: true,
        actorId: true,
        entityId: true,
        isOwner: true,
        isAdmin: true,
        isApproved: true,
        profileId: true,
        orgMemberProfileByMembershipId: {
          select: {
            displayName: true,
            profilePicture: true
          }
        }
      },
      where: { entityId: { equalTo: orgId } },
      first: pageSize
    }
  });

  return query;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MembersList({
  orgId,
  pageSize = 25,
  viewerIsOwner = false,
  viewerIsAdmin = false,
  roleProfiles,
  messages: messageOverrides,
  adapter,
  onRemoveMember: onRemoveMemberOverride,
  onRoleChange: onRoleChangeOverride,
  onTransferOwnership: onTransferOwnershipOverride,
  onRemoveSuccess,
  onRoleChangeSuccess,
  onTransferOwnershipSuccess,
  onError,
  onMessage,
  className
}: OrgMembersListProps) {
  // Deep merge: top-level keys + errors map merged separately.
  const merged: OrgMembersListMessages = {
    ...defaultOrgMembersListMessages,
    ...messageOverrides,
    errors: { ...defaultOrgMembersListMessages.errors, ...messageOverrides?.errors }
  };

  // ── Default query (adapter override replaces this) ──────────────────────────
  const defaultQuery = useDefaultAdapter(orgId, pageSize);
  const queryResult = adapter
    ? adapter()
    : {
        members: (defaultQuery.data?.orgMemberships?.nodes ?? []).map((node) => ({
          membershipId: node.id,
          userId: node.actorId ?? '',
          displayName: (node.orgMemberProfileByMembershipId as any)?.displayName ?? 'Unknown',
          username: null,
          profilePicture: (node.orgMemberProfileByMembershipId as any)?.profilePicture
            ? String((node.orgMemberProfileByMembershipId as any).profilePicture)
            : null,
          isOwner: node.isOwner ?? false,
          isAdmin: node.isAdmin ?? false,
          isApproved: node.isApproved ?? false,
          profileId: node.profileId ?? null,
          roleLabel: deriveRoleLabel(
            { isOwner: node.isOwner ?? false, isAdmin: node.isAdmin ?? false, profileId: node.profileId ?? null },
            merged,
            roleProfiles
          )
        })),
        isLoading: defaultQuery.isLoading,
        error: defaultQuery.error
      };

  // ── Default mutations ────────────────────────────────────────────────────────
  const defaultDeleteMutation = useDeleteOrgMembershipMutation({
    selection: { fields: { id: true } }
  });
  const defaultUpdateMutation = useUpdateOrgMembershipMutation({
    selection: { fields: { id: true, profileId: true } }
  });

  // ── Step-up ──────────────────────────────────────────────────────────────────
  const stepUp = useStepUp();

  // ── Local UI state ───────────────────────────────────────────────────────────
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [removeCandidate, setRemoveCandidate] = useState<OrgMember | null>(null);
  const [transferCandidate, setTransferCandidate] = useState<OrgMember | null>(null);
  const [actionPending, setActionPending] = useState(false);

  // ── Error handler (shared) ───────────────────────────────────────────────────
  function handleError(err: unknown) {
    const { code, message } = parseGraphQLError(err, {
      customMessages: merged.errors,
      defaultMessage: merged.errors.UNKNOWN_ERROR
    });
    const key = code ?? 'UNKNOWN_ERROR';
    setErrorMessage(message);
    onMessage?.({ kind: 'error', key, message });
    onError?.({ message, code: key });
  }

  // ── Remove member ────────────────────────────────────────────────────────────
  async function doRemoveMember(member: OrgMember) {
    setActionPending(true);
    setErrorMessage(null);
    try {
      const tier = member.isAdmin ? 'high' : 'medium';
      await stepUp({ tier });
    } catch (err) {
      if (err instanceof StepUpError && err.reason === 'cancelled') {
        setActionPending(false);
        setRemoveCandidate(null);
        onMessage?.({ kind: 'warning', key: 'STEP_UP_CANCELLED' });
        return;
      }
      handleError(err);
      setActionPending(false);
      setRemoveCandidate(null);
      return;
    }
    try {
      if (onRemoveMemberOverride) {
        await onRemoveMemberOverride(member.membershipId);
      } else {
        await defaultDeleteMutation.mutateAsync({ id: member.membershipId });
      }
      const msg = interpolate(merged.removeSuccessToast, { name: member.displayName });
      onMessage?.({ kind: 'success', key: 'removeMember.success', message: msg });
      onRemoveSuccess?.(member.userId);
    } catch (err) {
      handleError(err);
    } finally {
      setActionPending(false);
      setRemoveCandidate(null);
    }
  }

  // ── Role change ──────────────────────────────────────────────────────────────
  async function doRoleChange(member: OrgMember, newProfileId: string | null) {
    if (actionPending || defaultUpdateMutation.isPending) return;
    setErrorMessage(null);
    try {
      if (onRoleChangeOverride) {
        await onRoleChangeOverride(member.membershipId, newProfileId);
      } else {
        await defaultUpdateMutation.mutateAsync({
          id: member.membershipId,
          orgMembershipPatch: { profileId: newProfileId }
        });
      }
      const msg = interpolate(merged.roleChangeSuccessToast, { name: member.displayName });
      onMessage?.({ kind: 'success', key: 'roleChange.success', message: msg });
      onRoleChangeSuccess?.(member.userId, newProfileId);
    } catch (err) {
      handleError(err);
    }
  }

  // ── Transfer ownership ───────────────────────────────────────────────────────
  async function doTransferOwnership(member: OrgMember) {
    if (!onTransferOwnershipOverride) return; // backend-pending; hidden when absent
    setActionPending(true);
    setErrorMessage(null);
    try {
      await stepUp({ tier: 'high' });
    } catch (err) {
      if (err instanceof StepUpError && err.reason === 'cancelled') {
        setActionPending(false);
        setTransferCandidate(null);
        onMessage?.({ kind: 'warning', key: 'STEP_UP_CANCELLED' });
        return;
      }
      handleError(err);
      setActionPending(false);
      setTransferCandidate(null);
      return;
    }
    try {
      await onTransferOwnershipOverride(member.membershipId);
      const msg = interpolate(merged.transferSuccessToast, { name: member.displayName });
      onMessage?.({ kind: 'success', key: 'transferOwnership.success', message: msg });
      onTransferOwnershipSuccess?.(member.userId);
    } catch (err) {
      handleError(err);
    } finally {
      setActionPending(false);
      setTransferCandidate(null);
    }
  }

  const canManage = viewerIsOwner || viewerIsAdmin;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    // max-w-md (not -sm): rows carry the longest action pair in the list family
    // ("Transfer ownership" + "Remove") plus name + role/Pending badges — at
    // max-w-sm names truncate after ~7 chars and the second badge collides
    // with the buttons.
    <Card data-slot="members-list" className={cn('w-full max-w-md mx-auto', className)}>
      <CardHeader>
        <CardTitle>{merged.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <AuthErrorAlert error={errorMessage} />

        {queryResult.isLoading && (
          <div aria-label={merged.loadingAriaLabel} className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}

        {!queryResult.isLoading && queryResult.members.length === 0 && (
          <p className="text-muted-foreground py-4 text-center text-sm">{merged.emptyState}</p>
        )}

        {!queryResult.isLoading && queryResult.members.length > 0 && (
          <ul role="list" className="divide-border divide-y list-none [&>li:first-child]:pt-0">
            {queryResult.members.map((member) => (
              <li key={member.membershipId} role="listitem" className="flex items-center gap-3 py-3">
                <UserAvatar
                  user={{
                    id: member.userId,
                    type: 'person',
                    displayName: member.displayName,
                    username: member.username,
                    profilePicture: member.profilePicture
                  }}
                  size="sm"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{member.displayName}</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-xs">
                      {member.roleLabel}
                    </Badge>
                    {!member.isApproved && (
                      <Badge variant="outline" className="text-xs">
                        {merged.pendingBadge}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Inline role selector — only for non-owners when roleProfiles are provided */}
                {canManage && roleProfiles && roleProfiles.length > 0 && !member.isOwner && (
                  <Select
                    value={member.profileId ?? ''}
                    onValueChange={(val) => doRoleChange(member, val === '' ? null : val)}
                    disabled={actionPending || defaultUpdateMutation.isPending}
                  >
                    <SelectTrigger className="h-7 w-28 text-xs">
                      <SelectValue placeholder={merged.roleMember} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{merged.roleMember}</SelectItem>
                      {roleProfiles.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Transfer ownership button (only for non-owners, only if feature enabled) */}
                {canManage && viewerIsOwner && onTransferOwnershipOverride && !member.isOwner && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs"
                    aria-label={`${merged.transferOwnershipButton} ${member.displayName}`}
                    onClick={() => setTransferCandidate(member)}
                    disabled={actionPending}
                  >
                    {merged.transferOwnershipButton}
                  </Button>
                )}

                {/* Remove button — hidden for owner rows */}
                {canManage && !member.isOwner && (
                  <Button
                    variant="destructive-outline"
                    size="sm"
                    className="shrink-0 text-xs"
                    aria-label={`${merged.removeButton} ${member.displayName}`}
                    onClick={() => setRemoveCandidate(member)}
                    disabled={actionPending}
                    data-testid={`remove-${member.membershipId}`}
                  >
                    {merged.removeButton}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {/* Remove confirmation dialog */}
      <Dialog open={!!removeCandidate} onOpenChange={(open) => { if (!open) setRemoveCandidate(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{merged.removeConfirmTitle}</DialogTitle>
            <DialogDescription aria-live="polite">
              {removeCandidate
                ? interpolate(merged.removeConfirmDescription, { name: removeCandidate.displayName })
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveCandidate(null)} disabled={actionPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => removeCandidate && doRemoveMember(removeCandidate)}
              disabled={actionPending}
              data-testid="confirm-remove"
            >
              {merged.removeConfirmButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer ownership confirmation dialog */}
      <Dialog open={!!transferCandidate} onOpenChange={(open) => { if (!open) setTransferCandidate(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{merged.transferConfirmTitle}</DialogTitle>
            <DialogDescription aria-live="polite">
              {transferCandidate
                ? interpolate(merged.transferConfirmDescription, { name: transferCandidate.displayName })
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferCandidate(null)} disabled={actionPending}>
              Cancel
            </Button>
            <Button
              onClick={() => transferCandidate && doTransferOwnership(transferCandidate)}
              disabled={actionPending}
              data-testid="confirm-transfer"
            >
              {merged.transferConfirmButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
