# org-members-list

**Type:** `registry:block`
**Status:** `v1 (frontend ready, backend pending)`
**Namespace:** `org-*`
**Skill reference:** `constructive-frontend/references/block-auth-org-glue.md`
**Master entry:** `blocks-master.md#org-members-list`

**Pairing:** No page block — card-only. Used as: a section card within an org settings page (consumer-defined layout).

**Backend status:** pending — the query joins `constructive_memberships_public.org_memberships` to `constructive_users_public.users`, which may require a public view or explicit grant. `remove_org_member` and `transfer_org_ownership` procedures do not exist in `constructive_auth_public` today. See `backend-spec/future-procedures.md`.

## Purpose

Paginated list of members for a given org (type=2 user). Each row shows: [[user-avatar]], member display name, role chip (Owner / Admin / Member derived from `is_owner` / `is_admin` / `profile_id`), `is_approved` badge, inline role-change select, and a Remove button. Org owner can transfer ownership from this view. Remove and transfer-ownership actions are gated by step-up auth at appropriate tiers.

## When to use

- In the org admin settings area, "Members" tab.
- After [[org-invite-dialog]] creates new invites, refresh this list to show pending members.
- Not a fit when: you only need to show current user's own membership — use [[user-context-switcher]] instead.

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/org/org-members-list.tsx` | `registry:component` |
| `components/org/org-members-list.requires.json` | `registry:file` |
| `lib/org/messages/org-members-list-messages.ts` | `registry:lib` |
| `lib/auth/errors.ts` | `registry:lib` (shared, auto-deduped) |

> No data hooks are shipped. The block imports generated hooks from the host's `admin` SDK (`@/generated/admin`): a list query for memberships and mutations for remove/role-change/transfer. Only the messages catalog, the shared errors util, and the `requires.json` manifest are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (Constructive block; supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `card` (shadcn primitive)
- `button` (shadcn primitive)
- `badge` (shadcn primitive)
- `select` (shadcn primitive — inline role-change)
- `dialog` (shadcn primitive — confirmation dialogs)
- `skeleton` (shadcn primitive — loading state)
- `[[user-avatar]]` (user-* block)

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; it arrives transitively via the `blocks-runtime` registry dependency. The generated `admin` SDK is the host's, not a published dep of this block.

## DB procedures used by default hook

> **Backend pending** — the bindings in this section describe the block's intended targets and haven't all been reconciled with `constructive-db` yet; the membership-to-`users` JOIN access and the `remove_org_member` / `transfer_org_ownership` procedures are the open items, flagged inline below.

**Reading members:**
- Table: `constructive_memberships_public.org_memberships` — schema `memberships_public` → **namespace `admin`** → generated list hook `useOrgMembershipsQuery` (iff `OrgMembershipsConnection` type exists in the `admin` SDL; sdk-binding §5 Connection rule). Filtered by `entityId = $orgId`. The joined `users` fields (`displayName`, `profilePicture`, `username`) must be accessible via the SDL's relationship fields — FLAG if `org_memberships` JOIN `users` isn't directly queryable by the `authenticated` role.

**Removing a member:**
- Proposed: `constructive_auth_public.remove_org_member(org_id uuid, member_id uuid) RETURNS boolean` — schema `memberships_public` → **namespace `admin`** → generated op `removeOrgMember` → hook `useRemoveOrgMemberMutation`. Backend status: pending (see `backend-spec/future-procedures.md`).
- Fallback: `DELETE FROM constructive_memberships_public.org_memberships WHERE entity_id = $orgId AND actor_id = $memberId` → `useDeleteOrgMembershipMutation`. Gated by RLS.

**Changing role:**
- `UPDATE constructive_memberships_public.org_memberships SET profile_id = $profileId WHERE entity_id = $orgId AND actor_id = $memberId` — schema `memberships_public` → **namespace `admin`** → generated op `updateOrgMembership` → hook `useUpdateOrgMembershipMutation`. Gated by RLS.

**Transferring ownership:**
- Proposed: `constructive_auth_public.transfer_org_ownership(org_id uuid, new_owner_id uuid) RETURNS boolean` — schema `memberships_public` → **namespace `admin`** → generated op `transferOrgOwnership` → hook `useTransferOrgOwnershipMutation`. Backend status: pending. Needs to be atomic (set `is_owner=true`/`false` for both parties). FLAG if not yet deployed.

## Props

```ts
export type OrgMember = {
  userId: string;
  displayName: string;
  username: string | null;
  profilePicture: string | null;
  isOwner: boolean;
  isAdmin: boolean;
  isApproved: boolean;
  profileId: string | null;
  /** Derived display label: 'Owner' | 'Admin' | 'Member' or profile name */
  roleLabel: string;
};

export type OrgMembersListProps = {
  /** The org User id (type=2). Required. */
  orgId: string;
  /** Page size for pagination. Default: 25 */
  pageSize?: number;
  /** Whether the current viewer is an owner of this org (controls edit/remove visibility). */
  viewerIsOwner?: boolean;
  /** Whether the current viewer is an admin of this org. */
  viewerIsAdmin?: boolean;
  /** Available role profiles (from [[org-roles-editor]] data). Pass to show role selector. */
  roleProfiles?: Array<{ id: string; label: string }>;
  notifications?: boolean | NotificationConfig;
  messages?: Partial<OrgMembersListMessages>;
  onRemoveSuccess?: (removedUserId: string) => void;
  onRoleChangeSuccess?: (userId: string, newProfileId: string | null) => void;
  onTransferOwnershipSuccess?: (newOwnerId: string) => void;
  onError?: (err: unknown) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
};
```

## Messages catalog

```ts
export type OrgMembersListMessages = {
  title: string;
  emptyState: string;
  loadingAriaLabel: string;
  // Role labels
  roleOwner: string;
  roleAdmin: string;
  roleMember: string;
  // Status
  pendingBadge: string;
  approvedBadge: string;
  // Actions
  removeButton: string;
  removeConfirmTitle: string;
  removeConfirmDescription: string;
  removeConfirmButton: string;
  transferOwnershipButton: string;
  transferConfirmTitle: string;
  transferConfirmDescription: string;
  transferConfirmButton: string;
  // Toasts
  removeSuccessToast: string;
  roleChangeSuccessToast: string;
  transferSuccessToast: string;
  // Error codes (Q22 — UPPER_SNAKE_CASE keys match err.extensions.code)
  errors: {
    PERMISSION_DENIED: string;
    MEMBER_NOT_FOUND: string;
    CANNOT_REMOVE_OWNER: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultOrgMembersListMessages: OrgMembersListMessages = {
  title: 'Members',
  emptyState: 'No members yet.',
  loadingAriaLabel: 'Loading members…',
  roleOwner: 'Owner',
  roleAdmin: 'Admin',
  roleMember: 'Member',
  pendingBadge: 'Pending',
  approvedBadge: 'Active',
  removeButton: 'Remove',
  removeConfirmTitle: 'Remove member',
  removeConfirmDescription: 'Are you sure you want to remove {{name}} from this organization?',
  removeConfirmButton: 'Remove',
  transferOwnershipButton: 'Transfer ownership',
  transferConfirmTitle: 'Transfer ownership',
  transferConfirmDescription: 'Transfer ownership to {{name}}? You will become a regular admin.',
  transferConfirmButton: 'Transfer',
  removeSuccessToast: '{{name}} has been removed.',
  roleChangeSuccessToast: "{{name}}'s role has been updated.",
  transferSuccessToast: 'Ownership transferred to {{name}}.',
  errors: {
    PERMISSION_DENIED: 'You do not have permission to manage members.',
    MEMBER_NOT_FOUND: 'Member not found.',
    CANNOT_REMOVE_OWNER: 'Transfer ownership before removing the owner.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The block does **not** ship `use-org-members.ts`, `use-remove-org-member.ts`, or `use-transfer-org-ownership.ts`. It imports the generated hooks from the host's `admin` SDK. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

- **Import:**
  ```ts
  import {
    useOrgMembershipsQuery,
    useUpdateOrgMembershipMutation,
    useDeleteOrgMembershipMutation,
    useRemoveOrgMemberMutation,
    useTransferOrgOwnershipMutation,
  } from '@/generated/admin';
  ```
- **List members (query):**
  ```ts
  const members = useOrgMembershipsQuery({
    selection: { fields: { nodes: { id: true, actorId: true, entityId: true, isOwner: true, isAdmin: true, isApproved: true, profileId: true, actor: { displayName: true, username: true, profilePicture: true } } } },
    variables: { filter: { entityId: { equalTo: orgId } } },
  });
  ```
  List hook emitted iff `OrgMembershipsConnection` type exists in the `admin` SDL (sdk-binding §5 Connection rule). FLAG if absent — see backend-pending note above.
- **Role change:**
  ```ts
  const updateMembership = useUpdateOrgMembershipMutation({
    selection: { fields: { orgMembership: { id: true, profileId: true } } },
  });
  await updateMembership.mutateAsync({ id: membershipId, patch: { profileId } }).then((d) => d.updateOrgMembership);
  ```
- **Remove member:** `useRemoveOrgMemberMutation` (when procedure is deployed) or `useDeleteOrgMembershipMutation` (table-direct fallback). Backend status: pending.
- **Transfer ownership:** `useTransferOrgOwnershipMutation`. Backend status: pending.
- **Returns:** each generated hook exposes `{ mutateAsync, isPending, error }` (TanStack Query v5 style).
- **Step-up** is handled via the `use-step-up` utility hook (shipped, not generated) before calling the mutation.

### `org-members-list.requires.json`

```json
{
  "namespace": "admin",
  "mutations": ["updateOrgMembership", "deleteOrgMembership"],
  "queries": [],
  "models": ["orgMemberships"]
}
```

> `removeOrgMember` and `transferOrgOwnership` are backend-pending. Add them to `mutations` once the procedures are deployed and `check-sdk.mjs` can verify them.

## Step-up

- **Remove member (non-admin):** `tier: 'medium'` → `type: 'password'`.
- **Remove member who is admin:** `tier: 'high'` → `type: 'mfa'` if enrolled, else `type: 'password'`.
- **Transfer ownership:** `tier: 'high'` → `type: 'mfa'` if enrolled, else `type: 'password'`.

```ts
// Inside useRemoveOrgMember:
const tier = member.isAdmin ? 'high' : 'medium';
await stepUp({ tier });
```

## Captcha

Not applicable.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Member removed | `messages.removeSuccessToast` (success, `{{name}}` interpolated) |
| Role changed | `messages.roleChangeSuccessToast` (success, `{{name}}` interpolated) |
| Ownership transferred | `messages.transferSuccessToast` (success, `{{name}}` interpolated) |
| `PERMISSION_DENIED` | `messages.errors.PERMISSION_DENIED` (error) |
| `CANNOT_REMOVE_OWNER` | `messages.errors.CANNOT_REMOVE_OWNER` (error) |
| Unknown error | `messages.errors.UNKNOWN_ERROR` (error) |

## Accessibility

- Table or list with appropriate `role="table"` / `role="row"` semantics.
- Remove and Transfer buttons have `aria-label` including member name (e.g., `aria-label="Remove Jane Doe"`).
- Confirmation dialogs trap focus and return focus to the triggering button on close.
- Loading skeleton uses `aria-label` from `messages.loadingAriaLabel`.

## Notes / gotchas

- **Pagination**: use cursor-based pagination (TanStack Query `useInfiniteQuery`) over page numbers; `org_memberships` can be large in enterprise contexts.
- **Owner cannot be removed**: the Remove button is hidden for the owner row. Show a tooltip "Transfer ownership first" on hover.
- **Pending members**: `is_approved=false` rows are members who accepted an invite but haven't been explicitly approved (if `send_approved_invites` permission was off for the sender). Show "Pending" badge.
- **Role profiles**: if `roleProfiles` prop is empty or absent, the role selector shows only Owner/Admin/Member toggles based on `is_owner` / `is_admin` flags.
- Cross-ref: [[org-invite-dialog]] — after inviting, refresh this list to show the pending member row.
- Cross-ref: [[org-roles-editor]] — the `roleProfiles` prop comes from the org's profile list, managed by `org-roles-editor`.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/org/members-list/`
- Storybook stories: loading, empty, single owner, multiple members (mixed roles), pending member, remove flow (confirm dialog), transfer ownership flow, permission denied error.
