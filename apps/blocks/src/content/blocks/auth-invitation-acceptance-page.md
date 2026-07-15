# auth-invitation-acceptance-page

**Type:** `registry:page`
**Status:** `v1 (frontend ready)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-org-glue.md`
**Master entry:** `blocks-master.md#auth-invitation-acceptance-page`

**Pair:** This page composes [[auth-invitation-acceptance-card]] (a separate `registry:component`). Installing the page via `npx shadcn add auth-invitation-acceptance-page` pulls the card automatically via `registryDependencies`.

The two sub-flows call `submit_app_invite_code(token text) → boolean` and `submit_org_invite_code(token text) → boolean` in `constructive_invites_public`, both invoked as the signed-in (`authenticated`) user.

## Purpose

Next.js route page that handles `/invite?token=...&kind=app|org`. Reads the invite token and kind from search params, enforces an authentication gate (redirects unsigned-in users to sign-in with return URL), fetches invite metadata for display, then lets the user accept or decline. Two sub-flows: app invite (`kind=app`) calls `submit_app_invite_code`, org invite (`kind=org`) calls `submit_org_invite_code`. Composes [[auth-invitation-acceptance-card]] (the form-only block) inside the [[layout-kit]] page frame.

## When to use

- Mount at the `/invite` route in your Next.js app.
- Any invite link delivery (email, Slack DM, etc.) should deep-link here with `?token=...&kind=app|org`.
- Not a fit when: you need a custom invite UI — use [[auth-invitation-acceptance-card]] directly.

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `app/(auth)/invite/page.tsx` | `registry:page` |
| `components/auth/invitation-acceptance-card.tsx` | `registry:component` |
| `components/auth/invitation-acceptance-card.requires.json` | `registry:file` |
| `lib/auth/messages/invitation-acceptance-messages.ts` | `registry:lib` |
| `lib/auth/errors.ts` | `registry:lib` (shared, auto-deduped) |

> No data hooks are shipped. The `use-invite-metadata.ts` and `use-accept-invite.ts` hooks are removed — the card imports generated hooks from `@/generated/admin`. The page's auth gate uses `useCurrentUserQuery` from `@/generated/auth`. Only the messages catalog, errors util, and `requires.json` are registry files. See `contracts/sdk-binding-contract.md` §2, §5–§7.

## Registry dependencies

- `blocks-runtime` (supplies `QueryClientProvider` + per-namespace `configure()`; React Query reaches this block transitively)
- `card` (shadcn primitive)
- `button` (shadcn primitive)
- `badge` (shadcn primitive)
- `separator` (shadcn primitive)
- `[[layout-kit]]` (page layout centering block)
- `[[auth-sign-in-card]]` (rendered inline when auth gate fires; or redirected to sign-in page)
- `[[user-avatar]]` (shows inviter and org avatars)

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `next` (peer, ^15)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; arrives transitively via `blocks-runtime`. `@constructive-io/data` is removed.

## DB procedures used by default hook

**App invite:**
- `constructive_invites_public.submit_app_invite_code(token text) RETURNS boolean` — schema `invites_public` → **namespace `admin`** → generated op `submitAppInviteCode` → hook `useSubmitAppInviteCodeMutation`. DEPLOYED.
  - Error codes: `INVITE_NOT_FOUND`, `INVITE_LIMIT`, `INVITE_EMAIL_NOT_FOUND`, `EMAIL_NOT_VERIFIED`.

**Org invite:**
- `constructive_invites_public.submit_org_invite_code(token text) RETURNS boolean` — schema `invites_public` → **namespace `admin`** → generated op `submitOrgInviteCode` → hook `useSubmitOrgInviteCodeMutation`. DEPLOYED.

**Auth gate:**
- `constructive_auth_public.current_user()` — schema `constructive_auth_public` → **namespace `auth`** → `currentUser` → `useCurrentUserQuery`. Used by the page to check authentication before rendering the card.

**Invite metadata (display only — FLAG):**
- Queries `constructive_invites_public.app_invites` or `org_invites` by token — **FLAG: verify generated query hook name** from the host's `admin` SDK `.d.ts`.

CSRF token is handled below the block — see `contracts/endpoint-contract.md` §3. Block does NOT pass `csrf_token`.

The invite-metadata read depends on `app_invites` / `org_invites` exposing SELECT to the `authenticated` role, and resolves its generated query hook name from the host's `admin` SDK.

## Props (page block)

```ts
export type AuthInvitationAcceptancePageProps = {
  /** Passed from Next.js searchParams */
  searchParams: {
    token?: string;
    kind?: 'app' | 'org';
    /** Return URL after accept; defaults to '/' */
    redirect?: string;
  };
  /** Override all user-facing strings */
  messages?: Partial<InvitationAcceptanceMessages>;
  notifications?: boolean | NotificationConfig;
  /** Called after successful acceptance. Receives the resulting User or membership info. */
  onSuccess?: (result: InviteAcceptResult) => void;
  onError?: (err: unknown) => void;
};

export type InviteAcceptResult = {
  kind: 'app' | 'org';
  /** For org invites: the org User (type=2) that the user was added to. */
  org?: {
    id: string;
    displayName: string;
  };
  redirectTo?: string;
};
```

## Card-level props (auth-invitation-acceptance-card)

```ts
export type InvitationAcceptanceCardProps = {
  token: string;
  kind: 'app' | 'org';
  notifications?: boolean | NotificationConfig;
  messages?: Partial<InvitationAcceptanceMessages>;
  onSubmit?: (input: { token: string; kind: 'app' | 'org' }) => Promise<InviteAcceptResult>;
  onSuccess?: (result: InviteAcceptResult) => void;
  onDecline?: () => void;
  onError?: (err: unknown) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
};
```

## Messages catalog

```ts
export type InvitationAcceptanceMessages = {
  // Loading state
  loadingTitle: string;
  // App invite states
  appInviteTitle: string;
  appInviteDescription: string;
  // Org invite states
  orgInviteTitle: string;
  orgInviteDescription: string;
  orgInviteRole: string;
  orgInviteFrom: string;
  // Actions
  acceptButton: string;
  acceptButtonPending: string;
  declineButton: string;
  // Success states
  appSuccessTitle: string;
  appSuccessDescription: string;
  orgSuccessTitle: string;
  orgSuccessDescription: string;
  orgSuccessSwitchHint: string;
  // Auth gate
  authGateTitle: string;
  authGateDescription: string;
  // Missing params
  missingTokenTitle: string;
  missingTokenDescription: string;
  // Error codes (Q22 — UPPER_SNAKE_CASE keys match err.extensions.code)
  errors: {
    INVITE_NOT_FOUND: string;
    INVITE_LIMIT: string;
    INVITE_EMAIL_NOT_FOUND: string;
    EMAIL_NOT_VERIFIED: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultInvitationAcceptanceMessages: InvitationAcceptanceMessages = {
  loadingTitle: 'Loading invitation…',
  appInviteTitle: "You've been invited",
  appInviteDescription: "You've received an invitation to join the app.",
  orgInviteTitle: "You've been invited to {{orgName}}",
  orgInviteDescription: '{{inviterName}} has invited you to join {{orgName}}.',
  orgInviteRole: 'Role',
  orgInviteFrom: 'Invited by',
  acceptButton: 'Accept invitation',
  acceptButtonPending: 'Accepting…',
  declineButton: 'Decline',
  appSuccessTitle: 'Welcome aboard!',
  appSuccessDescription: "You've successfully joined the app.",
  orgSuccessTitle: "You've joined {{orgName}}",
  orgSuccessDescription: 'You are now a member of {{orgName}}.',
  orgSuccessSwitchHint: 'You can switch to this organization using the context switcher.',
  authGateTitle: 'Sign in to accept',
  authGateDescription: 'You need to sign in before accepting this invitation.',
  missingTokenTitle: 'Invalid link',
  missingTokenDescription: 'This invitation link is missing required parameters.',
  errors: {
    INVITE_NOT_FOUND: 'This invitation link is invalid or has been cancelled.',
    INVITE_LIMIT: 'This invitation link has reached its maximum number of uses.',
    INVITE_EMAIL_NOT_FOUND: 'This invitation was sent to a different email address. Sign in with the correct account.',
    EMAIL_NOT_VERIFIED: 'Please verify your email address before accepting this invitation.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The page/card does **not** ship `use-invite-metadata.ts` or `use-accept-invite.ts`. Generated hooks are imported from the host's **`admin`** SDK (invite ops are in `invites_public` → namespace `admin`) and **`auth`** SDK (for the page auth gate). Canonical mechanics: `contracts/sdk-binding-contract.md` §2, §5.

**Accept invite mutations (from `@/generated/admin`):**
- `import { useSubmitAppInviteCodeMutation, useSubmitOrgInviteCodeMutation } from '@/generated/admin';`
- Call: `await submitApp.mutateAsync({ token }).then((d) => d.submitAppInviteCode)` — vars carry `token`, **never** `csrf_token`.
- Returns: `{ mutateAsync, isPending, error }`.
- Adapter override: when `props.onSubmit` is provided, card awaits it instead.

**Auth gate query (from `@/generated/auth`):**
- `import { useCurrentUserQuery } from '@/generated/auth';` — page checks `currentUser` before rendering the card.

**Invite metadata query (FLAG — from `@/generated/admin`):**
- Import the confirmed query hook from `@/generated/admin` once the name is verified.

**For `kind: 'org'`, two-step flow:**
1. Mutate `submitOrgInviteCode({ token })` → `boolean`
2. Re-fetch the org's `users` row by `entity_id` to populate `InviteAcceptResult.org.displayName`.

**For `kind: 'app'`**: `result.org` is always `undefined`.

## Auth gate (page-level logic)

The page block checks `currentUser()` before rendering the card:
- If user is not signed in: renders `authGateTitle` + `authGateDescription` + inline [[auth-sign-in-card]] (or redirect to `/login?redirect=/invite?token=...&kind=...`).
- If user is signed in but `is_verified=false`: shows warning to verify email first (some invites require it).
- If user is signed in and verified: renders the invite acceptance card.

> Decision: The page redirects to the sign-in page (not inline sign-in) by default. Set `inlineSignIn?: boolean` prop to render [[auth-sign-in-card]] inline instead.

## State machine

```
loading → metadata-loaded
                ├── auth-gate (not signed in)
                │     └── [sign in] → metadata-loaded (check again)
                ├── expired
                ├── already-used
                ├── limit-reached
                ├── not-found
                └── ready-to-accept
                      ├── [accept] → accepting
                      │     ├── success → success-screen → [redirect]
                      │     ├── email-mismatch → error-screen
                      │     ├── email-not-verified → error-screen
                      │     └── unknown-error → error-screen
                      └── [decline] → onDecline() (caller navigates)
```

## Callbacks

- `onSuccess(result)` — fires after acceptance. `result.org` is present for org invites. Caller typically routes to `result.redirectTo` or switches context via [[user-context-switcher]].
- `onDecline()` — fires when user clicks Decline. Caller navigates away (e.g., to `/`).
- `onError(err)` — fires on mutation error.

## Captcha

Not applicable. The invite token itself is the rate-limiting mechanism.

## Step-up

Not required. The user is assumed to be freshly authenticated (or just signed in via the auth gate).

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| App invite accepted | `messages.appSuccessTitle` (success) |
| Org invite accepted | `messages.orgSuccessTitle` (success, `{{orgName}}` interpolated) |
| `INVITE_NOT_FOUND` | `messages.errors.INVITE_NOT_FOUND` (error) |
| `INVITE_LIMIT` | `messages.errors.INVITE_LIMIT` (error) |
| `INVITE_EMAIL_NOT_FOUND` | `messages.errors.INVITE_EMAIL_NOT_FOUND` (error) |
| `EMAIL_NOT_VERIFIED` | `messages.errors.EMAIL_NOT_VERIFIED` (error) |
| Unknown error | `messages.errors.UNKNOWN_ERROR` (error) |

## Accessibility

- Each state (loading, ready, success, error) is a distinct region with an appropriate heading.
- Error states use `role="alert"` so screen readers announce immediately.
- Accept/Decline buttons: Decline is secondary styling, Accept is primary. Pending state: `aria-busy`, disabled.
- Org avatar and inviter avatar have descriptive `alt` text.

## Notes / gotchas

- `kind` defaults to `'app'` if the query param is missing (defensive).
- `entity_id` in `org_invites` is the org's `users.id` (type=2 user). Use it to display the org avatar and name by querying `users` by `id`.
- For org invites, the role shown in the UI is derived from the membership `profile_id` (if present) or `is_owner`/`is_admin` flags. If `profile_id` is null and neither flag is set, show "Member" as the default.
- The procedure returns `boolean`, not the org row. The `useAcceptInvite` hook documents a 2-step contract: (1) mutate via `submit_org_invite_code`, then (2) re-fetch the org's `users` row by `entity_id` from pre-fetched invite metadata. `result.org` is populated by step 2. See the hook contract above for the authoritative description.
- After a successful org invite acceptance, the `org_memberships` row has `is_approved` set based on the sender's `send_approved_invites` permission. An `is_approved=false` acceptance means the user is pending approval — show appropriate messaging.
- Cross-ref: [[user-context-switcher]] — after org invite acceptance, offer to switch context to the new org. Plug `result.org.id` into [[user-context-switcher]].

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/invitation-acceptance-page/`
- The page is a `async` Server Component (Next.js 15). `searchParams` are awaited.
- Storybook stories (card-level): loading, app invite ready, org invite ready (owner role), org invite with email mismatch, expired, already used, limit reached, not found, success (app), success (org).
- The page wrapper is thin: auth check, searchParams parse, render card.
