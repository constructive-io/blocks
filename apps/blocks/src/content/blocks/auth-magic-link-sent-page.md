# auth-magic-link-sent-page

**Type:** `registry:page`
**Status:** `v1 (frontend ready, backend pending)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-credentials.md`
**Master entry:** `blocks-master.md#auth-magic-link-sent-page`

**Backend status:** pending — `request_magic_link` is not deployed in `constructive_auth_public` today. See `backend-spec/future-procedures.md`.

## Purpose

Static confirmation page shown after [[auth-magic-link-request-card]] submits successfully. Provides a "Check your email" affordance with: resend CTA (calls `request_magic_link` again), "Use a different email" link (navigates back to the request card), and a countdown until resend is re-enabled.

## When to use

- Navigate to this page from [[auth-magic-link-request-card]]'s `onSuccess` (the page variant; the card already shows inline confirmation when used stand-alone).
- This page is optional — the card already shows inline confirmation. Use it when you prefer navigation over inline state transition (e.g., separate URL per flow step).
- Not a fit when: you need the inline flow — use [[auth-magic-link-request-card]]'s built-in confirmed state.

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `app/auth/magic-link-sent/page.tsx` | `registry:page` |
| `app/auth/magic-link-sent/magic-link-sent-page.requires.json` | `registry:file` |
| `lib/auth/messages/magic-link-sent-page-messages.ts` | `registry:lib` |

> No data hook is shipped. The page imports its mutation hook (`useRequestMagicLinkMutation`) from the host's generated `auth` SDK (`@/generated/auth`). Only the messages catalog and the `requires.json` manifest are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (Constructive block; supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `layout-kit`
- `button` (shadcn primitive)
- `card` (shadcn primitive)

## Runtime (npm) dependencies

- `next` (peer, ^15)
- `react` (peer, ^19)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; it arrives transitively via the `blocks-runtime` registry dependency. The generated `auth` SDK is the host's, not a published dep of this block.

## DB procedures used by default hook

- `constructive_auth_public.request_magic_link(email citext)` — resend CTA — schema `constructive_auth_public` → **namespace `auth`** → generated op `requestMagicLink` → hook `useRequestMagicLinkMutation`. Returns `void`.

## Props

No exported React props. Reads `?email=` searchParam for display + resend. Configurable constants in installed page:

```ts
const MAGIC_LINK_REQUEST_PATH = '/auth/magic-link';
const SIGN_IN_PATH = '/auth/sign-in';
const RESEND_COOLDOWN_SECONDS = 60;
```

## Messages catalog

```ts
export type MagicLinkSentPageMessages = {
  title: string;
  /** Runtime interpolation: {{email}} */
  description: string;
  resendButton: string;
  resendPending: string;
  /** Runtime interpolation: {{seconds}} */
  resendCooldown: string;
  resendSuccess: string;
  differentEmailLink: string;
  signInLink: string;
  /** Error messages — UPPER_SNAKE_CASE keys match err.extensions.code from PostGraphile */
  errors: {
    RATE_LIMITED: string;
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultMagicLinkSentPageMessages: MagicLinkSentPageMessages = {
  title: 'Check your email',
  description: 'We sent a sign-in link to {{email}}. The link expires in a few minutes.',
  resendButton: 'Resend email',
  resendPending: 'Resending…',
  resendCooldown: 'Resend in {{seconds}}s',
  resendSuccess: 'Email resent. Check your inbox.',
  differentEmailLink: 'Use a different email',
  signInLink: 'Back to sign in',
  errors: {
    RATE_LIMITED: 'Too many requests. Please wait before trying again.',
    PROCEDURE_NOT_FOUND: 'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures',
    UNKNOWN_ERROR: 'Failed to resend email. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The page does **not** ship a data hook. It imports `useRequestMagicLinkMutation` from the host's generated `auth` SDK (`@/generated/auth`).

- **Import:** `import { useRequestMagicLinkMutation } from '@/generated/auth';`
- **Resend CTA calls:**
  ```ts
  await defaultMutation.mutateAsync({ email }).then((d) => d.requestMagicLink);
  ```
  `vars` carries `email` — **never** `csrf_token` (handled below the block).
- Email is read from `?email=` searchParam or sessionStorage (fallback for direct navigation).
- Resend cooldown tracked in component state via `setInterval`. Resets on resend success.

> **Backend pending** — `request_magic_link` is not yet deployed. The block ships its `requires.json` so the `check-sdk.mjs` install-time check will fail with a precise message if the host SDK does not export the named op.

### `magic-link-sent-page.requires.json`

```json
{
  "namespace": "auth",
  "mutations": ["requestMagicLink"],
  "queries": [],
  "models": []
}
```

## Callbacks / routing

```ts
// Resend success:
// Toast fires, countdown resets. No navigation.

// "Use a different email" link:
router.push(MAGIC_LINK_REQUEST_PATH);

// "Back to sign in" link:
router.push(SIGN_IN_PATH);
```

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Resend success | `messages.resendSuccess` (info) |
| `RATE_LIMITED` | `messages.errors.RATE_LIMITED` (error) |
| Unknown | `messages.errors.UNKNOWN_ERROR` (error) |

## Accessibility

- Resend button disabled + shows `resendCooldown` text (with `{{seconds}}` interpolated) during cooldown.
- `aria-live="polite"` for resend success message.
- `aria-busy="true"` on resend button during `isPending`.

## Notes / gotchas

- Resend cooldown: track `lastResendAt` in component state. Show countdown (e.g., "Resend in 30s") to discourage abuse. Reset on successful resend.
- Email must be passed via `?email=` searchParam or sessionStorage — do NOT rely on URL alone (user may navigate directly to this page from bookmarks).
- If `?email=` is absent, show the page with resend CTA disabled and a "Return to magic link form" link.
- Magic link tokens are `cnc_live_ot_...`. One-time use.

## Cross-references

- Request card: [[auth-magic-link-request-card]]
- Token exchange: [[auth-magic-link-callback-page]]

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/magic-link-sent-page/`
- This is a Next.js Server Component (reads `searchParams`) that renders a Client Component for the countdown/resend logic.
- Storybook: test resend states (cooldown, pending, success) at the Client Component level.
