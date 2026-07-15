# auth-account-connected-accounts

**Type:** `registry:block`
**Status:** `v1 (frontend ready)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-account.md`
**Master entry:** `blocks-master.md#auth-account-connected-accounts`

**Pairing:** No page block — this card is composed by [[auth-account-settings-page]]. Install the page to get the full settings surface; install this card alone for a standalone connected-accounts management widget.

> **IMPORTANT — do not confuse with [[auth-social-providers-grid]]:** `auth-account-connected-accounts` is the **settings surface** (manage already-linked accounts, connect new ones after sign-in). `auth-social-providers-grid` is the **sign-in/sign-up surface** (OAuth provider grid on the login page). They are different blocks serving different contexts.

## Purpose

Lists OAuth identity links from `constructive_user_identifiers_private.connected_accounts`. Per row: provider icon, service display name, identifier (email for OIDC providers), connection date, and a disconnect CTA. Also renders "Connect [provider]" actions for providers that are enabled (`identity_providers.enabled = true`) but not yet linked. Consumes the same dynamic provider list as [[auth-social-providers-grid]] — coordinate on the `IdentityProvider` type shape.

## When to use

- As the connected accounts section within `auth-account-settings-page`.
- On any custom settings page where OAuth management is needed.
- Not a fit when: `app_settings_auth.allow_identity_sign_in` is `false` (the entire section is irrelevant).

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/auth/account-connected-accounts.tsx` | `registry:component` |
| `components/auth/account-connected-accounts.requires.json` | `registry:file` |
| `lib/auth/messages/account-connected-accounts-messages.ts` | `registry:lib` |

> No data hook is shipped. The `use-connected-accounts.ts` hook is removed. The disconnect mutation is consumed as `useDisconnectAccountMutation` from `@/generated/auth`. The connected-accounts list and identity-providers list queries are conditional on generated Connection types (see "DB procedures" FLAG below). Only the messages catalog and `requires.json` are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (supplies `QueryClientProvider` + per-namespace `configure()`; React Query reaches this block transitively)
- `card`, `button`, `badge`, `separator`, `dialog`, `avatar`
- `lib/auth-errors`

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; arrives transitively via `blocks-runtime`. `@constructive-io/data` is removed.

## DB procedures used by default hook

| Operation | Source | Status |
|---|---|---|
| List connected accounts | `constructive_user_identifiers_private.connected_accounts` — **FLAG: private schema; no confirmed public Connection type** → list query conditional on generated Connection (see FLAG below) | FLAG — verify |
| List enabled providers | `constructive_auth_private.identity_providers` — **FLAG: private schema; no confirmed public Connection type** → list query conditional (see FLAG below; coordinate with `auth-social-providers-grid`) | FLAG — verify |
| Disconnect account | `constructive_auth_public.disconnect_account(account_id uuid) → boolean` — schema `constructive_auth_public` → **namespace `auth`** → generated op `disconnectAccount` → hook `useDisconnectAccountMutation` | DEPLOYED |
| Connect new account | Not a mutation — OAuth redirect. Consumer provides the OAuth redirect URL. | N/A |

> **FLAG — connected-accounts list query:** `constructive_user_identifiers_private.connected_accounts` is a private schema. Whether PostGraphile exposes a `ConnectedAccountsConnection` type via a public wrapper is not confirmed. **Do NOT invent a `useConnectedAccountsQuery` hook.** If a public Connection type exists in the generated SDK, import `useConnectedAccountsQuery` from `@/generated/auth` and add `"queries": ["connectedAccounts"]` to `requires.json`. Until confirmed, the list read is conditional on a generated Connection. See `contracts/sdk-binding-contract.md` §5 (Connection rule).

> **FLAG — identity-providers list query:** similarly, `constructive_auth_private.identity_providers` is private. The `auth-social-providers-grid` block queries this table — coordinate with the social vertical on the exact GraphQL type name. If a public `IdentityProvidersConnection` is confirmed, import `useIdentityProvidersQuery` from `@/generated/auth`. Until confirmed, treat the provider list as conditional.

The exact behavior of `disconnect_account` when the target account is the user's only remaining auth method isn't pinned down yet — the block treats a `LAST_AUTH_METHOD` error code as the expected rejection and surfaces it gracefully so a user can't lock themselves out of their own account.

CSRF token is handled below the block — see `contracts/endpoint-contract.md` §3. Block does NOT pass `csrf_token`.

## Props

```ts
export type AccountConnectedAccountsProps = {
  /**
   * Base URL for initiating an OAuth connection flow.
   * The block appends `?provider=<slug>&action=connect` to this URL.
   * Default: '/auth/social' (typical Constructive OAuth middleware path).
   */
  oauthRedirectBase?: string;
  onAccountDisconnected?: (accountId: string, provider: string) => void;
  onAccountConnected?: (provider: string) => void;
  onError?: (err: unknown) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  notifications?: boolean | { success?: boolean; error?: boolean };
  messages?: Partial<AccountConnectedAccountsMessages>;
  /**
   * Static list of providers to show as "connect" options.
   * If omitted, the block queries identity_providers dynamically (default).
   * Same prop pattern as [[auth-social-providers-grid]].
   */
  providers?: string[];
};

export type ConnectedAccountRow = {
  id: string;
  service: string;    // provider slug (e.g. 'google', 'github')
  identifier: string; // email or username shown for this link
  isVerified: boolean;
  createdAt: string;
  details: Record<string, unknown> | null;
};

/**
 * Shared type — coordinate with auth-social-providers-grid (social vertical).
 * Import from lib/auth/types/identity-provider.ts.
 */
export type IdentityProvider = {
  id: string;
  slug: string;
  displayName: string;
  kind: 'oidc' | 'oauth2';
  enabled: boolean;
};
```

## Messages catalog

```ts
export type AccountConnectedAccountsMessages = {
  title: string;
  description: string;
  connectedLabel: string;
  notConnectedLabel: string;
  disconnectButton: string;
  connectButton: (providerName: string) => string;
  disconnectConfirmTitle: string;
  disconnectConfirmDescription: string;
  disconnectConfirmButton: string;
  disconnectCancelButton: string;
  disconnectedToast: string;
  errors: {
    LAST_AUTH_METHOD: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultAccountConnectedAccountsMessages: AccountConnectedAccountsMessages = {
  title: 'Connected accounts',
  description: 'Link third-party accounts for sign-in and data access.',
  connectedLabel: 'Connected',
  notConnectedLabel: 'Not connected',
  disconnectButton: 'Disconnect',
  connectButton: (name) => `Connect ${name}`,
  disconnectConfirmTitle: 'Disconnect account?',
  disconnectConfirmDescription: 'You will no longer be able to sign in with this account.',
  disconnectConfirmButton: 'Disconnect',
  disconnectCancelButton: 'Cancel',
  disconnectedToast: 'Account disconnected.',
  errors: {
    LAST_AUTH_METHOD: 'Cannot disconnect your only sign-in method. Add a password or another account first.',
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The block does **not** ship a `use-connected-accounts.ts`.

**Disconnect mutation (buildable):**
- **Import:** `import { useDisconnectAccountMutation } from '@/generated/auth';` (`disconnect_account` → `disconnectAccount` → `useDisconnectAccountMutation`, per `endpoint-contract.md` §7.)
- **Instantiate:**
  ```ts
  const disconnectMutation = useDisconnectAccountMutation({
    selection: { fields: { disconnectAccount: true } },
  });
  ```
- **Call:**
  ```ts
  await disconnectMutation.mutateAsync({ accountId }).then((d) => d.disconnectAccount);
  ```
  `vars` carries `accountId` — **never** `csrf_token`.
- **Returns:** `{ mutateAsync, isPending, error }`.
- **Adapter override:** when `props.onSubmit` is provided, the block awaits it instead.

**List queries (conditional — FLAG):** Import `useConnectedAccountsQuery` and `useIdentityProvidersQuery` from `@/generated/auth` only once confirmed public Connection types exist in the generated SDK. Until confirmed, the list read is out-of-scope. Provider icon resolution: same icon set as `auth-social-providers-grid`. Share `lib/auth/utils/provider-icon.ts` registry lib.

### `account-connected-accounts.requires.json`

```json
{
  "namespace": "auth",
  "mutations": ["disconnectAccount"],
  "queries": [],
  "models": []
}
```

> `queries` and `models` are currently empty pending confirmation of public Connection types for connected accounts and identity providers. Add the query op names once confirmed.

## Callbacks

- `onAccountDisconnected(accountId, provider)` — fires after disconnect.
- `onAccountConnected(provider)` — fires if the consumer handles the OAuth callback and notifies this block.
- `onError(err)` — fires on error.
- `onMessage({ kind, key })`.

## Captcha

Not applicable.

## Step-up

Disconnect requires `tier: 'medium'` step-up (Q29) → `useStepUp({ tier: 'medium' })` maps to `type: 'password'`. This gates the `disconnect_account` call. The step-up fires after the confirmation dialog — flow is: disconnect button → confirmation → step-up → mutation.

If step-up is cancelled, the confirmation dialog re-opens. The `LAST_AUTH_METHOD` error is surfaced inline (not as a toast) before step-up triggers, since the block can detect this condition pre-mutation if only one account is linked.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Account disconnected | `messages.disconnectedToast` |
| Error → `LAST_AUTH_METHOD` | inline error (not toast) |
| Error → unknown | `messages.errors.UNKNOWN_ERROR` |

## Accessibility

- Section renders two sub-lists: "Connected" accounts and "Available to connect" accounts.
- Each provider row: provider icon has `alt="{{providerName}}"`.
- Disconnect button: `aria-label="Disconnect {{provider}} account"`.
- Connect button navigates (anchor tag behavior) — not a form submit. Use `<a href={oauthUrl}>` styled as button.
- Disconnect confirmation dialog traps focus.

## Notes / gotchas

- **Cross-vertical coordination**: The `IdentityProvider` type and the provider icon set MUST be shared with [[auth-social-providers-grid]] (social vertical). Define in `lib/auth/types/identity-provider.ts` and `lib/auth/utils/provider-icon.ts` as shared registry libs.
- The "Connect [provider]" action is a full-page OAuth redirect, not a fetch. The block renders an `<a>` tag with `href` pointing to the OAuth initiation endpoint (e.g. `/auth/social?provider=github&action=connect`). Do not attempt to initiate OAuth via a JS fetch.
- Pre-seeded providers per factsheet: Google (OIDC), GitHub (OAuth2), Apple (OIDC), Facebook (OAuth2), Microsoft (OIDC). LinkedIn exists in `constructive/packages/oauth` but is NOT pre-seeded in the DB — it will not appear in the dynamic list unless manually added.
- The `details jsonb` column may contain provider-specific data. Do not render raw details — extract only `identifier` (email/username) for display.
- `is_verified` on the connected account row: show a verified badge for verified OAuth links. Most OAuth OIDC providers will be verified; generic OAuth2 may not be.

## Implementation notes (for the author)

- Layout: unified list sorted by: connected accounts first (alphabetical by service), then unconnected providers.
- Provider icon: 24x24px, SVG preferred, same icon assets as `auth-social-providers-grid`.
- Test states: no connected accounts, all connected, mixed, disconnect error (last method), disconnect step-up cancelled, loading, provider list empty.
- Migration: no existing route to replace; new block.
