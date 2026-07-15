# auth-email-otp-request-card

**Type:** `registry:block`
**Status:** `v1 (frontend ready, backend pending)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-credentials.md`
**Master entry:** `blocks-master.md#auth-email-otp-request-card`

**Backend status:** pending — `send_email_otp` is not deployed in `constructive_auth_public` today. It must be compiled from `proc_send_email_otp_body` (AST generator) and deployed. See `backend-spec/future-procedures.md`.

## Purpose

Email-only form that sends a one-time passcode to the user's email. Calls `constructive_auth_public.send_email_otp(email, type)`. The `otpType` prop discriminates the OTP use case: `'sign_in'` | `'verify'` | `'reset'` | `'change_email'`. After submission, transitions to a "code sent" confirmation inline and renders (or routes to) [[auth-email-otp-input]] for code entry. Supports captcha.

## When to use

- Sign-in flows offering email OTP as an alternative to password.
- Email verification flows as an alternative to magic links.
- Gated by `app_settings_auth.allow_email_otp_sign_in=true`.
- Not a fit when: you need magic links instead of codes — use [[auth-magic-link-request-card]].

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/auth/email-otp-request-card.tsx` | `registry:component` |
| `components/auth/email-otp-request-card.requires.json` | `registry:file` |
| `lib/auth/messages/email-otp-request-card-messages.ts` | `registry:lib` |
| `lib/auth/errors.ts` | `registry:lib` (shared, auto-deduped) |

> No data hook is shipped. The block imports its mutation hook (`useSendEmailOtpMutation`) from the host's generated `auth` SDK (`@/generated/auth`). Only the messages catalog, the shared errors util, and the `requires.json` manifest are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (Constructive block; supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `card`, `button`, `input`, `label`, `form` (shadcn primitives)
- `auth-email-otp-input` (sibling block; rendered inline after OTP is sent when `showOtpInputInline=true`)

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `react-hook-form` (^7)
- `zod` (^3)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; it arrives transitively via the `blocks-runtime` registry dependency. The generated `auth` SDK is the host's, not a published dep of this block.
- Captcha libs: lazy-loaded when `captcha` prop is set

## DB procedures used by default hook

- `constructive_auth_public.send_email_otp(email citext, type text)` — schema `constructive_auth_public` → **namespace `auth`** → generated op `sendEmailOtp` → hook `useSendEmailOtpMutation`.
  Returns `void`. Backend source: `proc_send_email_otp_body` in `constructive-db/packages/ast-plpgsql/`.
  `type` values: `'sign_in'` | `'verify'` | `'reset'` | `'change_email'`

CSRF token is attached below the block — by the runtime adapter / server (`app_settings_auth.require_csrf_for_auth`), see `contracts/endpoint-contract.md` §3. The block does NOT read or set `csrf_token`; it is omitted from the mutation vars the block passes.

> **Backend pending** — the `type` discriminator values listed above (`'sign_in'`, `'verify'`, `'reset'`, `'change_email'`) aren't finalized with the constructive-db team ahead of backend deployment.

## Props

```ts
export type EmailOtpRequestCardProps = {
  /**
   * OTP type discriminator. Passed as 'type' param to send_email_otp.
   * Default: 'sign_in'
   */
  otpType?: 'sign_in' | 'verify' | 'reset' | 'change_email';
  /** Pre-fill the email field. */
  defaultEmail?: string;
  /**
   * When true, renders [[auth-email-otp-input]] inline after OTP is sent.
   * When false, caller handles navigation to OTP input via onSuccess.
   * Default: true
   */
  showOtpInputInline?: boolean;
  /**
   * Captcha config. Off by default.
   * Shape: { provider, siteKey, mode?, theme? }. Default mode: 'visible'.
   * For invisible providers (recaptcha-v3), pass mode: 'invisible' — no widget is rendered.
   */
  captcha?: CaptchaConfig;
  notifications?: boolean | NotificationConfig;
  messages?: Partial<EmailOtpRequestCardMessages>;
  onSubmit?: (input: { email: string; type: string }) => Promise<void>;
  onSuccess?: (input: { email: string }) => void;
  onError?: (err: AuthError) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
};
```

## Messages catalog

```ts
export type EmailOtpRequestCardMessages = {
  title: string;
  description: string;
  emailLabel: string;
  emailPlaceholder: string;
  submitButton: string;
  submitButtonPending: string;
  /** Runtime interpolation: {{email}} */
  codeSentMessage: string;
  resendButton: string;
  resendPending: string;
  resendSuccess: string;
  /** Error messages — UPPER_SNAKE_CASE keys match err.extensions.code from PostGraphile */
  errors: {
    RATE_LIMITED: string;
    CAPTCHA_FAILED: string;
    EMAIL_OTP_DISABLED: string;
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultEmailOtpRequestCardMessages: EmailOtpRequestCardMessages = {
  title: 'Sign in with a code',
  description: 'Enter your email and we'll send you a one-time code.',
  emailLabel: 'Email',
  emailPlaceholder: 'you@example.com',
  submitButton: 'Send code',
  submitButtonPending: 'Sending…',
  codeSentMessage: 'We sent a 6-digit code to {{email}}. Enter it below.',
  resendButton: 'Resend code',
  resendPending: 'Resending…',
  resendSuccess: 'Code resent.',
  errors: {
    RATE_LIMITED: 'Too many requests. Please wait before trying again.',
    CAPTCHA_FAILED: 'Captcha verification failed. Please try again.',
    EMAIL_OTP_DISABLED: 'Email OTP sign-in is not enabled.',
    PROCEDURE_NOT_FOUND: 'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
```

Note: `{{email}}` in `codeSentMessage` is substituted by `interpolate(template, { email })` from `lib/auth-messages`.

## Default data hook (generated, not shipped)

The block does **not** ship a `use-email-otp-request.ts`. It imports the generated mutation hook from the host's `auth` SDK. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

- **Import:** `import { useSendEmailOtpMutation } from '@/generated/auth';` (real generated name — `send_email_otp` → `sendEmailOtp` → `useSendEmailOtpMutation`, per `endpoint-contract.md` §7.)
- **Instantiate with a selection:**
  ```ts
  const defaultMutation = useSendEmailOtpMutation({
    selection: { fields: {} },
  });
  ```
  (`send_email_otp` returns `void` — no payload fields to select.)
- **Call + read the payload via the operation key:**
  ```ts
  await (onSubmitOverride
    ? onSubmitOverride(vars)
    : defaultMutation.mutateAsync(vars).then((d) => d.sendEmailOtp));
  ```
  `vars` carries `email`, `type` — **never** `csrf_token` (handled below the block).
- **Returns:** generated hook exposes `{ mutateAsync, isPending, error }` (TanStack Query v5 style).
- **Adapter override:** when `props.onSubmit` is provided, the block awaits it instead of the generated hook. Hybrid pending: `onSubmitOverride ? overridePending : defaultMutation.isPending`.
- **On success:** if `showOtpInputInline=true`, transitions internal state to show [[auth-email-otp-input]] inline, passing `email` down. If false, fires `onSuccess({ email })` for caller to navigate.
- **Resend:** "Resend code" button calls the same mutation. Captcha token refreshed if captcha is enabled.

> **Backend pending** — `send_email_otp` is not yet deployed. The block ships its `requires.json` so the `check-sdk.mjs` install-time check will fail with a precise message if the host SDK does not export the named op.

### `email-otp-request-card.requires.json`

```json
{
  "namespace": "auth",
  "mutations": ["sendEmailOtp"],
  "queries": [],
  "models": []
}
```

## Callbacks

- `onSuccess({ email })` — fires after code is sent. Used when `showOtpInputInline=false` to navigate to OTP input.
- `onError(err)` — fires on rate-limit, captcha, or unknown error.
- `onMessage({ kind, key, message? })` — fires `resendSuccess` on resend (kind: `'info'`).

## Captcha

- Supported: `turnstile`, `hcaptcha`, `recaptcha-v2`, `recaptcha-v3` (see `contracts/captcha-contract.md`).
- Off by default. When `captcha` prop set and `mode='visible'` (default), widget renders above submit button.
- When `mode='invisible'` (e.g., `recaptcha-v3`), no widget rendered — token resolved on submit.
- Token refreshed on resend.

## Step-up

- Required: no.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Success (initial) | none — card transitions to confirmed/OTP-input state |
| Resend success | `messages.resendSuccess` (info) |
| `RATE_LIMITED` | `messages.errors.RATE_LIMITED` (error) |
| `CAPTCHA_FAILED` | `messages.errors.CAPTCHA_FAILED` (error) |
| `EMAIL_OTP_DISABLED` | `messages.errors.EMAIL_OTP_DISABLED` (error) |
| Unknown | `messages.errors.UNKNOWN_ERROR` (error) |

## Accessibility

- `autoFocus` on email field; `autoComplete="email"`.
- In confirmed state, focus moved to OTP input's first segment.
- `aria-live="polite"` for resend success message.
- Submit button disabled during `isPending`.

## Notes / gotchas

- `type` param semantics are server-defined. The block surfaces them via `otpType`. Mismatched values are rejected server-side.
- When `showOtpInputInline=true`, the card transitions to show [[auth-email-otp-input]] — the card acts as a step flow. Email is passed down to the OTP input.
- `send_email_otp` returns void regardless of whether the email exists. This is intentional — no email enumeration.

## Cross-references

- OTP input (code entry): [[auth-email-otp-input]]

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/email-otp-request-card/`
- Internal state: `type CardState = 'form' | 'code-sent'`. The `code-sent` state renders the confirmation message and (optionally) the [[auth-email-otp-input]] inline.
- Storybook states: form (default), form (pending), form (error: RATE_LIMITED), code-sent inline OTP input, resending.
