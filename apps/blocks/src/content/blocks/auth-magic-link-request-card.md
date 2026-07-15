# auth-magic-link-request-card

**Type:** `registry:block`
**Status:** `v1 (frontend ready, backend pending)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-credentials.md`
**Master entry:** `blocks-master.md#auth-magic-link-request-card`

**Backend status:** pending — `request_magic_link` is not deployed in `constructive_auth_public` today. It must be compiled from `proc_request_magic_link_body` (AST generator) and deployed. See `backend-spec/future-procedures.md`.

## Purpose

Email-only form that initiates the magic-link sign-in flow. On submission, calls `constructive_auth_public.request_magic_link(email)`. Transitions to a "Check your email" confirmation state within the card (no navigation). Pre-sign-in surface — no credentials required. Supports captcha for rate-limited protection.

## When to use

- Sign-in pages offering passwordless sign-in via email link.
- Gated by `app_settings_auth.allow_magic_link_sign_in=true`.
- Not a fit when: user is already signed in — resend is handled by [[auth-magic-link-sent-page]].

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/auth/magic-link-request-card.tsx` | `registry:component` |
| `components/auth/magic-link-request-card.requires.json` | `registry:file` |
| `lib/auth/messages/magic-link-request-card-messages.ts` | `registry:lib` |
| `lib/auth/errors.ts` | `registry:lib` (shared, auto-deduped) |

> No data hook is shipped. The block imports its mutation hook (`useRequestMagicLinkMutation`) from the host's generated `auth` SDK (`@/generated/auth`). Only the messages catalog, the shared errors util, and the `requires.json` manifest are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (Constructive block; supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `card`, `button`, `input`, `label`, `form` (shadcn primitives)

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `react-hook-form` (^7)
- `zod` (^3)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; it arrives transitively via the `blocks-runtime` registry dependency. The generated `auth` SDK is the host's, not a published dep of this block.
- Captcha libs: lazy-loaded when `captcha` prop is set

## DB procedures used by default hook

- `constructive_auth_public.request_magic_link(email citext)` — schema `constructive_auth_public` → **namespace `auth`** → generated op `requestMagicLink` → hook `useRequestMagicLinkMutation`.
  Returns `void`. Backend source: `proc_request_magic_link_body` in `constructive-db/packages/ast-plpgsql/`.

CSRF token is attached below the block — by the runtime adapter / server (`app_settings_auth.require_csrf_for_auth`), see `contracts/endpoint-contract.md` §3. The block does NOT read or set `csrf_token`; it is omitted from the mutation vars the block passes.

> NOTE: The procedure returns void regardless of whether the email exists. This is intentional — no email enumeration. The block always transitions to confirmation state.

## Props

```ts
export type MagicLinkRequestCardProps = {
  /** Pre-fill the email field. */
  defaultEmail?: string;
  /** Show "Back to sign in" link. Default: true */
  showBackLink?: boolean;
  /**
   * Captcha config. Off by default.
   * Shape: { provider, siteKey, mode?, theme? }. Default mode: 'visible'.
   * For invisible providers (recaptcha-v3), pass mode: 'invisible' — no widget is rendered.
   */
  captcha?: CaptchaConfig;
  notifications?: boolean | NotificationConfig;
  messages?: Partial<MagicLinkRequestCardMessages>;
  onSubmit?: (input: { email: string }) => Promise<void>;
  onSuccess?: (input: { email: string }) => void;
  onError?: (err: AuthError) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
};
```

## Messages catalog

```ts
export type MagicLinkRequestCardMessages = {
  title: string;
  description: string;
  emailLabel: string;
  emailPlaceholder: string;
  submitButton: string;
  submitButtonPending: string;
  backToSignIn: string;
  /** Confirmation state strings */
  confirmationTitle: string;
  /** Runtime interpolation: {{email}} */
  confirmationDescription: string;
  resendButton: string;
  resendPending: string;
  resendSuccess: string;
  /** Error messages — UPPER_SNAKE_CASE keys match err.extensions.code from PostGraphile */
  errors: {
    RATE_LIMITED: string;
    CAPTCHA_FAILED: string;
    MAGIC_LINK_DISABLED: string;
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultMagicLinkRequestCardMessages: MagicLinkRequestCardMessages = {
  title: 'Sign in with email link',
  description: 'Enter your email and we'll send you a sign-in link.',
  emailLabel: 'Email',
  emailPlaceholder: 'you@example.com',
  submitButton: 'Send sign-in link',
  submitButtonPending: 'Sending…',
  backToSignIn: '← Back to sign in',
  confirmationTitle: 'Check your email',
  confirmationDescription: 'We sent a sign-in link to {{email}}. Check your inbox.',
  resendButton: 'Resend email',
  resendPending: 'Resending…',
  resendSuccess: 'Email resent.',
  errors: {
    RATE_LIMITED: 'Too many requests. Please wait before trying again.',
    CAPTCHA_FAILED: 'Captcha verification failed. Please try again.',
    MAGIC_LINK_DISABLED: 'Magic link sign-in is not enabled.',
    PROCEDURE_NOT_FOUND: 'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
```

Note: `{{email}}` in `confirmationDescription` is a runtime interpolation token substituted by the block using `interpolate(template, { email })` from `lib/auth-messages`.

## Default data hook (generated, not shipped)

The block does **not** ship a `use-magic-link-request.ts`. It imports the generated mutation hook from the host's `auth` SDK. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

- **Import:** `import { useRequestMagicLinkMutation } from '@/generated/auth';` (real generated name — `request_magic_link` → `requestMagicLink` → `useRequestMagicLinkMutation`, per `endpoint-contract.md` §7.)
- **Instantiate with a selection:**
  ```ts
  const defaultMutation = useRequestMagicLinkMutation({
    selection: { fields: {} },
  });
  ```
  (`request_magic_link` returns `void` — no payload fields to select.)
- **Call + read the payload via the operation key:**
  ```ts
  await (onSubmitOverride
    ? onSubmitOverride(vars)
    : defaultMutation.mutateAsync(vars).then((d) => d.requestMagicLink));
  ```
  `vars` carries `email` — **never** `csrf_token` (handled below the block).
- **Returns:** generated hook exposes `{ mutateAsync, isPending, error }` (TanStack Query v5 style).
- **Adapter override:** when `props.onSubmit` is provided, the block awaits it instead of the generated hook. Hybrid pending: `onSubmitOverride ? overridePending : defaultMutation.isPending`.
- **On success:** transitions internal card state to `'confirmed'`, fires `onSuccess({ email })`. No navigation.
- **Resend:** the "Resend email" button in confirmed state calls the same mutation. Captcha token is refreshed if captcha is enabled.

> **Backend pending** — `request_magic_link` is not yet deployed. The block ships its `requires.json` so the `check-sdk.mjs` install-time check will fail with a precise message if the host SDK does not export the named op.

### `magic-link-request-card.requires.json`

```json
{
  "namespace": "auth",
  "mutations": ["requestMagicLink"],
  "queries": [],
  "models": []
}
```

## Callbacks

- `onSuccess({ email })` — fires after submission. `email` available for display in confirmation copy.
- `onError(err)` — fires on rate-limit, captcha, or unknown error.
- `onMessage({ kind, key, message? })` — fires `resendSuccess` on resend (kind: `'info'`).

## Captcha

- Supported: `turnstile`, `hcaptcha`, `recaptcha-v2`, `recaptcha-v3` (see `contracts/captcha-contract.md`).
- Off by default. When `captcha` prop set and `mode='visible'` (default), widget renders above submit button.
- When `mode='invisible'` (e.g., `recaptcha-v3`), no widget is rendered — token resolved on submit.
- Token refreshed on resend (captcha providers expose a `reset()` method).

## Step-up

- Required: no.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Success (initial) | none — card transitions to confirmation state |
| Resend success | `messages.resendSuccess` (info) |
| `RATE_LIMITED` | `messages.errors.RATE_LIMITED` (error) |
| `CAPTCHA_FAILED` | `messages.errors.CAPTCHA_FAILED` (error) |
| `MAGIC_LINK_DISABLED` | `messages.errors.MAGIC_LINK_DISABLED` (error) |
| Unknown | `messages.errors.UNKNOWN_ERROR` (error) |

## Accessibility

- `autoFocus` on email field; `autoComplete="email"`.
- In confirmed state, focus moved to confirmation heading via `useEffect` + `ref.focus()`.
- `aria-live="polite"` for resend success message.
- Submit button disabled during `isPending`.

## Notes / gotchas

- `request_magic_link` is a "fire and forget" procedure — always returns void. Block always transitions to confirmed state regardless.
- Magic link tokens are `cnc_live_ot_...` format. One-time use, short expiry.
- Mirrors [[auth-forgot-password-card]] pattern exactly (email-only form → confirmation state). Reuse the implementation pattern.
- Cross-references: [[auth-magic-link-sent-page]] (page variant of confirmation), [[auth-magic-link-callback-page]] (token handler).

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/magic-link-request-card/`
- Internal state: `type CardState = 'form' | 'confirmed'`.
- Storybook states: form (default), form (pending), form (error: RATE_LIMITED), confirmed state, confirmed state (resending).
