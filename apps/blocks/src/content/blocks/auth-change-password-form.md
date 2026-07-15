# auth-change-password-form

**Type:** `registry:block`
**Status:** `v1 (frontend ready)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-credentials.md`
**Master entry:** `blocks-master.md#auth-change-password-form`

## Purpose

Inline form for authenticated users to update their password. Fields: current password + new password + confirm new password. Calls `constructive_auth_public.set_password(current_password, new_password)`. Before submission, checks `require_step_up('password')` — if the user's password verification is stale (outside the `step_up_window`), invokes the [[auth-step-up-dialog]] (type: `'password'`) to re-verify. Lives inside account settings (typically inside [[auth-account-security-card]]).

## When to use

- Account settings page / security section for signed-in users.
- When the user wants to set a new password (or set one for the first time if they signed up via OAuth).
- Not a fit for: unauthenticated reset flows — use [[auth-reset-password-card]].

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/auth/change-password-form.tsx` | `registry:component` |
| `components/auth/change-password-form.requires.json` | `registry:file` |
| `lib/auth/hooks/use-step-up.ts` | `registry:lib` (shared, auto-deduped) |
| `lib/auth/utils/password-strength.ts` | `registry:lib` (shared, auto-deduped) |
| `lib/auth/messages/change-password-form-messages.ts` | `registry:lib` |
| `lib/auth/errors.ts` | `registry:lib` (shared, auto-deduped) |

> No data hook is shipped. The block imports its mutation hooks (`useSetPasswordMutation`, `useRequireStepUpMutation`) from the host's generated `auth` SDK (`@/generated/auth`). The block-owned `use-step-up.ts` utility hook (which wraps generated hooks and adds dialog orchestration) is still shipped. Only the messages catalog, the shared errors util, and the `requires.json` manifest are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (Constructive block; supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `button`, `input`, `label`, `form` (shadcn primitives)
- `progress` (shadcn, for strength meter)
- `auth-step-up-dialog` (required for step-up check; installed as sibling registry item)

## Runtime (npm) dependencies

- `react` (peer, ^19)
- `react-hook-form` (^7)
- `zod` (^3)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; it arrives transitively via the `blocks-runtime` registry dependency. The generated `auth` SDK is the host's, not a published dep of this block.

## DB procedures used by default hook

- `constructive_auth_public.set_password(current_password text, new_password text)` — schema `constructive_auth_public` → **namespace `auth`** → generated op `setPassword` → hook `useSetPasswordMutation`.
  Returns: `boolean`
  Requires: current password to verify before updating.

- `constructive_auth_public.require_step_up(step_up_type text)` — schema `constructive_auth_public` → **namespace `auth`** → generated op `requireStepUp` → hook `useRequireStepUpMutation`.
  Returns: `boolean` — `true` if step-up is still valid (within `step_up_window`).
  Called with `'password'` before displaying the form; if `false`, step-up dialog fires.

- `constructive_auth_public.verify_password(password text)` — called internally by [[auth-step-up-dialog]] (not directly by this block).

CSRF token is attached below the block — by the runtime adapter / server (`app_settings_auth.require_csrf_for_auth`), see `contracts/endpoint-contract.md` §3. The block does NOT read or set `csrf_token`; it is omitted from the mutation vars the block passes.

## Props

```ts
export type ChangePasswordFormProps = {
  /** Show new password strength meter. Default: true */
  showPasswordStrength?: boolean;
  /**
   * Whether to check step-up before rendering the form.
   * Default: true. Set to false to skip the step-up check
   * (e.g., in a fresh session where sign-in already verified password).
   */
  requireStepUp?: boolean;
  notifications?: boolean | NotificationConfig;
  messages?: Partial<ChangePasswordFormMessages>;
  onSubmit?: (input: ChangePasswordInput) => Promise<boolean>;
  onSuccess?: (result: { success: boolean }) => void;
  onError?: (err: AuthError) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};
```

## Messages catalog

```ts
export type ChangePasswordFormMessages = {
  title: string;
  currentPasswordLabel: string;
  currentPasswordPlaceholder: string;
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
  successMessage: string;
  /** Error messages — UPPER_SNAKE_CASE keys match err.extensions.code from PostGraphile */
  errors: {
    INVALID_CREDENTIALS: string;
    WEAK_PASSWORD: string;
    STEP_UP_REQUIRED: string;
    STEP_UP_CANCELLED: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultChangePasswordFormMessages: ChangePasswordFormMessages = {
  title: 'Change password',
  currentPasswordLabel: 'Current password',
  currentPasswordPlaceholder: '••••••••',
  newPasswordLabel: 'New password',
  newPasswordPlaceholder: '••••••••',
  confirmPasswordLabel: 'Confirm new password',
  confirmPasswordPlaceholder: '••••••••',
  submitButton: 'Update password',
  submitButtonPending: 'Updating…',
  passwordMismatch: 'Passwords do not match.',
  passwordStrengthWeak: 'Weak',
  passwordStrengthFair: 'Fair',
  passwordStrengthGood: 'Good',
  passwordStrengthStrong: 'Strong',
  successMessage: 'Password updated successfully.',
  errors: {
    INVALID_CREDENTIALS: 'Current password is incorrect.',
    WEAK_PASSWORD: 'New password does not meet minimum requirements.',
    STEP_UP_REQUIRED: 'Please verify your identity to continue.',
    STEP_UP_CANCELLED: 'Identity verification was cancelled.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The block does **not** ship a `use-change-password.ts`. It imports the generated mutation hooks from the host's `auth` SDK. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

- **Import:**
  ```ts
  import { useSetPasswordMutation } from '@/generated/auth';
  import { useRequireStepUpMutation } from '@/generated/auth';
  ```
  (Real generated names — `set_password` → `setPassword` → `useSetPasswordMutation`; `require_step_up` → `requireStepUp` → `useRequireStepUpMutation`, per `endpoint-contract.md` §7.)
- **Instantiate with a selection:**
  ```ts
  const defaultMutation = useSetPasswordMutation({
    selection: { fields: {} },
  });
  const requireStepUp = useRequireStepUpMutation({
    selection: { fields: {} },
  });
  ```
- **Call + read the payload via the operation key:**
  ```ts
  const result = await (onSubmitOverride
    ? onSubmitOverride(vars)
    : defaultMutation.mutateAsync(vars).then((d) => d.setPassword));
  ```
  `vars` carries `currentPassword`, `newPassword` — **never** `csrf_token` (handled below the block).
- **Returns:** generated hooks expose `{ mutateAsync, isPending, error }` (TanStack Query v5 style).
- **Adapter override:** when `props.onSubmit` is provided, the block awaits it instead of the generated hook. Hybrid pending: `onSubmitOverride ? overridePending : defaultMutation.isPending`.
- **On mount (when `requireStepUp=true`):** calls `requireStepUp.mutateAsync({ stepUpType: 'password' })`. If returns `false` (step-up needed), invokes `stepUp({ type: 'password' })` from the block-owned `use-step-up.ts`. If step-up is cancelled, fires `onError` with `STEP_UP_CANCELLED` code.
- **Result handling:** `true` → fires `onSuccess`, shows success toast; `false` → treated as `INVALID_CREDENTIALS`.

### `change-password-form.requires.json`

The install-time check (`constructive-blocks` skill) reads this to verify the host's generated `auth` SDK exports the named ops before the block is installed.

```json
{
  "namespace": "auth",
  "mutations": ["setPassword", "requireStepUp"],
  "queries": [],
  "models": []
}
```

## Callbacks

- `onSuccess({ success: true })` — fires after password update.
- `onError(err)` — fires on `INVALID_CREDENTIALS`, `WEAK_PASSWORD`, `STEP_UP_CANCELLED`, `UNKNOWN_ERROR`.
- `onMessage({ kind, key, message? })` — unused in default flow.

## Captcha

- N/A. Requires an active authenticated session — captcha not appropriate here.

## Step-up

- Required: yes, type: `'password'`
- `require_step_up('password')` called on mount (or on first submit attempt if mount check is deferred).
- If step-up required, [[auth-step-up-dialog]] opens automatically.
- Cancellation fires `onError({ code: 'STEP_UP_CANCELLED', message: messages.stepUpCancelled })`.
- See `contracts/step-up-contract.md` for full step-up hook behavior.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Success | `messages.successMessage` (success) |
| `INVALID_CREDENTIALS` | `messages.errors.INVALID_CREDENTIALS` (error) |
| `WEAK_PASSWORD` | `messages.errors.WEAK_PASSWORD` (error) |
| `STEP_UP_CANCELLED` | `messages.errors.STEP_UP_CANCELLED` (warning) |
| Unknown | `messages.errors.UNKNOWN_ERROR` (error) |

## Accessibility

- `autoComplete="current-password"` on current password field; `autoComplete="new-password"` on new/confirm fields.
- Confirm mismatch announced via `aria-live="polite"`.
- Strength meter uses `role="progressbar"`.
- Submit disabled during `isPending` or while step-up dialog is open.

## Notes / gotchas

- `set_password` requires the current password even if the user signed up via OAuth (in which case they may not have one). If the user has no password yet, consider detecting this case and showing a "Set password" variant (no current-password field). Detecting "has password" requires a query on `constructive_encrypted` for the `password_hash` secret — expose via a `currentUser` field if available, or use a flag on the User type.
- Step-up window (`step_up_window`) is a server-side config value (in `app_settings_auth`). The block does not try to predict it; it calls `require_step_up` and acts on the boolean.
- After a successful password change, sessions remain active (server does not revoke other sessions). The user may want to revoke other sessions separately — [[auth-account-sessions-list]] handles that.

**Pairing:** No page block — used as: an inline form section within [[auth-account-security-card]] (account settings security tab). It is not a full-page flow; it is always composed inside another card. Consumers can also embed it in any custom settings layout.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/change-password-form/`
- This is a form section (no Card wrapper) — it composes into [[auth-account-security-card]].
- Storybook states: default, step-up loading, step-up open (dialog), pending submission, success, error (INVALID_CREDENTIALS), error (WEAK_PASSWORD).
