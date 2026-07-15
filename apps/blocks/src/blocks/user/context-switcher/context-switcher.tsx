'use client';

/**
 * context-switcher  (registry: user-context-switcher)
 *
 * Dropdown that lets a signed-in user switch their active "acting as" context
 * between their personal account (type=1) and any org (type=2) they are a
 * member of. Demonstrates Constructive's unified User model: organisations ARE
 * users, disambiguated by the `type` field.
 *
 * BACKEND-PENDING (CASE-b):
 *   `switch_context(org_id uuid)` does not exist in `constructive_auth_public`
 *   yet. The generated `useSwitchContextMutation` hook therefore does NOT exist
 *   in `@/generated/auth`. This file compiles cleanly without importing it.
 *   The `onSwitchSubmit` prop is the primary/required path until the proc ships
 *   and the host regenerates the SDK.
 *
 *   LOCAL STATE LIMITATION (active-until-Phase-2):
 *   While the backend is pending, the active context is held in local state
 *   (`activeContextId` controlled prop or local `useState`). The host is
 *   responsible for persisting/restoring it across page loads. Once the proc
 *   ships and `useSwitchContextMutation` is generated, the hook can write the
 *   new context server-side and invalidate the `currentUser` + `orgMemberships`
 *   cache entries.
 *
 * DATA PATH (existing generated hooks — CASE-a for these two):
 *   - `useCurrentUserQuery`   from '@/generated/auth'   ✅ exists
 *   - `useOrgMembershipsQuery` from '@/generated/admin'  ✅ exists
 *   Both wired inside the `useUserContexts` utility hook.
 *
 * No client bootstrap, no QueryClientProvider, no fetch, no GraphQL document.
 * The host mounts `@constructive/blocks-runtime` once; that is the single
 * wiring point for `QueryClientProvider` + `configure()`.
 */

import { useState } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@constructive-io/ui/dropdown-menu';
import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';

import { cn } from '@/lib/utils';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { UserAvatar } from '@/blocks/user/user-avatar/user-avatar';

import {
  defaultUserContextSwitcherMessages,
  type UserContextSwitcherMessageOverrides,
  type UserContextSwitcherMessages
} from './messages';
import { useUserContexts, type UserContextMembership } from './hooks/use-user-contexts';
import { useSwitchContext } from './hooks/use-switch-context';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type { UserContextMembership } from './hooks/use-user-contexts';
export type { User } from './hooks/use-user-contexts';

export type UserContextSwitcherProps = {
  /**
   * Pre-fetched personal-account user. If omitted, fetched from `useCurrentUserQuery`.
   * Provide when the host already has currentUser in the React Query cache to avoid
   * a redundant auth fetch (spec: user-context-switcher.md §Props line 104–107).
   */
  currentUser?: UserContextMembership['user'];
  /** Currently active context ID (controlled). If unset, personal account is considered active. */
  activeContextId?: string;
  /** Callback after context switch completes. Receives the new active User. */
  onContextSwitch?: (user: UserContextMembership['user']) => void;
  /**
   * Adapter override: replaces useSwitchContext's default path.
   * REQUIRED while switch_context backend procedure is pending (CASE-b).
   * Must resolve the session org_id change server-side.
   */
  onSwitchSubmit?: (orgId: string | null) => Promise<void>;
  /** Show "Create new org" footer link (default: true). */
  showCreateOrgLink?: boolean;
  /** Fires when user clicks "Create new org". */
  onCreateOrgClick?: () => void;
  /** Show role chip next to org entries (default: true). */
  showRoleChip?: boolean;
  messages?: UserContextSwitcherMessageOverrides;
  /** Fires after a mapped error. Always fires. */
  onError?: (err: unknown) => void;
  /** Notification seam — fires for success, mapped errors, and branches. */
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

export function UserContextSwitcher({
  currentUser: injectedCurrentUser,
  activeContextId,
  onContextSwitch,
  onSwitchSubmit,
  showCreateOrgLink = true,
  onCreateOrgClick,
  showRoleChip = true,
  messages: messageOverrides,
  onError,
  onMessage,
  className
}: UserContextSwitcherProps) {
  // Deep merge: top-level keys + errors object merged separately.
  const merged: UserContextSwitcherMessages = {
    ...defaultUserContextSwitcherMessages,
    ...messageOverrides,
    errors: {
      ...defaultUserContextSwitcherMessages.errors,
      ...messageOverrides?.errors
    }
  };

  // Local active context state for uncontrolled / local-state mode.
  const [localActiveId, setLocalActiveId] = useState<string | null>(null);
  const resolvedActiveId = activeContextId ?? localActiveId;

  // Read available contexts from the generated hooks.
  // Pass injectedCurrentUser to skip the redundant useCurrentUserQuery fetch.
  const { data: contexts, isPending: contextsPending } = useUserContexts({
    roleOwner: merged.roleOwner,
    roleAdmin: merged.roleAdmin,
    roleMember: merged.roleMember,
    currentUser: injectedCurrentUser
  });

  // Switch-context: CASE-b — onSwitchSubmit is the primary path.
  const { switchTo, isPending: switchPending } = useSwitchContext({
    onSwitchSubmit,
    onContextSwitch: (user) => {
      setLocalActiveId(user.id);
      onContextSwitch?.(user);
    },
    onError: (err) => {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      onMessage?.({ kind: 'error', key, message });
      onError?.(err);
    },
    onMessage,
    // Pass the switchedToast template so the hook can interpolate '{{name}}' with
    // the target user's displayName and emit a ready-to-display message on success.
    switchedToastTemplate: merged.switchedToast
  });

  const isPending = contextsPending || switchPending;

  // Find the currently-active context for the trigger display.
  const activeContext =
    contexts.find((c) => c.user.id === resolvedActiveId) ?? contexts[0];

  // Separate personal account from org entries.
  const personalContexts = contexts.filter((c) => c.user.type === 'person');
  const orgContexts = contexts.filter((c) => c.user.type === 'organization');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          aria-label={merged.triggerAriaLabel}
          aria-busy={isPending}
          disabled={isPending}
          data-slot="context-switcher"
          className={cn('w-full max-w-sm mx-auto flex items-center gap-2 px-2', className)}
        >
          {activeContext ? (
            <>
              <UserAvatar
                user={{
                  id: activeContext.user.id,
                  type: activeContext.user.type,
                  displayName: activeContext.user.displayName,
                  username: activeContext.user.username,
                  profilePicture: activeContext.user.profilePicture
                }}
                size="sm"
              />
              <span className="truncate text-sm font-medium">
                {activeContext.user.displayName}
              </span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">{merged.triggerAriaLabel}</span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56">
        {/* Personal account section */}
        {personalContexts.length > 0 && (
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              {merged.personalAccountLabel}
            </DropdownMenuLabel>
            {personalContexts.map((ctx) => (
              <ContextItem
                key={ctx.user.id}
                ctx={ctx}
                isActive={ctx.user.id === resolvedActiveId}
                activeLabel={merged.activeLabel}
                showRoleChip={false}
                onSelect={() => {
                  if (ctx.user.id !== resolvedActiveId) {
                    void switchTo(ctx);
                  }
                }}
              />
            ))}
          </DropdownMenuGroup>
        )}

        {/* Org entries section */}
        {orgContexts.length > 0 && (
          <>
            {personalContexts.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                {merged.orgsLabel}
              </DropdownMenuLabel>
              {orgContexts.map((ctx) => (
                <ContextItem
                  key={ctx.user.id}
                  ctx={ctx}
                  isActive={ctx.user.id === resolvedActiveId}
                  activeLabel={merged.activeLabel}
                  showRoleChip={showRoleChip}
                  onSelect={() => {
                    if (ctx.user.id !== resolvedActiveId) {
                      void switchTo(ctx);
                    }
                  }}
                />
              ))}
            </DropdownMenuGroup>
          </>
        )}

        {/* Empty org state */}
        {orgContexts.length === 0 && showCreateOrgLink && (
          <>
            <DropdownMenuSeparator />
            <p className="px-2 py-1.5 text-xs text-muted-foreground">{merged.noOrgsHint}</p>
          </>
        )}

        {/* Footer: Create new org */}
        {showCreateOrgLink && onCreateOrgClick && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={onCreateOrgClick}
              className="text-sm cursor-pointer"
            >
              {merged.createOrgLink}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------------------------------------------------------------------------
// Internal sub-component: ContextItem
// ---------------------------------------------------------------------------

type ContextItemProps = {
  ctx: UserContextMembership;
  isActive: boolean;
  activeLabel: string;
  showRoleChip: boolean;
  onSelect: () => void;
};

function ContextItem({ ctx, isActive, activeLabel, showRoleChip, onSelect }: ContextItemProps) {
  return (
    <DropdownMenuItem
      onSelect={onSelect}
      aria-current={isActive ? true : undefined}
      className="flex items-center gap-2 cursor-pointer"
      aria-label={
        ctx.membership && showRoleChip
          ? `${ctx.user.displayName}, ${ctx.membership.roleLabel}`
          : ctx.user.displayName
      }
    >
      <UserAvatar
        user={{
          id: ctx.user.id,
          type: ctx.user.type,
          displayName: ctx.user.displayName,
          username: ctx.user.username,
          profilePicture: ctx.user.profilePicture
        }}
        size="sm"
      />
      <span className="flex-1 truncate text-sm">{ctx.user.displayName}</span>
      {showRoleChip && ctx.membership && (
        <Badge variant="outline" className="text-xs shrink-0">
          {ctx.membership.roleLabel}
        </Badge>
      )}
      {isActive && (
        <span className="sr-only">{activeLabel}</span>
      )}
    </DropdownMenuItem>
  );
}
