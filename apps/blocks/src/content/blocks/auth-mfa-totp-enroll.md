# auth-mfa-totp-enroll

**Type:** `registry:block`
**Status:** `v1 (frontend ready, backend pending)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-mfa.md`
**Master entry:** `blocks-master.md#auth-mfa-totp-enroll`

> **Backend status: pending** — `enable_totp`, `confirm_totp_setup`, and `generate_backup_codes` are not yet deployed to `constructive_auth_public`. They are compiled from AST generator sources (`proc_enable_totp_body`, `proc_confirm_totp_setup_body`, `proc_generate_backup_codes_body`). See `backend-spec/future-procedures.md`. The frontend spec is complete and can be authored against these procedure signatures now.

**Pairing:** No page block — used inside `[[auth-account-security-card]]` (settings page security section). Mounted when the user opts in to TOTP from that card.

## Purpose

Three-step TOTP enrollment flow: (a) call `enable_totp()` → render QR code + manual entry key, (b) user enters verification code → `confirm_totp_setup(totp_code)`, (c) display backup codes via `[[auth-mfa-backup-codes-display]]`. Each step is a distinct UI state within the block.

## When to use

- In account security settings after user opts in to TOTP.
- After `[[auth-account-security-card]]` detects `totp_enabled=false` and the user clicks "Enable two-factor authentication".
- Not a fit when `allow_totp_mfa` feature flag is disabled.

## Files shipped (per registry.json)

| File path (in consumer repo) | Type |
|---|---|
| `components/auth/mfa-totp-enroll.tsx` | `registry:component` |
| `components/auth/mfa-totp-enroll.requires.json` | `registry:file` |
| `lib/auth/messages/mfa-totp-enroll-messages.ts` | `registry:lib` |

> No data hook is shipped. The block imports its mutation hooks (`useEnableTotpMutation`, `useConfirmTotpSetupMutation`, `useGenerateBackupCodesMutation`) from the host's generated `auth` SDK (`@/generated/auth`). Only the messages catalog and the `requires.json` manifest are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (Constructive block; supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `card`, `button`, `input`, `label`, `form`
- `lib/auth-errors`
- `[[auth-mfa-backup-codes-display]]`

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; it arrives transitively via the `blocks-runtime` registry dependency.

## DB procedures used by default hook

- `constructive_auth_public.enable_totp() RETURNS jsonb` — schema `constructive_auth_public` → **namespace `auth`** → generated op `enableTotp` → hook `useEnableTotpMutation`.
  — Returns `{ qr_url: string, manual_entry_key: string }`. Generates and stores a TOTP setup secret in `constructive_simple_secrets` under key `totp_setup_secret`.
- `constructive_auth_public.confirm_totp_setup(totp_code text) RETURNS boolean` — schema `constructive_auth_public` → **namespace `auth`** → generated op `confirmTotpSetup` → hook `useConfirmTotpSetupMutation`.
  — Verifies the user's first TOTP code against the setup secret. On success, promotes `totp_setup_secret` → `totp_secret`, marks `totp_enabled=true`.
- `constructive_auth_public.generate_backup_codes() RETURNS text[]` — schema `constructive_auth_public` → **namespace `auth`** → generated op `generateBackupCodes` → hook `useGenerateBackupCodesMutation`.
  — Called after successful confirm to produce initial backup codes. Block passes result to `[[auth-mfa-backup-codes-display]]`.

CSRF token is attached below the block — by the runtime adapter / server, see `contracts/endpoint-contract.md` §3. The block does NOT read or set `csrf_token`.

## Props

```ts
export type MfaTotpEnrollProps = {
  notifications?: boolean | NotificationConfig;
  messages?: Partial<MfaTotpEnrollMessages>;
  onSuccess?: (result: { backupCodes: string[] }) => void;
  onError?: (err: { message: string; code: string }) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  /** Adapter override for the full enrollment orchestration. */
  onSubmit?: () => Promise<{ qrUrl: string; manualKey: string }>;
};
```

## Messages catalog

```ts
export type MfaTotpEnrollMessages = {
  // Step 1: Setup
  setupTitle: string;
  setupDescription: string;
  qrInstructions: string;
  manualEntryLabel: string;
  nextButton: string;
  // Step 2: Verify
  verifyTitle: string;
  verifyDescription: string;
  codeLabel: string;
  codePlaceholder: string;
  verifyButton: string;
  verifyingButton: string;
  backButton: string;
  // Step 3: Backup codes (delegated to auth-mfa-backup-codes-display)
  // Shared
  errors: {
    INVALID_TOTP: string;
    RATE_LIMITED: string;
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultMfaTotpEnrollMessages: MfaTotpEnrollMessages = {
  setupTitle: 'Set up two-factor authentication',
  setupDescription: 'Scan the QR code with your authenticator app, then enter the code it shows.',
  qrInstructions: 'Or enter this key manually into your authenticator app:',
  manualEntryLabel: 'Manual entry key',
  nextButton: 'Next',
  verifyTitle: 'Verify your authenticator',
  verifyDescription: 'Enter the 6-digit code from your authenticator app to confirm setup.',
  codeLabel: 'Verification code',
  codePlaceholder: '000000',
  verifyButton: 'Verify and enable',
  verifyingButton: 'Verifying…',
  backButton: 'Back',
  errors: {
    INVALID_TOTP: 'Invalid code. Check your authenticator app and try again.',
    RATE_LIMITED: 'Too many attempts. Please wait before trying again.',
    PROCEDURE_NOT_FOUND: 'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The block does **not** ship a `use-mfa-totp-enroll.ts`. It imports three generated mutation hooks from the host's `auth` SDK. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

- **Imports:**
  ```ts
  import { useEnableTotpMutation } from '@/generated/auth';
  import { useConfirmTotpSetupMutation } from '@/generated/auth';
  import { useGenerateBackupCodesMutation } from '@/generated/auth';
  ```
  (Real generated names per `endpoint-contract.md` §7: `enable_totp` → `enableTotp` → `useEnableTotpMutation`; `confirm_totp_setup` → `confirmTotpSetup` → `useConfirmTotpSetupMutation`; `generate_backup_codes` → `generateBackupCodes` → `useGenerateBackupCodesMutation`.)
- **Orchestration:**
  1. Call `enableTotpMutation.mutateAsync({}).then(d => d.enableTotp)` → receive `{ qrUrl, manualEntryKey }`.
  2. Render QR code in step 1. User advances to step 2.
  3. Call `confirmTotpSetupMutation.mutateAsync({ totpCode }).then(d => d.confirmTotpSetup)` → receive `boolean`.
  4. On success, call `generateBackupCodesMutation.mutateAsync({}).then(d => d.generateBackupCodes)` → receive `string[]`.
  5. Pass codes to `[[auth-mfa-backup-codes-display]]`. Fire `onSuccess({ backupCodes })` when user confirms.
- `vars` in each step carry no `csrf_token` (handled below the block).
- **Returns:** Each hook exposes `{ mutateAsync, isPending, error }` (TanStack Query v5 style). The block manages step state internally.
- **Adapter override:** When `props.onSubmit` is provided, it replaces step 1's `enableTotp` call. The adapter must return `{ qrUrl, manualKey }`. Hybrid pending applies per hook.

### `mfa-totp-enroll.requires.json`

The install-time check (`constructive-blocks` skill) reads this to verify the host's generated `auth` SDK exports the named ops before the block is installed.

```json
{
  "namespace": "auth",
  "mutations": ["enableTotp", "confirmTotpSetup", "generateBackupCodes"],
  "queries": [],
  "models": []
}
```

## Callbacks

- `onSuccess(result)` — fires with `{ backupCodes: string[] }` after the user confirms backup codes are saved.
- `onError(err)` — fires after `mapAuthError(err, messages)` maps the error code using `messages.errors[err.extensions.code]`.
- `onMessage(event)` — fires `{ kind: 'success' | 'error' | 'info' | 'warning', key, message? }`; e.g. `{ kind: 'info', key: 'qr_ready' }`.

## Flow states

1. **`'setup'`** — Call `enable_totp()`, render QR code (`<img src={qrUrl}>`) + manual entry key in a `<code>` block. "Next" button advances to `'verify'`.
2. **`'verify'`** — 6-digit input. Call `confirm_totp_setup(totpCode)`. On success, call `generate_backup_codes()`, advance to `'backup-codes'`.
3. **`'backup-codes'`** — Render `[[auth-mfa-backup-codes-display]]` with the returned codes. "Done" button fires `onSuccess`.

## Captcha

- Not applicable. This action requires an authenticated session.

## Step-up

- Not required at enrollment time by default. The consumer may optionally gate this block with `[[use-step-up]]` at the parent level before mounting.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| setup error | `messages.errors.UNKNOWN_ERROR` |
| verify error → `INVALID_TOTP` | `messages.errors.INVALID_TOTP` |
| verify error → `RATE_LIMITED` | `messages.errors.RATE_LIMITED` |
| verify error → fallback | `messages.errors.UNKNOWN_ERROR` |

## Accessibility

- QR code `<img>` has `alt="QR code for authenticator app setup"`.
- Manual entry key is in a `<code>` element, selectable and copyable.
- TOTP input: `<input type="text" inputMode="numeric" maxLength={6} autoComplete="one-time-code" autoFocus>`.
- Error messages in `aria-live="polite"` region.
- Step indicator communicates current step to screen readers via `aria-label`.

## Notes / gotchas

- **QR code rendering:** Use a lightweight QR library (e.g. `qrcode`) to render client-side from `qr_url`. Do NOT make a third-party QR service request with the TOTP secret URL — the URL contains the TOTP secret.
- **`manual_entry_key` formatting:** Display in groups of 4 characters for readability (e.g. `ABCD EFGH IJKL MNOP`).
- **Backup codes after confirm:** `generate_backup_codes()` is called immediately after `confirm_totp_setup` succeeds. If it fails, handle gracefully — TOTP is already enabled; user can regenerate via `[[auth-mfa-backup-codes-regenerate]]`.
- Cross-reference: backup codes displayed in step 3 are managed long-term via `[[auth-mfa-backup-codes-regenerate]]`.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/mfa-totp-enroll/`
- Storybook states: step 1 (setup, loading QR), step 2 (verify, idle, submitting, error), step 3 (backup codes display).
- Dynamic `import('qrcode')` inside the hook to avoid SSR issues.
- Until backend procedures are deployed, use `onSubmit` adapter prop to wire a mock or test double.
