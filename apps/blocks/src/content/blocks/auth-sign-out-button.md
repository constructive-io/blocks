# auth-sign-out-button

**Type:** `registry:block`
**Status:** `v1 (frontend ready)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-credentials.md`
**Master entry:** `blocks-master.md#auth-sign-out-button`

**Pairing:** No page block — used as: a button embedded anywhere in an authenticated layout (app shell account menu, sidebar footer, account settings page, etc.). There is no standalone page because sign-out is a one-action trigger, not a page flow. Pair with `[[shell-account-menu]]` (v2 shell) or embed directly in your layout.

## Purpose

Single-click sign-out button. Calls `constructive_auth_public.sign_out()` via the generated `useSignOutMutation` hook, which revokes the active `session_credentials` and `sessions` row. Clears the local data cache via `queryClient.clear()`. Fires `onSuccess` for the consumer to navigate to the sign-in page (or any post-sign-out route). Minimal block — pure button, no form.

## When to use

- Any authenticated layout that needs a sign-out affordance (account menu, sidebar, settings page).
- The `shell-account-menu` (v2) will compose this block internally; in v1 consumer apps, install this directly.
- Not a fit when: you want to revoke OTHER sessions (not the current one) — use [[auth-account-sessions-list]] for that.

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/auth/sign-out-button.tsx` | `registry:component` |
| `components/auth/sign-out-button.requires.json` | `registry:file` |
| `lib/auth/messages/sign-out-button-messages.ts` | `registry:lib` |
| `lib/auth/errors.ts` | `registry:lib` (shared, auto-deduped) |

> No data hook is shipped. The block imports its mutation hook (`useSignOutMutation`) from the host's generated `auth` SDK (`@/generated/auth`). Only the messages catalog, the shared errors util, and the `requires.json` manifest are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (Constructive block; supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `button` (shadcn primitive)

## Runtime (npm) dependencies

- `react` (peer, ^19)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; it arrives transitively via the `blocks-runtime` registry dependency. The generated `auth` SDK is the host's, not a published dep of this block.

## DB procedures used by default hook

- `constructive_auth_public.sign_out()` — schema `constructive_auth_public` → **namespace `auth`** → generated op `signOut` → hook `useSignOutMutation`. Returns `void`.
  Effect: Revokes `session_credentials` + `sessions` row for the current session.
  This procedure IS deployed in `constructive_auth_public` today (v1 ship-ready).

After the mutation succeeds, the block calls `queryClient.clear()` via the TanStack Query client (accessed from the React Query context supplied by `blocks-runtime`) to invalidate all locally cached query data (prevents stale auth state from persisting in memory).

## Props

```ts
export type SignOutButtonProps = {
  /** Content rendered inside the button. Default: messages.buttonText */
  children?: React.ReactNode;
  /** Pass-through to the underlying Button component. Default: 'ghost' */
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive';
  className?: string;
  notifications?: boolean | NotificationConfig;
  messages?: Partial<SignOutButtonMessages>;
  /** Adapter override: replaces the generated useSignOutMutation hook. */
  onSubmit?: () => Promise<void>;
  /** Fires after successful sign-out and cache clear. Navigate here. */
  onSuccess?: () => void;
  onError?: (err: AuthError) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
};
```

## Messages catalog

```ts
export type SignOutButtonMessages = {
  buttonText: string;
  buttonPending: string;
  successMessage: string;
  /** Error messages — UPPER_SNAKE_CASE keys match err.extensions.code from PostGraphile */
  errors: {
    UNKNOWN_ERROR: string;
  };
};

export const defaultSignOutButtonMessages: SignOutButtonMessages = {
  buttonText: 'Sign out',
  buttonPending: 'Signing out…',
  successMessage: 'You have been signed out.',
  errors: {
    UNKNOWN_ERROR: 'Failed to sign out. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The block does **not** ship a `use-sign-out.ts`. It imports the generated mutation hook from the host's `auth` SDK and drives it with a field `selection`. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

- **Import:** `import { useSignOutMutation } from '@/generated/auth';` (real generated name — `sign_out` → `signOut` → `useSignOutMutation`, per `endpoint-contract.md` §7. Note the `Mutation` suffix; it is **not** `useSignOut`.)
- **Instantiate:** `sign_out()` returns `void`, so no `selection` fields are needed:
  ```ts
  const defaultMutation = useSignOutMutation({});
  ```
- **Call + read the payload via the operation key:**
  ```ts
  await (onSubmitOverride
    ? onSubmitOverride()
    : defaultMutation.mutateAsync({}).then((d) => d.signOut));
  ```
- **Post-success:** calls `queryClient.clear()` (TanStack Query client from context, supplied by `blocks-runtime`) to wipe all cached query data. Fires `onSuccess()` after cache clear completes.
- **Returns:** generated hook exposes `{ mutateAsync, isPending, error }` (TanStack Query v5 style).
- **Adapter override:** when `props.onSubmit` is provided, the block awaits it instead of the generated hook. Cache clear still fires after `onSubmit` resolves successfully. Hybrid pending: `onSubmitOverride ? overridePending : defaultMutation.isPending`.

### `sign-out-button.requires.json`

The install-time check (`constructive-blocks` skill) reads this to verify the host's generated `auth` SDK exports the named op before the block is installed.

```json
{
  "namespace": "auth",
  "mutations": ["signOut"],
  "queries": [],
  "models": []
}
```

## Callbacks

- `onSuccess()` — fires after sign-out and cache clear. Consumer should navigate to the sign-in page.
- `onError(err)` — fires if the mutation fails (network error, server error).
- `onMessage({ kind, key, message? })` — fires `{ kind: 'success', key: 'signOut.success', message: messages.successMessage }` on success.

## Captcha

- N/A. Sign-out requires an active session; captcha is not appropriate.

## Step-up

- Required: no.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Success | `messages.successMessage` (info) — or none if consumer navigates away immediately |
| Unknown error | `messages.errors.UNKNOWN_ERROR` (error) |

## Accessibility

- Button shows `buttonPending` text and `aria-busy="true"` during `isPending`.
- `aria-disabled` if externally disabled (e.g., in a pending navigation state).
- When used in a dropdown/menu, ensure the parent menu closes on click (consumer responsibility).

## Notes / gotchas

- Cache clear is critical: without it, stale `currentUser` data may cause post-sign-out UI to briefly show authenticated state. Always call cache clear before navigating.
- The `sign_out` procedure revokes ONLY the current session. Other sessions (other browsers/devices) remain active. To revoke all other sessions, use [[auth-account-sessions-list]].
- Navigation after sign-out is the consumer's responsibility (call `router.push('/auth/sign-in')` in `onSuccess`). The block does NOT navigate — cards never navigate (Q20).
- In v1, before the shell account menu is available, install this block directly in your layout's user menu.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/sign-out-button/`
- Thin component — essentially a Button wrapping a mutation call and cache clear. Target ~40 lines.
- Storybook states: default, pending, error.
- After sign-out, the consumer's `useCurrentUser()` query should return null — if cache is cleared correctly, this happens automatically.
