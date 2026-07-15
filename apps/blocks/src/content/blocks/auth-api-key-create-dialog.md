# auth-api-key-create-dialog

**Type:** `registry:block`
**Status:** `v1 (frontend ready, backend pending)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-account.md`
**Master entry:** `blocks-master.md#auth-api-key-create-dialog`

**Backend status: pending** — `create_api_key` procedure is deployed, but the parameter contract is not finalized. Enum values for `access_level` and `mfa_level` parameters need verification against `constructive_auth_public.create_api_key` signature. The `expires_in` format (Postgres interval string) also needs confirmation. The form cannot be correctly implemented until these are verified.

**Pairing:** No page block — this dialog is composed inside [[auth-account-api-keys-list]], which is itself composed by [[auth-account-settings-page]]. Not intended for standalone installation.

## Purpose

Modal dialog form for creating a new user-scoped API key. Collects key name, access level, MFA level, and expiry duration. Enforces high-severity step-up (`tier: 'high'`) before calling `create_api_key`. On success, hands the raw `cnc_live_sk_...` key to `auth-api-key-created-modal` for one-time display. Never rendered standalone — always triggered from `auth-account-api-keys-list`.

## When to use

- Rendered as a child dialog inside `auth-account-api-keys-list`. Not installed standalone.
- Not a fit when: the consumer wants a custom key creation UI — override via `onSubmit` prop.

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/auth/api-key-create-dialog.tsx` | `registry:component` |
| `components/auth/api-key-create-dialog.requires.json` | `registry:file` |
| `lib/auth/messages/api-key-create-dialog-messages.ts` | `registry:lib` |

> No data hook is shipped. The block imports `useCreateApiKeyMutation` from `@/generated/auth`. Only the messages catalog and `requires.json` are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (supplies `QueryClientProvider` + per-namespace `configure()`; React Query reaches this block transitively)
- `dialog`, `button`, `input`, `label`, `select`, `form`
- `use-step-up`
- `lib/auth-errors`

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `react-hook-form` (^7)
- `zod` (^3)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; arrives transitively via `blocks-runtime`. `@constructive-io/data` is removed.

## DB procedures used by default hook

| Procedure | Signature | Returns | Notes |
|---|---|---|---|
| `constructive_auth_public.create_api_key` | `(key_name text, access_level text, mfa_level text, expires_in interval)` | `(api_key text, key_id uuid, expires_at timestamptz)` | Schema `constructive_auth_public` → **namespace `auth`** → generated op `createApiKey` → hook `useCreateApiKeyMutation`. DEPLOYED (enum values unverified). |

CSRF token is handled below the block — see `contracts/endpoint-contract.md` §3. Block does NOT pass `csrf_token`.

> **Backend pending** — `create_api_key` is deployed, but the valid enum values for its `access_level` and `mfa_level` parameters aren't finalized against `constructive-db`, and the accepted `expires_in` interval format (ISO 8601 vs. Postgres interval) is still unsettled. The parameter details in the table above are provisional until the procedure signature is locked.

## Props

```ts
export type ApiKeyCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called on successful creation with the raw key. Consumer (auth-account-api-keys-list) opens auth-api-key-created-modal. */
  onSuccess: (result: ApiKeyCreatedResult) => void;
  onError?: (err: unknown) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  notifications?: boolean | { success?: boolean; error?: boolean };
  messages?: Partial<ApiKeyCreateDialogMessages>;
  /** Override the default hook. Receives the raw form values after step-up. */
  onSubmit?: (input: ApiKeyCreateInput) => Promise<ApiKeyCreatedResult>;
  /** Available access levels. Default: ['read', 'write', 'admin']. // TBD: verify against constructive_auth_public.create_api_key signature */
  accessLevelOptions?: AccessLevelOption[];
  /** Available MFA levels. Default: ['none', 'required']. // TBD: verify against constructive_auth_public.create_api_key signature */
  mfaLevelOptions?: MfaLevelOption[];
};

export type ApiKeyCreateInput = {
  name: string;
  accessLevel: string;
  mfaLevel: string;
  expiresIn: string | null; // Postgres interval string or null for no expiry. // TBD: verify against constructive_auth_public.create_api_key signature (ISO 8601 vs Postgres interval format)
};

export type ApiKeyCreatedResult = {
  keyId: string;
  rawKey: string;
  name: string;
  expiresAt: string | null;
};

export type AccessLevelOption = { value: string; label: string };
export type MfaLevelOption = { value: string; label: string };
```

## Messages catalog

```ts
export type ApiKeyCreateDialogMessages = {
  title: string;
  description: string;
  nameLabel: string;
  namePlaceholder: string;
  accessLevelLabel: string;
  mfaLevelLabel: string;
  expiresInLabel: string;
  expiresInOptions: {
    noExpiry: string;
    days30: string;
    days90: string;
    days180: string;
    days365: string;
  };
  createButton: string;
  creatingButton: string;
  cancelButton: string;
  stepUpPrompt: string;
  stepUpCancelled: string;
  errors: {
    UNKNOWN_ERROR: string;
  };
};

export const defaultApiKeyCreateDialogMessages: ApiKeyCreateDialogMessages = {
  title: 'Create API key',
  description: 'API keys provide programmatic access to your account.',
  nameLabel: 'Key name',
  namePlaceholder: 'e.g. CI deploy key',
  accessLevelLabel: 'Access level',
  mfaLevelLabel: 'MFA requirement',
  expiresInLabel: 'Expiry',
  expiresInOptions: {
    noExpiry: 'No expiry',
    days30: '30 days',
    days90: '90 days',
    days180: '180 days',
    days365: '1 year',
  },
  createButton: 'Create key',
  creatingButton: 'Creating…',
  cancelButton: 'Cancel',
  stepUpPrompt: 'Confirm your identity before creating an API key.',
  stepUpCancelled: 'Step-up verification cancelled.',
  errors: {
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The block does **not** ship a standalone data hook. It imports `useCreateApiKeyMutation` from the host's `auth` SDK. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

- **Import:** `import { useCreateApiKeyMutation } from '@/generated/auth';` (`create_api_key` → `createApiKey` → `useCreateApiKeyMutation`, per `endpoint-contract.md` §7.)
- **Instantiate:**
  ```ts
  const createApiKey = useCreateApiKeyMutation({
    selection: { fields: { createApiKey: { apiKey: true, keyId: true, expiresAt: true } } },
  });
  ```
- **Call + read payload:**
  ```ts
  const result = await (onSubmitOverride
    ? onSubmitOverride(vars)
    : createApiKey.mutateAsync({ keyName, accessLevel, mfaLevel, expiresIn }).then((d) => d.createApiKey));
  ```
  `vars` carry `keyName`, `accessLevel`, `mfaLevel`, `expiresIn` — **never** `csrf_token`.
- **Returns:** `{ mutateAsync, isPending, error }`.
- **Adapter override:** when `props.onSubmit` is provided, the block awaits it instead. Hybrid `isPending`.
- **Flow:**
  1. Client-side form validation passes.
  2. Call `await stepUp({ tier: 'high' })` — maps to `type: 'mfa'` if TOTP enrolled, falls back to `type: 'password'`.
  3. Step-up resolves → fire `createApiKey.mutateAsync(input)`.
  4. On success, call `props.onSuccess(result)` and close the dialog.

### `api-key-create-dialog.requires.json`

```json
{
  "namespace": "auth",
  "mutations": ["createApiKey"],
  "queries": [],
  "models": []
}
```

## Callbacks

- `onSuccess(result)` — fires with the raw key and metadata. Parent (`auth-account-api-keys-list`) opens `auth-api-key-created-modal`.
- `onError(err)` — fires on mutation error.
- `onMessage({ kind, key })` — step-up events.

## Captcha

Not applicable — authenticated action.

## Step-up

- Required: yes, `tier: 'high'` → maps to `type: 'mfa'` (preferred) or `type: 'password'` if TOTP not enrolled.
- The form is validated client-side first. Only after validation passes does the block invoke `stepUp()`.
- If step-up is cancelled, the dialog remains open (form is not reset). User can try again.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Error → unknown | `messages.errors.UNKNOWN_ERROR` |

No success toast from this dialog — the success state is handed to the parent list which opens the created-modal.

## Accessibility

- Dialog uses `role="dialog"` with `aria-labelledby` pointing to the title.
- Focus trapping managed by the `dialog` registry primitive.
- Form validation errors: `aria-describedby` per field.
- Submit button disabled while `isPending` or during step-up.
- Cancel button closes without saving.

## Notes / gotchas

- `name` field: require non-empty, trim whitespace, max 100 chars. The DB may enforce uniqueness per user — handle `UNIQUE_VIOLATION` gracefully with an inline error.
- The dialog should NOT auto-close on success. Instead, call `onSuccess` and let the parent close it and open the created-modal. This prevents a flash where both the dialog and the modal try to render simultaneously.
- Expiry duration options are hardcoded defaults. Consumer can add custom options via the messages catalog override.
- Step-up dialog (`auth-step-up-dialog`) renders as a nested dialog — confirm z-index stacking is correct with the `dialog` primitive.

## Implementation notes (for the author)

- Form validation: name required, min 1 char; accessLevel required; mfaLevel required; expiresIn optional (null = no expiry).
- Controlled dialog: `open`/`onOpenChange` from parent; block doesn't manage its own open state.
- Test states: form validation errors, step-up success, step-up cancel, create success, create error (name conflict), network error.
- Migration: no existing route to replace; new block.
