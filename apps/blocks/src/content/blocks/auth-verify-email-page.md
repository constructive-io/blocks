# auth-verify-email-page

**Type:** `registry:page`
**Status:** `v1 (frontend ready)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-credentials.md`
**Master entry:** `blocks-master.md#auth-verify-email-page`

## Purpose

One-time email verification confirmation page. Reads `?email_id=` and `?token=` from the URL (the link sent by `send_verification_email`). On mount, calls `constructive_auth_public.verify_email(email_id, token)` and transitions to a success, expired, or invalid state. No form — the user lands here from their email client.

## When to use

- The target URL of verification emails sent by `send_verification_email` and the `sign_up` flow.
- This is a page-only block (no card variant needed — it is a single-state landing, not an interactive form).
- Not a fit when: you need the "resend verification" affordance in the app shell — use [[auth-verify-email-banner]].

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `app/auth/verify-email/page.tsx` | `registry:page` |
| `app/auth/verify-email/verify-email-page.requires.json` | `registry:file` |
| `lib/auth/messages/verify-email-page-messages.ts` | `registry:lib` |
| `lib/auth/errors.ts` | `registry:lib` (shared, auto-deduped) |

> No data hook is shipped. The page imports its mutation hooks (`useVerifyEmailMutation`, `useSendVerificationEmailMutation`) from the host's generated `auth` SDK (`@/generated/auth`). Only the messages catalog, the shared errors util, and the `requires.json` manifest are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (Constructive block; supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `layout-kit`
- `button` (shadcn primitive, for CTA links)
- `card` (shadcn primitive)

## Runtime (npm) dependencies

- `next` (peer, ^15)
- `react` (peer, ^19)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; it arrives transitively via the `blocks-runtime` registry dependency. The generated `auth` SDK is the host's, not a published dep of this block.

## DB procedures used by default hook

- `constructive_auth_public.verify_email(email_id uuid, token text)` — schema `constructive_auth_public` → **namespace `auth`** → generated op `verifyEmail` → hook `useVerifyEmailMutation`.
  Returns: `boolean`
  Effect: Sets `emails.is_verified=true`, `app_memberships.is_verified=true` for the matching email row.

- `constructive_auth_public.send_verification_email(email citext)` — schema `constructive_auth_public` → **namespace `auth`** → generated op `sendVerificationEmail` → hook `useSendVerificationEmailMutation`.
  Used in the `'expired'` state resend CTA.

CSRF token is attached below the block — by the runtime adapter / server (`app_settings_auth.require_csrf_for_auth`), see `contracts/endpoint-contract.md` §3. The block does NOT read or set `csrf_token`; it is omitted from the mutation vars the block passes.

`verify_email` returns `boolean`; a `false` result maps to the `'invalid'` state, while an `EXPIRED_TOKEN` or `INVALID_TOKEN` exception maps to the `'expired'` / `'invalid'` state (see Result handling below).

## Props

No exported React props. Configurable constants in the installed page:

```ts
const SIGN_IN_PATH = '/auth/sign-in';
const DASHBOARD_PATH = '/dashboard';
const RESEND_PATH = '/auth/forgot-verification'; // or trigger inline resend
```

## Messages catalog

```ts
export type VerifyEmailPageMessages = {
  /** Loading state */
  loadingTitle: string;
  loadingDescription: string;
  /** Success state */
  successTitle: string;
  successDescription: string;
  successCta: string;
  /** Expired state */
  expiredTitle: string;
  expiredDescription: string;
  expiredResendButton: string;
  expiredResendPending: string;
  expiredResendSuccess: string;
  /** Invalid state (bad token, mismatched email_id) */
  invalidTitle: string;
  invalidDescription: string;
  invalidSignInLink: string;
  /** Missing params state */
  missingParamsTitle: string;
  missingParamsDescription: string;
  /** Error messages — UPPER_SNAKE_CASE keys match err.extensions.code from PostGraphile */
  errors: {
    EXPIRED_TOKEN: string;
    INVALID_TOKEN: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultVerifyEmailPageMessages: VerifyEmailPageMessages = {
  loadingTitle: 'Verifying your email…',
  loadingDescription: 'Please wait while we confirm your address.',
  successTitle: 'Email verified',
  successDescription: 'Your email address has been confirmed. You're all set.',
  successCta: 'Continue to dashboard',
  expiredTitle: 'Link expired',
  expiredDescription: 'This verification link has expired. Request a new one below.',
  expiredResendButton: 'Resend verification email',
  expiredResendPending: 'Sending…',
  expiredResendSuccess: 'Verification email sent. Check your inbox.',
  invalidTitle: 'Invalid link',
  invalidDescription: 'This verification link is invalid or has already been used.',
  invalidSignInLink: 'Go to sign in',
  missingParamsTitle: 'Invalid verification link',
  missingParamsDescription: 'This link is incomplete. Try clicking the link in your email again.',
  errors: {
    EXPIRED_TOKEN: 'This verification link has expired.',
    INVALID_TOKEN: 'This verification link is invalid.',
    UNKNOWN_ERROR: 'Verification failed. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The page does **not** ship a `use-verify-email.ts`. It imports the generated mutation hooks from the host's `auth` SDK. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

- **Import:**
  ```ts
  import { useVerifyEmailMutation } from '@/generated/auth';
  import { useSendVerificationEmailMutation } from '@/generated/auth';
  ```
  (Real generated names — `verify_email` → `verifyEmail` → `useVerifyEmailMutation`; `send_verification_email` → `sendVerificationEmail` → `useSendVerificationEmailMutation`, per `endpoint-contract.md` §7.)
- **Instantiate with a selection:**
  ```ts
  const defaultMutation = useVerifyEmailMutation({
    selection: { fields: {} },
  });
  ```
- **Call + read the payload via the operation key:**
  ```ts
  const result = await defaultMutation.mutateAsync({ emailId, token })
    .then((d) => d.verifyEmail);
  ```
  `vars` carries `emailId`, `token` — **never** `csrf_token` (handled below the block).
- **Returns:** generated hook exposes `{ mutateAsync, isPending, error }` (TanStack Query v5 style).
- **Invoked:** on component mount (not on user action — auto-fires when params are present).
- **Missing params:** if `email_id` or `token` absent, transitions to `'missing-params'` state immediately.
- **Result handling:**
  - `true` → `'success'` state.
  - `false` → `'invalid'` state.
  - Exception `EXPIRED_TOKEN` → `'expired'` state with resend CTA.
  - Exception `INVALID_TOKEN` → `'invalid'` state.
- **Resend:** `'expired'` state renders a "Resend verification email" button. Calls `useSendVerificationEmailMutation` — requires the email address. Since we only have `email_id` (UUID), the resend call passes `email_id` only.

The deployed `constructive_auth_public.send_verification_email` takes the email address (its `email` domain type), not an `email_id` UUID — but the `'expired'` state only has the `email_id` on hand, so resending from that state requires collecting the address through an email input field.

### `verify-email-page.requires.json`

The install-time check (`constructive-blocks` skill) reads this to verify the host's generated `auth` SDK exports the named ops before the block is installed.

```json
{
  "namespace": "auth",
  "mutations": ["verifyEmail", "sendVerificationEmail"],
  "queries": [],
  "models": []
}
```

## Callbacks / routing

```ts
// onSuccess in installed page:
router.push(DASHBOARD_PATH); // or show inline success CTA button
```

The page can either auto-redirect on success (if user is signed in) or show a CTA button if the user is not authenticated (e.g., verifying after sign-up before first sign-in).

## Captcha

N/A — no user-submitted form. Resend action is rate-limited server-side.

## Step-up

N/A.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Success | none — success state is the feedback |
| Expired (initial detection) | none — expired state is the feedback |
| Resend success | `messages.expiredResendSuccess` (info) |
| Unknown error | `messages.errors.UNKNOWN_ERROR` (error) |

## Accessibility

- States announced via heading structure (`<h1>` changes per state) — not ARIA-live (full page state transitions, not incremental updates).
- Loading state uses appropriate loading indicator (`aria-busy`).
- CTA buttons have descriptive text (not "click here").

## Notes / gotchas

- This page fires the mutation on mount. If the user refreshes, the mutation fires again — but `verify_email` is idempotent (calling on an already-verified email returns `true` or the same result; confirm this is not rejected as `INVALID_TOKEN`).
- The block is intentionally NOT a card (no `auth-verify-email-card.md`). The verification is automatic, not user-initiated. The page IS the UX surface.
- URL format from email link: `/auth/verify-email?email_id=<uuid>&token=<cnc_live_ot_...>`.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/verify-email-page/`
- Internal state: `type PageState = 'loading' | 'success' | 'expired' | 'invalid' | 'missing-params'`.
- Use `useEffect` with `mutateAsync` call inside. Run once via empty dependency array (or stable params derived from URL).
- Storybook: use stories for each state (loading, success, expired, invalid, missing-params).
