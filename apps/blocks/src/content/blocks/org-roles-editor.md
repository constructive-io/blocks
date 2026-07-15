# org-roles-editor

**Type:** `registry:block`
**Status:** `v1 (frontend ready, backend pending)`
**Namespace:** `org-*`
**Skill reference:** `constructive-frontend/references/block-auth-org-glue.md`
**Master entry:** `blocks-master.md#org-roles-editor`

**Pairing:** No page block — card-only. Used as: an admin section card within an org settings page (consumer-defined layout), alongside [[org-members-list]] and [[org-invite-dialog]].

**Backend status:** pending — `constructive_profiles_public` procedures for creating/updating/deleting org role profiles are not confirmed in `constructive_auth_public` today. The bitstring-based permission system (SPRT / AuthzComposite) requires dedicated procedures. See `backend-spec/future-procedures.md`.

> **Backend pending** — the exact procedure names and table structure in `constructive_profiles_public` aren't finalized against `constructive-db`, and the permission-bit catalog (human-readable permission names) still needs to be exposed to the `authenticated` role. The block targets the shapes described below until those land.

## Purpose

Admin interface for managing named role profiles for an org. Each profile is a named set of permission bits drawn from the SPRT (Security Predicate Resolution Tables) system. Org admins create, rename, and delete profiles; each profile maps to a bitstring in `constructive_permissions_private`. These profiles feed into [[org-members-list]] (role assignment) and [[org-invite-dialog]] (default role for new invites).

## When to use

- In org settings, "Roles" tab or section.
- When the org has custom permission requirements beyond the default Owner/Admin/Member flags.
- Not a fit when: the org uses only the built-in `is_owner` / `is_admin` flags without custom profiles.

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/org/org-roles-editor.tsx` | `registry:component` |
| `components/org/org-roles-editor.requires.json` | `registry:file` |
| `lib/org/messages/org-roles-editor-messages.ts` | `registry:lib` |
| `lib/auth/errors.ts` | `registry:lib` (shared, auto-deduped) |

> No data hooks are shipped. The block imports generated hooks from the host's generated SDK — namespace to be confirmed (see FLAG in DB section). Only the messages catalog, the shared errors util, and the `requires.json` manifest are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (Constructive block; supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `card` (shadcn primitive)
- `button` (shadcn primitive)
- `input` (shadcn primitive)
- `label` (shadcn primitive)
- `checkbox` (shadcn primitive — per-permission toggles)
- `dialog` (shadcn primitive — delete confirmation)
- `badge` (shadcn primitive)

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `react-hook-form` (^7)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; it arrives transitively via the `blocks-runtime` registry dependency. The generated SDK is the host's, not a published dep of this block.

## DB procedures used by default hook

> **Backend pending** — every binding below is a proposed target against `constructive_profiles_public` and hasn't been reconciled with `constructive-db` yet.

> **FLAG — namespace unresolved:** The spec targets `constructive_profiles_public`. This schema is NOT explicitly listed in `sdk-binding-contract.md` §2's four standard namespaces (`auth`, `admin`, `objects`, `public`). `permissions_public` (listed in `admin`) is distinct from `profiles_public`. Until the schema→API mapping for `constructive_profiles_public` is confirmed, this block CANNOT derive a definitive namespace. If `profiles_public` is exposed via the `admin` API (grouped with `permissions_public`), namespace = `admin`. If it requires the `public` combined namespace, namespace = `public`. **Do not ship `requires.json` with a guessed namespace — verify against `constructive-db` `api_schemas` config first.**

**Reading profiles:**
- Proposed: `SELECT FROM constructive_profiles_public.profiles WHERE entity_id = $orgId` — namespace TBD (see FLAG) → generated list hook `useProfilesQuery` (iff `ProfilesConnection` type exists). Returns profile rows with `id`, `name`, `permissions`.

**Reading permission catalog:**
- Proposed: `SELECT FROM constructive_permissions_private.org_permissions` (or equivalent) — must be selectable by `authenticated` role via a public view. Namespace TBD. FLAG if not queryable.

**Creating/updating a profile:**
- Proposed: `constructive_auth_public.save_org_role_profile(org_id uuid, profile_id uuid?, name text, permissions text[]) RETURNS uuid` — namespace TBD → generated op `saveOrgRoleProfile` → hook `useSaveOrgRoleProfileMutation`. Backend status: pending.
- Upsert pattern: `profile_id` null = create new, present = update existing.

**Deleting a profile:**
- Proposed: `constructive_auth_public.delete_org_role_profile(profile_id uuid) RETURNS boolean` — namespace TBD → generated op `deleteOrgRoleProfile` → hook `useDeleteOrgRoleProfileMutation`. Backend status: pending.
- Must refuse deletion if any `org_memberships.profile_id` references this profile (or CASCADE to set to null).

## Props

```ts
export type OrgRoleProfile = {
  id: string;
  name: string;
  /** Human-readable permission keys granted by this profile. */
  permissions: string[];
  /** Number of members currently assigned this profile. */
  memberCount: number;
};

export type OrgPermission = {
  key: string;
  label: string;
  description?: string;
  category?: string;
};

export type OrgRolesEditorProps = {
  /** The org User id (type=2). Required. */
  orgId: string;
  notifications?: boolean | NotificationConfig;
  messages?: Partial<OrgRolesEditorMessages>;
  onProfileSaved?: (profileId: string) => void;
  onProfileDeleted?: (profileId: string) => void;
  onError?: (err: unknown) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
};
```

## Messages catalog

```ts
export type OrgRolesEditorMessages = {
  title: string;
  description: string;
  addProfileButton: string;
  editButton: string;
  deleteButton: string;
  deleteConfirmTitle: string;
  deleteConfirmDescription: string;
  deleteConfirmButton: string;
  profileNameLabel: string;
  profileNamePlaceholder: string;
  permissionsLabel: string;
  saveButton: string;
  saveButtonPending: string;
  cancelButton: string;
  memberCountLabel: string;
  emptyState: string;
  saveSuccessToast: string;
  deleteSuccessToast: string;
  errors: {
    PROFILE_IN_USE: string;
    PERMISSION_DENIED: string;
    DUPLICATE_NAME: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultOrgRolesEditorMessages: OrgRolesEditorMessages = {
  title: 'Role profiles',
  description: 'Define named sets of permissions for org members.',
  addProfileButton: 'Add role',
  editButton: 'Edit',
  deleteButton: 'Delete',
  deleteConfirmTitle: 'Delete role profile',
  deleteConfirmDescription: 'Delete "{{name}}"? Members with this role will be set to default.',
  deleteConfirmButton: 'Delete',
  profileNameLabel: 'Role name',
  profileNamePlaceholder: 'e.g. Billing Manager',
  permissionsLabel: 'Permissions',
  saveButton: 'Save role',
  saveButtonPending: 'Saving…',
  cancelButton: 'Cancel',
  memberCountLabel: '{{count}} member(s)',
  emptyState: 'No custom roles defined.',
  saveSuccessToast: 'Role "{{name}}" saved.',
  deleteSuccessToast: 'Role "{{name}}" deleted.',
  errors: {
    PROFILE_IN_USE: 'This role is assigned to members and cannot be deleted. Reassign members first.',
    PERMISSION_DENIED: 'You do not have permission to manage roles.',
    DUPLICATE_NAME: 'A role with this name already exists.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The block does **not** ship `use-org-role-profiles.ts` or `use-save-org-role-profile.ts`. It imports generated hooks from the host's SDK. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

> **FLAG:** Namespace is unresolved (see DB section). The import path below uses `admin` as the most likely value — update once confirmed.

- **Import (tentative — pending namespace confirmation):**
  ```ts
  import { useProfilesQuery, useSaveOrgRoleProfileMutation, useDeleteOrgRoleProfileMutation } from '@/generated/admin';
  ```
- **Read profiles (query):**
  ```ts
  const profiles = useProfilesQuery({
    selection: { fields: { nodes: { id: true, name: true, permissions: true, memberCount: true } } },
    variables: { filter: { entityId: { equalTo: orgId } } },
  });
  ```
  List hook emitted iff `ProfilesConnection` type exists in the SDK SDL (sdk-binding §5 Connection rule).
- **Save (mutation):**
  ```ts
  const saveProfile = useSaveOrgRoleProfileMutation({
    selection: { fields: { profile: { id: true, name: true } } },
  });
  const result = await (onSubmitOverride
    ? onSubmitOverride(vars)
    : saveProfile.mutateAsync(vars).then((d) => d.saveOrgRoleProfile));
  ```
- **Delete:** `useDeleteOrgRoleProfileMutation`. Backend status: pending.
- **Returns:** each generated hook exposes `{ mutateAsync, isPending, error }` (TanStack Query v5 style).
- **Adapter override:** when `props.onSubmit` is provided, the block awaits it instead. Hybrid isPending: `onSubmitOverride ? overridePending : saveProfile.isPending`.

### `org-roles-editor.requires.json`

> **BLOCKED — requires namespace resolution (see FLAG above).** Template shown for the `admin` namespace assumption:

```json
{
  "namespace": "admin",
  "mutations": ["saveOrgRoleProfile", "deleteOrgRoleProfile"],
  "queries": [],
  "models": ["profiles"]
}
```

## Captcha

Not applicable.

## Step-up

Not required for role management. Org admin/owner session authority is sufficient.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Role saved | `messages.saveSuccessToast` (success, `{{name}}` interpolated) |
| Role deleted | `messages.deleteSuccessToast` (success, `{{name}}` interpolated) |
| `PROFILE_IN_USE` | `messages.errors.PROFILE_IN_USE` (error) |
| `PERMISSION_DENIED` | `messages.errors.PERMISSION_DENIED` (error) |
| Unknown error | `messages.errors.UNKNOWN_ERROR` (error) |

## Accessibility

- Role profile list uses `role="list"` / `role="listitem"`.
- Inline edit form opens below the selected profile row (accordion pattern). Focus moves to the name field on open.
- Delete confirmation dialog traps focus.
- Checkbox group for permissions uses `fieldset` + `legend`.

## Notes / gotchas

- **Permission catalog complexity**: the SPRT bitstring system is Constructive-internal. The block renders permission keys as checkboxes labeled by `OrgPermission.label`. The mapping of key → bit number is server-side; the block doesn't need to understand bit positions.
- **Built-in roles are not editable**: Owner and Admin are system-level flags (`is_owner`, `is_admin`), not profiles. The editor only manages additional named profiles.
- **Deletion guard**: if `memberCount > 0`, show a warning before deletion rather than hard-blocking.
- Cross-ref: [[org-members-list]] consumes `roleProfiles` returned by this block's query.
- Cross-ref: [[org-invite-dialog]] uses profile IDs from this block for the default role selector.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/org/roles-editor/`
- Consider a two-panel layout: profile list on the left, permission editor on the right (or collapsible accordion on mobile).
- Storybook stories: empty state, one profile, multiple profiles, editing profile, permission catalog loading, save success, delete success, profile-in-use error.
