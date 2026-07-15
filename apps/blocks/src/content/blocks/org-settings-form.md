# org-settings-form

**Type:** `registry:block`
**Status:** `v1 (frontend ready, backend pending)`
**Namespace:** `org-*`
**Skill reference:** `constructive-frontend/references/block-auth-org-glue.md`
**Master entry:** `blocks-master.md#org-settings-form`

**Pairing:** No page block — card-only. Used as: the primary settings section card within an org settings page (consumer-defined layout).

**Backend status:** pending — `delete_org` procedure does not exist in `constructive_auth_public` today. Display name / slug / logo updates use direct `UPDATE` on `constructive_users_public.users` via PostGraphile, which should work under existing RLS for org owners. See `backend-spec/future-procedures.md`.

> **Backend pending** — the org-deletion path isn't finalized: no `delete_org` procedure exists in `constructive_auth_public` today, and whether deletion will run through such a procedure or a cascading DELETE on the type=2 `users` row is still open. Name, slug, and logo edits already save through a direct `UPDATE` on `constructive_users_public.users`.

## Purpose

Form for editing an org's basic settings: display name, URL slug (`username`), and logo (`profile_picture`). Since an org IS a `users` row (type=2), this block updates the `constructive_users_public.users` row scoped to the target org. Includes a Danger Zone section for org deletion (requires step-up + confirmation).

## When to use

- In org settings, "General" tab.
- Any surface that lets an org owner/admin edit their org's identity.
- Not a fit when: you need to manage org members, roles, or app memberships — use [[org-members-list]], [[org-roles-editor]], [[org-app-memberships]].

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/org/org-settings-form.tsx` | `registry:component` |
| `components/org/org-settings-form.requires.json` | `registry:file` |
| `lib/org/messages/org-settings-form-messages.ts` | `registry:lib` |
| `lib/auth/errors.ts` | `registry:lib` (shared, auto-deduped) |

> No data hooks are shipped. The block imports its query and mutation hooks (`useUserQuery`, `useUpdateUserMutation`, `useDeleteOrgMutation`) from the host's generated `auth` SDK (`@/generated/auth`). Only the messages catalog, the shared errors util, and the `requires.json` manifest are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (Constructive block; supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `card` (shadcn primitive)
- `button` (shadcn primitive)
- `input` (shadcn primitive)
- `label` (shadcn primitive)
- `form` (shadcn primitive)
- `separator` (shadcn primitive — separates Danger Zone)
- `dialog` (shadcn primitive — delete confirmation)
- `[[user-avatar]]` (user-* block — logo preview)

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `react-hook-form` (^7)
- `zod` (^3)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; it arrives transitively via the `blocks-runtime` registry dependency. The generated `auth` SDK is the host's, not a published dep of this block.

## DB procedures used by default hook

**Loading org data:**
- Table: `constructive_users_public.users` — schema `users_public` → **namespace `auth`** → generated query `useUserQuery` with `filter: { id: { equalTo: orgId } }`. Returns `displayName`, `username`, `profilePicture`.

**Saving settings:**
- `UPDATE constructive_users_public.users SET display_name = $name, username = $slug, profile_picture = $logo WHERE id = $orgId` — schema `users_public` → **namespace `auth`** → generated op `updateUser` → hook `useUpdateUserMutation`. Gated by RLS (org owner/admin only).
- Slug uniqueness check: `useUsersQuery` with `filter: { username: { equalTo: $slug } }` (same pattern as [[org-create-card]]).
- Logo upload: `object_store_public` presigned URL upload via the `objects` namespace — separate from the `auth` SDK. Returns URL stored in `profilePicture`.

CSRF token is attached below the block — by the runtime adapter / server, see `contracts/endpoint-contract.md` §3. The block does NOT read or set `csrf_token`.

**Deleting the org:**
- Proposed: `constructive_auth_public.delete_org(org_id uuid) RETURNS boolean` — schema `users_public` → **namespace `auth`** → generated op `deleteOrg` → hook `useDeleteOrgMutation`. Backend status: pending (see `backend-spec/future-procedures.md`).
- Expected behaviour: cascades `org_memberships`, revokes active sessions scoped to the org, soft-deletes the `users` row.
- Requires step-up before calling. See Step-up section below.
- Messages catalog includes `PROCEDURE_NOT_FOUND` for runtime fallback (backend-pending block; see `endpoint-contract.md` §6).

## Props

```ts
export type OrgSettingsFormProps = {
  /** The org User id (type=2). Required. */
  orgId: string;
  notifications?: boolean | NotificationConfig;
  messages?: Partial<OrgSettingsFormMessages>;
  /** Adapter override for settings save. */
  onSubmit?: (input: OrgSettingsInput) => Promise<OrgSettingsResult>;
  onSaveSuccess?: (result: OrgSettingsResult) => void;
  /** Adapter override for org deletion. */
  onDeleteSubmit?: (orgId: string) => Promise<void>;
  onDeleteSuccess?: () => void;
  onError?: (err: unknown) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
};

export type OrgSettingsInput = {
  displayName: string;
  username: string;
  profilePicture?: File | null;
};

export type OrgSettingsResult = {
  id: string;
  displayName: string;
  username: string;
  profilePicture: string | null;
};
```

## Messages catalog

```ts
export type OrgSettingsFormMessages = {
  title: string;
  description: string;
  nameLabel: string;
  namePlaceholder: string;
  slugLabel: string;
  slugPlaceholder: string;
  slugHint: string;
  slugAvailable: string;
  slugTaken: string;
  slugChangeWarning: string;
  logoLabel: string;
  logoHint: string;
  removeLogoButton: string;
  saveButton: string;
  saveButtonPending: string;
  // Danger zone
  dangerZoneTitle: string;
  deleteOrgButton: string;
  deleteConfirmTitle: string;
  deleteConfirmDescription: string;
  deleteConfirmButton: string;
  // Validation
  nameRequired: string;
  nameTooShort: string;
  slugInvalid: string;
  // Toasts
  saveSuccessToast: string;
  deleteSuccessToast: string;
  errors: {
    PERMISSION_DENIED: string;
    USERNAME_TAKEN: string;
    ORG_NOT_FOUND: string;
    /** Backend-pending: fires when delete_org procedure is not yet deployed. */
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultOrgSettingsFormMessages: OrgSettingsFormMessages = {
  title: 'General settings',
  description: 'Update your organization profile.',
  nameLabel: 'Organization name',
  namePlaceholder: 'Acme Corp',
  slugLabel: 'URL slug',
  slugPlaceholder: 'acme-corp',
  slugHint: 'Used in URLs and mentions. Letters, numbers, and hyphens only.',
  slugAvailable: 'Available',
  slugTaken: 'Already taken',
  slugChangeWarning: 'Changing the slug will break existing links to this organization.',
  logoLabel: 'Logo',
  logoHint: 'PNG or JPG, up to 2 MB. Square images work best.',
  removeLogoButton: 'Remove logo',
  saveButton: 'Save changes',
  saveButtonPending: 'Saving…',
  dangerZoneTitle: 'Danger zone',
  deleteOrgButton: 'Delete organization',
  deleteConfirmTitle: 'Delete organization',
  deleteConfirmDescription: 'This action is permanent and cannot be undone. All members will lose access. Type "{{orgName}}" to confirm.',
  deleteConfirmButton: 'Delete permanently',
  nameRequired: 'Organization name is required.',
  nameTooShort: 'Organization name must be at least 2 characters.',
  slugInvalid: 'Slug may only contain letters, numbers, and hyphens.',
  saveSuccessToast: 'Organization settings saved.',
  deleteSuccessToast: '{{orgName}} has been deleted.',
  errors: {
    PERMISSION_DENIED: 'You do not have permission to edit this organization.',
    USERNAME_TAKEN: 'That slug is already taken. Choose a different one.',
    ORG_NOT_FOUND: 'Organization not found.',
    PROCEDURE_NOT_FOUND: 'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The block does **not** ship `use-org-settings.ts` or `use-delete-org.ts`. It imports generated hooks from the host's `auth` SDK. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

- **Import:** `import { useUserQuery, useUpdateUserMutation, useDeleteOrgMutation } from '@/generated/auth';`
- **Load org (query):**
  ```ts
  const orgData = useUserQuery({
    selection: { fields: { id: true, displayName: true, username: true, profilePicture: true } },
    variables: { id: orgId },
  });
  ```
- **Save settings (mutation):**
  ```ts
  const updateUser = useUpdateUserMutation({
    selection: { fields: { user: { id: true, displayName: true, username: true, profilePicture: true } } },
  });
  const result = await (onSubmitOverride
    ? onSubmitOverride(vars)
    : updateUser.mutateAsync({ id: orgId, patch: { displayName: vars.displayName, username: vars.username, profilePicture: vars.profilePictureUrl ?? null } })
        .then((d) => d.updateUser));
  ```
  `vars` excludes any csrf_token (handled below the block; see `endpoint-contract.md` §3).
- **Delete org (mutation — backend pending):**
  ```ts
  const deleteOrg = useDeleteOrgMutation({
    selection: { fields: { deleted: true } },
  });
  await deleteOrg.mutateAsync({ orgId }).then((d) => d.deleteOrg);
  ```
  Step-up clears before this call (see Step-up section). If the procedure is not yet deployed, maps to `PROCEDURE_NOT_FOUND` error key.
- **Returns:** each generated hook exposes `{ mutateAsync, isPending, error }` (TanStack Query v5 style).
- **Adapter override:** when `props.onSubmit` / `props.onDeleteSubmit` are provided, the block awaits them instead. Hybrid isPending: `onSubmitOverride ? overridePending : updateUser.isPending`.

### `org-settings-form.requires.json`

```json
{
  "namespace": "auth",
  "mutations": ["updateUser"],
  "queries": [],
  "models": ["users"]
}
```

> `deleteOrg` is backend-pending. Add it to `mutations` once the procedure is deployed and `check-sdk.mjs` can verify it.

## Callbacks

- `onSaveSuccess(result)` — fires after successful save.
- `onDeleteSuccess()` — fires after deletion. Caller should switch context to personal account via [[user-context-switcher]].
- `onError(err)` — fires on mutation failure.
- `onMessage({ kind, key })` — informational events (e.g., slug changed warning).

## Captcha

Not applicable.

## Step-up

- **Save settings (name/slug/logo):** no step-up required.
- **Delete org:** `tier: 'high'` → `type: 'mfa'` if enrolled, else `type: 'password'`.

```ts
// Inside useDeleteOrg:
await stepUp({ tier: 'high' });
```

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Settings saved | `messages.saveSuccessToast` (success) |
| Org deleted | `messages.deleteSuccessToast` (success, `{{orgName}}` interpolated) |
| `PERMISSION_DENIED` | `messages.errors.PERMISSION_DENIED` (error) |
| `USERNAME_TAKEN` | `messages.errors.USERNAME_TAKEN` (error) |
| Unknown error | `messages.errors.UNKNOWN_ERROR` (error) |

## Accessibility

- `<form>` with `aria-label="Organization settings"`.
- Danger Zone section visually separated (red border, distinct heading).
- Delete confirmation requires typed confirmation (`orgName` input). The confirm button is disabled until the typed value matches.
- Step-up dialog (from `useStepUp`) traps focus during the step-up flow.

## Notes / gotchas

- **Slug change warning**: if the user edits the slug field, show an inline warning (`messages.slugChangeWarning`) before saving — slug changes break all existing links.
- **Logo removal**: setting `profile_picture` to `null` removes the logo. Show a "Remove logo" button when a logo is present.
- **Type confirmation on delete**: the delete confirmation dialog requires the user to type the org's `displayName` exactly before enabling the confirm button (inspired by GitHub org deletion). This is a UX guard; the actual authorization gate is step-up auth.
- After deletion, the caller MUST switch context back to the personal account. Pass the `onDeleteSuccess` callback to trigger [[user-context-switcher]]'s `switchTo(null)`.
- Cross-ref: [[user-context-switcher]] — call `switchTo(null)` after org deletion.
- Cross-ref: [[org-create-card]] — slug uniqueness check uses the same query pattern.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/org/settings-form/`
- Storybook stories: loading, default state with existing data, slug available, slug taken, slug change warning, logo upload, remove logo, save success, delete flow (step-up, typed confirm), permission-denied error.
