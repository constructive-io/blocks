# auth-mfa-totp-disable-confirm

**Type:** `registry:block`
**Status:** `v1 (frontend ready, backend pending)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-mfa.md`
**Master entry:** `blocks-master.md#auth-mfa-totp-disable-confirm`

> **Backend status: pending** — `disable_totp` is not yet deployed to `constructive_auth_public`. Compiled from `proc_disable_totp_body` in the AST generator. See `backend-spec/future-procedures.md`. The frontend spec is complete and can be authored against this procedure signature now.

**Pairing:** No page block — this is a dialog used inside `[[auth-account-security-card]]`. Consumers of this block: `[[auth-account-security-card]]` (surfaces this dialog when user clicks "Disable two-factor authentication").

## Purpose

Confirmation dialog for disabling TOTP. Requires high-severity step-up (`tier: 'high'`) before calling `disable_totp()`. Shows a clear warning about the security implications of removing two-factor authentication.

## When to use

- In `[[auth-account-security-card]]` when TOTP is currently enabled and user clicks "Disable two-factor authentication".
- Not a fit when TOTP is already disabled.

## Files shipped (per registry.json)

| File path (in consumer repo) | Type |
|---|---|
| `components/auth/mfa-totp-disable-confirm.tsx` | `registry:component` |
| `components/auth/mfa-totp-disable-confirm.requires.json` | `registry:file` |
| `lib/auth/messages/mfa-totp-disable-confirm-messages.ts` | `registry:lib` |

> No data hook is shipped. The block imports its mutation hook (`useDisableTotpMutation`) from the host's generated `auth` SDK (`@/generated/auth`). Only the messages catalog and the `requires.json` manifest are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (Constructive block; supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `dialog`, `button`
- `lib/auth-errors`
- `[[use-step-up]]`

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; it arrives transitively via the `blocks-runtime` registry dependency.

## DB procedures used by default hook

- `constructive_auth_public.disable_totp() RETURNS boolean` — schema `constructive_auth_public` → **namespace `auth`** → generated op `disableTotp` → hook `useDisableTotpMutation`.
  — Clears `totp_secret`, sets `totp_enabled=false`, invalidates all existing backup codes.

CSRF token is attached below the block — by the runtime adapter / server, see `contracts/endpoint-contract.md` §3. The block does NOT read or set `csrf_token`.

## Props

```ts
export type MfaTotpDisableConfirmProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications?: boolean | NotificationConfig;
  messages?: Partial<MfaTotpDisableConfirmMessages>;
  onSuccess?: () => void;
  onError?: (err: { message: string; code: string }) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  /** Adapter override. */
  onSubmit?: () => Promise<void>;
};
```

## Messages catalog

```ts
export type MfaTotpDisableConfirmMessages = {
  title: string;
  description: string;
  warningText: string;
  backupCodesWarning: string;
  confirmButton: string;
  cancelButton: string;
  successToast: string;
  errors: {
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultMfaTotpDisableConfirmMessages: MfaTotpDisableConfirmMessages = {
  title: 'Disable two-factor authentication',
  description: 'This will remove the extra layer of security from your account.',
  warningText: 'Your account will be less secure without two-factor authentication.',
  backupCodesWarning: 'All backup codes will also be invalidated.',
  confirmButton: 'Disable two-factor authentication',
  cancelButton: 'Keep enabled',
  successToast: 'Two-factor authentication disabled.',
  errors: {
    PROCEDURE_NOT_FOUND: 'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The block does **not** ship a `use-mfa-totp-disable.ts`. It imports the generated mutation hook from the host's `auth` SDK and drives it with a field `selection`. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

- **Import:** `import { useDisableTotpMutation } from '@/generated/auth';` (real generated name — `disable_totp` → `disableTotp` → `useDisableTotpMutation`, per `endpoint-contract.md` §7.)
- **Instantiate with a selection:**
  ```ts
  const defaultMutation = useDisableTotpMutation({
    selection: { fields: { disableTotp: true } },
  });
  ```
- **Call + read the payload via the operation key:**
  ```ts
  await (onSubmitOverride
    ? onSubmitOverride()
    : defaultMutation.mutateAsync({}).then((d) => d.disableTotp));
  ```
  `vars` carries no user-supplied fields — `csrf_token` is omitted (handled below the block).
- **Returns:** generated hook exposes `{ mutateAsync, isPending, error }` (TanStack Query v5 style).
- **Adapter override:** When `props.onSubmit` is provided, the block awaits it instead of the generated hook. Hybrid pending: `onSubmitOverride ? overridePending : defaultMutation.isPending`.
- **Step-up:** The block calls `await stepUp({ tier: 'high' })` from `[[use-step-up]]` before invoking the mutation. If step-up is cancelled, the action is aborted silently.

### `mfa-totp-disable-confirm.requires.json`

The install-time check (`constructive-blocks` skill) reads this to verify the host's generated `auth` SDK exports the named op before the block is installed.

```json
{
  "namespace": "auth",
  "mutations": ["disableTotp"],
  "queries": [],
  "models": []
}
```

## Callbacks

- `onSuccess()` — fires after `disable_totp()` succeeds.
- `onError(err)` — fires after `mapAuthError(err, messages)` maps the error using `messages.errors[err.extensions.code]`.
- `onMessage(event)` — fires `{ kind: 'success' | 'error' | 'info' | 'warning', key, message? }`.

## Step-up

- **Required:** `tier: 'high'` → resolves to `type: 'mfa'` if user has MFA enrolled (which they do, since TOTP is active), falls back to `type: 'password'` if no other MFA method is available.
- The user has TOTP active when this dialog is open — `type: 'mfa'` is the correct posture (verify TOTP before disabling it).
- Hook calls `await stepUp({ tier: 'high' })` from `[[use-step-up]]`.

## Captcha

- Not applicable. Post-authentication action.

## Notifications (default toasts)

Step-up errors are handled by `[[auth-step-up-dialog]]` inline. This block's toast fires only on success or on `disable_totp` failure.

| Event | Behavior |
|---|---|
| success | Sonner toast: `messages.successToast` |
| error → `UNKNOWN_ERROR` | Sonner toast: `messages.errors.UNKNOWN_ERROR` |
| step-up cancelled | silent — no toast |

## Accessibility

- Dialog uses `role="alertdialog"` with `aria-labelledby` pointing to the title.
- Focus is trapped inside the dialog when open.
- Confirm button is visually destructive (red variant).
- Cancel button receives initial focus (safer default for a destructive action).
- `aria-live="polite"` region for async errors.

## Notes / gotchas

- **Prominent warning:** Display a destructive-style alert (`bg-destructive` or `border-destructive`) in the dialog body before the confirm button. Both `warningText` and `backupCodesWarning` should be visible simultaneously.
- **Backup codes invalidation:** After `disable_totp()` succeeds, backup codes are also invalidated server-side — the `backupCodesWarning` message informs the user before they confirm.
- **Step-up order:** Step-up runs first (inside the hook), then the disable mutation. The dialog remains open during step-up. After step-up resolves, the disable call executes in the same async chain.
- Cross-reference: `[[auth-account-security-card]]` surfaces this dialog.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/mfa-totp-disable-confirm/`
- Storybook states: idle (open), step-up in progress, disabling (pending), success, error.
- Until `disable_totp` is deployed, use the `onSubmit` adapter prop to wire a mock.
