# auth-invitation-acceptance-card

**Type:** `registry:block`
**Status:** `v1 (frontend ready)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-org-glue.md`
**Master entry:** `blocks-master.md#auth-invitation-acceptance-card`
**Pairing:** Paired with [[auth-invitation-acceptance-page]] — the page is the canonical install. This card is a standalone registry item for custom invite UX (modals, multi-step onboarding, post-sign-in inline confirmations) where the consumer controls layout and routing.

## Purpose

Card half of the invitation acceptance flow. Displays invite metadata (inviter name, org name, role, expiry) and renders Accept / Decline actions. Calls `constructive_invites_public.submit_app_invite_code` or `submit_org_invite_code` depending on `kind`. Composed inside [[auth-invitation-acceptance-page]] (the canonical page wrapper handles auth gating, searchParam parsing, and routing).

## When to use

- Use [[auth-invitation-acceptance-page]] for the one-shot Next.js page install — it composes this card automatically.
- Use this card directly when: building a custom invite UX (modal, multi-step onboarding, invite-in-app flow) where you control the layout, auth gating, and routing yourself.
- Not a fit when: you need the full page with auth gating — use [[auth-invitation-acceptance-page]].

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/auth/invitation-acceptance-card.tsx` | `registry:component` |
| `components/auth/invitation-acceptance-card.requires.json` | `registry:file` |
| `lib/auth/messages/invitation-acceptance-messages.ts` | `registry:lib` (shared with page, auto-deduped) |
| `lib/auth/errors.ts` | `registry:lib` (shared, auto-deduped) |

> No data hooks are shipped. The `use-invite-metadata.ts` and `use-accept-invite.ts` hooks are removed — the block imports `useSubmitAppInviteCodeMutation` / `useSubmitOrgInviteCodeMutation` from `@/generated/admin` (invite ops live in `invites_public` → namespace `admin`). Only the messages catalog, errors util, and `requires.json` are registry files. See `contracts/sdk-binding-contract.md` §2, §5–§7.

## Registry dependencies

- `blocks-runtime` (supplies `QueryClientProvider` + per-namespace `configure()`; React Query reaches this block transitively)
- `card`, `button`, `badge`, `separator` (shadcn primitives)
- `[[user-avatar]]` (shows inviter and org avatars)

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; arrives transitively via `blocks-runtime`. `@constructive-io/data` is removed.

## DB procedures used by default hook

**App invite:**
- `constructive_invites_public.submit_app_invite_code(token text)` → `boolean` — schema `invites_public` → **namespace `admin`** → generated op `submitAppInviteCode` → hook `useSubmitAppInviteCodeMutation`. DEPLOYED.

**Org invite:**
- `constructive_invites_public.submit_org_invite_code(token text)` → `boolean` — schema `invites_public` → **namespace `admin`** → generated op `submitOrgInviteCode` → hook `useSubmitOrgInviteCodeMutation`. DEPLOYED.

**Invite metadata (display only — read-only query, does not consume token):**
- Queries `constructive_invites_public.app_invites` or `org_invites` by token — **FLAG: verify generated query hook name** for metadata fetch (likely `useAppInvitesQuery` or similar from `@/generated/admin`).
- Returns: `invite_token`, `sender_id`, `entity_id` (org only), `email`, `expires_at`, `invite_valid`, `data jsonb`.

CSRF token is handled below the block — see `contracts/endpoint-contract.md` §3. Block does NOT pass `csrf_token`.

The read-only metadata query depends on the `app_invites` and `org_invites` tables exposing SELECT to the `authenticated` role, and resolves its generated query hook name (likely `useAppInvitesQuery` or similar) from the host's `admin` SDK `.d.ts`.

## Props

```ts
export type InvitationAcceptanceCardProps = {
  /** The invite token from the URL. */
  token: string;
  /** Whether this is an app-level or org-level invite. */
  kind: 'app' | 'org';
  notifications?: boolean | NotificationConfig;
  messages?: Partial<InvitationAcceptanceMessages>;
  /** Adapter override: replaces default useAcceptInvite mutation. */
  onSubmit?: (input: { token: string; kind: 'app' | 'org' }) => Promise<InviteAcceptResult>;
  onSuccess?: (result: InviteAcceptResult) => void;
  onDecline?: () => void;
  onError?: (err: unknown) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
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

## Messages catalog

```ts
export type InvitationAcceptanceMessages = {
  loadingTitle: string;
  appInviteTitle: string;
  appInviteDescription: string;
  /** Runtime interpolation: {{orgName}} */
  orgInviteTitle: string;
  /** Runtime interpolation: {{inviterName}}, {{orgName}} */
  orgInviteDescription: string;
  orgInviteRole: string;
  orgInviteFrom: string;
  acceptButton: string;
  acceptButtonPending: string;
  declineButton: string;
  appSuccessTitle: string;
  appSuccessDescription: string;
  /** Runtime interpolation: {{orgName}} */
  orgSuccessTitle: string;
  /** Runtime interpolation: {{orgName}} */
  orgSuccessDescription: string;
  orgSuccessSwitchHint: string;
  expiredTitle: string;
  expiredDescription: string;
  alreadyUsedTitle: string;
  alreadyUsedDescription: string;
  emailMismatchTitle: string;
  emailMismatchDescription: string;
  emailNotVerifiedError: string;
  limitReachedTitle: string;
  limitReachedDescription: string;
  notFoundTitle: string;
  notFoundDescription: string;
  missingTokenTitle: string;
  missingTokenDescription: string;
  /** Error messages — UPPER_SNAKE_CASE keys match err.extensions.code from PostGraphile */
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
  expiredTitle: 'Invitation expired',
  expiredDescription: 'This invitation link has expired. Ask the sender for a new one.',
  alreadyUsedTitle: 'Already used',
  alreadyUsedDescription: 'This invitation has already been claimed.',
  emailMismatchTitle: 'Wrong account',
  emailMismatchDescription: 'This invitation was sent to a different email address. Sign in with the correct account.',
  emailNotVerifiedError: 'Please verify your email address before accepting this invitation.',
  limitReachedTitle: 'Invitation limit reached',
  limitReachedDescription: 'This invitation link has reached its maximum number of uses.',
  notFoundTitle: 'Invitation not found',
  notFoundDescription: 'This invitation link is invalid or has been cancelled.',
  missingTokenTitle: 'Invalid link',
  missingTokenDescription: 'This invitation link is missing required parameters.',
  errors: {
    INVITE_NOT_FOUND: 'This invitation was not found.',
    INVITE_LIMIT: 'This invitation has reached its usage limit.',
    INVITE_EMAIL_NOT_FOUND: 'This invitation was sent to a different email address.',
    EMAIL_NOT_VERIFIED: 'Please verify your email before accepting this invitation.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
```

Note: `{{inviterName}}`, `{{orgName}}` in several strings are runtime interpolation tokens substituted by `interpolate(template, values)` from `lib/auth-messages`.

## Default data hook (generated, not shipped)

The block does **not** ship `use-invite-metadata.ts` or `use-accept-invite.ts`. It imports generated hooks from the host's **`admin`** SDK (invite ops are in `invites_public` → namespace `admin`). Canonical mechanics: `contracts/sdk-binding-contract.md` §2, §5.

**Accept invite mutations:**
- **Import:** `import { useSubmitAppInviteCodeMutation, useSubmitOrgInviteCodeMutation } from '@/generated/admin';`
  (`submit_app_invite_code` → `submitAppInviteCode` → `useSubmitAppInviteCodeMutation`; `submit_org_invite_code` → `submitOrgInviteCode` → `useSubmitOrgInviteCodeMutation`, per `endpoint-contract.md` §7.)
- **Instantiate (app):**
  ```ts
  const submitApp = useSubmitAppInviteCodeMutation({
    selection: { fields: { submitAppInviteCode: true } },
  });
  ```
- **Call + read payload:**
  ```ts
  const result = await (onSubmitOverride
    ? onSubmitOverride({ token, kind })
    : submitApp.mutateAsync({ token }).then((d) => d.submitAppInviteCode));
  ```
  `vars` carry `token` — **never** `csrf_token`.
- **Returns:** `{ mutateAsync, isPending, error }`.
- **Adapter override:** when `props.onSubmit` is provided, block awaits it instead.

**Invite metadata query (FLAG — verify generated name):**
- Import the appropriate query hook from `@/generated/admin` once the generated query name is confirmed from the host SDK `.d.ts`.

**For `kind: 'org'`, two-step flow:**
1. Mutate: `submitOrgInviteCode({ token })` → `boolean`
2. After success, re-fetch the org's `users` row (by `entity_id` from pre-fetched invite metadata) to get `displayName` for `InviteAcceptResult.org.displayName`.

**For `kind: 'app'`**: `result.org` is always `undefined`.

### `invitation-acceptance-card.requires.json`

```json
{
  "namespace": "admin",
  "mutations": ["submitAppInviteCode", "submitOrgInviteCode"],
  "queries": [],
  "models": []
}
```

> `queries` is empty pending verification of the generated invite metadata query hook name from the `admin` SDK. Add once confirmed.

## State machine

```
loading → metadata-loaded
                ├── expired
                ├── already-used
                ├── limit-reached
                ├── not-found
                └── ready-to-accept
                      ├── [accept] → accepting
                      │     ├── success → success-screen
                      │     ├── email-mismatch → error-screen
                      │     ├── email-not-verified → error-screen
                      │     └── unknown-error → error-screen
                      └── [decline] → onDecline() (caller navigates)
```

## Callbacks

- `onSuccess(result)` — fires after acceptance. `result.org` present for org invites. Caller routes to `result.redirectTo` or switches context via [[user-context-switcher]].
- `onDecline()` — fires when user clicks Decline. Caller navigates away.
- `onError(err)` — fires on mutation error.
- `onMessage({ kind, key })` — fires for success states.

## Captcha

Not applicable. The invite token itself is the rate-limiting mechanism.

## Step-up

Not required. The user is assumed freshly authenticated.

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

- Each state (loading, ready, success, error) has an appropriate heading.
- Error states use `role="alert"` so screen readers announce immediately.
- Accept/Decline buttons: Decline is secondary styling, Accept is primary. Pending state: `aria-busy`, disabled.
- Org avatar and inviter avatar have descriptive `alt` text.

## Notes / gotchas

- `kind` defaults to `'app'` if not provided (defensive).
- `entity_id` in `org_invites` is the org's `users.id` (type=2 user). Use it to display org avatar and name by querying `users` by `id`.
- For org invites, the role shown in the UI is derived from the membership `profile_id` (if present) or `is_owner`/`is_admin` flags. If null and neither flag set, show "Member".
- The procedure returns `boolean`, NOT the org row. The `useAcceptInvite` hook handles this as a documented 2-step: (1) mutate via `submit_org_invite_code`, then (2) re-fetch the org's `users` row by `entity_id` from pre-fetched invite metadata. `result.org` is populated by the hook after step 2 — this is part of the hook's contract, not an implementation detail. Do not call `submit_org_invite_code` directly and bypass the hook, or `result.org` will be absent.
- After a successful org invite acceptance, `org_memberships.is_approved` may be `false` (pending approval if sender lacks `send_approved_invites` permission). Show appropriate messaging.
- Cross-ref: after org invite acceptance, offer to switch context to the new org via [[user-context-switcher]].

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/invitation-acceptance-card/`
- The page block [[auth-invitation-acceptance-page]] lists this card in `registryDependencies` — installing the page pulls the card automatically.
- Storybook stories: loading, app invite ready, org invite ready (owner role), org invite with email mismatch, expired, already used, limit reached, not found, success (app), success (org).
