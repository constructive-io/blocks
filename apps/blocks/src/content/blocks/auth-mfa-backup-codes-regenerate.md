# auth-mfa-backup-codes-regenerate

**Type:** `registry:block`
**Status:** `v1 (frontend ready, backend pending)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-mfa.md`
**Master entry:** `blocks-master.md#auth-mfa-backup-codes-regenerate`

> **Backend status: pending** — `generate_backup_codes` is not yet deployed to `constructive_auth_public`. Compiled from `proc_generate_backup_codes_body` in the AST generator. See `backend-spec/future-procedures.md`. The frontend spec is complete and can be authored against this procedure signature now.

**Pairing:** No page block — this is a confirmation dialog used inside `[[auth-account-security-card]]`. Consumers of this block: `[[auth-account-security-card]]` (surfaces this dialog when user clicks "Regenerate backup codes").

## Purpose

Confirmation dialog → step-up → `generate_backup_codes()` (returns new set, invalidates old) → display new codes via `[[auth-mfa-backup-codes-display]]`. Used in account security settings when the user wants to rotate their backup codes.

## When to use

- In `[[auth-account-security-card]]` when TOTP is enabled and the user clicks "Regenerate backup codes".
- Not a fit when TOTP is not enabled or backup codes are not allowed by `allow_backup_codes` feature flag.

## Files shipped (per registry.json)

| File path (in consumer repo) | Type |
|---|---|
| `components/auth/mfa-backup-codes-regenerate.tsx` | `registry:component` |
| `components/auth/mfa-backup-codes-regenerate.requires.json` | `registry:file` |
| `lib/auth/messages/mfa-backup-codes-regenerate-messages.ts` | `registry:lib` |

> No data hook is shipped. The block imports its mutation hook (`useGenerateBackupCodesMutation`) from the host's generated `auth` SDK (`@/generated/auth`). Only the messages catalog and the `requires.json` manifest are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (Constructive block; supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `dialog`, `button`
- `lib/auth-errors`
- `[[use-step-up]]`
- `[[auth-mfa-backup-codes-display]]`

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; it arrives transitively via the `blocks-runtime` registry dependency.

## DB procedures used by default hook

- `constructive_auth_public.generate_backup_codes() RETURNS text[]` — schema `constructive_auth_public` → **namespace `auth`** → generated op `generateBackupCodes` → hook `useGenerateBackupCodesMutation`.
  — Generates a new set of backup codes, stores hashes in `constructive_simple_secrets` (key: `backup_codes`), and invalidates any previously generated codes.

CSRF token is attached below the block — by the runtime adapter / server, see `contracts/endpoint-contract.md` §3. The block does NOT read or set `csrf_token`.

## Props

```ts
export type MfaBackupCodesRegenerateProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications?: boolean | NotificationConfig;
  messages?: Partial<MfaBackupCodesRegenerateMessages>;
  onSuccess?: (result: { codes: string[] }) => void;
  onError?: (err: { message: string; code: string }) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  /** Adapter override. */
  onSubmit?: () => Promise<{ codes: string[] }>;
};
```

## Messages catalog

```ts
export type MfaBackupCodesRegenerateMessages = {
  title: string;
  description: string;
  warningText: string;
  regenerateButton: string;
  cancelButton: string;
  generatingButton: string;
  errors: {
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultMfaBackupCodesRegenerateMessages: MfaBackupCodesRegenerateMessages = {
  title: 'Regenerate backup codes',
  description:
    'Generate a new set of backup codes. Your old backup codes will stop working immediately.',
  warningText: 'Make sure to save the new codes. Old codes cannot be recovered.',
  regenerateButton: 'Regenerate backup codes',
  cancelButton: 'Cancel',
  generatingButton: 'Generating…',
  errors: {
    PROCEDURE_NOT_FOUND: 'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The block does **not** ship a `use-mfa-backup-codes-regenerate.ts`. It imports the generated mutation hook from the host's `auth` SDK and drives it with a field `selection`. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

- **Import:** `import { useGenerateBackupCodesMutation } from '@/generated/auth';` (real generated name — `generate_backup_codes` → `generateBackupCodes` → `useGenerateBackupCodesMutation`, per `endpoint-contract.md` §7.)
- **Instantiate with a selection** of exactly the payload fields this block consumes:
  ```ts
  const defaultMutation = useGenerateBackupCodesMutation({
    selection: { fields: { generateBackupCodes: true } },
  });
  ```
- **Call + read the payload via the operation key:**
  ```ts
  const result = await (onSubmitOverride
    ? onSubmitOverride()
    : defaultMutation.mutateAsync({}).then((d) => d.generateBackupCodes));
  ```
  `vars` carries no user-supplied fields — `csrf_token` is omitted (handled below the block). The block passes the result codes to `[[auth-mfa-backup-codes-display]]`.
- **Returns:** generated hook exposes `{ mutateAsync, isPending, error }` (TanStack Query v5 style).
- **Adapter override:** When `props.onSubmit` is provided, the block awaits it instead of the generated hook. Hybrid pending: `onSubmitOverride ? overridePending : defaultMutation.isPending`.
- **Step-up:** Hook calls `await stepUp({ tier: 'high' })` from `[[use-step-up]]` before calling the mutation. If step-up is cancelled, the action is aborted silently.

### `mfa-backup-codes-regenerate.requires.json`

The install-time check (`constructive-blocks` skill) reads this to verify the host's generated `auth` SDK exports the named op before the block is installed.

```json
{
  "namespace": "auth",
  "mutations": ["generateBackupCodes"],
  "queries": [],
  "models": []
}
```

## Flow

1. **Confirmation state** — Dialog open. Warns user that old backup codes will be invalidated. "Regenerate" button triggers step-up.
2. **Step-up** — `await stepUp({ tier: 'high' })` via `[[use-step-up]]`. Cancel returns to calling context silently.
3. **Generating** — Call `generate_backup_codes()`. Show loading state (button text: `messages.generatingButton`).
4. **Display** — Replace dialog content with `[[auth-mfa-backup-codes-display]]` showing new codes. `onSuccess` fires when user confirms codes are saved.

## Step-up

- **Required:** `tier: 'high'` → resolves to `type: 'mfa'` if user has MFA enrolled (TOTP is active at this point), falls back to `type: 'password'`.
- Called before `generate_backup_codes()`.

## Captcha

- Not applicable. Post-authentication action.

## Notifications (default toasts)

Step-up errors are handled by `[[auth-step-up-dialog]]` inline. This block's notifications fire only on `generate_backup_codes` errors.

| Event | Behavior |
|---|---|
| step-up cancelled | silent — no toast |
| generate error → fallback | Sonner toast: `messages.errors.UNKNOWN_ERROR` |

## Accessibility

- Dialog uses `role="alertdialog"` with `aria-modal="true"`.
- Warning text is visible before the confirm button — not hidden behind an expand.
- "Regenerate" button is visually destructive (red/warning variant).
- Cancel button receives initial focus.

## Notes / gotchas

- **Old codes are immediately invalidated** the moment `generate_backup_codes()` is called — make the `warningText` prominent before confirming.
- After codes are displayed via `[[auth-mfa-backup-codes-display]]` and the user clicks "Continue", close the dialog and fire `onSuccess({ codes })`.
- **Step-up order:** Step-up runs first inside the hook, then `generate_backup_codes()` executes. The dialog remains open during step-up.
- Cross-reference: `[[auth-mfa-backup-codes-display]]` handles the actual code display + confirmation gate.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/mfa-backup-codes-regenerate/`
- Storybook states: confirmation state (open), step-up in progress, generating (pending), display (backup codes shown), success.
- Until `generate_backup_codes` is deployed, use the `onSubmit` adapter prop to wire a mock.
