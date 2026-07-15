# auth-account-deletion-confirm-page

**Type:** `registry:page`
**Status:** `v1 (frontend ready)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-account.md`
**Master entry:** `blocks-master.md#auth-account-deletion-confirm-page`

**Pairing note:** This block IS a page — there is no card sibling because the deletion confirmation pattern does not fit the card+page pair model. The `auth-account-danger-card` (which triggers the email) is the entry point; this page is the terminal confirmation step reached via an email link. There is no reusable card form here — the page renders three fixed outcome states (processing, success, error) driven by a URL token.

## Purpose

Next.js page that handles the `/auth/delete-account?token=...&user_id=...` link from the deletion confirmation email. Calls `confirm_delete_account(user_id, token)` on mount. Renders three distinct outcome states: success (account deleted, redirect to sign-in), expired token, and invalid token. This page is the terminal step of the account deletion flow initiated by `auth-account-danger-card`.

## When to use

- Register at `/auth/delete-account` in the consumer's Next.js app.
- Required if `auth-account-danger-card` is used — without this page, the deletion email link has nowhere to land.
- Not a fit when: account deletion is not supported (omit both this page and `auth-account-danger-card`).

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `app/auth/delete-account/page.tsx` | `registry:page` |
| `components/auth/account-deletion-confirm-view.tsx` | `registry:component` |
| `components/auth/account-deletion-confirm-view.requires.json` | `registry:file` |
| `lib/auth/messages/account-deletion-confirm-messages.ts` | `registry:lib` |

> No data hook is shipped. The `use-confirm-delete-account.ts` hook is removed — the view component imports `useConfirmDeleteAccountMutation` from `@/generated/auth`. Only the messages catalog and `requires.json` are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (supplies `QueryClientProvider` + per-namespace `configure()`; React Query reaches this block transitively)
- `card`, `button`
- `layout-kit` (centered layout; per Decision Q21)
- `lib/auth-errors`

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `next` (peer, ^15)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; arrives transitively via `blocks-runtime`. `@constructive-io/data` is removed.

## DB procedures used by default hook

| Procedure | Signature | Returns | Notes |
|---|---|---|---|
| `constructive_auth_public.confirm_delete_account` | `(user_id uuid, token text)` | `boolean` | Schema `constructive_auth_public` → **namespace `auth`** → generated op `confirmDeleteAccount` → hook `useConfirmDeleteAccountMutation`. Verifies PGP-encrypted `account_deletion_token`, deletes user cascade. |

CSRF token is handled below the block — see `contracts/endpoint-contract.md` §3. Block does NOT pass `csrf_token`.

Whether the `confirm_delete_account` cascade is a hard delete or a soft delete isn't settled in the current constructive-db procedure source; the block treats the operation as terminal either way and routes the user out on success.

The procedure's `user_id` and `token` parameter names are expected to line up with the query params the deletion email places in the confirmation URL, but that pairing hasn't been reconciled against the email template yet.

## Props

The page block reads `searchParams` from Next.js and passes them to the view component.

```ts
// app/auth/delete-account/page.tsx
// Next.js page — no exported props type. Reads searchParams.token and searchParams.user_id.

// Sub-component props:
export type AccountDeletionConfirmViewProps = {
  token: string;
  userId: string;
  /** Called after successful deletion. Default: redirect to sign-in page. */
  onSuccess?: (result: { userId: string }) => void;
  /** Called when token is expired. Default: show expired state. */
  onExpired?: () => void;
  /** Called when token is invalid. Default: show invalid state. */
  onInvalid?: () => void;
  messages?: Partial<AccountDeletionConfirmMessages>;
  notifications?: boolean;
  /** Path to redirect to after successful deletion. Default: '/auth/sign-in'. */
  redirectTo?: string;
};
```

## Messages catalog

```ts
export type AccountDeletionConfirmMessages = {
  processingTitle: string;
  processingDescription: string;
  successTitle: string;
  successDescription: string;
  successButton: string;
  expiredTitle: string;
  expiredDescription: string;
  expiredButton: string;
  invalidTitle: string;
  invalidDescription: string;
  invalidButton: string;
  errors: {
    UNKNOWN_ERROR: string;
  };
};

export const defaultAccountDeletionConfirmMessages: AccountDeletionConfirmMessages = {
  processingTitle: 'Deleting your account…',
  processingDescription: 'Please wait while we process your request.',
  successTitle: 'Account deleted',
  successDescription: 'Your account and all associated data have been permanently deleted. Thank you for using our service.',
  successButton: 'Go to sign in',
  expiredTitle: 'Link expired',
  expiredDescription: 'This deletion link has expired. Please request a new deletion email from your account settings.',
  expiredButton: 'Go to account settings',
  invalidTitle: 'Invalid link',
  invalidDescription: 'This deletion link is invalid or has already been used. If you believe this is an error, contact support.',
  invalidButton: 'Go to sign in',
  errors: {
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The block does **not** ship a `use-confirm-delete-account.ts`. The view component imports the generated mutation hook from the host's `auth` SDK. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

- **Import:** `import { useConfirmDeleteAccountMutation } from '@/generated/auth';` (`confirm_delete_account` → `confirmDeleteAccount` → `useConfirmDeleteAccountMutation`, per `endpoint-contract.md` §7.)
- **Instantiate:**
  ```ts
  const confirmDelete = useConfirmDeleteAccountMutation({
    selection: { fields: { confirmDeleteAccount: true } },
  });
  ```
- **Call on mount (single-call — no refetch):**
  ```ts
  const result = await confirmDelete.mutateAsync({ userId, token }).then((d) => d.confirmDeleteAccount);
  ```
  `vars` carries `userId`, `token` — **never** `csrf_token`.
- **Returns:** `{ mutateAsync, isPending, error }`. View component derives `status: 'idle' | 'pending' | 'success' | 'expired' | 'invalid' | 'error'` from mutation state + error code.
- After `success`: view calls `router.push(redirectTo)` after a brief delay (1–2 seconds).
- After `expired` or `invalid`: view renders the appropriate error state with a CTA.

### `account-deletion-confirm-view.requires.json`

```json
{
  "namespace": "auth",
  "mutations": ["confirmDeleteAccount"],
  "queries": [],
  "models": []
}
```

## Callbacks

- `onSuccess({ userId })` — fires after successful deletion. Consumer can override default redirect.
- `onExpired()` — fires on expired token error.
- `onInvalid()` — fires on invalid/already-used token error.

## Captcha

Not applicable — token-authenticated action.

## Step-up

Not applicable — the email link IS the step-up equivalent (email possession proof).

## Notifications (default toasts)

None — the page renders inline outcome states, not toasts.

## Accessibility

- Each state (processing, success, expired, invalid) is a distinct, fully rendered view — not a conditional toast.
- Processing state: `aria-busy="true"` on the container; spinner with `role="status"` and `aria-label="Processing deletion"`.
- All state headings use `<h1>` (page is the full content, using `layout-kit` centering).
- CTA buttons have descriptive labels.

## Notes / gotchas

- **Missing query params**: if `token` or `user_id` are absent from the URL, immediately render the `invalidTitle` / `invalidDescription` state without making any API call.
- The page should call `confirm_delete_account` exactly once on mount (use a `useEffect` with empty deps, or a server action if the consumer prefers RSC). Guard against double-invocation with a ref flag.
- After deletion, the user's session is invalidated server-side. Any subsequent authenticated requests will fail. The block should NOT rely on the current session after this call succeeds.
- If the consumer uses Next.js RSC: `confirm_delete_account` can be called in a Server Component or Server Action instead of a client-side hook, which removes the risk of double-invocation. The view component then receives the outcome as a prop.

## Implementation notes (for the author)

- Use `layout-kit` for the centered card layout (Decision Q21).
- The page file (`app/auth/delete-account/page.tsx`) reads `searchParams` and renders `AccountDeletionConfirmView` with the extracted params.
- Test states: missing params, processing/loading, success + redirect, expired, invalid, unknown error.
- Migration: no existing admin route to replace; new page.
