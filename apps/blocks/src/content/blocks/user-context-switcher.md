# user-context-switcher

**Type:** `registry:block`
**Status:** `v1 (frontend ready, backend pending)`
**Namespace:** `user-*`
**Skill reference:** `constructive-frontend/references/block-auth-org-glue.md`
**Master entry:** `blocks-master.md#user-context-switcher`

**Pairing:** No page block — used as: navigation slot inside [[shell-sidebar]], [[shell-header]], or any consumer-defined nav wrapper. Also composed by [[shell-account-menu]].

**Backend status:** pending — `switch_context(org_id)` does not exist in `constructive_auth_public` today. See `backend-spec/future-procedures.md`.

## Purpose

Dropdown allowing the signed-in user to switch the active "acting as" context between their personal account (`type=1`) and any orgs (`type=2`) they are a member of. This block is the canonical expression of Constructive's unified User model — it surfaces the polymorphic `User` type directly in the UI rather than hiding it behind a separate `Organization` concept. Updating the active context writes `org_id` on `session_credentials` (see the backend-pending note below).

## When to use

- In the app shell nav (sidebar or header) to let multi-org users switch context without signing out.
- As the post-`org-create-card` redirect target (call `switchTo(newOrg.id)` immediately after creation).
- Any surface that needs a "scope selector" — e.g., a workspace picker in a SaaS app.
- Not a fit when: the app is single-org or never creates type=2 users (just hide it; it renders nothing if the user has no orgs).

## The Unified User Model (pedagogy)

In Constructive, organizations ARE users. The `constructive_users_public.users` table has a `type` column:
- `type=1` — a person (personal account)
- `type=2` — an organization

An "org membership" is an `org_memberships` row linking `actor_id` (a type=1 user) to `entity_id` (a type=2 user). When you switch context to an org, the session credential's `org_id` is set to that org's user ID. RLS policies use this to scope queries as if the org is the principal.

The block prop signature makes this model explicit: `User` has a `type` field. There is no separate `Organization` type.

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/user/user-context-switcher.tsx` | `registry:component` |
| `components/user/user-context-switcher.requires.json` | `registry:file` |
| `lib/user/hooks/use-user-contexts.ts` | `registry:lib` |
| `lib/user/hooks/use-switch-context.ts` | `registry:lib` |
| `lib/user/messages/user-context-switcher-messages.ts` | `registry:lib` |

> No generated data hook is shipped. The block-owned utility hooks (`use-user-contexts.ts`, `use-switch-context.ts`) internally import generated hooks from the host's `admin` SDK (`@/generated/admin`) for memberships and the `auth` SDK (`@/generated/auth`) for the current user and context-switch mutation. See `contracts/sdk-binding-contract.md` §5–§7.

> **`switch_context` mutation is backend-pending.** `constructive_auth_public.switch_context(org_id)` does not exist yet. The `requires.json` names it so `check-sdk.mjs` fails with a precise message. See `backend-spec/future-procedures.md`.

## Registry dependencies

- `blocks-runtime` (Constructive block — supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `dropdown-menu` (shadcn primitive)
- `avatar` (shadcn primitive)
- `badge` (shadcn primitive)
- `separator` (shadcn primitive)
- `button` (shadcn primitive)
- `[[user-avatar]]` (user-* block, renders avatar with fallback initials)

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `sonner` (peer)
- `@tanstack/react-query` — **not declared per-block**; arrives transitively via the `blocks-runtime` registry dependency.

## DB procedures used by default hook

**Reading contexts (`useUserContexts`):**
- `constructive_auth_public.current_user()` — schema `constructive_auth_public` → **namespace `auth`** → generated op `currentUser` → hook `useCurrentUserQuery`. Returns the signed-in person (type=1).
- `constructive_memberships_public.org_memberships` (via `admin` namespace) — **namespace `admin`** → generated list hook (requires a `OrgMembershipsConnection` type to exist in the SDL; see FLAG below). Returns memberships where `actor_id = current_user_id()`, `is_approved=true`, `is_banned=false`, joined to the org `users` row for `displayName`, `profilePicture`, `username`.

> **FLAG — `OrgMembershipsConnection` type required.** A generated list hook (`useOrgMembershipsQuery`) exists only if `memberships_public` exposes a `*Connection` type for `org_memberships` in the SDL. Verify this in `constructive-db/sdk/constructive-schema/schemas/admin.graphql` (or the live `admin` endpoint SDL). If no Connection type exists, the list hook is absent — the block cannot use a generated list hook and must fall back to a direct `currentUser` query that includes memberships as a nested field (if the `currentUser` return type includes them) or wait for a Connection type to be added. **Do not assume the hook name until confirmed.** Until confirmed, the `requires.json` uses `orgMemberships` as the provisional query name.

**Switching context (`useSwitchContext`):**

> **Backend pending** — the `session_credentials.org_id` column is deployed in `constructive_auth_private`, but the public-facing setter it needs isn't final: `constructive_auth_public.switch_context(org_id)` doesn't exist yet, so the exact procedure and column names are still to be confirmed. Until it lands, the switch mutation maps to the `PROCEDURE_NOT_FOUND` error key described below.

- `constructive_auth_public.switch_context(org_id uuid) RETURNS session_credentials_result` (**backend-pending**) — schema `constructive_auth_public` → **namespace `auth`** → generated op `switchContext` → hook `useSwitchContextMutation`. Sets `session_credentials.org_id` for the current credential to the specified org UUID (null = personal account context).

## Props

```ts
/** The unified User model — same type for persons and orgs. GraphQL exposes `type` as `Int!` (1 = person, 2 = organization); hooks normalize to string enum at the block boundary. */
export type User = {
  id: string;
  /** 'person' = type=1 on the wire (Int); 'organization' = type=2 on the wire (Int). Normalized by the block-owned hooks via `normalizeUserType(raw: number)`. */
  type: 'person' | 'organization';
  displayName: string;
  username: string | null;
  profilePicture: string | null;
};

export type UserContextMembership = {
  user: User;
  /** Only present for type=2 entries — membership details. */
  membership?: {
    isOwner: boolean;
    isAdmin: boolean;
    profileId: string | null;
    /** Display role label derived from profile or isOwner/isAdmin flags. */
    roleLabel: string;
  };
};

export type UserContextSwitcherProps = {
  /** The signed-in personal account (type=1). If omitted, fetched from useCurrentUser. */
  currentUser?: User;
  /** Currently active context (personal or org). Controlled mode. */
  activeContextId?: string;
  /** Callback after context switch completes. Receives the new active User. */
  onContextSwitch?: (user: User) => void;
  /** Adapter override: replaces useSwitchContext. Must set org_id on session credential. */
  onSwitchSubmit?: (orgId: string | null) => Promise<void>;
  /** Show "Create new org" footer link. Default: true */
  showCreateOrgLink?: boolean;
  /** Fires when user clicks "Create new org" — open [[org-create-card]]. */
  onCreateOrgClick?: () => void;
  /** Show role chip next to org entries. Default: true */
  showRoleChip?: boolean;
  /** Override toast/notification behavior. Default: true */
  notifications?: boolean | NotificationConfig;
  /** Override all user-facing strings. */
  messages?: Partial<UserContextSwitcherMessages>;
  onError?: (err: unknown) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
};
```

## Messages catalog

```ts
export type UserContextSwitcherMessages = {
  /** Accessible label for the trigger button */
  triggerAriaLabel: string;
  /** Section header above personal account */
  personalAccountLabel: string;
  /** Section header above org list */
  orgsLabel: string;
  /** Active indicator text (screen-reader) */
  activeLabel: string;
  /** Footer link text */
  createOrgLink: string;
  /** Role chip for org owner */
  roleOwner: string;
  /** Role chip for org admin */
  roleAdmin: string;
  /** Role chip for regular member */
  roleMember: string;
  /** Toast on successful switch */
  switchedToast: string;
  /** Toast on error */
  switchErrorToast: string;
  /** Shown when user has no orgs and showCreateOrgLink=true */
  noOrgsHint: string;
  errors: {
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultUserContextSwitcherMessages: UserContextSwitcherMessages = {
  triggerAriaLabel: 'Switch active context',
  personalAccountLabel: 'Personal account',
  orgsLabel: 'Organizations',
  activeLabel: 'Active',
  createOrgLink: 'Create new organization',
  roleOwner: 'Owner',
  roleAdmin: 'Admin',
  roleMember: 'Member',
  switchedToast: 'Switched to {{name}}',
  switchErrorToast: 'Failed to switch context. Please try again.',
  noOrgsHint: 'You have no organizations yet.',
  errors: {
    PROCEDURE_NOT_FOUND: 'This feature requires a backend update.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The block does **not** ship generated data hooks. Two block-owned utility hooks are shipped (`use-user-contexts.ts`, `use-switch-context.ts`); they internally call generated hooks.

**`useUserContexts`** (block-owned utility hook, shipped)
- Module: `lib/user/hooks/use-user-contexts.ts`
- Internally imports:
  ```ts
  import { useCurrentUserQuery } from '@/generated/auth';
  import { useOrgMembershipsQuery } from '@/generated/admin'; // provisional name — see FLAG above
  ```
- Combines results: personal account (type=1) from `currentUser`, org memberships (type=2) from `orgMemberships`. Normalizes `type` via `normalizeUserType(raw: number): 'person' | 'organization'` (raw `1` → `'person'`, raw `2` → `'organization'`).
- Returns: `{ data: UserContextMembership[], isPending, error }` sorted personal first, then orgs alphabetically.

**`useSwitchContext`** (block-owned utility hook, shipped)
- Module: `lib/user/hooks/use-switch-context.ts`
- Internally imports:
  ```ts
  import { useSwitchContextMutation } from '@/generated/auth'; // backend-pending
  ```
- Call:
  ```ts
  const result = await (onSwitchSubmitOverride
    ? onSwitchSubmitOverride(orgId)
    : switchContext.mutateAsync({ orgId }).then((d) => d.switchContext));
  ```
- On success: invalidates `currentUser` and `orgMemberships` queries so the UI reflects the new context.
- Returns: `{ mutateAsync(orgId: string | null): Promise<void>, isPending, error }`.

**Error key for backend-pending switch mutation:**
```ts
errors: {
  PROCEDURE_NOT_FOUND: 'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures',
  UNKNOWN_ERROR: 'Something went wrong. Please try again.',
}
```

### `user-context-switcher.requires.json`

```json
{
  "requires": [
    {
      "namespace": "auth",
      "mutations": ["switchContext"],
      "queries": ["currentUser"],
      "models": []
    },
    {
      "namespace": "admin",
      "mutations": [],
      "queries": ["orgMemberships"],
      "models": []
    }
  ]
}
```

> **Note on `orgMemberships` query:** the generated list hook name is provisional — it depends on a `OrgMembershipsConnection` type existing in the `admin` SDL (see FLAG in DB procedures section). Confirm before finalizing the hook name and `requires.json` entry.

## Callbacks

- `onContextSwitch(user)` — fires after switch completes. Caller typically triggers a page reload or re-fetch of app data scoped to the new context.
- `onCreateOrgClick()` — fires when user clicks "Create new org". Caller opens [[org-create-card]] (e.g., in a sheet or modal).
- `onError(err)` — fires on switch failure after internal mapping.
- `onMessage({ kind, key })` — informational events.

## Captcha

Not applicable. Context switching is a low-risk, authenticated-only action.

## Step-up

Not required for switching. The session credential's `org_id` is set server-side with existing session authority.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Context switched | `messages.switchedToast` (with `{{name}}` interpolated) |
| Switch error | `messages.switchErrorToast` (error) |
| Unknown error | `messages.errors.UNKNOWN_ERROR` (error) |

## Accessibility

- Trigger button has `aria-label` from `messages.triggerAriaLabel`.
- Active context marked with `aria-current="true"` and a visual indicator (checkmark or ring).
- Dropdown items are keyboard-navigable (`role="menuitem"`).
- Role chips use `aria-label` suffix: e.g. "Acme Corp, Owner".
- Loading state: trigger shows spinner, `aria-busy="true"`.

## Notes / gotchas

- The block renders the trigger as an avatar + display_name chip by default. Consumers can slot a custom trigger via `asChild` on the `DropdownMenuTrigger`.
- The `activeContextId` prop enables controlled mode. If unset, the block reads the active context from the current session credential (`org_id`). A null `org_id` = personal account context.
- `switchedToast` uses `{{name}}` as a simple interpolation placeholder. The block does string replacement; no i18n runtime required.
- After switching context, the calling app is responsible for re-scoping data fetches. The block fires `onContextSwitch` to signal this.
- The "Create new org" link is always shown to authenticated users (if `showCreateOrgLink=true`). Gate it in `onCreateOrgClick` if the consumer wants to restrict org creation by permissions.
- Cross-ref: [[org-create-card]] is the target of the footer link. After `org-create-card` fires `onSuccess(newOrg)`, call `useSwitchContext` or set `activeContextId=newOrg.id` to auto-switch.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/user/context-switcher/`
- The org list is loaded once on mount (TanStack Query). Refetch interval not needed; refetch on focus is fine.
- Storybook stories: no orgs (personal only), one org (owner), multiple orgs (mixed roles), switching pending state, switch error.
- The `session_credentials.org_id` column exists in the DB; the public setter procedure it needs is still backend-pending (see the note above).
