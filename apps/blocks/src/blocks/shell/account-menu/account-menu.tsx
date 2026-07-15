'use client';

/**
 * account-menu  (registry: shell-account-menu)
 *
 * Pure layout menu — no data op of its own beyond what it composes. Renders
 * the current user's avatar + display name as the dropdown trigger. Menu items:
 *   • Account settings (plain <a href>)
 *   • Optionally: active context display (personal vs org)
 *   • Separator
 *   • Sign out (via the composed SignOutButton block)
 *
 * Data: uses `useCurrentUserQuery` from `@/generated/auth` to resolve the
 * trigger user when no `user` prop is passed. The sign-out action is fully
 * delegated to the composed `<SignOutButton>` (auth-sign-out-button block).
 *
 * Shell-block exception: navigates to `signOutRedirectHref` after sign-out
 * (block-contract.md §6). Fires `onSignOutSuccess()` before navigating.
 *
 * Binding doctrine: sdk-binding-contract.md §3 — import from `@/generated/auth`.
 * No fetch, no GraphQL doc string, no configure(), no QueryClientProvider.
 */

import { useCurrentUserQuery } from '@/generated/auth';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@constructive-io/ui/dropdown-menu';

import { cn } from '@/lib/utils';
import { UserAvatar } from '@/blocks/user/user-avatar/user-avatar';
import type { UserAvatarUser } from '@/blocks/user/user-avatar/user-avatar';
import { SignOutButton } from '@/blocks/auth/sign-out-button/sign-out-button';

import { defaultShellAccountMenuMessages, type ShellAccountMenuMessages } from './messages';

// ============================================================================
// Normalisation helper — API exposes User.type as Int! (1 = person, 2 = org)
// ============================================================================

function normalizeUserType(raw: number): 'person' | 'organization' {
  if (raw === 2) return 'organization';
  return 'person';
}

// ============================================================================
// Types
// ============================================================================

/** Resolved user shape used for the trigger. Normalised from the SDK int type. */
export type AccountMenuUser = UserAvatarUser;

export type ShellAccountMenuMessageOverrides = Partial<Omit<ShellAccountMenuMessages, 'errors'>> & {
  errors?: Partial<ShellAccountMenuMessages['errors']>;
};

export type ShellAccountMenuProps = {
  /** Link to account settings page. Default: '/account/settings' */
  accountSettingsHref?: string;
  /** URL to navigate to after sign-out. Default: '/login' */
  signOutRedirectHref?: string;
  /** Show the active context (org name or "Personal") below the user name. Default: true */
  showActiveContext?: boolean;
  messages?: ShellAccountMenuMessageOverrides;
  /** Fires after sign-out success and before navigation. Use to clear stores. */
  onSignOutSuccess?: () => void;
  /** Fires after a mapped sign-out error. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success and errors. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

// ============================================================================
// Component
// ============================================================================

export function ShellAccountMenu({
  accountSettingsHref = '/account/settings',
  signOutRedirectHref = '/login',
  showActiveContext = true,
  messages: messageOverrides,
  onSignOutSuccess,
  onError,
  onMessage,
  className
}: ShellAccountMenuProps) {
  // Deep merge: top-level copy + errors map merged separately.
  const merged: ShellAccountMenuMessages = {
    ...defaultShellAccountMenuMessages,
    ...messageOverrides,
    errors: { ...defaultShellAccountMenuMessages.errors, ...messageOverrides?.errors }
  };

  // Resolve current user from the generated auth SDK.
  // The query is deduplicated by TanStack Query — if user-context-switcher or
  // another block already fetched it, no extra network request is made.
  const currentUserResult = useCurrentUserQuery({
    selection: {
      fields: {
        id: true,
        type: true,
        displayName: true,
        username: true,
        profilePicture: true
      }
    }
  });

  const rawUser = currentUserResult.data?.currentUser;

  // Normalise from API shape to the block's public UserAvatarUser type.
  // InferSelectResult wraps scalars as `{}` in TS; cast profilePicture to string.
  const user: AccountMenuUser | null = rawUser
    ? {
        id: (rawUser.id as string) ?? '',
        type: typeof rawUser.type === 'number' ? normalizeUserType(rawUser.type as number) : 'person',
        displayName: (rawUser.displayName as string) ?? '',
        username: (rawUser.username as string | null) ?? null,
        profilePicture: (rawUser.profilePicture as string | null) ?? null
      }
    : null;

  const displayName = user?.displayName ?? '';
  const truncatedName = displayName.length > 20 ? `${displayName.slice(0, 20)}…` : displayName;

  const contextLabel =
    user?.type === 'organization' ? user.displayName : merged.personalContextLabel;

  function handleSignOutSuccess() {
    onSignOutSuccess?.();
    // Shell-block exception: navigate after sign-out (block-contract.md §6).
    if (typeof window !== 'undefined') {
      window.location.href = signOutRedirectHref;
    }
  }

  function handleSignOutError(err: { message: string; code: string }) {
    // The message is already mapped by SignOutButton; forward directly.
    onError?.({ message: err.message, code: err.code });
  }

  return (
    <div data-slot="account-menu" className={cn('w-full max-w-sm mx-auto', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={merged.triggerAriaLabel}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          data-testid="account-menu-trigger"
        >
          {user && (
            <UserAvatar user={user} size="sm" />
          )}
          {!user && (
            <span className="size-6 rounded-full bg-muted" aria-hidden="true" />
          )}
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate font-medium leading-tight">{truncatedName}</span>
          </span>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-56"
          aria-live="polite"
          data-testid="account-menu-content"
        >
          {/* User identity header — label must be inside a group per Base UI */}
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-0.5">
                <p className="truncate text-sm font-medium leading-none">{truncatedName}</p>
                {showActiveContext && (
                  <p className="text-muted-foreground truncate text-xs leading-none" data-testid="context-label">{contextLabel}</p>
                )}
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <a
                href={accountSettingsHref}
                data-testid="account-settings-link"
              >
                {merged.accountSettingsLabel}
              </a>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* Sign out — composed via the auth-sign-out-button block */}
          <DropdownMenuGroup>
            <DropdownMenuItem
              className="p-0 focus:bg-transparent"
              onSelect={(e) => e.preventDefault()}
              data-testid="sign-out-menu-item"
            >
              <SignOutButton
                variant="ghost"
                className="w-full justify-start px-2 py-1.5 text-sm font-normal h-auto"
                messages={{
                  buttonText: merged.signOutLabel,
                  buttonPending: merged.signOutLabel,
                  successMessage: merged.signOutSuccessToast,
                  // Forward both catalog error codes so SIGN_OUT_FAILED overrides
                  // reach parseGraphQLError inside SignOutButton at runtime.
                  // Cast is required because SignOutButton's errors type only
                  // declares UNKNOWN_ERROR; SIGN_OUT_FAILED is handled dynamically.
                  errors: {
                    SIGN_OUT_FAILED: merged.errors.SIGN_OUT_FAILED,
                    UNKNOWN_ERROR: merged.errors.UNKNOWN_ERROR
                  } as Record<string, string>
                }}
                onSuccess={handleSignOutSuccess}
                onError={handleSignOutError}
                onMessage={onMessage}
              />
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
