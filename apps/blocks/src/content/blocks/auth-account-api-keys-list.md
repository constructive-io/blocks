# auth-account-api-keys-list

**Type:** `registry:block`
**Status:** `out-of-frontend-scope (API-config-pending)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-account.md`
**Master entry:** `blocks-master.md#auth-account-api-keys-list`

> **FLAG — out-of-frontend-scope (API-config-pending):** `user_api_keys` is a `constructive_auth_private` view with no public API. Codegen emits **no** `*Connection` type → **no** generated list hook. The list-fetch portion of this block cannot be built until an API exposes a `UserApiKeysConnection`. **Only `revokeApiKey` mutation is buildable today.** See `contracts/sdk-binding-contract.md` §10 and `blocks-master.md` §6 (Q37). The `requires.json` names only `revokeApiKey`; the list query is omitted.

**Pairing:** No page block — this card is composed by [[auth-account-settings-page]]. Install the page to get the full settings surface; install this card alone for a standalone API-keys management widget.

## Purpose

Lists the signed-in user's API keys from `constructive_auth_private.user_api_keys` view (a view in the private schema, exposed via the `authenticated` role grant — see DB section below). Per row: key name, prefix (first characters of visible key), access level, MFA level, last-used timestamp, expiry, and revoke. Triggers the `auth-api-key-create-dialog` block for key creation. App feature flag `allow_api_keys` gates the entire block.

## When to use

- As the API keys section within `auth-account-settings-page`.
- On any developer settings page.
- Not a fit when: `app_settings_auth.allow_api_keys` is `false` (block should not be mounted; consumer checks flag before rendering).

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/auth/account-api-keys-list.tsx` | `registry:component` |
| `components/auth/account-api-keys-list.requires.json` | `registry:file` |
| `lib/auth/messages/account-api-keys-list-messages.ts` | `registry:lib` |

> No data hook is shipped. The `use-api-keys.ts` hook is removed — the list query has no generated hook (private-schema view, no `*Connection`). The revoke mutation is consumed as `useRevokeApiKeyMutation` from `@/generated/auth` when the list surface is buildable. Only the messages catalog and the `requires.json` manifest are registry files. See `contracts/sdk-binding-contract.md` §5–§7 and §10.

## Registry dependencies

- `blocks-runtime` (supplies `QueryClientProvider` + per-namespace `configure()`; React Query reaches this block transitively)
- `card`, `button`, `badge`, `separator`, `dialog`, `tooltip`
- `auth-api-key-create-dialog`
- `auth-api-key-created-modal`
- `lib/auth-errors`

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; arrives transitively via `blocks-runtime`. `@constructive-io/data` is removed.

## DB procedures used by default hook

| Operation | Source | Status |
|---|---|---|
| List API keys | `constructive_auth_private.user_api_keys` view — **no public API, no `*Connection` type** → **no generated list hook** (out-of-frontend-scope) | Blocked — API-config-pending |
| Revoke API key | `constructive_auth_public.revoke_api_key(key_id uuid) → boolean` — schema `constructive_auth_public` → **namespace `auth`** → generated op `revokeApiKey` → hook `useRevokeApiKeyMutation` | DEPLOYED |

**List blocked:** `constructive_auth_private.user_api_keys` has no public API. Codegen emits no `UserApiKeysConnection` type and no `useUserApiKeysQuery` hook. The list portion is out-of-frontend-scope until an API exposes the Connection. See `contracts/sdk-binding-contract.md` §10.

CSRF token is handled below the block — see `contracts/endpoint-contract.md` §3. Block does NOT pass `csrf_token`.

**Key prefix column:** The `user_api_keys` view surfaces `session_credentials` data. A `key_prefix` for displaying the first characters of the raw key is stored at creation time (returned from `create_api_key`). Its exact column name in the `user_api_keys` view isn't finalized yet.

## Props

```ts
export type AccountApiKeysListProps = {
  onKeyRevoked?: (keyId: string) => void;
  onKeyCreated?: (result: ApiKeyCreatedResult) => void;
  onError?: (err: unknown) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  notifications?: boolean | { success?: boolean; error?: boolean };
  messages?: Partial<AccountApiKeysListMessages>;
  /** Maximum number of API keys allowed per user. Sourced from app_settings_auth or a sane default. */
  maxKeys?: number;
};

export type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string; // first visible chars of raw key, stored at creation
  accessLevel: string;
  mfaLevel: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export type ApiKeyCreatedResult = {
  keyId: string;
  rawKey: string; // cnc_live_sk_... — shown ONCE via auth-api-key-created-modal
  name: string;
  expiresAt: string | null;
};
```

## Messages catalog

```ts
export type AccountApiKeysListMessages = {
  title: string;
  description: string;
  createButton: string;
  nameHeader: string;
  prefixHeader: string;
  accessLevelHeader: string;
  lastUsedHeader: string;
  expiresHeader: string;
  revokeButton: string;
  revokeConfirmTitle: string;
  revokeConfirmDescription: string;
  revokeConfirmButton: string;
  revokeCancelButton: string;
  keyRevokedToast: string;
  neverUsed: string;
  noExpiry: string;
  expired: string;
  maxKeysReached: string;
  errors: {
    UNKNOWN_ERROR: string;
  };
};

export const defaultAccountApiKeysListMessages: AccountApiKeysListMessages = {
  title: 'API keys',
  description: 'API keys allow programmatic access to your account. Treat them like passwords.',
  createButton: 'Create API key',
  nameHeader: 'Name',
  prefixHeader: 'Key',
  accessLevelHeader: 'Access',
  lastUsedHeader: 'Last used',
  expiresHeader: 'Expires',
  revokeButton: 'Revoke',
  revokeConfirmTitle: 'Revoke API key?',
  revokeConfirmDescription: 'This key will stop working immediately. This action cannot be undone.',
  revokeConfirmButton: 'Revoke key',
  revokeCancelButton: 'Cancel',
  keyRevokedToast: 'API key revoked.',
  neverUsed: 'Never',
  noExpiry: 'No expiry',
  expired: 'Expired',
  maxKeysReached: 'Maximum number of API keys reached.',
  errors: {
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The block does **not** ship a `use-api-keys.ts`. The list-fetch portion has no generated hook (private-schema view, no `*Connection` — `contracts/sdk-binding-contract.md` §10). Only the revoke mutation is bindable today.

**Revoke mutation (buildable):**
- **Import:** `import { useRevokeApiKeyMutation } from '@/generated/auth';` (`revoke_api_key` → `revokeApiKey` → `useRevokeApiKeyMutation`, per `endpoint-contract.md` §7.)
- **Instantiate:**
  ```ts
  const revokeMutation = useRevokeApiKeyMutation({
    selection: { fields: { revokeApiKey: true } },
  });
  ```
- **Call:**
  ```ts
  await revokeMutation.mutateAsync({ keyId }).then((d) => d.revokeApiKey);
  ```
  `vars` carries `keyId` — **never** `csrf_token`.
- **Returns:** `{ mutateAsync, isPending, error }`.
- **Adapter override:** when `props.onSubmit` is provided, the block awaits it instead.

**List query (out-of-frontend-scope):** no generated `useUserApiKeysQuery` or `useApiKeysQuery` hook exists; the list cannot be fetched until an API exposes a `UserApiKeysConnection`. When that Connection ships, the list hook becomes: `import { useUserApiKeysQuery } from '@/generated/auth'` and `requires.json` gains `"queries": ["userApiKeys"]`.

### `account-api-keys-list.requires.json`

```json
{
  "namespace": "auth",
  "mutations": ["revokeApiKey"],
  "queries": [],
  "models": []
}
```

> `queries` and `models` are empty because the list surface is out-of-frontend-scope. Only `revokeApiKey` mutation exists today.

## Callbacks

- `onKeyRevoked(keyId)` — fires after revocation.
- `onKeyCreated(result)` — fires after `auth-api-key-create-dialog` succeeds. List block uses this to trigger a refetch and open `auth-api-key-created-modal`.
- `onError(err)` — fires on error.

## Captcha

Not applicable.

## Step-up

Revocation of a single API key does not require step-up — a confirmation dialog is sufficient. Key creation requires step-up (`tier: 'high'`), handled inside `auth-api-key-create-dialog`.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Key revoked | `messages.keyRevokedToast` |
| Unknown error | `messages.errors.UNKNOWN_ERROR` |

## Accessibility

- Table with proper `<thead>` / `<tbody>` and column headers.
- Revoke button per row: `aria-label="Revoke API key {{name}}"`.
- Expired keys: `aria-label` on expiry cell indicates expired state.
- Confirmation dialog traps focus.

## Notes / gotchas

- The raw API key (`cnc_live_sk_...`) is NEVER shown in this list — only the prefix. After the key is created and the modal dismissed, it cannot be recovered. Make this clear in the UI copy.
- An expired key (`expires_at < now()`) should be shown with a muted style and an "Expired" badge. It cannot be used but still appears until explicitly revoked.
- Key prefix display: `cnc_live_sk_<first8>…` — confirm the exact prefix format once the key schema is verified.
- `auth-api-key-created-modal` is opened by this block (not the create dialog) to ensure the modal appears within the list page context and the raw key is handed off correctly.

## Implementation notes (for the author)

- The create-dialog and created-modal are sub-components rendered inside this list block's tree.
- State: `pendingCreatedKey: ApiKeyCreatedResult | null` — when set, opens the created-modal.
- Test states: empty list, multiple keys, expired key, max keys reached, revoke confirmation, revoke error, create flow end-to-end.
- Migration: no existing route to replace; new block.
