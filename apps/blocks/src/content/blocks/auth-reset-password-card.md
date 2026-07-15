# auth-reset-password-card

**Type:** `registry:block`
**Status:** `v1 (frontend ready)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-credentials.md`
**Master entry:** `blocks-master.md#auth-reset-password-card`

## Purpose

New password + confirm password form used to complete the password reset flow. Reads `role_id` and `reset_token` from URL searchParams (or props) and calls `constructive_auth_public.reset_password(role_id, reset_token, new_password)`. Handles expired/invalid token states with a prompt to restart the forgot-password flow. Includes inline password strength feedback.

## When to use

- The `/auth/reset-password?token=...&role_id=...` route (canonical path is `auth-reset-password-page`).
- Drop into a modal or custom flow by passing `token` + `roleId` as props (bypassing URL reading).
- Not a fit when: user wants to change password while signed in — use [[auth-change-password-form]].

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/auth/reset-password-card.tsx` | `registry:component` |
| `components/auth/reset-password-card.requires.json` | `registry:file` |
| `lib/auth/utils/password-strength.ts` | `registry:lib` (shared, auto-deduped) |
| `lib/auth/messages/reset-password-card-messages.ts` | `registry:lib` |
| `lib/auth/errors.ts` | `registry:lib` (shared, auto-deduped) |

> No data hook is shipped. The block imports its mutation hook (`useResetPasswordMutation`) from the host's generated `auth` SDK (`@/generated/auth`). Only the messages catalog, the shared errors util, and the `requires.json` manifest are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (Constructive block; supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `card`, `button`, `input`, `label`, `form` (shadcn primitives)
- `progress` (shadcn, for strength meter)

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `react-hook-form` (^7)
- `zod` (^3)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; it arrives transitively via the `blocks-runtime` registry dependency. The generated `auth` SDK is the host's, not a published dep of this block.

## DB procedures used by default hook

- `constructive_auth_public.reset_password(role_id uuid, reset_token text, new_password text)` — schema `constructive_auth_public` → **namespace `auth`** → generated op `resetPassword` → hook `useResetPasswordMutation`.
  Returns: `boolean`
  Note: verifies bcrypt token stored in `constructive_encrypted`. Returns `false` on expired/invalid token.

CSRF token is attached below the block — by the runtime adapter / server (`app_settings_auth.require_csrf_for_auth`), see `contracts/endpoint-contract.md` §3. The block does NOT read or set `csrf_token`; it is omitted from the mutation vars the block passes.

On an expired or invalid token `reset_password` returns `false`, which the default hook maps to the `INVALID_TOKEN` error state.

## Props

```ts
export type ResetPasswordCardProps = {
  /**
   * Role ID from URL. If not provided, read from `?role_id=` searchParam.
   * Page block passes this from searchParams; modal callers pass it as prop.
   */
  roleId?: string;
  /**
   * Reset token from URL. If not provided, read from `?token=` searchParam.
   */
  token?: string;
  /** Show password strength meter. Default: true */
  showPasswordStrength?: boolean;
  /** Link to restart forgot-password flow. Default: '/auth/forgot-password' */
  forgotPasswordPath?: string;
  notifications?: boolean | NotificationConfig;
  messages?: Partial<ResetPasswordCardMessages>;
  onSubmit?: (input: ResetPasswordInput) => Promise<boolean>;
  onSuccess?: (result: { success: boolean }) => void;
  onError?: (err: AuthError) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  // NOTE: captcha is intentionally absent. The reset_token itself is the
  // rate-limiting mechanism — request_password_reset (forgot-password) is the
  // captcha'd entry point. See Q31 in decisions.md.
};

export type ResetPasswordInput = {
  roleId: string;
  resetToken: string;
  newPassword: string;
};
```

## Messages catalog

```ts
export type ResetPasswordCardMessages = {
  title: string;
  description: string;
  newPasswordLabel: string;
  newPasswordPlaceholder: string;
  confirmPasswordLabel: string;
  confirmPasswordPlaceholder: string;
  submitButton: string;
  submitButtonPending: string;
  passwordMismatch: string;
  passwordStrengthWeak: string;
  passwordStrengthFair: string;
  passwordStrengthGood: string;
  passwordStrengthStrong: string;
  /** Shown when token is missing from URL/props */
  missingTokenError: string;
  /** Confirmed state */
  successTitle: string;
  successDescription: string;
  successSignInLink: string;
  /** Restart prompt (shown on EXPIRED_TOKEN or INVALID_TOKEN) */
  expiredTokenTitle: string;
  expiredTokenDescription: string;
  expiredTokenRestartLink: string;
  /** Error messages — UPPER_SNAKE_CASE keys match err.extensions.code from PostGraphile */
  errors: {
    EXPIRED_TOKEN: string;
    INVALID_TOKEN: string;
    WEAK_PASSWORD: string;
    RATE_LIMITED: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultResetPasswordCardMessages: ResetPasswordCardMessages = {
  title: 'Reset your password',
  description: 'Enter your new password below.',
  newPasswordLabel: 'New password',
  newPasswordPlaceholder: '••••••••',
  confirmPasswordLabel: 'Confirm new password',
  confirmPasswordPlaceholder: '••••••••',
  submitButton: 'Reset password',
  submitButtonPending: 'Resetting…',
  passwordMismatch: 'Passwords do not match.',
  passwordStrengthWeak: 'Weak',
  passwordStrengthFair: 'Fair',
  passwordStrengthGood: 'Good',
  passwordStrengthStrong: 'Strong',
  missingTokenError: 'Reset link is invalid or incomplete. Please request a new one.',
  successTitle: 'Password reset',
  successDescription: 'Your password has been updated. You can now sign in.',
  successSignInLink: 'Sign in',
  expiredTokenTitle: 'Link expired',
  expiredTokenDescription: 'This password reset link has expired or already been used.',
  expiredTokenRestartLink: 'Request a new link',
  errors: {
    EXPIRED_TOKEN: 'This reset link has expired. Please request a new one.',
    INVALID_TOKEN: 'This reset link is invalid. Please request a new one.',
    WEAK_PASSWORD: 'Password does not meet minimum requirements.',
    RATE_LIMITED: 'Too many attempts. Please wait before trying again.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The block does **not** ship a `use-reset-password.ts`. It imports the generated mutation hook from the host's `auth` SDK and drives it with a field `selection`. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

- **Import:** `import { useResetPasswordMutation } from '@/generated/auth';` (real generated name — `reset_password` → `resetPassword` → `useResetPasswordMutation`, per `endpoint-contract.md` §7.)
- **Instantiate with a selection** of exactly the payload fields this card consumes:
  ```ts
  const defaultMutation = useResetPasswordMutation({
    selection: { fields: {} },
  });
  ```
  (`reset_password` returns `Boolean` — no complex payload fields to select.)
- **Call + read the payload via the operation key:**
  ```ts
  const result = await (onSubmitOverride
    ? onSubmitOverride(vars)
    : defaultMutation.mutateAsync(vars).then((d) => d.resetPassword));
  ```
  `vars` carries `roleId`, `resetToken`, `newPassword` — **never** `csrf_token` (handled below the block).
- **Returns:** generated hook exposes `{ mutateAsync, isPending, error }` (TanStack Query v5 style).
- **Adapter override:** when `props.onSubmit` is provided, the block awaits it instead of the generated hook. Hybrid pending: `onSubmitOverride ? overridePending : defaultMutation.isPending`.
- **Token extraction:** if `props.roleId` / `props.token` are not set, reads from `URLSearchParams` on the client side (not server-side — this is a client component).
- **Missing token guard:** if either `roleId` or `token` is absent after mount, transitions to `'missing-token'` state immediately (no submission attempt).
- **Result handling:**
  - `result === true` → transitions to `'success'` state, fires `onSuccess`.
  - `result === false` → treats as `INVALID_TOKEN` (an expired or invalid token; see the token-handling note above).
  - Exception with `EXPIRED_TOKEN` code → transitions to `'expired'` state.
  - Exception with `INVALID_TOKEN` code → transitions to `'expired'` state (same UX).

### `reset-password-card.requires.json`

The install-time check (`constructive-blocks` skill) reads this to verify the host's generated `auth` SDK exports the named op before the block is installed.

```json
{
  "namespace": "auth",
  "mutations": ["resetPassword"],
  "queries": [],
  "models": []
}
```

## Callbacks

- `onSuccess({ success: true })` — fires after successful reset. Caller typically navigates to sign-in.
- `onError(err)` — fires on `WEAK_PASSWORD`, `RATE_LIMITED`, `UNKNOWN_ERROR`.
- `onMessage({ kind, key, message? })` — unused in default flow but available.

## Captcha

- Not applicable. `captcha` prop is intentionally absent from this block (Q31). The reset token itself is the rate-limiting mechanism — `request_password_reset` (the forgot-password flow) is where captcha belongs. Adding captcha to the reset form would be security theater: the user already proved email access by clicking the link.

## Step-up

- Required: no.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Success | none — card transitions to success state |
| `EXPIRED_TOKEN` / `INVALID_TOKEN` | none — card transitions to expired state |
| `WEAK_PASSWORD` | `messages.errors.WEAK_PASSWORD` (error) |
| `RATE_LIMITED` | `messages.errors.RATE_LIMITED` (error) |
| Unknown | `messages.errors.UNKNOWN_ERROR` (error) |

## Accessibility

- `autoComplete="new-password"` on both password fields.
- `aria-live="polite"` for confirm-mismatch and error messages.
- On token error/expired state, focus moved to the error heading.
- Submit disabled during `isPending`.

## Notes / gotchas

- The reset token is `cnc_live_ot_...` format (one-time). Once used, it's invalid. The `success` state should make clear the user must now sign in fresh.
- `role_id` in the URL is a UUID (the user's `users.id`). It is not a secret; it pairs with the secret `reset_token` to identify the target.
- Token arrives via email link formatted as `/auth/reset-password?role_id=<uuid>&token=<cnc_live_ot_...>`. Block parses both params.
- This block does NOT sign the user in after reset. Redirect to sign-in and let them sign in explicitly — don't auto-sign-in (would skip MFA).

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/reset-password-card/`
- Internal state: `type CardState = 'form' | 'success' | 'expired' | 'missing-token'`.
- Storybook states: form, pending, success, expired/invalid, missing-token, WEAK_PASSWORD error.
