# auth-account-settings-page

**Type:** `registry:page`
**Status:** `v1 (frontend ready)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-account.md`
**Master entry:** `blocks-master.md#auth-account-settings-page`

## Purpose

Next.js page composing all account-settings section cards into a single tabbed/sectioned layout. One-shot install for the canonical account settings surface. Installing this page automatically pulls in all dependent section cards via `registryDependencies`. Consumers who need a custom layout should install the individual section cards instead.

## When to use

- When the consumer wants the full canonical account settings page out of the box.
- As a starting point that can be forked and customised.
- Not a fit when: the consumer needs a non-standard layout or wants to mix only some section cards into an existing settings page.

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `app/auth/account/page.tsx` | `registry:page` |
| `app/auth/account/layout.tsx` | `registry:component` (optional auth guard wrapper) |
| `components/auth/account-settings-layout.tsx` | `registry:component` |
| `components/auth/account-settings-layout.requires.json` | `registry:file` |
| `lib/auth/messages/account-settings-page-messages.ts` | `registry:lib` |

> No data hook is shipped. The page itself imports `useCurrentUserQuery` from `@/generated/auth`. All section card data calls are in their respective blocks. Only the messages catalog and `requires.json` are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

All section cards are pulled in via `registryDependencies`:

- `blocks-runtime` (supplies `QueryClientProvider` + per-namespace `configure()`; React Query reaches all child blocks transitively)
- `auth-account-profile-card`
- `auth-account-emails-list`
- `auth-account-security-card`
- `auth-account-sessions-list`
- `auth-account-api-keys-list`
- `auth-account-connected-accounts`
- `auth-account-danger-card`
- `auth-api-key-create-dialog`
- `auth-api-key-created-modal`
- `use-step-up`
- `auth-step-up-dialog`
- `layout-kit`
- `card`, `button`, `separator`, `tabs`

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `next` (peer, ^15)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; arrives transitively via `blocks-runtime`. `@constructive-io/data` is removed.

## DB procedures used by default hook

This page block delegates all DB calls to its child section cards. The page itself performs one top-level query:

- `constructive_auth_public.current_user()` — schema `constructive_auth_public` → **namespace `auth`** → generated op `currentUser` → hook `useCurrentUserQuery`. Fetches the current user's `id`, `displayName`, `profilePicture`, `type`, `totpEnabled` to seed the profile card and security card initial values. This is a single query to avoid N+1 loading on mount.

CSRF token is handled below the block — see `contracts/endpoint-contract.md` §3. Block does NOT pass `csrf_token`.

The `totpEnabled` value that seeds the security card is read from the `current_user()` payload; a session that predates the flag is treated as `false`, matching how [[auth-account-security-card]] consumes it.

## Props

```ts
// app/auth/account/page.tsx
// Next.js page — no exported props type for the page file itself.

// Layout/composition component props:
export type AccountSettingsPageProps = {
  /**
   * Which sections to render. Defaults to all sections.
   * Consumers can hide sections they don't need without forking the page.
   */
  sections?: AccountSettingsSection[];
  /** Override messages for the page-level chrome (tab labels, etc.). */
  messages?: Partial<AccountSettingsPageMessages>;
  /** Route to push after account deletion email is sent. Default: stays on page (inline success). */
  onDeletionEmailSent?: () => void;
  /** Route to use for change-password action. Default: opens auth-change-password-form as a dialog. */
  onChangePassword?: () => void;
  /** Route to use for manage-passkeys action. Default: navigates to [[auth-passkey-management-list]] page. */
  onManagePasskeys?: () => void;
  /** Route to use for manage-MFA action. Default: navigates to [[auth-mfa-totp-enroll]] (frontend ready, backend pending). */
  onManageMfa?: () => void;
};

export type AccountSettingsSection =
  | 'profile'
  | 'emails'
  | 'security'
  | 'sessions'
  | 'api-keys'
  | 'connected-accounts'
  | 'danger';
```

## Messages catalog

```ts
export type AccountSettingsPageMessages = {
  pageTitle: string;
  profileTabLabel: string;
  emailsTabLabel: string;
  securityTabLabel: string;
  sessionsTabLabel: string;
  apiKeysTabLabel: string;
  connectedAccountsTabLabel: string;
  dangerTabLabel: string;
};

export const defaultAccountSettingsPageMessages: AccountSettingsPageMessages = {
  pageTitle: 'Account settings',
  profileTabLabel: 'Profile',
  emailsTabLabel: 'Emails',
  securityTabLabel: 'Security',
  sessionsTabLabel: 'Sessions',
  apiKeysTabLabel: 'API keys',
  connectedAccountsTabLabel: 'Connected accounts',
  dangerTabLabel: 'Account',
};
```

## Default data hook (generated, not shipped)

The page does **not** ship a standalone data hook. It imports `useCurrentUserQuery` directly from the host's `auth` SDK. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

- **Import:** `import { useCurrentUserQuery } from '@/generated/auth';`
- **Instantiate:**
  ```ts
  const currentUser = useCurrentUserQuery({
    selection: { fields: { id: true, displayName: true, profilePicture: true, type: true, totpEnabled: true } },
  });
  ```
- **Read payload:** `const user = currentUser.data?.currentUser;`
- `user.type` is `Int!` from the wire — normalize to `'person' | 'organization'` at the page boundary per `block-contract.md` §5.
- No direct mutations from the page component — all mutations are in section cards.
- Loading state: shows a skeleton layout while the query resolves.

### `account-settings-layout.requires.json`

```json
{
  "namespace": "auth",
  "mutations": [],
  "queries": ["currentUser"],
  "models": []
}
```

## Callbacks

All callbacks are delegated to section cards. Page-level callbacks:

- `onDeletionEmailSent()` — passed to `auth-account-danger-card`.
- `onChangePassword()` — passed to `auth-account-security-card`.
- `onManagePasskeys()` — passed to `auth-account-security-card`.
- `onManageMfa()` — passed to `auth-account-security-card`.

## Captcha

Not applicable at page level.

## Step-up

Not applicable at page level. Step-up is managed within section cards that require it (`auth-account-sessions-list` for revoke-all, `auth-account-danger-card` for deletion, `auth-api-key-create-dialog` for key creation, `auth-account-connected-accounts` for disconnect).

## Notifications (default toasts)

All notifications are managed within section cards. The page requires `<Toaster />` to be mounted in the consumer's root layout (prerequisite, documented in install instructions).

## Accessibility

- Page `<h1>`: `messages.pageTitle`.
- Tab navigation: each section accessible via `<Tabs>` component (keyboard navigable).
- Skip-to-content link at the top for screen reader users.
- Each section card has its own `<h2>` heading (from the card's `messages.title`).

## Layout

```
[Page Title: Account settings]

[Tab Nav: Profile | Emails | Security | Sessions | API Keys | Connected Accounts | Account]

[Active Tab Content]
  ↳ auth-account-profile-card          (tab: Profile)
  ↳ auth-account-emails-list           (tab: Emails)
  ↳ auth-account-security-card         (tab: Security)
  ↳ auth-account-sessions-list         (tab: Sessions)
  ↳ auth-account-api-keys-list         (tab: API Keys)
  ↳ auth-account-connected-accounts    (tab: Connected Accounts)
  ↳ auth-account-danger-card           (tab: Account — at bottom)
```

Alternate layout (non-tabbed, all visible): consumer can set `sections` prop to all sections and render without a `<Tabs>` wrapper by forking the component. The page ships with tabs by default for nav cleanliness.

## Notes / gotchas

- **Auth guard**: the `layout.tsx` in the shipped files should redirect unauthenticated users to `/auth/sign-in?redirect=/auth/account`. Implementation depends on the consumer's session provider. A comment in the file explains where to add the guard.
- **`allow_api_keys` feature flag**: the `auth-account-api-keys-list` section should only be rendered if `app_settings_auth.allow_api_keys = true`. The page block checks this flag (via `current_user()` response or a separate feature flag query) before rendering the API keys tab. If the flag is false, the tab is omitted from the tab list.
- **MFA tab (frontend ready, backend pending)**: the security card's "Manage MFA" CTA links to `[[auth-mfa-totp-enroll]]` which is backend-pending. In v1, pass `onManageMfa={undefined}` — the security card will not render the CTA if the callback is absent.
- Consumer can render only a subset of sections by passing `sections={['profile', 'emails']}`. This keeps the registry dependency graph clean since all cards are installed but only some rendered.

## Implementation notes (for the author)

- The page uses `layout-kit` for the outer centered container.
- Tabs: use the `tabs` registry primitive. Tab content is lazy-loaded (each tab renders its card only when the tab is active) to avoid loading all data on mount.
- URL-based tab routing: the page optionally reads `?tab=emails` from the URL and activates the matching tab, enabling deep-linking to specific settings sections.
- Test states: all sections visible, API keys section hidden (flag off), single-section render, loading skeleton, unauthenticated redirect.
- Migration: this page replaces any existing per-route account settings pages in the consumer's app. List consumer's existing auth routes for reference before install.
