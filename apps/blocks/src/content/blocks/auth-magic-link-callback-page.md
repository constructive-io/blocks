# auth-magic-link-callback-page

**Type:** `registry:page`
**Status:** `v1 (frontend ready, backend pending)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-credentials.md`
**Master entry:** `blocks-master.md#auth-magic-link-callback-page`

**Backend status:** pending — `sign_in_magic_link` is not deployed in `constructive_auth_public` today. See `backend-spec/future-procedures.md`.

## Purpose

Handles the `/auth/magic-link?token=...` URL that users land on from their email client. On mount, calls `constructive_auth_public.sign_in_magic_link(token, credential_kind)`. Transitions through loading → success (redirect) or error (expired/invalid) states. No user input required — fully automatic on load.

## When to use

- Mount at `/auth/magic-link` (the URL embedded in magic-link emails).
- Not a fit when: you need interactive code entry — use [[auth-email-otp-input]] for OTP flows instead.

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `app/auth/magic-link/page.tsx` | `registry:page` |
| `app/auth/magic-link/magic-link-callback-page.requires.json` | `registry:file` |
| `lib/auth/messages/magic-link-callback-page-messages.ts` | `registry:lib` |
| `lib/auth/errors.ts` | `registry:lib` (shared, auto-deduped) |

> No data hook is shipped. The page imports its mutation hook (`useSignInMagicLinkMutation`) from the host's generated `auth` SDK (`@/generated/auth`). Only the messages catalog, the shared errors util, and the `requires.json` manifest are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (Constructive block; supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `layout-kit`
- `card` (shadcn primitive)
- `button` (shadcn primitive)
- **`auth-mfa-totp-challenge-page`** — must be installed separately. This page routes to `MFA_PATH` (`/auth/mfa/totp`) on `mfa_required=true`; without [[auth-mfa-totp-challenge-page]], the MFA redirect produces a 404.

## Runtime (npm) dependencies

- `next` (peer, ^15)
- `react` (peer, ^19)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; it arrives transitively via the `blocks-runtime` registry dependency. The generated `auth` SDK is the host's, not a published dep of this block.

## DB procedures used by default hook

- `constructive_auth_public.sign_in_magic_link(token text, credential_kind text)` — schema `constructive_auth_public` → **namespace `auth`** → generated op `signInMagicLink` → hook `useSignInMagicLinkMutation`.
  Backend source: `proc_sign_in_magic_link_body` in `constructive-db/packages/ast-plpgsql/`.
  Returns same shape as `sign_in`: `(id, user_id, access_token, access_token_expires_at, is_verified, totp_enabled, mfa_required, mfa_challenge_token)`.

CSRF token is attached below the block — by the runtime adapter / server (`app_settings_auth.require_csrf_for_auth`), see `contracts/endpoint-contract.md` §3. The block does NOT read or set `csrf_token`; it is omitted from the mutation vars the block passes.

## Props

No exported React props. Configurable constants in installed page:

```ts
const DEFAULT_REDIRECT = '/dashboard';
const SIGN_IN_PATH = '/auth/sign-in';
const MAGIC_LINK_REQUEST_PATH = '/auth/magic-link-request';
const MFA_PATH = '/auth/mfa/totp';
const CREDENTIAL_KIND = 'bearer';
```

## Messages catalog

```ts
export type MagicLinkCallbackPageMessages = {
  loadingTitle: string;
  loadingDescription: string;
  successTitle: string;
  successDescription: string;
  expiredTitle: string;
  expiredDescription: string;
  expiredRequestNewLink: string;
  invalidTitle: string;
  invalidDescription: string;
  missingTokenTitle: string;
  missingTokenDescription: string;
  /** Error messages — UPPER_SNAKE_CASE keys match err.extensions.code from PostGraphile */
  errors: {
    EXPIRED_TOKEN: string;
    INVALID_TOKEN: string;
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultMagicLinkCallbackPageMessages: MagicLinkCallbackPageMessages = {
  loadingTitle: 'Signing you in…',
  loadingDescription: 'Please wait while we verify your link.',
  successTitle: 'Signed in',
  successDescription: 'You have been signed in successfully. Redirecting…',
  expiredTitle: 'Link expired',
  expiredDescription: 'This sign-in link has expired or has already been used. Request a new one.',
  expiredRequestNewLink: 'Request a new link',
  invalidTitle: 'Invalid link',
  invalidDescription: 'This sign-in link is invalid.',
  missingTokenTitle: 'Invalid link',
  missingTokenDescription: 'This sign-in link is missing required parameters. Try clicking the link in your email again.',
  errors: {
    EXPIRED_TOKEN: 'This sign-in link has expired.',
    INVALID_TOKEN: 'This sign-in link is invalid.',
    PROCEDURE_NOT_FOUND: 'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures',
    UNKNOWN_ERROR: 'Sign-in failed. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The page does **not** ship a `use-magic-link-sign-in.ts`. It imports the generated mutation hook from the host's `auth` SDK. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

- **Import:** `import { useSignInMagicLinkMutation } from '@/generated/auth';` (real generated name — `sign_in_magic_link` → `signInMagicLink` → `useSignInMagicLinkMutation`, per `endpoint-contract.md` §7.)
- **Instantiate with a selection** of exactly the payload fields this page consumes:
  ```ts
  const defaultMutation = useSignInMagicLinkMutation({
    selection: { fields: {
      id: true, userId: true, accessToken: true, accessTokenExpiresAt: true,
      isVerified: true, mfaRequired: true, mfaChallengeToken: true,
    } },
  });
  ```
- **Call + read the payload via the operation key:**
  ```ts
  const result = await defaultMutation.mutateAsync({ token, credentialKind })
    .then((d) => d.signInMagicLink);
  ```
  `vars` carries `token`, `credentialKind` — **never** `csrf_token` (handled below the block).
- **Returns:** generated hook exposes `{ mutateAsync, isPending, error }` (TanStack Query v5 style).
- **Invoked:** on component mount (auto-fires when `?token=` param is present). Not user-triggered.
- **Missing token:** if `token` absent from URL, transitions to `'missing-token'` state immediately.
- **Result handling:**
  - Success, no MFA: transitions to `'success'`, routes to `redirect || DEFAULT_REDIRECT`.
  - Success, MFA required: routes to `MFA_PATH?token=mfaChallengeToken&redirect=...`.
  - Exception `EXPIRED_TOKEN`: transitions to `'expired'` state.
  - Exception `INVALID_TOKEN`: transitions to `'invalid'` state.
  - Other error: transitions to `'invalid'` state.

> **Backend pending** — `sign_in_magic_link` is not yet deployed. The block ships its `requires.json` so the `check-sdk.mjs` install-time check will fail with a precise message if the host SDK does not export the named op.

### `magic-link-callback-page.requires.json`

```json
{
  "namespace": "auth",
  "mutations": ["signInMagicLink"],
  "queries": [],
  "models": []
}
```

## Internal state

```ts
type PageState = 'loading' | 'success' | 'expired' | 'invalid' | 'missing-token';
```

## Callbacks / routing

```ts
// On success (no MFA):
router.push(redirect || DEFAULT_REDIRECT);

// On success (MFA required):
router.push(`${MFA_PATH}?token=${encodeURIComponent(mfaChallengeToken)}&redirect=${encodeURIComponent(redirect)}`);

// On expired: show state with link to MAGIC_LINK_REQUEST_PATH.
// On invalid: show state with link to SIGN_IN_PATH.
```

## Captcha

N/A — no user-submitted form. Token-gated endpoint.

## Step-up

N/A.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Loading / success | none — state transitions are the feedback |
| Unknown error | `messages.errors.UNKNOWN_ERROR` (error) |

## Accessibility

- Loading state uses `aria-busy` on the card.
- States announced via heading structure (`<h1>` changes per state).
- Error states use `role="alert"` so screen readers announce immediately.
- CTA links have descriptive text.

## Notes / gotchas

- Magic link tokens are `cnc_live_ot_...` format. One-time use. If the user clicks the same link twice, the second attempt returns `INVALID_TOKEN` (or `EXPIRED_TOKEN` if the DB deletes on first use).
- Pattern mirrors [[auth-verify-email-page]] — mutation fires on mount, state machine handles results.
- If `mfa_required=true` in the result, route to TOTP challenge exactly as [[auth-sign-in-page]] does.
- `?redirect=` is validated as same-origin before use (open-redirect protection).

## Cross-references

- Request: [[auth-magic-link-request-card]]
- Sent confirmation: [[auth-magic-link-sent-page]]
- MFA follow-up: [[auth-mfa-totp-challenge]] (cross-vertical, owned by MFA vertical)

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/magic-link-callback-page/`
- This is a Client Component (needs `useSearchParams`). Wrap with `<Suspense>` at the page level per Next.js 15 requirements.
- Storybook: stories for each state (loading, success, expired, invalid, missing-token).
