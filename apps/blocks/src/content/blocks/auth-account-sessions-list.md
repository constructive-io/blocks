# auth-account-sessions-list

**Type:** `registry:block`
**Status:** `out-of-frontend-scope (API-config-pending)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-account.md`
**Master entry:** `blocks-master.md#auth-account-sessions-list`

> **FLAG — out-of-frontend-scope (API-config-pending):** `user_sessions` is a `constructive_auth_private` view with no public API. Codegen emits **no** `*Connection` type → **no** generated list hook. The list-fetch portion of this block cannot be built until an API exposes a `UserSessionsConnection`. **Only `revokeSession` mutation is buildable today.** See `contracts/sdk-binding-contract.md` §10 and `blocks-master.md` §6 (Q37). The `requires.json` names only `revokeSession`; the list query is omitted.

**Pairing:** No page block — this card is composed by [[auth-account-settings-page]]. Install the page to get the full settings surface; install this card alone for a standalone session-management widget.

## Purpose

Lists the signed-in user's active sessions from `constructive_auth_private.user_sessions` (a view in the private schema, exposed via the `authenticated` role grant — see DB section below). Per row: parsed device/browser info, IP address, last-used timestamp, creation timestamp, and a revoke button. The current session is highlighted with a "This device" badge and cannot be revoked from this UI. A "Revoke all other sessions" CTA is provided, gated behind high-severity step-up.

**Backend status (revoke-all-others):** The single-session `revoke_session` procedure IS deployed. A bulk `revoke_all_other_sessions()` procedure is NOT deployed — this sub-action is backend-pending. In v1, the block iterates and calls `revoke_session` per non-current session client-side. See `backend-spec/future-procedures.md`.

## When to use

- As the sessions section within `auth-account-settings-page`.
- On any custom security page requiring session management.
- Not a fit when: the consumer only needs a sign-out button for the current session (use [[auth-sign-out-button]] directly).

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/auth/account-sessions-list.tsx` | `registry:component` |
| `components/auth/account-sessions-list.requires.json` | `registry:file` |
| `lib/auth/utils/parse-user-agent.ts` | `registry:lib` |
| `lib/auth/messages/account-sessions-list-messages.ts` | `registry:lib` |

> No data hook is shipped. The `use-user-sessions.ts` hook is removed — the list query has no generated hook (private-schema view, no `*Connection`). The revoke mutation is consumed as `useRevokeSessionMutation` from `@/generated/auth` when the list surface is buildable. Only the parse utility, messages catalog, and `requires.json` manifest are registry files. See `contracts/sdk-binding-contract.md` §5–§7 and §10.

## Registry dependencies

- `blocks-runtime` (supplies `QueryClientProvider` + per-namespace `configure()`; React Query reaches this block transitively)
- `card`, `button`, `badge`, `separator`, `dialog`
- `use-step-up` (hook, see `contracts/step-up-contract.md`)
- `lib/auth-errors`

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; arrives transitively via `blocks-runtime`. `@constructive-io/data` is removed.

## DB procedures used by default hook

| Operation | Source | Status |
|---|---|---|
| List sessions | `constructive_auth_private.user_sessions` view — **no public API, no `*Connection` type** → **no generated list hook** (out-of-frontend-scope) | Blocked — API-config-pending |
| Revoke single session | `constructive_auth_public.revoke_session(session_id uuid) → boolean` — schema `constructive_auth_public` → **namespace `auth`** → generated op `revokeSession` → hook `useRevokeSessionMutation` | DEPLOYED |
| Revoke all other sessions | Client-side iteration: call `revokeSession` for each non-current session. No bulk procedure deployed yet. | Backend-pending |
| Identify current session | `jwt_private.current_session_id()` surfaced as a GraphQL field — the exact field name (likely `currentSessionId`) is not yet confirmed against the generated `auth` SDK | FLAG — unconfirmed |

**List blocked:** `constructive_auth_private.user_sessions` has no public API. Codegen emits no `UserSessionsConnection` type and no `useUserSessionsQuery` hook. The list portion is out-of-frontend-scope. See `contracts/sdk-binding-contract.md` §10.

CSRF token is handled below the block — see `contracts/endpoint-contract.md` §3. Block does NOT pass `csrf_token`.

## Props

```ts
export type AccountSessionsListProps = {
  onSessionRevoked?: (sessionId: string) => void;
  onAllOtherSessionsRevoked?: () => void;
  onError?: (err: unknown) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  notifications?: boolean | { success?: boolean; error?: boolean };
  messages?: Partial<AccountSessionsListMessages>;
};

export type SessionRow = {
  id: string;
  isCurrent: boolean;
  authMethod: 'password' | 'identity' | 'magic_link' | 'email_otp' | 'sms_otp' | 'anonymous' | string;
  userAgent: string | null;
  parsedDevice: ParsedDevice | null;
  ip: string | null;
  origin: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string;
};

export type ParsedDevice = {
  browser: string | null;
  os: string | null;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
};
```

## Messages catalog

```ts
export type AccountSessionsListMessages = {
  title: string;
  description: string;
  currentSessionBadge: string;
  revokeButton: string;
  revokeConfirmTitle: string;
  revokeConfirmDescription: string;
  revokeConfirmButton: string;
  revokeCancelButton: string;
  revokeAllOtherButton: string;
  revokeAllConfirmTitle: string;
  revokeAllConfirmDescription: string;
  revokeAllConfirmButton: string;
  revokeAllCancelButton: string;
  sessionRevokedToast: string;
  allOtherRevokedToast: string;
  lastUsedLabel: string;
  createdLabel: string;
  ipLabel: string;
  unknownDevice: string;
  unknownLocation: string;
  stepUpCancelled: string;
  errors: {
    UNKNOWN_ERROR: string;
  };
};

export const defaultAccountSessionsListMessages: AccountSessionsListMessages = {
  title: 'Active sessions',
  description: 'These are the devices currently signed in to your account. Revoke any session you do not recognise.',
  currentSessionBadge: 'This device',
  revokeButton: 'Revoke',
  revokeConfirmTitle: 'Revoke session?',
  revokeConfirmDescription: 'This device will be signed out immediately.',
  revokeConfirmButton: 'Revoke',
  revokeCancelButton: 'Cancel',
  revokeAllOtherButton: 'Revoke all other sessions',
  revokeAllConfirmTitle: 'Revoke all other sessions?',
  revokeAllConfirmDescription: 'All sessions except the current one will be signed out. You will remain signed in on this device.',
  revokeAllConfirmButton: 'Revoke all',
  revokeAllCancelButton: 'Cancel',
  sessionRevokedToast: 'Session revoked.',
  allOtherRevokedToast: 'All other sessions revoked.',
  lastUsedLabel: 'Last active',
  createdLabel: 'Signed in',
  ipLabel: 'IP',
  unknownDevice: 'Unknown device',
  unknownLocation: 'Unknown location',
  stepUpCancelled: 'Step-up verification cancelled.',
  errors: {
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The block does **not** ship a `use-user-sessions.ts`. The list-fetch portion has no generated hook (private-schema view, no `*Connection` — `contracts/sdk-binding-contract.md` §10). Only the revoke mutation is bindable today.

**Revoke mutation (buildable):**
- **Import:** `import { useRevokeSessionMutation } from '@/generated/auth';` (`revoke_session` → `revokeSession` → `useRevokeSessionMutation`, per `endpoint-contract.md` §7.)
- **Instantiate:**
  ```ts
  const revokeMutation = useRevokeSessionMutation({
    selection: { fields: { revokeSession: true } },
  });
  ```
- **Call:**
  ```ts
  await revokeMutation.mutateAsync({ sessionId }).then((d) => d.revokeSession);
  ```
  `vars` carries `sessionId` — **never** `csrf_token`.
- **Returns:** `{ mutateAsync, isPending, error }`.
- **Adapter override:** when `props.onSubmit` is provided, the block awaits it instead.

**List query (out-of-frontend-scope):** no generated `useUserSessionsQuery` hook exists. When a `UserSessionsConnection` ships, the list hook becomes: `import { useUserSessionsQuery } from '@/generated/auth'` and `requires.json` gains `"queries": ["userSessions"]`.

### `account-sessions-list.requires.json`

```json
{
  "namespace": "auth",
  "mutations": ["revokeSession"],
  "queries": [],
  "models": []
}
```

> `queries` and `models` are empty because the list surface is out-of-frontend-scope. Only `revokeSession` mutation exists today.

## Callbacks

- `onSessionRevoked(sessionId)` — fires after single revocation.
- `onAllOtherSessionsRevoked()` — fires after bulk revocation (all per-session calls resolved).
- `onError(err)` — fires on error.
- `onMessage({ kind, key })` — e.g. step-up events.

## Captcha

Not applicable.

## Step-up

Two tiers apply (Q29):

- **Single session revoke** — `tier: 'medium'` → `useStepUp({ tier: 'medium' })` maps to `type: 'password'`. A confirmation dialog precedes step-up; if step-up is too heavy for the consumer's UX, they may configure the block to skip step-up for single revokes and rely on the confirmation dialog only.
- **Revoke all other sessions** — `tier: 'high'` → `useStepUp({ tier: 'high' })` maps to `type: 'mfa'` if enrolled, falls back to `type: 'password'`. This fires AFTER the confirmation dialog.

Cancellation of step-up surfaces `STEP_UP_CANCELLED` and is handled gracefully (no revocation attempted, dialog remains open).

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Single session revoked | `messages.sessionRevokedToast` |
| All other sessions revoked | `messages.allOtherRevokedToast` |
| Unknown error | `messages.errors.UNKNOWN_ERROR` |

## Accessibility

- Session list: `role="list"` with each session as `role="listitem"`.
- Current session row: `aria-current="true"`.
- Revoke button on current session: `disabled` with `aria-describedby` pointing to the "current session cannot be revoked" explanation.
- Confirmation dialog traps focus.
- Step-up dialog (from `auth-step-up-dialog`) handles its own focus trap.

## Notes / gotchas

- The current session must be identifiable — highlight it visually (e.g. `bg-muted` row, "This device" badge) and disable its revoke button. Do not hide the row.
- User agent parsing (`parse-user-agent.ts`) is a lightweight client-side parse — do not ship a heavy UA parser library. A minimal regex-based approach is sufficient for "Chrome on macOS", "Safari on iPhone" etc.
- Session `ip` may be `null` if the server didn't record it. Display `messages.unknownLocation`.
- `expires_at` vs `last_used_at`: prefer `last_used_at` for "Last active" display. `expires_at` shown in a tooltip if needed.
- After revoking all other sessions, refetch the list to confirm only the current session remains.
- This block should not be used to sign out the current session — that action belongs to [[auth-sign-out-button]].

## Implementation notes (for the author)

- Row layout: device icon (based on `parsedDevice.deviceType`) + device/browser label + IP + timestamps + revoke button.
- Use relative timestamps (e.g., "2 hours ago") for `lastUsedAt` — a lightweight `formatRelativeTime` utility or `Intl.RelativeTimeFormat`.
- "Revoke all other" button placed below the list, not per-row.
- Test states: single session (current only), multiple sessions, no `last_used_at`, step-up cancelled (medium tier), step-up cancelled (high tier), revoke error, all revoked.
- Migration: no existing admin route to replace; new block.
