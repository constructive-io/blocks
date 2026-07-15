# auth-step-up-dialog

**Type:** `registry:block`
**Status:** `v1 (frontend ready)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-mfa.md`
**Master entry:** `blocks-master.md#auth-step-up-dialog`

**Pairing:** No page block — this IS the dialog. It is mounted by `[[use-step-up]]` and is composed into pages/cards that need identity re-verification. Consumers: `[[auth-change-password-form]]`, `[[auth-account-danger-card]]`, `[[auth-account-sessions-list]]` (revoke all), `[[auth-api-key-create-dialog]]`, `[[auth-account-connected-accounts]]` (disconnect OAuth), `[[auth-passkey-management-list]]` (delete passkey), `[[auth-mfa-totp-disable-confirm]]`.

## Purpose

Reusable modal dialog that re-verifies user identity before allowing a sensitive action. Renders either a password input or a TOTP input based on the `type` prop. Also offers a passkey button when the user has registered passkeys (delegates to `[[auth-passkey-sign-in]]` in step-up mode). On success, fires `onVerify({ ok: true })` and signals the session's `last_password_verified` or `last_mfa_verified` timestamp. On cancel, fires `onVerify({ ok: false, reason: 'cancelled' })`. Designed to be driven programmatically via `[[use-step-up]]` — the hook wraps this dialog's callbacks into Promise semantics.

## When to use

- Wrap any sensitive mutation: API key creation (`[[auth-api-key-create-dialog]]`), account deletion (`[[auth-account-danger-card]]`), TOTP disable confirm (`[[auth-mfa-totp-disable-confirm]]`).
- Consumer code calls `await stepUp({ type: 'password' | 'mfa' })` or `await stepUp({ tier: 'high' | 'medium' })` via `[[use-step-up]]` — that hook mounts this dialog and resolves or rejects the Promise when the dialog closes.
- Not a fit for the initial sign-in flow (use `[[auth-sign-in-card]]` instead).

## Files shipped (per registry.json)

| File path (in consumer repo) | Type |
|---|---|
| `components/auth/step-up-dialog.tsx` | `registry:component` |
| `components/auth/step-up-dialog.requires.json` | `registry:file` |
| `lib/auth/messages/step-up-dialog-messages.ts` | `registry:lib` |

> No data hook is shipped. The block imports its mutation hooks (`useVerifyPasswordMutation`, `useVerifyTotpMutation`, `useRequireStepUpMutation`) from the host's generated `auth` SDK (`@/generated/auth`). Only the messages catalog and the `requires.json` manifest are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (Constructive block; supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `dialog`, `button`, `input`, `label`, `form`
- `lib/auth-errors`
- `[[auth-passkey-sign-in]]` (optional passkey button when user has passkeys)

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; it arrives transitively via the `blocks-runtime` registry dependency.

## DB procedures used by default hook

- `constructive_auth_public.verify_password(password text) RETURNS boolean` — schema `constructive_auth_public` → **namespace `auth`** → generated op `verifyPassword` → hook `useVerifyPasswordMutation`. Called when `type='password'`. Updates `sessions.last_password_verified` server-side. **Deployed.**
- `constructive_auth_public.verify_totp(totp_value text) RETURNS boolean` — schema `constructive_auth_public` → **namespace `auth`** → generated op `verifyTotp` → hook `useVerifyTotpMutation`. Called when `type='mfa'` (TOTP path). Updates `sessions.last_mfa_verified` server-side. **Deployed.**
- `constructive_auth_public.require_step_up(step_up_type text) RETURNS boolean` — schema `constructive_auth_public` → **namespace `auth`** → generated op `requireStepUp` → hook `useRequireStepUpMutation`. Called on mount to check if step-up is still valid within the `step_up_window`. **Deployed.**

CSRF token is attached below the block — by the runtime adapter / server, see `contracts/endpoint-contract.md` §3. The block does NOT read or set `csrf_token`.

> **Backup-code path (backend pending):** The `type='mfa'` step-up path optionally allows a backup code as an alternative to TOTP. This path requires `verify_backup_code(code text) RETURNS boolean` — which does NOT have an AST source and is NOT deployed. Backup-code support in this dialog is deferred until that procedure lands. See `backend-spec/future-procedures.md`.

## Props

```ts
export type StepUpDialogProps = {
  /** Controls dialog open state. Parent manages this. */
  open: boolean;
  /** What to verify. 'password' renders password input. 'mfa' renders TOTP input. */
  type: 'password' | 'mfa';
  /**
   * Whether to show the "Sign in with passkey" option.
   * Default: 'auto' (true when current user has webauthn_credentials rows).
   * Set false to suppress regardless.
   */
  showPasskeyOption?: boolean | 'auto';
  /**
   * Whether to show a "Use backup code instead" link in the mfa path.
   * Locked to false in v1 until verify_backup_code is deployed.
   * Default: false.
   */
  allowBackupCode?: false;
  /** Fired with ok=true on verified, ok=false on cancel. */
  onVerify: (result: StepUpResult) => void;
  /** Override the verify_password call. */
  onSubmitPassword?: (input: { password: string }) => Promise<StepUpResult>;
  /** Override the verify_totp call. */
  onSubmitTotp?: (input: { totpValue: string }) => Promise<StepUpResult>;
  notifications?: boolean | NotificationConfig;
  messages?: Partial<StepUpDialogMessages>;
  onError?: (err: { message: string; code: string }) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
};

export type StepUpResult =
  | { ok: true }
  | { ok: false; reason: 'cancelled' | 'error'; error?: unknown };
```

## Messages catalog

```ts
export type StepUpDialogMessages = {
  // Password mode
  passwordTitle: string;
  passwordDescription: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  passwordSubmitButton: string;
  // MFA (TOTP) mode
  mfaTitle: string;
  mfaDescription: string;
  mfaCodeLabel: string;
  mfaCodePlaceholder: string;
  mfaSubmitButton: string;
  // Passkey option
  orLabel: string;
  passkeyButton: string;
  // Shared
  cancelButton: string;
  errors: {
    INVALID_CREDENTIALS: string;
    INVALID_TOTP: string;
    RATE_LIMITED: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultStepUpDialogMessages: StepUpDialogMessages = {
  passwordTitle: 'Confirm your password',
  passwordDescription: 'Enter your current password to continue.',
  passwordLabel: 'Password',
  passwordPlaceholder: '••••••••',
  passwordSubmitButton: 'Confirm',
  mfaTitle: 'Confirm with two-factor authentication',
  mfaDescription: 'Enter the 6-digit code from your authenticator app.',
  mfaCodeLabel: 'Authentication code',
  mfaCodePlaceholder: '000000',
  mfaSubmitButton: 'Confirm',
  orLabel: 'or',
  passkeyButton: 'Verify with passkey',
  cancelButton: 'Cancel',
  errors: {
    INVALID_CREDENTIALS: 'Incorrect password. Please try again.',
    INVALID_TOTP: 'Invalid code. Check your authenticator app and try again.',
    RATE_LIMITED: 'Too many attempts. Please wait before trying again.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The dialog block itself does not export a standalone hook — that is `[[use-step-up]]`. The block imports generated mutation hooks from the host's `auth` SDK.

- **Imports:**
  ```ts
  import { useRequireStepUpMutation } from '@/generated/auth';
  import { useVerifyPasswordMutation } from '@/generated/auth';
  import { useVerifyTotpMutation } from '@/generated/auth';
  ```
- **Block's internal logic:**
  1. On `open=true`, call `requireStepUpMutation.mutateAsync({ stepUpType: type }).then(d => d.requireStepUp)`. If it returns `true`, immediately fire `onVerify({ ok: true })` without rendering the dialog UI. `vars` carry no `csrf_token`.
  2. Render the appropriate form based on `type`.
  3. On submit, call `verifyPasswordMutation.mutateAsync(vars).then(d => d.verifyPassword)` or `verifyTotpMutation.mutateAsync(vars).then(d => d.verifyTotp)`.
  4. On success, fire `onVerify({ ok: true })`.
  5. On cancel or backdrop click, fire `onVerify({ ok: false, reason: 'cancelled' })`.
  6. On error, fire `onError(err)` AND `onVerify({ ok: false, reason: 'error', error: err })`.
- **Adapter overrides:** `onSubmitPassword` / `onSubmitTotp` replace the respective generated hook call when provided. Hybrid pending applies per hook.

**Passkey option:** When `showPasskeyOption` is `true` (or `'auto'` and user has passkeys), render `[[auth-passkey-sign-in]]` with `stepUpMode=true` below the primary form. `auth-passkey-sign-in`'s `onSuccess` fires `onVerify({ ok: true })`.

### `step-up-dialog.requires.json`

```json
{
  "namespace": "auth",
  "mutations": ["requireStepUp", "verifyPassword", "verifyTotp"],
  "queries": [],
  "models": []
}
```

## Callbacks

- `onVerify(result)` — the primary callback. Always fires on close (success, cancel, or error).
- `onError(err)` — fires additionally on error (after `mapAuthError(err, messages)` using `messages.errors[err.extensions.code]`).
- `onMessage(event)` — fires `{ kind: 'success' | 'error' | 'info' | 'warning', key, message? }`.

## Captcha

- Not applicable.

## Step-up

- This block IS the step-up surface. It does not recurse.

## Notifications (§5 — step-up tier table)

Step-up errors are shown inline in the dialog (not as toasts) to keep context. The consumer controlling the parent action may show a success toast after `onVerify({ ok: true })`.

### Tier mapping (from `[[use-step-up]]`)

| Tier | Resolves to `type` | Logic |
|---|---|---|
| `tier: 'high'` | `'mfa'` | If user has MFA enrolled (TOTP or passkey registered) |
| `tier: 'high'` | `'password'` | Fallback if user has NO MFA enrolled |
| `tier: 'medium'` | `'password'` | Always password — medium severity does not require MFA |

### MFA path details (when `type='mfa'`)

- **TOTP:** `verify_totp(totp_value)` — **deployed**. Returns `boolean`.
- **Passkey option:** `[[auth-passkey-sign-in]]` with `stepUpMode=true` — **deployed**. Uses `webauthn_begin_sign_in` / `webauthn_finish_sign_in`.
- **Backup code option:** Requires `verify_backup_code` — **backend pending**. `allowBackupCode` is locked `false` in v1. Enable when procedure is deployed.

### Inline error behavior

| Event | Behavior |
|---|---|
| success | Inline — no toast (parent handles success feedback) |
| error → `INVALID_CREDENTIALS` | Inline form error: `messages.errors.INVALID_CREDENTIALS` |
| error → `INVALID_TOTP` | Inline form error: `messages.errors.INVALID_TOTP` |
| error → `RATE_LIMITED` | Inline form error: `messages.errors.RATE_LIMITED` |
| error → fallback | Inline form error: `messages.errors.UNKNOWN_ERROR` |

## Accessibility

- Dialog uses `role="dialog"` with `aria-modal="true"` and `aria-labelledby` pointing to the title.
- Focus is trapped inside the dialog when open.
- First interactive element (password input or TOTP input) receives focus on open.
- Cancel button mapped to Escape key.
- Error messages in `aria-live="polite"` region.

## Notes / gotchas

- **`require_step_up` skip logic:** The `step_up_window` interval on `app_settings_auth` controls how long a step-up remains valid. If the user verified recently, the dialog short-circuits to `onVerify({ ok: true })` without rendering.
- **Backdrop click:** Should fire `onVerify({ ok: false, reason: 'cancelled' })` same as the cancel button.
- **Promise semantics:** This block uses callbacks. `[[use-step-up]]` wraps it into Promises. Block consumers should use `[[use-step-up]]` in most cases.
- **Passkey auto-detect:** `showPasskeyOption='auto'` requires a query to `webauthn_credentials`. This query fires on dialog open. Cache it in the hook.
- **Type switching:** The dialog does NOT allow switching between `type='password'` and `type='mfa'` — the consumer decides. Use `[[use-step-up]]` with `tier` shorthand to let the hook decide automatically based on MFA enrollment.
- Cross-reference: `[[use-step-up]]` is the primary integration point. `[[auth-passkey-sign-in]]` is composed inside this block for the passkey option.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/step-up-dialog/`
- Storybook states: password mode (idle, submitting, error), MFA mode (idle, submitting, error), with passkey option, step-up skipped (require_step_up=true).
- The dialog is always controlled (`open` prop) — it never manages its own open state.
- Use `@base-ui-components/react` `Dialog` primitive (matching existing dashboard patterns).
