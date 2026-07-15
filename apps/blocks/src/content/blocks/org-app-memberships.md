# org-app-memberships

**Type:** `registry:block`
**Status:** `v1 (frontend ready, backend pending)`
**Namespace:** `org-*`
**Skill reference:** `constructive-frontend/references/block-auth-org-glue.md`
**Master entry:** `blocks-master.md#org-app-memberships`

**Pairing:** No page block — card-only. Used as: an admin section card within an org settings or platform-admin page (consumer-defined layout).

**Backend status:** pending — RLS policy coverage for type=2 users as `actor_id` in `constructive_memberships_public.app_memberships` is unconfirmed. The revoke and approve mutations are direct table operations (no dedicated procedures in `constructive_auth_public` today). See `backend-spec/future-procedures.md`.

> **Backend pending** — whether RLS lets type=2 users (`organization`) appear as `actor_id` in `constructive_memberships_public.app_memberships`, and whether the `authenticated` role can UPDATE/DELETE those rows, isn't settled yet; the `app_memberships.actor_id` FK references `users.id`. Today the approve and revoke actions are direct table operations, with no dedicated procedures in `constructive_auth_public`.

## Purpose

Admin block for managing which apps an org has access to via the `constructive_memberships_public.app_memberships` join table. Displays the org's current `app_memberships` row(s), shows approval status, and allows approving, revoking, or adjusting the membership profile. Used in super-admin or platform-admin contexts where app membership is controlled centrally.

## When to use

- In a platform-admin dashboard managing org app access.
- In an org settings area where the org owner/admin can see (and request changes to) their app memberships.
- Not a fit when: managing individual user (type=1) memberships — use [[org-members-list]] for org members.

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/org/org-app-memberships.tsx` | `registry:component` |
| `components/org/org-app-memberships.requires.json` | `registry:file` |
| `lib/org/messages/org-app-memberships-messages.ts` | `registry:lib` |
| `lib/auth/errors.ts` | `registry:lib` (shared, auto-deduped) |

> No data hook is shipped. The block imports its query and mutation hooks (`useAppMembershipsQuery`, `useUpdateAppMembershipMutation`, `useDeleteAppMembershipMutation`) from the host's generated `admin` SDK (`@/generated/admin`). Only the messages catalog, the shared errors util, and the `requires.json` manifest are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (Constructive block; supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `card` (shadcn primitive)
- `button` (shadcn primitive)
- `badge` (shadcn primitive)
- `dialog` (shadcn primitive — revoke confirmation)
- `select` (shadcn primitive — profile update)
- `skeleton` (shadcn primitive)

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; it arrives transitively via the `blocks-runtime` registry dependency. The generated `admin` SDK is the host's, not a published dep of this block.

## DB procedures used by default hook

**Reading memberships:**
- Table: `constructive_memberships_public.app_memberships` — schema `memberships_public` → **namespace `admin`** → codegen emits `useAppMembershipsQuery` (list hook iff `AppMembershipsConnection` type exists in the `admin` SDL). Filtered by `actorId = $orgId`.
- Returns rows with: `id`, `actorId`, `appId`, `isApproved`, `isVerified`, `profileId`, `createdAt`.

**Approving membership:**
- `UPDATE constructive_memberships_public.app_memberships SET is_approved = true WHERE actor_id = $orgId AND app_id = $appId` — schema `memberships_public` → **namespace `admin`** → generated op `updateAppMembership` → hook `useUpdateAppMembershipMutation`. Gated by RLS (platform admin only).

**Revoking membership:**
- `DELETE FROM constructive_memberships_public.app_memberships WHERE actor_id = $orgId AND app_id = $appId` — schema `memberships_public` → **namespace `admin`** → generated op `deleteAppMembership` → hook `useDeleteAppMembershipMutation`. Gated by RLS.

**Profile update:**
- `UPDATE constructive_memberships_public.app_memberships SET profile_id = $profileId WHERE actor_id = $orgId AND app_id = $appId` — same `useUpdateAppMembershipMutation`.

## Props

```ts
export type OrgAppMembership = {
  id: string;
  appId: string;
  appName?: string;
  isApproved: boolean;
  isVerified: boolean;
  profileId: string | null;
  createdAt: string;
};

export type OrgAppMembershipsProps = {
  /** The org User id (type=2). Required. */
  orgId: string;
  /** Available app membership profiles (platform-defined). */
  membershipProfiles?: Array<{ id: string; label: string }>;
  notifications?: boolean | NotificationConfig;
  messages?: Partial<OrgAppMembershipsMessages>;
  onSuccess?: (action: 'approve' | 'revoke' | 'profile-update', membershipId: string) => void;
  onError?: (err: unknown) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
};
```

## Messages catalog

```ts
export type OrgAppMembershipsMessages = {
  title: string;
  description: string;
  emptyState: string;
  loadingAriaLabel: string;
  approvedBadge: string;
  pendingBadge: string;
  verifiedBadge: string;
  approveButton: string;
  revokeButton: string;
  revokeConfirmTitle: string;
  revokeConfirmDescription: string;
  revokeConfirmButton: string;
  profileLabel: string;
  approveSuccessToast: string;
  revokeSuccessToast: string;
  profileUpdateSuccessToast: string;
  errors: {
    PERMISSION_DENIED: string;
    MEMBERSHIP_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultOrgAppMembershipsMessages: OrgAppMembershipsMessages = {
  title: 'App memberships',
  description: 'Manage app access for this organization.',
  emptyState: 'No app memberships.',
  loadingAriaLabel: 'Loading memberships…',
  approvedBadge: 'Approved',
  pendingBadge: 'Pending',
  verifiedBadge: 'Verified',
  approveButton: 'Approve',
  revokeButton: 'Revoke',
  revokeConfirmTitle: 'Revoke app membership',
  revokeConfirmDescription: 'Remove this organization from the app? This will revoke access for all members.',
  revokeConfirmButton: 'Revoke access',
  profileLabel: 'Membership profile',
  approveSuccessToast: 'Membership approved.',
  revokeSuccessToast: 'Membership revoked.',
  profileUpdateSuccessToast: 'Membership profile updated.',
  errors: {
    PERMISSION_DENIED: 'You do not have permission to manage app memberships.',
    MEMBERSHIP_NOT_FOUND: 'Membership not found.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The block does **not** ship a `use-org-app-memberships.ts`. It imports the generated query and mutation hooks from the host's `admin` SDK and drives them with field `selection` objects. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

- **Import:** `import { useAppMembershipsQuery, useUpdateAppMembershipMutation, useDeleteAppMembershipMutation } from '@/generated/admin';`
- **List (read):** `useAppMembershipsQuery({ selection: { fields: { id: true, actorId: true, appId: true, isApproved: true, isVerified: true, profileId: true, createdAt: true } }, variables: { filter: { actorId: { equalTo: orgId } } } })` — list hook emitted iff `AppMembershipsConnection` type exists in the `admin` SDL (sdk-binding §5 Connection rule). FLAG if the Connection is absent — list surface may be out-of-scope.
- **Approve / profile update:**
  ```ts
  const updateMembership = useUpdateAppMembershipMutation({
    selection: { fields: { appMembership: { id: true, isApproved: true, profileId: true } } },
  });
  const result = await (onSubmitOverride
    ? onSubmitOverride(vars)
    : updateMembership.mutateAsync(vars).then((d) => d.updateAppMembership));
  ```
  `vars` excludes any csrf_token (handled below the block; see `endpoint-contract.md` §3).
- **Revoke (delete):**
  ```ts
  const deleteMembership = useDeleteAppMembershipMutation({
    selection: { fields: { appMembership: { id: true } } },
  });
  await deleteMembership.mutateAsync({ id: membershipId }).then((d) => d.deleteAppMembership);
  ```
- **Returns:** each generated hook exposes `{ mutateAsync, isPending, error }` (TanStack Query v5 style).
- **Adapter override:** when `props.onSubmit` is provided for the relevant action, the block awaits it instead of the generated hook. Hybrid isPending: `onSubmitOverride ? overridePending : mutation.isPending`.

### `org-app-memberships.requires.json`

```json
{
  "namespace": "admin",
  "mutations": ["updateAppMembership", "deleteAppMembership"],
  "queries": [],
  "models": ["appMemberships"]
}
```

## Callbacks

- `onSuccess(action, membershipId)` — fires after approve, revoke, or profile-update.
- `onError(err)` — fires on failure.
- `onMessage({ kind, key })` — informational events.

## Captcha

Not applicable.

## Step-up

- **Approve membership:** no step-up required (administrative action, lower risk).
- **Revoke membership:** `tier: 'medium'` → `type: 'password'`.

```ts
// Inside revoke handler:
await stepUp({ tier: 'medium' });
```

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Membership approved | `messages.approveSuccessToast` (success) |
| Membership revoked | `messages.revokeSuccessToast` (success) |
| Profile updated | `messages.profileUpdateSuccessToast` (success) |
| `PERMISSION_DENIED` | `messages.errors.PERMISSION_DENIED` (error) |
| Unknown error | `messages.errors.UNKNOWN_ERROR` (error) |

## Accessibility

- List of memberships uses `role="list"`.
- Revoke confirmation dialog traps focus and returns focus on close.
- Approve/Revoke buttons include the app name in `aria-label` when available.

## Notes / gotchas

- **Platform-admin vs org-admin scope**: approving/revoking app memberships is typically a platform-admin action (requires special RLS permissions). Org owners may only be able to VIEW their memberships, not revoke them. Gate the edit actions client-side based on viewer's platform role; server-side RLS enforces the actual gate.
- **App name resolution**: `app_memberships.app_id` references an app identifier that may not be directly human-readable from the `constructive_memberships_public` schema. Pass an `appName` override or query app metadata separately.
- **Revoke cascade**: revoking an org's app membership may cascade to member-level access. Document this impact prominently in the confirmation dialog.
- Cross-ref: [[org-members-list]] — org members' individual access is governed by their personal `app_memberships`. The org's `app_memberships` is the org-level gate.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/org/app-memberships/`
- Storybook stories: loading, empty, approved membership, pending membership, revoke flow, approve flow, profile update, permission-denied error.
