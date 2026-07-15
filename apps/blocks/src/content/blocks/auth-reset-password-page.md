# auth-reset-password-page

**Type:** `registry:page`
**Status:** `v1 (frontend ready)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-credentials.md`
**Master entry:** `blocks-master.md#auth-reset-password-page`

## Purpose

Next.js 15 page wrapping [[auth-reset-password-card]] with `layout-kit` centered layout. Passes `?token=` and `?role_id=` searchParams as props to the card. On success, routes to the sign-in page.

## When to use

- The standard `/auth/reset-password` route in a Next.js 15 app (this is the link target in password reset emails).
- Use the card directly for custom flows.

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `app/auth/reset-password/page.tsx` | `registry:page` |

## Registry dependencies

- `auth-reset-password-card` (pulled automatically)
- `layout-kit`

## Runtime (npm) dependencies

- `next` (peer, ^15)
- `react` (peer, ^19)

## DB procedures used by default hook

None directly. Delegates to [[auth-reset-password-card]]'s `useResetPasswordMutation`.

## Props

No exported React props. Configurable constants in installed page:

```ts
const SIGN_IN_PATH = '/auth/sign-in';
const FORGOT_PASSWORD_PATH = '/auth/forgot-password';
```

## Messages catalog

Inherits from [[auth-reset-password-card]]. No additional page-level messages.

## Default data hook (generated, not shipped)

None. Thin wrapper — delegates entirely to [[auth-reset-password-card]].

## Callbacks / routing

```ts
// onSuccess handler — navigate to sign-in:
router.push(SIGN_IN_PATH);
```

The card's `forgotPasswordPath` prop is set to `FORGOT_PASSWORD_PATH` so expired-token state links correctly.

## Captcha

N/A for reset-password (see card spec).

## Step-up

N/A.

## Notifications

Delegated to [[auth-reset-password-card]].

## Accessibility

Inherits. `layout-kit` provides landmark `<main>`.

## Notes / gotchas

- `token` and `role_id` are read server-side from `searchParams` and passed to the card as props. The card itself is a client component but receives them as strings, not reading the URL directly. This is the correct pattern for Next.js 15 App Router.
- If either param is missing, the card transitions to `'missing-token'` state immediately.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/reset-password-page/`
