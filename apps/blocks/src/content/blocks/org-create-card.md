# org-create-card

**Type:** `registry:block`
**Status:** `v1 (frontend ready)`
**Namespace:** `org-*`
**Skill reference:** `constructive-frontend/references/block-auth-org-glue.md`
**Master entry:** `blocks-master.md#org-create-card`

**Pairing:** No page block — card-only. Used as: opened in a sheet or dialog from [[user-context-switcher]]'s "Create new org" footer link, or placed on a dedicated `/orgs/new` route by the consumer.

**DB verified (2026-05-14):** No `create_org` procedure — direct INSERT into `constructive_users_public.users` (type=2) is the intentional path, gated by the `create_org` permission bit in RLS. `org_mbr_trg` trigger auto-creates the owner `org_memberships` row. `profile_picture` is the custom `image` domain (stored as text URL).

## Purpose

Multi-step wizard to create a new organization. Under the Constructive unified User model, an "org" is a `users` row with `type=2`. This block inserts that row, then grants the creator an owner membership via `org_memberships`. On success it returns the new org's `User` record so the caller can immediately switch context via [[user-context-switcher]]. Three-step flow: (1) name + slug, (2) logo upload (optional), (3) confirm + submit.

## When to use

- Triggered from the "Create new org" footer link in [[user-context-switcher]].
- Placed in a sheet, dialog, or dedicated `/orgs/new` route.
- Any onboarding flow that provisions an org during sign-up.
- Not a fit when: the app doesn't use type=2 users; or when org creation is admin-only (gate at the call site, not inside the block).

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/org/org-create-card.tsx` | `registry:component` |
| `components/org/org-create-card.requires.json` | `registry:file` |
| `lib/org/messages/org-create-card-messages.ts` | `registry:lib` |
| `lib/auth/errors.ts` | `registry:lib` (shared, auto-deduped) |

> No data hook is shipped. The block imports its mutation hook (`useCreateUserMutation`) and slug-check query hook (`useUsersQuery`) from the host's generated `auth` SDK (`@/generated/auth`). Logo upload goes through the `objects` namespace separately (see DB section). Only the messages catalog, the shared errors util, and the `requires.json` manifest are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (Constructive block; supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `card` (shadcn primitive)
- `button` (shadcn primitive)
- `input` (shadcn primitive)
- `label` (shadcn primitive)
- `form` (shadcn primitive)
- `stepper` (registry block — if available; otherwise render step indicators inline)
- `avatar` (shadcn primitive — preview logo)
- `[[user-avatar]]` (user-* block — shows org avatar preview using same component as context switcher)

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `react-hook-form` (^7)
- `zod` (^3)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; it arrives transitively via the `blocks-runtime` registry dependency. The generated `auth` SDK is the host's, not a published dep of this block.

## DB procedures used by default hook

**Creating the org:**

The Constructive unified model means creating an org = inserting a `users` row with `type=2`. The RLS policy `auth_ins_insert_chk` on `constructive_users_public.users` permits INSERT with `type=2` when the authenticated actor has the `create_org` permission bit set in `app_memberships_sprt`.

- Table: `constructive_users_public.users` — schema `users_public` → **namespace `auth`** → generated op `createUser` → hook `useCreateUserMutation`. Passes `type=2`, `displayName`, `username`, `profilePicture`.
- Triggers on `users` table automatically create the initial `org_memberships` row for the creator as owner (`_00050_users_org_membership_settings_seed_trg`, `org_mbr_trg`). The block does NOT call a separate membership procedure.

There is no dedicated `constructive_auth_public.create_org` procedure; the intended path is a direct insert into `constructive_users_public.users` via PostGraphile, permitted for the `authenticated` role by RLS plus the table's INSERT grant.

**Slug uniqueness check:**
- Query `constructive_users_public.users` for `username = $slug` before submit — schema `users_public` → **namespace `auth`** → generated list hook `useUsersQuery` with `filter: { username: { equalTo: $slug } }`. Returns count (0 = available).

**Logo upload:**
- Calls `object_store_public` upload endpoint (presigned URL via the `objects` namespace — separate from the `auth` SDK). Returns a URL stored as text in `profile_picture`.
- If no logo is uploaded, `profile_picture` is null.

**DB verified (2026-05-14):** `profile_picture` is stored as text (URL string) in the custom `image` domain on `constructive_users_public.users`. Pass the uploaded URL directly.

## Props

```ts
export type User = {
  id: string;
  /** DB stores '1'/'2' as text; hooks normalize to string enum at boundary. */
  type: 'person' | 'organization';
  displayName: string;
  username: string | null;
  profilePicture: string | null;
};

export type OrgCreateInput = {
  displayName: string;
  username: string;  // slug / citext username
  profilePicture?: File | null;
};

export type OrgCreateResult = {
  /** The newly created org as a User (type=2). */
  org: User;
};

export type OrgCreateCardProps = {
  /** Initial value for display name field. */
  defaultName?: string;
  /** Show the logo upload step. Default: true */
  showLogoStep?: boolean;
  /** Override toast/notification behavior. Default: true */
  notifications?: boolean | NotificationConfig;
  /** Override all user-facing strings. */
  messages?: Partial<OrgCreateCardMessages>;
  /** Adapter override: replaces useCreateOrg hook. */
  onSubmit?: (input: OrgCreateInput) => Promise<OrgCreateResult>;
  /** Fires after successful org creation. Receives the new org User. */
  onSuccess?: (result: OrgCreateResult) => void;
  onError?: (err: unknown) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
};
```

## Messages catalog

```ts
export type OrgCreateCardMessages = {
  title: string;
  description: string;
  // Step 1
  step1Title: string;
  nameLabel: string;
  namePlaceholder: string;
  slugLabel: string;
  slugPlaceholder: string;
  slugHint: string;
  slugAvailable: string;
  slugTaken: string;
  // Step 2
  step2Title: string;
  logoLabel: string;
  logoHint: string;
  logoSkip: string;
  // Step 3
  step3Title: string;
  confirmName: string;
  confirmSlug: string;
  // Buttons
  nextButton: string;
  backButton: string;
  submitButton: string;
  submitButtonPending: string;
  // Success
  successToast: string;
  // Validation (field-level, not error-code-based)
  nameTooShort: string;
  nameRequired: string;
  slugInvalid: string;
  slugTakenInline: string;
  // Error codes (Q22 — UPPER_SNAKE_CASE keys match err.extensions.code)
  errors: {
    PERMISSION_DENIED: string;
    USERNAME_TAKEN: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultOrgCreateCardMessages: OrgCreateCardMessages = {
  title: 'Create organization',
  description: 'Set up a new organization to collaborate with your team.',
  step1Title: 'Name your organization',
  nameLabel: 'Organization name',
  namePlaceholder: 'Acme Corp',
  slugLabel: 'URL slug',
  slugPlaceholder: 'acme-corp',
  slugHint: 'Used in URLs and mentions. Letters, numbers, and hyphens only.',
  slugAvailable: 'Available',
  slugTaken: 'Already taken',
  step2Title: 'Add a logo (optional)',
  logoLabel: 'Logo',
  logoHint: 'PNG or JPG, up to 2 MB. Square images work best.',
  logoSkip: 'Skip for now',
  step3Title: 'Confirm',
  confirmName: 'Name',
  confirmSlug: 'Slug',
  nextButton: 'Continue',
  backButton: 'Back',
  submitButton: 'Create organization',
  submitButtonPending: 'Creating…',
  successToast: '{{name}} created successfully.',
  nameTooShort: 'Organization name must be at least 2 characters.',
  nameRequired: 'Organization name is required.',
  slugInvalid: 'Slug may only contain letters, numbers, and hyphens.',
  slugTakenInline: 'That slug is already taken. Choose a different one.',
  errors: {
    PERMISSION_DENIED: "You don't have permission to create organizations.",
    USERNAME_TAKEN: 'That slug is already taken. Choose a different one.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The block does **not** ship a `use-create-org.ts`. It imports the generated mutation and query hooks from the host's `auth` SDK and drives them with field `selection` objects. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

- **Import:** `import { useCreateUserMutation, useUsersQuery } from '@/generated/auth';`
- **Instantiate mutation with a selection:**
  ```ts
  const createUser = useCreateUserMutation({
    selection: { fields: { user: { id: true, type: true, displayName: true, username: true, profilePicture: true } } },
  });
  ```
- **Call + read the payload via the operation key:**
  ```ts
  const result = await (onSubmitOverride
    ? onSubmitOverride(vars)
    : createUser.mutateAsync({ type: 2, displayName: vars.displayName, username: vars.username, profilePicture: vars.profilePictureUrl ?? null })
        .then((d) => d.createUser));
  ```
  `vars` excludes any csrf_token (handled below the block; see `endpoint-contract.md` §3). Logo is uploaded to `objects` namespace first; the resulting URL is passed as `profilePicture`.
- **Slug check (debounced, internal):**
  ```ts
  const slugCheck = useUsersQuery({
    selection: { fields: { nodes: { id: true } } },
    variables: { filter: { username: { equalTo: slug } } },
  });
  ```
  Returns `{ available: slugCheck.data?.users?.nodes?.length === 0 }`.
- **Returns:** generated hooks expose `{ mutateAsync, isPending, error }` (TanStack Query v5 style).
- **Adapter override:** when `props.onSubmit` is provided, the block awaits it instead. Hybrid isPending: `onSubmitOverride ? overridePending : createUser.isPending`.

### `org-create-card.requires.json`

```json
{
  "namespace": "auth",
  "mutations": ["createUser"],
  "queries": [],
  "models": ["users"]
}
```

## Callbacks

- `onSuccess(result)` — fires after successful creation. `result.org` is the full new `User` (type=2). Caller typically calls [[user-context-switcher]]'s `onContextSwitch(result.org)` to immediately switch.
- `onError(err)` — fires on mutation failure.
- `onMessage({ kind, key })` — e.g., slug uniqueness check in progress.

## Captcha

Not applicable. Org creation requires an authenticated session; not typically rate-limited at the block level.

## Step-up

**Required: no.** Per `step-up-contract.md §6` explicit exclusions, org creation is not gated by step-up. Rationale: org creation is a forward, value-adding action and often part of sign-up/onboarding; step-up belongs to destructive or session-elevation actions, not creation flows. See the contract for the full exclusion list and rationale.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Org created | `messages.successToast` (success, `{{name}}` interpolated) |
| `PERMISSION_DENIED` | `messages.errors.PERMISSION_DENIED` (error) |
| `USERNAME_TAKEN` | `messages.errors.USERNAME_TAKEN` (error, also shown inline) |
| Unknown error | `messages.errors.UNKNOWN_ERROR` (error) |

## Accessibility

- Stepper navigation: each step has a heading (`h2`) and `aria-current="step"` on the active step indicator.
- File input for logo has `accept="image/png,image/jpeg"` and `aria-label` from `messages.logoLabel`.
- Back/Continue buttons clearly labelled. Submit button shows `aria-busy` while pending.
- Error messages in `aria-live="polite"` regions.

## Notes / gotchas

- **Slug auto-derivation**: on `displayName` change, auto-derive the slug by lowercasing + replacing non-alphanum with hyphens. Allow manual override; if the user edits slug manually, stop auto-deriving.
- **Slug check debounce**: avoid checking on every keystroke. 300ms debounce is sufficient. Show a spinner during the in-flight check.
- **Logo upload failure is non-fatal**: if the upload fails, show an error message on the logo step but allow the user to proceed without a logo (skip the logo field, submit with `null`).
- **Triggers handle membership**: after the users INSERT, DB triggers (`org_mbr_trg`) automatically insert the creator as an owner in `org_memberships`. The block does NOT need to call a separate membership procedure.
- **RLS gate**: the INSERT policy `auth_ins_insert_chk` checks for the `create_org` permission bit. If the user lacks this permission, the mutation will throw a PostGraphile error. Mapped to `PERMISSION_DENIED`.
- After creation, typical caller flow: `onSuccess(result) → userContextSwitcher.switchTo(result.org.id)`.
- Cross-ref: [[user-context-switcher]] is the natural next step. [[org-settings-form]] is the V2 block for editing the org after creation.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/org/create-card/`
- Step 1 validation: `display_name` (2-100 chars, required); `username` (2-39 chars, `/^[a-z0-9-]+$/`, required, unique check).
- Step 2: file input + preview. Accept PNG/JPG max 2 MB. Resize client-side before upload if > 512x512.
- Step 3: read-only summary with avatar preview.
- Storybook stories: step 1 empty, step 1 slug taken, step 1 slug available, step 2 with logo, step 2 skipped, step 3 confirm, submitting, success, permission denied error.
