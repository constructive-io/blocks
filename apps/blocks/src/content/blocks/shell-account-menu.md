# shell-account-menu

**Type:** `registry:block`
**Status:** `v1 (frontend ready)`
**Namespace:** `shell-*`
**Skill reference:** `constructive-frontend/references/block-auth-org-glue.md`
**Master entry:** `blocks-master.md#shell-account-menu`

**Pairing:** No page block — card-only. Used as: the bottom-of-sidebar slot in [[shell-sidebar]] and the top-right slot in [[shell-header]]. Renders [[user-avatar]] as its trigger.

## Purpose

Dropdown showing the current user's [[user-avatar]] + display name as the trigger, with menu items: Account settings link, Sign out button. Optionally shows the currently active context (personal vs org). Calls `constructive_auth_public.sign_out()` via `useSignOutMutation` on sign-out click, invalidates the React Query cache, then navigates to the sign-out redirect URL.

## When to use

- In the bottom of [[shell-sidebar]] for the primary account action anchor.
- In the top-right of [[shell-header]] for a compact account menu.
- Not a fit when: the app only needs a standalone sign-out button — use `[[auth-sign-out-button]]` directly.

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/shell/shell-account-menu.tsx` | `registry:component` |
| `components/shell/shell-account-menu.requires.json` | `registry:file` |
| `lib/shell/messages/shell-account-menu-messages.ts` | `registry:lib` |

> No data hook is shipped. The block imports `useCurrentUserQuery` and `useSignOutMutation` from the host's generated `auth` SDK (`@/generated/auth`). Only the messages catalog and the `requires.json` manifest are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (Constructive block — supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `[[user-avatar]]` (user-* block — trigger avatar)
- `[[auth-sign-out-button]]` (shell-* / auth-* block — standalone sign-out; provides the `useSignOutMutation` import path via the generated `auth` SDK)
- `dropdown-menu` (shadcn primitive)
- `separator` (shadcn primitive)

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `sonner` (peer)
- `@tanstack/react-query` — **not declared per-block**; arrives transitively via the `blocks-runtime` registry dependency.

## DB procedures used by default hook

- `constructive_auth_public.current_user() RETURNS users` — schema `constructive_auth_public` → **namespace `auth`** → generated op `currentUser` → hook `useCurrentUserQuery`. Deployed v1.
- `constructive_auth_public.sign_out() RETURNS void` — schema `constructive_auth_public` → **namespace `auth`** → generated op `signOut` → hook `useSignOutMutation`. Deployed v1.

## Props

```ts
export type ShellAccountMenuProps = {
  /** Link to account settings page. Default: '/account/settings' */
  accountSettingsHref?: string;
  /** URL to navigate to after sign-out. Default: '/login' */
  signOutRedirectHref?: string;
  /** Show the active context (org name or "Personal") in the trigger. Default: true */
  showActiveContext?: boolean;
  notifications?: boolean | NotificationConfig;
  messages?: Partial<ShellAccountMenuMessages>;
  onSignOutSuccess?: () => void;
  onError?: (err: unknown) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
};
```

## Messages catalog

```ts
export type ShellAccountMenuMessages = {
  /** Trigger button accessible label */
  triggerAriaLabel: string;
  /** Menu item: account settings */
  accountSettingsLabel: string;
  /** Menu item: sign out */
  signOutLabel: string;
  /** Label for active context display */
  activeContextLabel: string;
  /** Shown below user name when in personal context */
  personalContextLabel: string;
  /** Toast on sign-out success */
  signOutSuccessToast: string;
  errors: {
    SIGN_OUT_FAILED: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultShellAccountMenuMessages: ShellAccountMenuMessages = {
  triggerAriaLabel: 'Account menu',
  accountSettingsLabel: 'Account settings',
  signOutLabel: 'Sign out',
  activeContextLabel: 'Active context',
  personalContextLabel: 'Personal account',
  signOutSuccessToast: "You've been signed out.",
  errors: {
    SIGN_OUT_FAILED: 'Sign out failed. Please try again.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The block does **not** ship a hand-written data hook. It imports the generated hooks directly from the host's `auth` SDK.

**Current user (trigger avatar display):**
- **Import:** `import { useCurrentUserQuery } from '@/generated/auth';`
- **Instantiate:**
  ```ts
  const currentUser = useCurrentUserQuery({
    selection: { fields: { id: true, type: true, displayName: true, profilePicture: true } },
  });
  ```
- **Read result:**
  ```ts
  const user = currentUser.data?.currentUser;
  ```
- **Returns:** `{ data, isPending, error }` (TanStack Query v5 style).

**Sign out:**
- **Import:** `import { useSignOutMutation } from '@/generated/auth';`
- **Instantiate:**
  ```ts
  const signOut = useSignOutMutation({ selection: {} });
  ```
- **Call:**
  ```ts
  const result = await (onSubmitOverride
    ? onSubmitOverride()
    : signOut.mutateAsync({}).then((d) => d.signOut));
  ```
- **On success:** invalidates the React Query cache (call `queryClient.invalidateQueries()`), fires `onSignOutSuccess()`, then navigates to `signOutRedirectHref`.
- **Returns:** `{ mutateAsync, isPending, error }`.

### `shell-account-menu.requires.json`

```json
{
  "namespace": "auth",
  "mutations": ["signOut"],
  "queries": ["currentUser"],
  "models": []
}
```

## Callbacks

- `onSignOutSuccess()` — fires before navigation. Consumer can trigger additional cleanup (e.g., clear Zustand stores).
- `onError(err)` — fires on sign-out mutation failure.
- `onMessage({ kind, key })` — informational events.

## Step-up

Not required for sign-out. The user's authenticated session is the authority.

## Captcha

Not applicable.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Signed out | `messages.signOutSuccessToast` (success) |
| Sign out failed | `messages.errors.SIGN_OUT_FAILED` (error) |
| Unknown error | `messages.errors.UNKNOWN_ERROR` (error) |

## Accessibility

- `<DropdownMenuTrigger>` uses `aria-label={messages.triggerAriaLabel}`.
- `<DropdownMenuItem>` for sign-out uses `role="menuitem"`.
- After sign-out navigates away, focus management is not needed (full page navigation).

## Notes / gotchas

- **Navigation after sign-out**: this block navigates to `signOutRedirectHref` after a successful sign-out. This is an intentional exception to the "cards never navigate" rule — the account menu is a shell block whose primary consumer context IS the shell, and sign-out always results in a page change.
- **Cache clearing**: the block must call `queryClient.invalidateQueries()` (from the shared `QueryClient` supplied by `blocks-runtime`) on sign-out before navigating, not just navigate. Stale authenticated data visible to the next visitor on a shared device is a security concern.
- **Active context display**: reads `current_user()` (already fetched by [[user-context-switcher]] — the TanStack Query cache deduplicates the request). Shows "Personal account" for type=1 context; org `display_name` for type=2 context.
- Cross-ref: [[shell-sidebar]] — bottom slot. [[shell-header]] — top-right slot. [[user-avatar]] — trigger visual. [[auth-sign-out-button]] — standalone alternative for non-shell contexts.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/shell/account-menu/`
- The trigger is `<UserAvatar user={currentUser} size="sm" />` + display name (truncated to ~20 chars).
- Sign-out is a destructive action — add a visual separator before it in the dropdown.
- Storybook stories: personal context, org context, sign-out pending, sign-out error.
