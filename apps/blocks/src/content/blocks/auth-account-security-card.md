# auth-account-security-card

**Type:** `registry:block`
**Status:** `v1 (frontend ready)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-account.md`
**Master entry:** `blocks-master.md#auth-account-security-card`

**Pairing:** No page block — this card is composed by [[auth-account-settings-page]]. It is also a composing card itself: it links to [[auth-change-password-form]], [[auth-mfa-totp-enroll]], and [[auth-passkey-management-list]] via callbacks (no direct embedding).

## Purpose

At-a-glance summary card for the signed-in user's security posture. Displays password status, TOTP MFA status, and passkey count. Each item links to the dedicated action block. This block is purely a summary + CTA card — it performs no mutations of its own.

## When to use

- As the security section within `auth-account-settings-page`.
- On any custom dashboard where a compact security status summary is desired.
- Not a fit when: the consumer wants the full management UIs inline (use the respective action blocks directly).

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/auth/account-security-card.tsx` | `registry:component` |
| `components/auth/account-security-card.requires.json` | `registry:file` |
| `lib/auth/messages/account-security-card-messages.ts` | `registry:lib` |

> No data hook is shipped. The `use-security-status.ts` hook is removed — the block imports `useCurrentUserQuery` from `@/generated/auth`. The passkey count query is conditional on a generated Connection type (see FLAG below). Only the messages catalog and `requires.json` are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (supplies `QueryClientProvider` + per-namespace `configure()`; React Query reaches this block transitively)
- `card`, `button`, `badge`, `separator`
- `lib/auth-errors`

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; arrives transitively via `blocks-runtime`. `@constructive-io/data` is removed.

## DB procedures used by default hook

| Data point | Source | Schema → namespace → hook |
|---|---|---|
| TOTP enabled? | `constructive_auth_public.current_user()` → `totpEnabled` field | `constructive_auth_public` → `auth` → `currentUser` → `useCurrentUserQuery` — DEPLOYED |
| Passkey count | `constructive_user_identifiers_public.webauthn_credentials` — **FLAG: requires a public `WebauthnCredentialsConnection` type** (see FLAG below) | conditional on generated Connection |
| Password set? | Not directly queryable via a public proc — **FLAG: no confirmed public query for password-set status** | FLAG — verify |

> **FLAG — passkey count query:** whether `constructive_user_identifiers_public.webauthn_credentials` has a public `WebauthnCredentialsConnection` type is not confirmed. Do NOT invent a `useWebauthnCredentialsQuery`. If confirmed, import `useWebauthnCredentialsQuery` from `@/generated/auth` and add to `requires.json`. Until confirmed, treat the passkey count as conditional.

> **FLAG — password set status:** no public query for password presence is confirmed. It may be a field on the `current_user()` return or require a separate procedure. Verify against the generated `auth` SDK `.d.ts`.

The card reads MFA state from the `totpEnabled` field on the `current_user()` payload and treats a `null` or absent value as `false`, so it degrades gracefully when a session predates the flag.

CSRF token is handled below the block — see `contracts/endpoint-contract.md` §3. Block does NOT pass `csrf_token`.

## Props

```ts
export type AccountSecurityCardProps = {
  /** Called when user clicks the change-password CTA. Consumer handles navigation to [[auth-change-password-form]]. */
  onChangePassword?: () => void;
  /** Called when user clicks the MFA enable/disable CTA. Consumer handles navigation to [[auth-mfa-totp-enroll]] (v1, frontend ready, backend pending). */
  onManageMfa?: () => void;
  /** Called when user clicks the passkeys CTA. Consumer handles navigation to [[auth-passkey-management-list]]. */
  onManagePasskeys?: () => void;
  onError?: (err: unknown) => void;
  messages?: Partial<AccountSecurityCardMessages>;
  notifications?: boolean | { error?: boolean };
};

export type SecurityStatus = {
  hasPassword: boolean;
  totpEnabled: boolean;
  passkeyCount: number;
};
```

## Messages catalog

```ts
export type AccountSecurityCardMessages = {
  title: string;
  description: string;
  passwordLabel: string;
  passwordSetStatus: string;
  passwordNotSetStatus: string;
  changePasswordButton: string;
  setPasswordButton: string;
  mfaLabel: string;
  mfaEnabledStatus: string;
  mfaDisabledStatus: string;
  manageMfaButton: string;
  enableMfaButton: string;
  passkeysLabel: string;
  // Single interpolated string with {{count}} placeholder. Use `interpolate(messages.passkeysCountStatus, { count })` in the component.
  // i18n-contract §9: catalog values must be strings. English pluralisation edge case (1 passkey vs N passkeys) is acceptable with a single default string.
  passkeysCountStatus: string;
  passkeysNoneStatus: string;
  managePasskeysButton: string;
  errors: {
    UNKNOWN_ERROR: string;
  };
};

export const defaultAccountSecurityCardMessages: AccountSecurityCardMessages = {
  title: 'Security',
  description: 'Manage your password, two-factor authentication, and passkeys.',
  passwordLabel: 'Password',
  passwordSetStatus: 'Set',
  passwordNotSetStatus: 'Not set',
  changePasswordButton: 'Change password',
  setPasswordButton: 'Set password',
  mfaLabel: 'Two-factor authentication',
  mfaEnabledStatus: 'Enabled',
  mfaDisabledStatus: 'Disabled',
  manageMfaButton: 'Manage',
  enableMfaButton: 'Enable',
  passkeysLabel: 'Passkeys',
  passkeysCountStatus: '{{count}} passkey(s) registered',
  passkeysNoneStatus: 'No passkeys registered',
  managePasskeysButton: 'Manage passkeys',
  errors: {
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The block does **not** ship a `use-security-status.ts`. It imports generated query hooks from the host's `auth` SDK. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

- **Import:** `import { useCurrentUserQuery } from '@/generated/auth';` (`current_user` → `currentUser` → `useCurrentUserQuery`, per `endpoint-contract.md` §7.)
- **Instantiate:**
  ```ts
  const currentUser = useCurrentUserQuery({
    selection: { fields: { totpEnabled: true, /* other needed fields */ } },
  });
  ```
- **Read payload:**
  ```ts
  const user = currentUser.data?.currentUser;
  ```
- **Returns:** `{ data, isLoading, error }` (React Query query hook — no `mutateAsync`).
- **Passkey count query (conditional):** if `WebauthnCredentialsConnection` is confirmed: `import { useWebauthnCredentialsQuery } from '@/generated/auth';`. Run in parallel with `useCurrentUserQuery`.
- Read-only — no mutations.

### `account-security-card.requires.json`

```json
{
  "namespace": "auth",
  "mutations": [],
  "queries": ["currentUser"],
  "models": []
}
```

> `queries` lists `currentUser` (confirmed deployed). Add passkey count query op once Connection is confirmed.

## Callbacks

- `onChangePassword()` — consumer navigates to or opens [[auth-change-password-form]].
- `onManageMfa()` — consumer navigates to or opens [[auth-mfa-totp-enroll]] (frontend ready, backend pending). In v1, this CTA should be conditionally hidden if the app feature flag `allow_totp_mfa` is false, or shown with a tooltip "Coming soon" if the consumer prefers.
- `onManagePasskeys()` — consumer navigates to or opens [[auth-passkey-management-list]].
- `onError(err)` — fires on query errors.

## Captcha

Not applicable — read-only query block.

## Step-up

Not applicable — no mutations performed here. Step-up is enforced in the linked blocks.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| query error | `messages.errors.UNKNOWN_ERROR` |

## Accessibility

- Each security item row uses `<dl>/<dt>/<dd>` or equivalent semantic structure.
- Status badges use descriptive text, not icon-only.
- CTA buttons have descriptive labels (`aria-label` if icon-only variant used).
- Skeleton loader shown while `isLoading`.

## Notes / gotchas

- **MFA CTA in v1**: TOTP enrollment is frontend-ready, backend-pending. In v1, if `totp_enabled === false`, the "Enable" button should either be hidden or shown with a disabled state + tooltip indicating this feature is coming. Consumer controls this via `onManageMfa` being undefined — block should not render the CTA if the callback is not provided.
- The card is display-only. Do not render any mutation buttons on this card itself. All actions are delegated via callbacks.
- `passkeysCountStatus` uses `{{count}}` interpolation. In the component: `interpolate(messages.passkeysCountStatus, { count: status.passkeyCount })`. The default string `'{{count}} passkey(s) registered'` covers both singular and plural for English; override with locale-appropriate strings as needed.
- Block must gracefully handle `totp_enabled` being `null`/`undefined` (e.g., older sessions where the flag wasn't returned). Treat as `false`.

## Implementation notes (for the author)

- Layout: vertical list of rows, each with label, status badge/text, and CTA button.
- Skeleton: three rows during load.
- MFA status should show `bg-success` badge when enabled, `bg-muted` when disabled (use existing theme tokens).
- Test states: all features enabled, password not set, MFA disabled, no passkeys, loading, error.
- Migration: no existing route to replace; new block.
