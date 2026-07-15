# auth-social-providers-grid

**Type:** `registry:block`
**Status:** `v1 (frontend ready)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-social.md`
**Master entry:** `blocks-master.md#auth-social-providers-grid`

**Pairing:** No page block — card-only. Used as: an "Or sign in with…" composition layer inside [[auth-sign-in-card]] and [[auth-sign-up-card]], and on standalone social-only sign-in pages. For inline contexts (secondary to an email/password form), see [[auth-social-buttons]].

> **Renamed from `auth-connected-accounts`.** All `auth-connected-accounts` cross-references must be updated to `[[auth-social-providers-grid]]`. Note: `[[auth-account-connected-accounts]]` (the authenticated settings surface) is a different block and its name is unchanged.

**DB verification (2026-05-14):** `constructive_auth_public.identity_providers` view EXISTS with anonymous + authenticated grants. This block is ship-ready. View columns: `slug`, `kind`, `display_name`, `enabled`, `is_built_in`.

## Purpose

The "Or sign in with…" section rendered on sign-in and sign-up screens — a composition layer around [[auth-social-buttons]] that adds sign-in/up context (mode, divider, return URL) and a "Last used" badge showing which social provider the user previously authenticated with. This is the **sign-in/up surface** block for primary sign-in pages where social providers deserve visual prominence (grid or stacked layout).

**Distinction from [[auth-social-buttons]]:**
- `auth-social-providers-grid` (this block) — a composition layer. Adds mode context (`sign-in` / `sign-up`), divider, last-used badge, and wraps [[auth-social-buttons]] for primary sign-in/up pages. Use on dedicated sign-in and sign-up pages.
- `auth-social-buttons` — the raw button row. Use for inline contexts, e.g., a secondary "Or sign in with…" section alongside an email/password form.

**Distinction from [[auth-account-connected-accounts]]:**
- `auth-social-providers-grid` (this block) — unauthenticated surface. No disconnect logic.
- `auth-account-connected-accounts` — authenticated account settings surface. Shows linked providers with disconnect action. Uses `constructive_auth_public.disconnect_account`.

## When to use

- As the primary social auth entry point on [[auth-sign-in-card]] or [[auth-sign-up-card]] (via `showSocialButtons=true`, which composes this block internally).
- On standalone social-only sign-in/sign-up pages.
- Not a fit when: you need social buttons inline below a password form — use [[auth-social-buttons]] directly. Not a fit for account settings — use [[auth-account-connected-accounts]].

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/auth/social-providers-grid.tsx` | `registry:component` |
| `lib/auth/messages/social-providers-grid-messages.ts` | `registry:lib` |

Note: `social-providers-grid.tsx` composes [[auth-social-buttons]] — provider discovery is delegated there.

## Registry dependencies

- `[[auth-social-buttons]]` (auth-* block — core provider buttons and generated `useIdentityProvidersQuery` hook)
- `separator` (shadcn primitive)
- `badge` (shadcn primitive — "Last used" badge)

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `sonner`
- (`@tanstack/react-query` arrives transitively via `[[auth-social-buttons]]`'s `blocks-runtime` registry dependency — no per-block declaration needed)

## DB procedures used by default hook

None directly. Provider discovery and OAuth redirect URL construction are delegated to [[auth-social-buttons]] (generated `useIdentityProvidersQuery` hook, which queries the `constructive_auth_public.identity_providers` view).

Optional: reads a `localStorage` key (`cnc_last_auth_provider`) to show the "Last used" badge on the matching provider button. Pure client-side; no DB call.

## Props

```ts
export type AuthSocialProvidersGridProps = {
  /**
   * Context mode — controls button label ("Sign in with" vs "Sign up with").
   * Default: 'sign-in'
   */
  mode?: 'sign-in' | 'sign-up';
  /**
   * Show "Last used" badge on the provider the user previously authenticated with.
   * Reads from localStorage. Default: true.
   */
  showLastUsed?: boolean;
  /**
   * Static provider override — passed through to [[auth-social-buttons]].
   * When set, skips DB query.
   */
  providers?: string[];
  /**
   * Button layout — passed through to [[auth-social-buttons]].
   * Default: 'stacked'
   */
  layout?: 'stacked' | 'grid' | 'icon-only';
  /**
   * Return URL passed to OAuth middleware.
   * Default: current URL.
   */
  returnTo?: string;
  /**
   * Show the divider above buttons. Default: true.
   */
  showDivider?: boolean;
  /**
   * Override OAuth middleware base path. Default: '/auth'.
   */
  baseOAuthPath?: string;
  /**
   * Custom render function for each button — passed through to [[auth-social-buttons]].
   */
  renderButton?: (provider: { slug: string; displayName: string; kind: string }) => React.ReactNode | null;
  onProviderClick?: (provider: { slug: string; displayName: string; kind: string }, url: string) => boolean | void;
  notifications?: boolean | NotificationConfig;
  messages?: Partial<SocialProvidersGridMessages>;
  onError?: (err: unknown) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
};
```

## Messages catalog

```ts
export type SocialProvidersGridMessages = {
  dividerText: string;
  lastUsedBadge: string;
  /** Passed through to [[auth-social-buttons]] if messages not set separately */
  signInWith: string;
  signUpWith: string;
  errors: {
    UNKNOWN_ERROR: string;
  };
};

export const defaultSocialProvidersGridMessages: SocialProvidersGridMessages = {
  dividerText: 'or',
  lastUsedBadge: 'Last used',
  signInWith: 'Sign in with {{provider}}',
  signUpWith: 'Sign up with {{provider}}',
  errors: {
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
```

## Default hook contract

No hook in this block. All data fetching is delegated to [[auth-social-buttons]]. The `showLastUsed` feature reads `localStorage` item `cnc_last_auth_provider`, written on `onProviderClick` (before navigation). Pure client-side.

## Callbacks

- `onProviderClick(provider, url)` — forwarded from [[auth-social-buttons]]. Block also writes `localStorage` here to track last used. Return `false` to cancel navigation.
- `onError(err)` — forwarded from [[auth-social-buttons]].
- `onMessage({ kind, key })` — forwarded.

## Captcha

Not applicable. See [[auth-sign-in-card]] for captcha on the parent form.

## Step-up

Not applicable.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Provider list fetch error | `messages.errors.UNKNOWN_ERROR` |

## Accessibility

- Inherits all accessibility from [[auth-social-buttons]].
- "Last used" badge adds a visually hidden `(last used)` suffix to the matching button's `aria-label`.
- Divider uses `aria-hidden="true"` on decorative lines.

## Notes / gotchas

- **This block vs [[auth-social-buttons]]**: Use `auth-social-providers-grid` on primary sign-in/up pages where social auth deserves prominence. Use `auth-social-buttons` inline below a password form (or in other inline contexts).
- **This block vs [[auth-account-connected-accounts]]**: Completely different purpose. `auth-social-providers-grid` handles the unauthenticated sign-in/up path. `auth-account-connected-accounts` handles the authenticated account settings path (link/unlink OAuth accounts).
- **Last used persistence**: uses `localStorage` key `cnc_last_auth_provider`. SSR-safe (reads only in `useEffect`). Renders the badge only if the provider is still enabled in the DB.
- **Mode switching**: `mode='sign-up'` changes button labels to "Sign up with…" but the OAuth flow is identical — the Constructive OAuth middleware determines sign-in vs sign-up based on whether the identity exists.
- The block is intentionally thin. Don't add provider-specific logic here — extend [[auth-social-buttons]] instead.
- Cross-ref: [[auth-sign-in-card]], [[auth-sign-up-card]] — compose this block via their `showSocialButtons` prop.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/social-providers-grid/`
- This is a composition-only component (~60 lines). Keep it thin.
- Storybook stories: sign-in mode with last-used badge, sign-up mode, no providers, loading.
- The `cnc_last_auth_provider` localStorage key is the only persistent state owned by this block. Document format: `{ slug: string; timestamp: number }`.
