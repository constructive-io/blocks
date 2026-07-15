# auth-passkey-management-list

**Type:** `registry:block`
**Status:** `v1 (frontend ready)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-mfa.md`
**Master entry:** `blocks-master.md#auth-passkey-management-list`

**Pairing:** No page block — this block is used inside `[[auth-account-security-card]]` (account settings security section). Consumers of this block: `[[auth-account-security-card]]`. The delete action triggers `[[auth-step-up-dialog]]` via `[[use-step-up]]`.

## Purpose

Lists all `webauthn_credentials` rows for the current user. Allows inline renaming and deletion (delete requires step-up). Displays credential metadata: transport types (USB, NFC, internal), device type (platform / cross-platform), and last_used_at. Typically embedded within `[[auth-account-security-card]]`.

## When to use

- On the account security settings page to show all registered passkeys.
- Anywhere the user needs to audit or remove passkeys.
- Not a fit when the current user has no enrolled passkeys — consumer should conditionally render or show an empty state with an `[[auth-passkey-enroll]]` CTA.

## Files shipped (per registry.json)

| File path (in consumer repo) | Type |
|---|---|
| `components/auth/passkey-management-list.tsx` | `registry:component` |
| `components/auth/passkey-management-list.requires.json` | `registry:file` |
| `lib/auth/hooks/use-passkey-management.ts` | `registry:lib` |
| `lib/auth/messages/passkey-management-list-messages.ts` | `registry:lib` |

> **WebAuthn ceremony (delete) is via middleware; list availability is FLAG.** The passkey list query (`webauthn_credentials`) is in `constructive_user_identifiers_public` — this schema IS included in the `auth` namespace SDK (see `sdk-binding-contract.md` §2: `user_identifiers_public` is in the `auth` schema set). A generated `useWebauthnCredentialsQuery` hook should be available IF `webauthn_credentials` is exposed as a Connection type. **FLAG: Verify that `constructive_user_identifiers_public.webauthn_credentials` is exposed as a `WebauthnCredentialsConnection` in the SDL — if no Connection type exists, the list hook is out-of-scope per `sdk-binding-contract.md` §5 (no `*Connection` → no list hook).** Rename and delete mutations (`updateWebauthnCredential`, `deleteWebauthnCredential`) may be generated table writes if RLS permits. `use-passkey-management.ts` is a **UTILITY hook** that orchestrates the query, rename, delete, and step-up logic — it is AUTHORED and SHIPPED by this block. See `contracts/sdk-binding-contract.md` §7 (hook split).

## Registry dependencies

- `blocks-runtime` (Constructive block; supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `card`, `button`, `input`, `badge`, `dialog`, `tooltip`
- `lib/auth-errors`
- `[[auth-step-up-dialog]]` (via `[[use-step-up]]`)
- `[[use-step-up]]`

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; it arrives transitively via the `blocks-runtime` registry dependency.

## DB procedures used by default hook

- **List (Query):** `constructive_user_identifiers_public.webauthn_credentials` — filtered to `owner_id = current_user_id()`. Schema `constructive_user_identifiers_public` is in the `auth` namespace SDK (→ `@/generated/auth`). Fields used: `id`, `name`, `transports`, `credential_device_type`, `backup_eligible`, `backup_state`, `last_used_at`, `created_at`.
  > **FLAG: Verify `WebauthnCredentialsConnection` exists in SDL.** If a `WebauthnCredentialsConnection` type is present, codegen emits a `useWebauthnCredentialsQuery` list hook (namespace `auth`). If NOT present, the list surface is out-of-frontend-scope per `sdk-binding-contract.md` §5 — the utility hook falls back to a direct fetch or the block is marked API-config-pending.
- **Rename:** `constructive_user_identifiers_public.webauthn_credentials` table write — schema `constructive_user_identifiers_public` → **namespace `auth`** → generated op `updateWebauthnCredential` → hook `useUpdateWebauthnCredentialMutation` (table-write pattern).
  > **FLAG: Verify `updateWebauthnCredential(id, patch)` mutation is generated.** If RLS does not permit owner-update, a wrapper `constructive_auth_public.rename_webauthn_credential(credential_id uuid, name text)` is needed (would generate `useRenameWebauthnCredentialMutation`). Check constructive-db.
- **Delete:** `constructive_user_identifiers_public.webauthn_credentials` table delete — **namespace `auth`** → generated op `deleteWebauthnCredential` → hook `useDeleteWebauthnCredentialMutation`.
  > **FLAG: Verify `deleteWebauthnCredential(id)` mutation is generated.** If RLS blocks direct delete, a wrapper `constructive_auth_public.remove_webauthn_credential(credential_id uuid)` is needed. Check constructive-db.

CSRF token is attached below the block — by the runtime adapter / server, see `contracts/endpoint-contract.md` §3. The block does NOT read or set `csrf_token`.

## Props

```ts
export type PasskeyManagementListProps = {
  notifications?: boolean | NotificationConfig;
  messages?: Partial<PasskeyManagementListMessages>;
  /**
   * Adapter override for fetching the credential list.
   * When provided, replaces the default query.
   */
  queryCredentials?: () => Promise<WebAuthnCredential[]>;
  /**
   * Adapter override for renaming a credential.
   */
  onRename?: (input: { credentialId: string; name: string }) => Promise<void>;
  /**
   * Adapter override for deleting a credential.
   * Step-up is called BEFORE this, so the adapter receives a post-step-up call.
   */
  onDelete?: (input: { credentialId: string }) => Promise<void>;
  onSuccess?: (event: PasskeyManagementEvent) => void;
  onError?: (err: { message: string; code: string }) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
};

type WebAuthnCredential = {
  id: string;
  name: string;
  transports: string[];                 // e.g. ['internal', 'hybrid']
  credentialDeviceType: 'platform' | 'cross-platform';
  backupEligible: boolean;
  backupState: boolean;
  lastUsedAt: string | null;
  createdAt: string;
};

type PasskeyManagementEvent =
  | { type: 'renamed'; credentialId: string; name: string }
  | { type: 'deleted'; credentialId: string };
```

## Messages catalog

```ts
export type PasskeyManagementListMessages = {
  title: string;
  emptyState: string;
  addPasskeyButton: string;
  platformBadge: string;
  crossPlatformBadge: string;
  lastUsedNever: string;
  lastUsedLabel: string;
  createdAtLabel: string;
  transportsLabel: string;
  renameButton: string;
  renameSaveButton: string;
  renameCancelButton: string;
  renameInputLabel: string;
  renameInputPlaceholder: string;
  deleteButton: string;
  deleteConfirmTitle: string;
  deleteConfirmDescription: string;
  deleteConfirmButton: string;
  deleteCancelButton: string;
  renameSuccessToast: string;
  deleteSuccessToast: string;
  errors: {
    RENAME_FAILED: string;
    DELETE_FAILED: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultPasskeyManagementListMessages: PasskeyManagementListMessages = {
  title: 'Passkeys',
  emptyState: 'No passkeys registered. Add one below.',
  addPasskeyButton: 'Add passkey',
  platformBadge: 'Built-in',
  crossPlatformBadge: 'Hardware key',
  lastUsedNever: 'Never used',
  lastUsedLabel: 'Last used',
  createdAtLabel: 'Added',
  transportsLabel: 'Works over',
  renameButton: 'Rename',
  renameSaveButton: 'Save',
  renameCancelButton: 'Cancel',
  renameInputLabel: 'Passkey name',
  renameInputPlaceholder: 'e.g. iPhone Face ID',
  deleteButton: 'Remove',
  deleteConfirmTitle: 'Remove passkey',
  deleteConfirmDescription: 'Are you sure you want to remove this passkey? You will not be able to use it to sign in.',
  deleteConfirmButton: 'Remove passkey',
  deleteCancelButton: 'Cancel',
  renameSuccessToast: 'Passkey renamed.',
  deleteSuccessToast: 'Passkey removed.',
  errors: {
    RENAME_FAILED: 'Failed to rename passkey. Please try again.',
    DELETE_FAILED: 'Failed to remove passkey. Please try again.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
```

## Default data hook (utility hook — shipped)

`use-passkey-management.ts` is a **UTILITY hook** authored and shipped by this block. It orchestrates the generated query + mutation hooks (from `@/generated/auth`) and step-up logic — adding block-level coordination the codegen cannot. Canonical mechanics: `contracts/sdk-binding-contract.md` §7 (hook split).

- **Module:** `lib/auth/hooks/use-passkey-management.ts` (SHIPPED — utility hook)
- **Generated hooks consumed internally:**
  - List: `import { useWebauthnCredentialsQuery } from '@/generated/auth';` — see FLAG above for Connection availability.
  - Rename: `import { useUpdateWebauthnCredentialMutation } from '@/generated/auth';` (or `useRenameWebauthnCredentialMutation` if wrapper proc deployed).
  - Delete: `import { useDeleteWebauthnCredentialMutation } from '@/generated/auth';` (or `useRemoveWebauthnCredentialMutation` if wrapper proc deployed).
- **Query:** Fetches `webauthn_credentials` list using the generated list hook with `owner_id = current_user_id()` filter. Refetches after rename or delete.
- **Rename:** Inline edit — calls the generated update mutation. No step-up required.
- **Delete:** Requires step-up. Hook calls `await stepUp({ tier: 'high' })` from `[[use-step-up]]` before sending the delete mutation. If step-up is cancelled, delete is aborted silently.
- **Returns:** `{ credentials, isLoading, error, rename, delete: deleteCredential }`.

### `passkey-management-list.requires.json`

```json
{
  "namespace": "auth",
  "mutations": ["updateWebauthnCredential", "deleteWebauthnCredential"],
  "queries": [],
  "models": ["webauthnCredentials"]
}
```

> **FLAG:** `models` entry `"webauthnCredentials"` requires a `WebauthnCredentialsConnection` in the SDL. If that Connection does not exist, remove the `models` entry and mark the list as API-config-pending (see `sdk-binding-contract.md` §10). Mutation names may also differ if wrapper procs (`renameWebauthnCredential`, `removeWebauthnCredential`) are deployed instead of table-write generated ops — update `requires.json` accordingly once confirmed.

## Callbacks

- `onSuccess(event)` — fires after rename or delete with the event type and relevant IDs.
- `onError(err)` — fires after error mapping.
- `onMessage(event)` — fires `{ kind: 'success' | 'error' | 'info' | 'warning', key, message? }`; e.g. `{ kind: 'info', key: 'step_up_required' }`.

## Captcha

- Not applicable.

## Step-up

- **Required for delete:** `tier: 'high'` → resolves to `type: 'mfa'` if the user has MFA enrolled, else `type: 'password'`. Deleting a passkey is a high-severity action — per Q29 tier policy.
- Hook calls `await stepUp({ tier: 'high' })` from `[[use-step-up]]` before the delete mutation. On cancel, `STEP_UP_CANCELLED` error is caught internally — no user-visible error is shown.
- Rename does NOT require step-up (low-sensitivity action).

> **FLAG: Verify `updateWebauthnCredential` and `deleteWebauthnCredential` mutation availability** in the PostGraphile SDL for `constructive_user_identifiers_public`. If RLS blocks owner-direct writes, wrapper procedures in `constructive_auth_public` (`rename_webauthn_credential`, `remove_webauthn_credential`) must be deployed first — these would generate `useRenameWebauthnCredentialMutation` / `useRemoveWebauthnCredentialMutation` instead. Update `requires.json` and hook imports once confirmed against constructive-db.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| rename success | `messages.renameSuccessToast` |
| delete success | `messages.deleteSuccessToast` |
| rename error | `messages.errors.RENAME_FAILED` |
| delete error | `messages.errors.DELETE_FAILED` |
| error → fallback | `messages.errors.UNKNOWN_ERROR` |

## Accessibility

- Inline rename activates an `<input>` with `aria-label` set to the passkey name. Escape key cancels; Enter saves.
- Delete opens a confirmation dialog (`<dialog role="alertdialog">`).
- Transports displayed as human-readable labels with a `<Tooltip>` showing the raw transport value (e.g. "internal" → "Built-in authenticator").
- `aria-live="polite"` region announces rename/delete success.
- Credential rows should have `aria-label="Passkey: {{name}}"` for screen reader navigation.

## Notes / gotchas

- **Transport display:** Raw transport values from `webauthn_credentials.transports` (e.g. `['internal', 'usb', 'ble', 'nfc', 'hybrid', 'cable']`) map to user-friendly labels. Provide a mapping in the block. `'internal'` → "Built-in", `'usb'` → "USB key", `'nfc'` → "NFC", `'ble'` / `'cable'` → "Bluetooth", `'hybrid'` → "Cross-device".
- **`credential_device_type`:** `'platform'` means the passkey is bound to a device (Face ID, Touch ID, Windows Hello). `'cross-platform'` means a hardware security key (YubiKey etc.).
- **Backup eligible / backup state:** `backup_eligible` indicates the passkey CAN sync to iCloud Keychain / Google Password Manager. `backup_state` indicates it currently IS backed up. Optionally surface these as icons — confirm with design.
- **Last passkey guard:** If the user has only one passkey, warn before deleting (or block deletion if passkeys are their only auth method and `allow_password_sign_in` is false).
- **Empty state:** Render an `[[auth-passkey-enroll]]` CTA inline within the empty state.
- Cross-reference: credentials are enrolled via `[[auth-passkey-enroll]]` and used for sign-in via `[[auth-passkey-sign-in]]`.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/passkey-management-list/`
- Storybook states: loading, empty, 1 credential, 3 credentials (mixed types), inline rename active, delete confirm dialog, deleting.
- Inline rename: toggle between a display `<span>` and a controlled `<input>` using a local `editingId: string | null` state.
- Use `date-fns` or `Intl.RelativeTimeFormat` for `lastUsedAt` relative display (e.g. "3 days ago").
