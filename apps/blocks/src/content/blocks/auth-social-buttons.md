# auth-social-buttons

**Type:** `registry:block`
**Status:** `v1 (frontend ready)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-social.md`
**Master entry:** `blocks-master.md#auth-social-buttons`

**Pairing:** No page block — card-only. Used as: the raw button row **inside [[auth-social-providers-grid]]** (which is the canonical social composition layer for primary sign-in/up surfaces). `auth-social-buttons` is the low-level primitive; it should NOT be listed as a direct dependency of `auth-sign-in-card` or `auth-sign-up-card` — those cards depend on `auth-social-providers-grid`, which wraps this block internally. Use `auth-social-buttons` directly only in inline or custom layouts (e.g., a secondary "Or sign in with…" section alongside an email/password form in a non-standard layout where the grid is too heavy).

## Purpose

Renders OAuth provider sign-in/sign-up buttons. Dynamic-by-default: queries `constructive_auth_private.identity_providers` (via a public-facing view/procedure) to discover which providers are enabled in the DB, so admin toggles take effect without a code deploy. Supports a `providers` static array prop to bypass the DB query for marketing pages or demos. Ships built-in SVG icons for the 7 most common providers. OAuth flow itself happens via redirect to the `constructive` server-side Express OAuth middleware — the block generates the correct redirect URL and navigates to it.

## When to use

- Inside [[auth-social-providers-grid]] (the grid wraps this block as its inner button row — do not import `auth-social-buttons` directly in sign-in or sign-up card code).
- In custom inline layouts where you need the raw button row without the grid's mode context or last-used badge overhead (e.g., a secondary "Or sign in with…" section in a non-standard layout).
- Not a fit when: all social auth is disabled in `app_settings_auth.allow_identity_sign_in` — check that flag before rendering.
- Not a fit for primary sign-in/sign-up pages — use [[auth-social-providers-grid]] instead, which adds mode labels, last-used badges, and correct context for the primary sign-in surface.

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/auth/social-buttons.tsx` | `registry:component` |
| `components/auth/social-buttons.requires.json` | `registry:file` |
| `lib/auth/social-icons/google.tsx` | `registry:component` |
| `lib/auth/social-icons/github.tsx` | `registry:component` |
| `lib/auth/social-icons/apple.tsx` | `registry:component` |
| `lib/auth/social-icons/facebook.tsx` | `registry:component` |
| `lib/auth/social-icons/microsoft.tsx` | `registry:component` |
| `lib/auth/social-icons/linkedin.tsx` | `registry:component` |
| `lib/auth/social-icons/slack.tsx` | `registry:component` |
| `lib/auth/social-icons/generic-oauth.tsx` | `registry:component` |
| `lib/auth/messages/social-buttons-messages.ts` | `registry:lib` |

> No data hook is shipped. The block imports its query hook (`useIdentityProvidersQuery`) from the host's generated `auth` SDK (`@/generated/auth`). Only the messages catalog, the icon components, and the `requires.json` manifest are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (Constructive block; supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `button` (shadcn primitive)
- `separator` (shadcn primitive)
- `skeleton` (shadcn primitive — shown while providers load)

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; it arrives transitively via the `blocks-runtime` registry dependency. The generated `auth` SDK is the host's, not a published dep of this block.

## DB procedures used by default hook

Queries the `identity_providers` view for enabled social providers:

**DB verified (2026-05-14):** `constructive_auth_public.identity_providers` view EXISTS with both `anonymous` and `authenticated` grants. Columns available: `slug`, `kind`, `display_name`, `enabled`, `is_built_in`. View in schema `constructive_auth_public` → **namespace `auth`** → generated query `identityProviders` → hook `useIdentityProvidersQuery`. The hook queries this view filtered to `enabled = true`.

> **FLAG:** `identity_providers` is a view (not a custom procedure), so the generated hook name follows the table-read convention (`use<Plural>Query`) rather than the custom-op convention in `endpoint-contract.md` §7. Verify the exact generated hook name against `@/generated/auth` exports — PostGraphile must expose a `IdentityProvidersConnection` type for the `use<Plural>Query` hook to be generated (see `sdk-binding-contract.md` §5).

Pre-seeded providers (all `enabled=false` by default per factsheet): `google` (oidc), `github` (oauth2), `apple` (oidc), `facebook` (oauth2), `microsoft` (oidc). LinkedIn is in the OAuth package but not DB-seeded — treated as custom provider if slug `linkedin` is found.

## OAuth URL construction

The block does NOT initiate the OAuth flow itself. It generates a redirect URL to the Constructive Express OAuth middleware and navigates with `window.location.href`:

```
/auth/{provider_slug}?return_to={encodedReturnUrl}
```

The Express OAuth middleware (at `constructive/packages/oauth`) handles PKCE, nonce, state, and the provider exchange. The block's only job is to construct the URL and fire `onProviderClick` before navigating.

By default the block assumes the Constructive Express OAuth middleware is mounted at `/auth` (so links resolve to `/auth/{slug}`); hosts whose middleware mounts elsewhere override it with the `baseOAuthPath` prop (default `'/auth'`).

## Props

```ts
export type IdentityProvider = {
  slug: string;
  displayName: string;
  /** 'oidc' | 'oauth2' | 'saml' — only oidc/oauth2 are v1 */
  kind: string;
};

export type SocialButtonsLayout = 'stacked' | 'grid' | 'icon-only';

export type AuthSocialButtonsProps = {
  /**
   * Static override: skip DB query and render only these providers.
   * Accepts provider slugs: 'google' | 'github' | 'apple' | 'facebook' | 'microsoft' | 'linkedin' | 'slack'
   * or any custom slug (renders generic OAuth icon + displayName from DB if available).
   */
  providers?: string[];
  /**
   * Whether user is signing in or signing up (affects button label).
   * Default: 'sign-in'
   */
  mode?: 'sign-in' | 'sign-up';
  /** Button layout. Default: 'stacked' */
  layout?: SocialButtonsLayout;
  /** Show divider above buttons with text. Default: true */
  showDivider?: boolean;
  /**
   * Return URL passed to OAuth middleware as `return_to`.
   * Default: current window.location.href (or `'/'` in SSR).
   */
  returnTo?: string;
  /**
   * Override the base path for the OAuth middleware.
   * Default: '/auth'
   */
  baseOAuthPath?: string;
  /**
   * Custom render function for each button.
   * Return null to use the default rendering.
   */
  renderButton?: (provider: IdentityProvider) => React.ReactNode | null;
  /**
   * Called before navigating to the OAuth URL.
   * Returning false cancels navigation (for testing / analytics).
   */
  onProviderClick?: (provider: IdentityProvider, url: string) => boolean | void;
  notifications?: boolean | NotificationConfig;
  messages?: Partial<AuthSocialButtonsMessages>;
  onError?: (err: unknown) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
};
```

## Messages catalog

```ts
export type AuthSocialButtonsMessages = {
  dividerText: string;
  /** Button label: "Continue with Google" */
  continueWith: string;
  /** Sign-in variant: "Sign in with Google" */
  signInWith: string;
  /** Sign-up variant: "Sign up with Google" */
  signUpWith: string;
  /** Aria label for icon-only layout */
  iconOnlyAriaLabel: string;
  /** Loading skeleton aria label */
  loadingAriaLabel: string;
  /** Shown when no providers are enabled */
  noProvidersMessage: string;
  errors: {
    UNKNOWN_ERROR: string;
  };
};

export const defaultAuthSocialButtonsMessages: AuthSocialButtonsMessages = {
  dividerText: 'or',
  continueWith: 'Continue with {{provider}}',
  signInWith: 'Sign in with {{provider}}',
  signUpWith: 'Sign up with {{provider}}',
  iconOnlyAriaLabel: 'Sign in with {{provider}}',
  loadingAriaLabel: 'Loading sign-in options…',
  noProvidersMessage: 'No social sign-in options are available.',
  errors: {
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The block does **not** ship a `use-identity-providers.ts`. It imports the generated query hook from the host's `auth` SDK and drives it with a field `selection`. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

- **Import:** `import { useIdentityProvidersQuery } from '@/generated/auth';` (real generated name — view `identity_providers` → `identityProviders` → `useIdentityProvidersQuery`, per `sdk-binding-contract.md` §5 table-read convention. See FLAG in "DB procedures used by default hook" above.)
- **Instantiate with a selection** of the fields this block consumes:
  ```ts
  const providersQuery = useIdentityProvidersQuery({
    selection: { fields: { slug: true, kind: true, displayName: true, enabled: true } },
  });
  ```
- **Behavior when `providers` prop is set:** skips the DB query entirely; constructs `IdentityProvider[]` from the static array (looks up `displayName` from a built-in slug→name map for known providers; uses the slug as `displayName` for unknown ones). The generated hook call is conditionally skipped (pass `{ enabled: false }` as React Query option).
- **Returns:** generated hook exposes `{ data, isPending, error }` (TanStack Query v5 style). Block maps `data.identityProviders.nodes` to `IdentityProvider[]`, filtered to `enabled = true`.
- **Adapter override:** when `props.providers` is set (static mode), the generated hook is bypassed entirely. No `onSubmit` adapter is relevant for a query block; consumers wanting a custom provider list use the `providers` prop.
- **Caches aggressively:** pass `staleTime: 5 * 60 * 1000` (5 minutes) in React Query options since providers change rarely.

### `social-buttons.requires.json`

The install-time check (`constructive-blocks` skill) reads this to verify the host's generated `auth` SDK exports the named op before the block is installed.

```json
{
  "namespace": "auth",
  "mutations": [],
  "queries": ["identityProviders"],
  "models": ["identityProviders"]
}
```

## Callbacks

- `onProviderClick(provider, url)` — fires before navigation. Return `false` to cancel. Use for analytics tracking.
- `onError(err)` — fires if provider list fetch fails.
- `onMessage({ kind, key, message? })` — e.g., `{ kind: 'info', key: 'noProviders' }` when list is empty.

## Captcha

Not applicable to this block. Captcha is handled at the form-submission level in [[auth-sign-in-card]] / [[auth-sign-up-card]].

## Step-up

Not applicable. OAuth flow handles its own authentication handshake.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Provider list fetch error | `messages.errors.UNKNOWN_ERROR` (error) |

No success toast — OAuth flow navigates away entirely; post-redirect success is handled by the destination page.

## Built-in provider icons

| Slug | Icon |
|---|---|
| `google` | Official Google "G" coloured SVG |
| `github` | GitHub Invertocat mark |
| `apple` | Apple logo |
| `facebook` | Facebook "f" logo |
| `microsoft` | Microsoft four-coloured windows logo |
| `linkedin` | LinkedIn "in" logo |
| `slack` | Slack pinwheel logo |
| `*` (any other slug) | `generic-oauth.tsx` (circuit/globe icon) |

All icons are inline SVG React components, no external dependencies. They follow the container's `currentColor` for monochrome contexts (e.g., `icon-only` layout with dark mode).

## Accessibility

- Each button has `aria-label` from `signInWith` / `signUpWith` / `continueWith` (with provider name interpolated).
- Icon-only layout: `aria-label` is critical (from `iconOnlyAriaLabel`).
- Loading state: buttons replaced with `<Skeleton>` elements with `aria-label` from `loadingAriaLabel`.
- No `tabIndex` manipulation — standard button focus order.

## Notes / gotchas

- **Dynamic vs static**: when `providers` prop is set, the block bypasses DB entirely. This is intentional — use it on marketing pages or when the DB isn't accessible (e.g., pre-auth landing page). For app sign-in pages, prefer dynamic (default) so admin toggles take effect.
- **OAuth middleware path**: the default `/auth/{slug}` must be served by the Constructive Express server. If your Next.js app and the Express server are on different origins, set `baseOAuthPath` to the full URL (e.g., `https://auth.example.com/auth`).
- **`return_to` encoding**: the block URL-encodes `returnTo` when appending to the OAuth URL.
- **LinkedIn not pre-seeded in DB**: if you want LinkedIn, either pre-seed it or pass `providers={['linkedin']}` with static override (the OAuth package supports it).
- **Custom providers**: any slug not in the built-in icon set renders the generic icon. The block does NOT validate slugs against the DB fixture list.
- This block is the low-level "buttons" block. [[auth-social-providers-grid]] uses it internally. Primary sign-in/up cards (`auth-sign-in-card`, `auth-sign-up-card`) depend on the grid, not on this block directly. See [[auth-account-connected-accounts]] for managing already-linked accounts.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/social-buttons/`
- Icons should be colocated in `lib/auth/social-icons/`. Keep them as pure SVG React components (no icon library dep).
- `layout='grid'` renders 2-column grid for 4+ providers, 1-column for fewer.
- `layout='icon-only'` renders small square icon buttons only.
- Storybook stories: stacked (3 providers), grid (5 providers), icon-only, static override, loading, no providers, with custom renderButton.
- Provider list should be sorted: built-in providers first (in slug alphabetical order), then custom.
