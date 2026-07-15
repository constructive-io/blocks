# auth-forgot-password-page

**Type:** `registry:page`
**Status:** `v1 (frontend ready)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-credentials.md`
**Master entry:** `blocks-master.md#auth-forgot-password-page`

## Purpose

Next.js 15 page wrapping [[auth-forgot-password-card]] with `layout-kit` centered layout and branding. No redirect logic needed — the card handles confirmation state internally. Pre-fills email from `?email=` searchParam if present (e.g., when navigated from the sign-in form's "Forgot password?" link).

## When to use

- Standard `/auth/forgot-password` route in a Next.js 15 app.
- Use the card directly for embedded flows (modal, multi-step).

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `app/auth/forgot-password/page.tsx` | `registry:page` |

## Registry dependencies

- `auth-forgot-password-card` (pulled automatically)
- `layout-kit`

## Runtime (npm) dependencies

- `next` (peer, ^15)
- `react` (peer, ^19)

## DB procedures used by default hook

None directly. Delegates to [[auth-forgot-password-card]]'s `useForgotPasswordMutation`.

## Props

No exported React props. Configurable constants in the installed page:

```ts
const SIGN_IN_PATH = '/auth/sign-in';
```

## Messages catalog

Inherits from [[auth-forgot-password-card]]. No additional page-level messages.

## Default data hook (generated, not shipped)

None. Thin wrapper — delegates entirely to [[auth-forgot-password-card]].

## Callbacks / routing

No navigation on success — the card transitions to its confirmed state internally. The only navigation from this page is the "Back to sign in" link in the card (rendered as a Next.js `<Link>`).

## Captcha

Passed through to `<ForgotPasswordCard captcha={...}>` — edit the installed page to enable.

## Step-up

N/A.

## Notifications

Delegated to [[auth-forgot-password-card]].

## Accessibility

Inherits. `layout-kit` provides landmark `<main>`.

## Notes / gotchas

- `?email=` searchParam pre-fills the email field to reduce friction when navigated from a sign-in "Forgot password?" link that already knows the typed email.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/forgot-password-page/`
