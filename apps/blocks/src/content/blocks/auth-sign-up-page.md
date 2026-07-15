# auth-sign-up-page

**Type:** `registry:page`
**Status:** `v1 (frontend ready)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-credentials.md`
**Master entry:** `blocks-master.md#auth-sign-up-page`

## Purpose

Next.js 15 page that composes [[auth-sign-up-card]] with branding, centered layout via `layout-kit`, and post-registration redirect logic. Reads `?redirect=` from searchParams. After successful sign-up, routes to a configurable destination (default: `/dashboard` or a verification-pending page if `isVerified=false`).

## When to use

- Installing a complete sign-up route in a Next.js 15 app.
- Use the card block directly for embedded registration (modal, multi-step onboarding, etc.).

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `app/auth/sign-up/page.tsx` | `registry:page` |

## Registry dependencies

- `auth-sign-up-card` (pulled automatically)
- `layout-kit`

## Runtime (npm) dependencies

- `next` (peer, ^15)
- `react` (peer, ^19)

## DB procedures used by default hook

None directly. Delegates to [[auth-sign-up-card]]'s generated `useSignUpMutation` hook (imported from `@/generated/auth` by the card).

## Props

No exported React props. Configurable via constants in the installed page file:

```ts
const DEFAULT_REDIRECT = '/dashboard';
const VERIFY_EMAIL_PATH = '/auth/verify-email-sent';
const SIGN_IN_PATH = '/auth/sign-in';
```

## Messages catalog

Inherits all messages from [[auth-sign-up-card]]. No additional page-level messages.

## Default hook contract

None. Thin wrapper only.

## Callbacks / routing

```ts
// onSuccess handler in installed page:
if (!result.isVerified) {
  router.push(VERIFY_EMAIL_PATH);
} else {
  const redirectTo = searchParams.redirect
    ? decodeURIComponent(searchParams.redirect)
    : DEFAULT_REDIRECT;
  router.push(redirectTo);
}
```

- `?redirect=` validated as same-origin before use (open-redirect protection).

## Captcha

Passed through to `<SignUpCard captcha={...}>` — edit the installed page file to enable.

## Step-up

N/A.

## Notifications

Delegated to [[auth-sign-up-card]].

## Accessibility

Inherits card accessibility. `layout-kit` provides landmark `<main>`.

## Notes / gotchas

- If `app_settings_auth.allow_sign_up=false`, the server returns `SIGN_UP_DISABLED`. Consider adding a server-side redirect in `page.tsx` if you want to hide the form entirely (query feature flags at page load).
- The page routes to `VERIFY_EMAIL_PATH` when `isVerified=false`. This should be a dedicated "check your email" info page (see [[auth-verify-email-page]] for the actual token confirmation page).

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/sign-up-page/`
- Test: Playwright E2E in `constructive-hub`.
