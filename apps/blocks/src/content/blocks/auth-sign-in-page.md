# auth-sign-in-page

**Type:** `registry:page`
**Status:** `v1 (frontend ready)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-credentials.md`
**Master entry:** `blocks-master.md#auth-sign-in-page`

## Purpose

Next.js 15 page that composes [[auth-sign-in-card]] with branding, centered layout via `layout-kit`, and thin router glue. Reads `?redirect=` from searchParams and routes after successful sign-in. Handles MFA branching by routing to `/auth/mfa/totp` (or a custom `mfaPath`). Intended as the one-shot install for the standard `/sign-in` route.

## When to use

- Installing a complete sign-in route in a Next.js 15 app.
- The card is already available — use this page to get the full route (layout + redirect logic) without writing glue code.
- Not a fit when: you need the form embedded inside another page or modal — use [[auth-sign-in-card]] directly.

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `app/auth/sign-in/page.tsx` | `registry:page` |

## Registry dependencies

- `auth-sign-in-card` (pulled automatically)
- `layout-kit` (centered auth layout wrapper)
- **`auth-mfa-totp-challenge-page`** — must be installed separately. This page routes to `MFA_PATH` (`/auth/mfa/totp`) on `mfa_required=true`; without [[auth-mfa-totp-challenge-page]], the MFA redirect produces a 404.

## Runtime (npm) dependencies

- `next` (peer, ^15)
- `react` (peer, ^19)
- (All card deps pulled transitively)

## DB procedures used by default hook

None directly. Delegates entirely to [[auth-sign-in-card]]'s generated `useSignInMutation` hook (imported from `@/generated/auth` by the card).

## Props

Page components in Next.js 15 receive `searchParams` as a prop (async). This page has no exported React props beyond what Next.js provides. Configuration is via the page's source (edited after install).

```ts
// Editable constants at the top of the installed page file:
const DEFAULT_REDIRECT = '/dashboard';
const MFA_PATH = '/auth/mfa/totp';
const SIGN_UP_PATH = '/auth/sign-up';
const FORGOT_PASSWORD_PATH = '/auth/forgot-password';
```

For advanced control (custom layout, custom redirect logic), use [[auth-sign-in-card]] directly.

## Messages catalog

Inherits all messages from [[auth-sign-in-card]]. No additional page-level messages.

## Default hook contract

None. The page is a thin Next.js wrapper; all data fetching is delegated to [[auth-sign-in-card]].

## Callbacks / routing

```ts
// Inside the page's onSuccess handler:
const redirectTo = searchParams.redirect
  ? decodeURIComponent(searchParams.redirect)
  : DEFAULT_REDIRECT;
router.push(redirectTo);

// Inside onMfaRequired:
router.push(`${MFA_PATH}?token=${encodeURIComponent(challengeToken)}&redirect=${encodeURIComponent(redirectTo)}`);
```

- `?redirect=` is validated against a same-origin allowlist before use (open-redirect protection). External URLs are ignored and `DEFAULT_REDIRECT` is used instead.
- `onError` is wired but does not navigate — the card renders inline errors.

## Captcha

Configured by passing `captcha` prop to `<SignInCard>` inside the installed page. Off by default.

## Step-up

N/A (sign-in page is the authentication step itself).

## Notifications (default toasts)

Delegated to [[auth-sign-in-card]].

## Accessibility

Inherits card accessibility. `layout-kit` provides a landmark `<main>` with appropriate ARIA region.

## Notes / gotchas

- `?redirect=` open-redirect protection: only same-origin paths are honoured. Validate with `new URL(redirect, window.location.origin).origin === window.location.origin`.
- MFA token is passed via query param to the challenge page — it is a short-lived opaque token (`cnc_live_mfa_...`), not a secret credential, so URL transit is acceptable.
- If `app_settings_auth.allow_password_sign_in=false`, the sign-in card will receive a `SIGN_IN_DISABLED` error from the server — no additional page-level handling needed.
- Page uses `layout-kit`'s centered card variant with an optional logo slot (set `BRAND_LOGO_SRC` constant in the installed file).

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/sign-in-page/`
- This is a Next.js Server Component that renders a Client Component card. The `searchParams` read happens server-side.
- Storybook: not applicable for page files; test in Playwright E2E (`constructive-hub`).
