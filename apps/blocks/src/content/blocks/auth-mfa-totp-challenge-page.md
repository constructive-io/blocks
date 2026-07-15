# auth-mfa-totp-challenge-page

**Type:** `registry:page`
**Status:** `v1 (frontend ready, backend pending)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-mfa.md`
**Master entry:** `blocks-master.md#auth-mfa-totp-challenge-page`

**Backend status:** pending — this page mounts [[auth-mfa-totp-challenge]], whose default hook calls `complete_mfa_challenge`. That procedure is not yet deployed in `constructive_auth_public`. See `backend-spec/future-procedures.md`.

**Pairing:** Paired with [[auth-mfa-totp-challenge]] — this page reads `?token=` and `?redirect=` from `useSearchParams` and passes them to the card. It is the canonical registry route for the MFA TOTP challenge step.

## Purpose

Next.js 15 page mounted at `/auth/mfa/totp`. Receives a `challengeToken` (from `sign_in` or `sign_in_magic_link` returning `mfa_required=true`) via the `?token=` query parameter and an optional `?redirect=` safe-URL. Reads both from `useSearchParams`, validates that `?token=` is present, and mounts `<MfaTotpChallenge>`. On success, routes to the redirect or `DEFAULT_REDIRECT`. Shows an error state if the token is missing or expired.

This page is the glue that lets [[auth-sign-in-page]] and [[auth-magic-link-callback-page]] push to a named route (`/auth/mfa/totp`) without embedding the challenge UI inline. Consumers who install either page MUST also install this page to complete the MFA flow.

## When to use

- Install alongside [[auth-sign-in-page]] or [[auth-magic-link-callback-page]] when MFA is enabled in `app_settings_auth`.
- Not a fit when: you want the MFA step embedded inline within the sign-in page (use [[auth-mfa-totp-challenge]] card directly inside a custom sign-in component instead).

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `app/auth/mfa/totp/page.tsx` | `registry:page` |
| `lib/auth/messages/mfa-totp-challenge-page-messages.ts` | `registry:lib` |

## Registry dependencies

- `auth-mfa-totp-challenge` (pulled automatically; this page is its thin wrapper)
- `layout-kit` (centered layout)
- `card` (error state card)
- `button` (error state CTA)

## Runtime (npm) dependencies

- `next` (peer, ^15)
- `react` (peer, ^19)
- (All card deps pulled transitively via `auth-mfa-totp-challenge`)

## DB procedures used by default hook

None directly. Delegates entirely to [[auth-mfa-totp-challenge]]'s generated hook (`useCompleteMfaChallengeMutation`). This page is presentational — it contains no `@constructive-io/data` imports, no generated-hook calls, and ships no `requires.json`.

## Props

Page components in Next.js 15 receive `searchParams` as a prop (async Server Component). This page has no exported React props beyond what Next.js provides. Configuration is via editable constants in the installed page file.

```ts
// Editable constants at the top of the installed page file:
const DEFAULT_REDIRECT = '/dashboard';
const SIGN_IN_PATH = '/auth/sign-in';
```

For advanced control (custom layout, custom error handling), use [[auth-mfa-totp-challenge]] directly.

## Messages catalog

```ts
export type MfaTotpChallengePageMessages = {
  /** Shown when ?token= is absent from the URL */
  missingTokenTitle: string;
  missingTokenDescription: string;
  missingTokenCta: string;
  /** Shown when the challenge token has expired (EXPIRED_TOKEN from the card's onError) */
  expiredTokenTitle: string;
  expiredTokenDescription: string;
  expiredTokenCta: string;
};

export const defaultMfaTotpChallengePageMessages: MfaTotpChallengePageMessages = {
  missingTokenTitle: 'Invalid link',
  missingTokenDescription: 'This sign-in link is missing required parameters. Please sign in again.',
  missingTokenCta: 'Back to sign in',
  expiredTokenTitle: 'Session expired',
  expiredTokenDescription: 'Your sign-in session has expired. Please sign in again to get a new verification link.',
  expiredTokenCta: 'Sign in again',
};
```

## Default data hook (generated, not shipped)

None. The page is a thin Next.js wrapper; all mutation logic is delegated to [[auth-mfa-totp-challenge]]. This page is presentational — no generated hook import, no `requires.json` manifest.

## Callbacks / routing

```ts
// Inside the page — passed to <MfaTotpChallenge> as onSuccess:
const redirectTo = searchParams.redirect
  ? decodeURIComponent(searchParams.redirect)
  : DEFAULT_REDIRECT;
router.push(redirectTo);

// Error state — if ?token= is missing:
// Renders missingTokenTitle / missingTokenDescription / missingTokenCta → link to SIGN_IN_PATH

// Error state — if card calls onError with EXPIRED_TOKEN:
// Transitions to expiredToken state → renders expiredTokenTitle / ... → link to SIGN_IN_PATH
```

- `?redirect=` is validated against a same-origin allowlist before use (open-redirect protection). External URLs are ignored and `DEFAULT_REDIRECT` is used instead.
- `?token=` is passed directly to `<MfaTotpChallenge challengeToken={token} />`. It is a short-lived opaque string (`cnc_live_mfa_...`); URL transit is acceptable.

## Internal state

```ts
type PageState = 'ready' | 'missing-token' | 'expired';
```

The page starts in `'ready'` if `?token=` is present, or `'missing-token'` immediately if absent. Transitions to `'expired'` when the card's `onError` fires with code `EXPIRED_TOKEN`.

## Captcha

N/A — no user-submitted rate-limited form at this level. Captcha is not applicable to MFA verification.

## Step-up

N/A — this page IS the authentication challenge step itself.

## Notifications (default toasts)

Delegated to [[auth-mfa-totp-challenge]].

## Accessibility

- Error states use `role="alert"` and an `<h1>` with the error title.
- CTA links are descriptive ("Back to sign in", "Sign in again").
- Inherits card accessibility from [[auth-mfa-totp-challenge]].

## Notes / gotchas

- **Install dependency**: consumers who install [[auth-sign-in-page]] or [[auth-magic-link-callback-page]] MUST also install this page. Without it, the MFA redirect from those pages hits a 404. Add an install-time note in the registry.
- **Token expiry**: `mfa_challenge_expiry` is configurable in `app_settings_auth`. If the user opens the sign-in tab and then sits idle, the challenge token may expire before they reach this page. The `EXPIRED_TOKEN` error from the card transitions the page to the expired state and surfaces a "Sign in again" CTA.
- **Same-origin redirect validation**: `?redirect=` must be validated server-side or at the point of use. Use `new URL(redirect, window.location.origin).origin === window.location.origin` before pushing. See [[auth-sign-in-page]] for the same pattern.
- **Client Component**: this page uses `useSearchParams()` and must be a Client Component (or wrapped in `<Suspense>` per Next.js 15 requirements for `useSearchParams`).
- The `?token=` value is the `mfa_challenge_token` from the `sign_in` or `sign_in_magic_link` result. It is NOT the session access token.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/mfa-totp-challenge-page/`
- This is a Client Component (needs `useSearchParams`). Wrap with `<Suspense fallback={<Skeleton />}>` at the route segment level per Next.js 15 requirements.
- Storybook: not applicable for page files; test states (ready, missing-token, expired) in Playwright E2E.
- The page is intentionally thin (~40 lines). All form logic lives in [[auth-mfa-totp-challenge]].
