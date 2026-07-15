# auth-verify-email-banner

**Type:** `registry:block`
**Status:** `v1 (frontend ready)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-credentials.md`
**Master entry:** `blocks-master.md#auth-verify-email-banner`

## Purpose

Dismissible top-of-page banner shown to authenticated users whose primary email is not yet verified (`is_verified=false`). Includes a "Resend verification email" CTA that calls `constructive_auth_public.send_verification_email(email)`. Surfaces inside the app shell (not on auth pages). Dismissal is session-local (not persisted — the banner reappears on next page load until email is verified).

## When to use

- Mount at the top of authenticated layouts (e.g., `app/(dashboard)/layout.tsx`) when `currentUser.isVerified === false`.
- Pass the user's primary email as a prop to enable the resend CTA.
- Not a fit on auth pages (sign-in, sign-up, etc.) — those render their own state feedback.
- Not a fit when: the user has already verified their email.

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/auth/verify-email-banner.tsx` | `registry:component` |
| `components/auth/verify-email-banner.requires.json` | `registry:file` |
| `lib/auth/messages/verify-email-banner-messages.ts` | `registry:lib` |
| `lib/auth/errors.ts` | `registry:lib` (shared, auto-deduped) |

> No data hook is shipped. The block imports its mutation hook (`useSendVerificationEmailMutation`) from the host's generated `auth` SDK (`@/generated/auth`). Only the messages catalog, the shared errors util, and the `requires.json` manifest are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (Constructive block; supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `button` (shadcn primitive)
- `alert` (shadcn primitive, for banner container)

## Runtime (npm) dependencies

- `react` (peer, ^19)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; it arrives transitively via the `blocks-runtime` registry dependency. The generated `auth` SDK is the host's, not a published dep of this block.

## DB procedures used by default hook

- `constructive_auth_public.send_verification_email(email citext)` — schema `constructive_auth_public` → **namespace `auth`** → generated op `sendVerificationEmail` → hook `useSendVerificationEmailMutation`.
  Returns: `boolean`
  Effect: Generates token, stores encrypted, enqueues `send-email-link` job.

CSRF token is attached below the block — by the runtime adapter / server (`app_settings_auth.require_csrf_for_auth`), see `contracts/endpoint-contract.md` §3. The block does NOT read or set `csrf_token`; it is omitted from the mutation vars the block passes.

## Props

```ts
export type VerifyEmailBannerProps = {
  /** Primary email to resend verification to. Required for the resend CTA. */
  email: string;
  /**
   * Control dismissal externally. If not provided, banner manages its own dismiss state.
   * Use this to sync with parent state (e.g., user context).
   */
  dismissed?: boolean;
  onDismiss?: () => void;
  /** Show the resend CTA. Default: true */
  showResendButton?: boolean;
  notifications?: boolean | NotificationConfig;
  messages?: Partial<VerifyEmailBannerMessages>;
  /** Adapter override for resend action. */
  onResend?: (email: string) => Promise<boolean>;
  onSuccess?: (email: string) => void;
  onError?: (err: AuthError) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
};
```

## Messages catalog

```ts
export type VerifyEmailBannerMessages = {
  text: string;
  resendButton: string;
  resendPending: string;
  resendSuccess: string;
  dismissLabel: string;
  /** Error messages — UPPER_SNAKE_CASE keys match err.extensions.code from PostGraphile */
  errors: {
    RATE_LIMITED: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultVerifyEmailBannerMessages: VerifyEmailBannerMessages = {
  text: 'Please verify your email address to access all features.',
  resendButton: 'Resend verification email',
  resendPending: 'Sending…',
  resendSuccess: 'Verification email sent. Check your inbox.',
  dismissLabel: 'Dismiss',
  errors: {
    RATE_LIMITED: 'Too many requests. Please wait before trying again.',
    UNKNOWN_ERROR: 'Failed to send verification email. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The block does **not** ship a `use-send-verification-email.ts`. It imports the generated mutation hook from the host's `auth` SDK. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

- **Import:** `import { useSendVerificationEmailMutation } from '@/generated/auth';` (real generated name — `send_verification_email` → `sendVerificationEmail` → `useSendVerificationEmailMutation`, per `endpoint-contract.md` §7.)
- **Instantiate with a selection:**
  ```ts
  const defaultMutation = useSendVerificationEmailMutation({
    selection: { fields: {} },
  });
  ```
  (`send_verification_email` returns `Boolean` — no complex payload fields to select.)
- **Call + read the payload via the operation key:**
  ```ts
  const result = await (onResendOverride
    ? onResendOverride(email)
    : defaultMutation.mutateAsync({ email }).then((d) => d.sendVerificationEmail));
  ```
  `vars` carries `email` — **never** `csrf_token` (handled below the block).
- **Returns:** generated hook exposes `{ mutateAsync, isPending, error }` (TanStack Query v5 style).
- **Adapter override:** when `props.onResend` is provided, the block calls it instead of the generated hook. Hybrid pending: `onResendOverride ? overridePending : defaultMutation.isPending`.
- **On success:** fires `onSuccess(email)`, fires `onMessage({ kind: 'success', key: 'resendSuccess', message: messages.resendSuccess })`. Does not dismiss the banner automatically (verification not yet confirmed).

### `verify-email-banner.requires.json`

The install-time check (`constructive-blocks` skill) reads this to verify the host's generated `auth` SDK exports the named op before the block is installed.

```json
{
  "namespace": "auth",
  "mutations": ["sendVerificationEmail"],
  "queries": [],
  "models": []
}
```

## Callbacks

- `onSuccess(email)` — fires after resend succeeds. Banner remains visible (user still unverified).
- `onDismiss()` — fires when user clicks dismiss. Parent controls whether to un-render the banner.
- `onError(err)` — fires on resend error.
- `onMessage({ kind, key, message? })` — fires `resendSuccess` (kind: `'success'`).

## Captcha

- N/A. `send_verification_email` is rate-limited server-side. Adding captcha here would be excessive for a post-sign-in surface.

## Step-up

- Required: no.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Resend success | `messages.resendSuccess` (success) |
| `RATE_LIMITED` | `messages.errors.RATE_LIMITED` (error) |
| Unknown | `messages.errors.UNKNOWN_ERROR` (error) |

## Accessibility

- Banner uses `role="alert"` so screen readers announce it on mount.
- Dismiss button has `aria-label={messages.dismissLabel}`.
- Resend button shows `resendPending` text and `aria-busy="true"` during `isPending`.

## Notes / gotchas

- Dismissal is session-local by default. To persist dismissal (suppress until next sign-in), set `dismissed` prop from a flag in your session/user context — e.g., read from a `sessionStorage` flag that you set in `onDismiss`.
- The banner does not auto-hide after resend. It only disappears once `currentUser.isVerified === true` (which requires a data refetch). After resend, fire a query invalidation for `currentUser` in `onSuccess` to get the verified state.
- `send_verification_email` returns `false` if the email is already verified — treat this as a success (no error toast needed; the banner should already be hidden at this point).
- Mount the banner conditionally: `{!currentUser.isVerified && <VerifyEmailBanner email={currentUser.primaryEmail} />}`. Do not render it on the sign-in or sign-up pages.

**Pairing:** No page block — used as: a persistent dismissible banner rendered at the top of authenticated app layouts (e.g., `app/(dashboard)/layout.tsx`) whenever `currentUser.isVerified === false`. Pairs with [[auth-verify-email-page]] (the page that processes the verification link) but is a separate block with a separate install.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/verify-email-banner/`
- Internal state: `isDismissed: boolean` (local useState). When `props.dismissed` is provided, use it as controlled state.
- Storybook states: visible with resend CTA, pending (resend), dismissed (hidden), no-resend variant.
- Typical integration in `app/(dashboard)/layout.tsx`:
  ```tsx
  import { useCurrentUserQuery } from '@/generated/auth';
  const { data } = useCurrentUserQuery({ selection: { fields: { isVerified: true, primaryEmail: true } } });
  const user = data?.currentUser;
  {user && !user.isVerified && <VerifyEmailBanner email={user.primaryEmail} />}
  ```
