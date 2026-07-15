# auth-forgot-password-card

**Type:** `registry:block`
**Status:** `v1 (frontend ready)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-credentials.md`
**Master entry:** `blocks-master.md#auth-forgot-password-card`

## Purpose

Email-only form that initiates the password reset flow. Calls `constructive_auth_public.forgot_password(email)`. After submission, transitions to a "Check your email" confirmation state within the same card (no navigation). Supports captcha for rate-limited protection.

## When to use

- Any route where users need to reset a forgotten password.
- Embedded in `auth-forgot-password-page` (canonical install).
- Can be dropped into a modal.
- Not a fit when: you need full reset (with new password input) — that is [[auth-reset-password-card]].

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/auth/forgot-password-card.tsx` | `registry:component` |
| `components/auth/forgot-password-card.requires.json` | `registry:file` |
| `lib/auth/messages/forgot-password-card-messages.ts` | `registry:lib` |
| `lib/auth/errors.ts` | `registry:lib` (shared, auto-deduped) |

> No data hook is shipped. The block imports its mutation hook (`useForgotPasswordMutation`) from the host's generated `auth` SDK (`@/generated/auth`). Only the messages catalog, the shared errors util, and the `requires.json` manifest are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

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

- `constructive_auth_public.forgot_password(email citext)` — schema `constructive_auth_public` → **namespace `auth`** → generated op `forgotPassword` → hook `useForgotPasswordMutation`.
  Returns: `void`
  Effect: Stores `reset_password_token` in `constructive_encrypted`, enqueues `send-email-link` job.

CSRF token is attached below the block — by the runtime adapter / server (`app_settings_auth.require_csrf_for_auth`), see `contracts/endpoint-contract.md` §3. The block does NOT read or set `csrf_token`; it is omitted from the mutation vars the block passes.

> NOTE: The procedure returns void regardless of whether the email exists. This is intentional — no email enumeration. The block always shows the confirmation state after submission.

## Props

```ts
export type ForgotPasswordCardProps = {
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
  messages?: Partial<ForgotPasswordCardMessages>;
  onSubmit?: (input: ForgotPasswordInput) => Promise<void>;
  onSuccess?: (input: ForgotPasswordInput) => void;
  onError?: (err: AuthError) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
};

export type ForgotPasswordInput = {
  email: string;
};
```

## Messages catalog

```ts
export type ForgotPasswordCardMessages = {
  title: string;
  description: string;
  emailLabel: string;
  emailPlaceholder: string;
  submitButton: string;
  submitButtonPending: string;
  backToSignIn: string;
  /** Confirmation state strings */
  confirmationTitle: string;
  confirmationDescription: string;
  confirmationResendButton: string;
  confirmationResendPending: string;
  confirmationResendSuccess: string;
  /** Error messages — UPPER_SNAKE_CASE keys match err.extensions.code from PostGraphile */
  errors: {
    RATE_LIMITED: string;
    CAPTCHA_FAILED: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultForgotPasswordCardMessages: ForgotPasswordCardMessages = {
  title: 'Forgot your password?',
  description: 'Enter your email address and we'll send you a reset link.',
  emailLabel: 'Email',
  emailPlaceholder: 'you@example.com',
  submitButton: 'Send reset link',
  submitButtonPending: 'Sending…',
  backToSignIn: '← Back to sign in',
  confirmationTitle: 'Check your email',
  confirmationDescription: 'If an account exists for {{email}}, you'll receive a password reset link shortly.',
  confirmationResendButton: 'Resend email',
  confirmationResendPending: 'Resending…',
  confirmationResendSuccess: 'Email resent.',
  errors: {
    RATE_LIMITED: 'Too many requests. Please wait before trying again.',
    CAPTCHA_FAILED: 'Captcha verification failed. Please try again.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
```

Note: `{{email}}` in `confirmationDescription` is a runtime interpolation token substituted by the block using `interpolate(template, { email })` from `lib/auth-messages`.

## Default data hook (generated, not shipped)

The block does **not** ship a `use-forgot-password.ts`. It imports the generated mutation hook from the host's `auth` SDK and drives it with a field `selection`. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

- **Import:** `import { useForgotPasswordMutation } from '@/generated/auth';` (real generated name — `forgot_password` → `forgotPassword` → `useForgotPasswordMutation`, per `endpoint-contract.md` §7. Note the `Mutation` suffix; it is **not** `useForgotPassword`.)
- **Instantiate with a selection** of exactly the payload fields this card consumes:
  ```ts
  const defaultMutation = useForgotPasswordMutation({
    selection: { fields: {} },
  });
  ```
  (`forgot_password` returns `void` — no payload fields to select.)
- **Call + read the payload via the operation key:**
  ```ts
  await (onSubmitOverride
    ? onSubmitOverride(vars)
    : defaultMutation.mutateAsync(vars).then((d) => d.forgotPassword));
  ```
  `vars` carries `email` — **never** `csrf_token` (handled below the block).
- **Returns:** generated hook exposes `{ mutateAsync, isPending, error }` (TanStack Query v5 style).
- **Adapter override:** when `props.onSubmit` is provided, the block awaits it instead of the generated hook. Hybrid pending: `onSubmitOverride ? overridePending : defaultMutation.isPending`.
- **On success:** transitions internal card state to `'confirmed'`, fires `onSuccess(input)`. No navigation.
- **Resend:** the "Resend email" button in confirmed state calls the same mutation with the same email. Captcha token is refreshed if captcha is enabled.

### `forgot-password-card.requires.json`

The install-time check (`constructive-blocks` skill) reads this to verify the host's generated `auth` SDK exports the named op before the block is installed.

```json
{
  "namespace": "auth",
  "mutations": ["forgotPassword"],
  "queries": [],
  "models": []
}
```

## Callbacks

- `onSuccess(input)` — fires after submission (regardless of whether email exists — procedure returns void). `input.email` available for display.
- `onError(err)` — fires on rate-limit, captcha, or unknown error.
- `onMessage({ kind, key, message? })` — fires `confirmationResendSuccess` on resend (kind: `'info'`).

## Captcha

- Supported: `turnstile`, `hcaptcha`, `recaptcha-v2`, `recaptcha-v3` (see `contracts/captcha-contract.md`).
- Off by default. When `captcha` prop set and `mode='visible'` (default), widget renders above submit button.
- When `mode='invisible'` (e.g., for `recaptcha-v3` or Turnstile invisible), no widget rendered — token resolved on submit via provider's invisible API.
- Token refreshed on resend (captcha providers expose a `reset()` method called between submissions).
- Block lazy-loads provider script only when prop is present.

## Step-up

- Required: no.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Success (initial) | none — card transitions to confirmation state as feedback |
| Resend success | `messages.confirmationResendSuccess` (info) |
| `RATE_LIMITED` | `messages.errors.RATE_LIMITED` (error) |
| `CAPTCHA_FAILED` | `messages.errors.CAPTCHA_FAILED` (error) |
| Unknown | `messages.errors.UNKNOWN_ERROR` (error) |

## Accessibility

- `autoFocus` on email field; `autoComplete="email"`.
- In confirmed state, focus moved to confirmation heading via `useEffect` + `ref.focus()`.
- `aria-live="polite"` for resend success message.
- Submit button disabled during `isPending`.

## Notes / gotchas

- `forgot_password` is a "fire and forget" procedure — it always returns void. The block always transitions to confirmed state. Do NOT infer anything from the response about whether the email exists.
- `{{email}}` interpolation in `confirmationDescription` is substituted by the block using `interpolate(template, { email })` from `lib/auth-messages` (see `contracts/i18n-contract.md` §3). Pass the raw template string in `messages.confirmationDescription`.
- Reset tokens expire (period set in `app_settings_auth`; default typically 1 hour). The confirmation copy does not mention the expiry — keep that in the reset page copy.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/forgot-password-card/`
- Internal state: `type CardState = 'form' | 'confirmed'`. The `confirmed` state renders the check-email UI.
- Storybook states: form (default), form (pending), form (error: RATE_LIMITED), confirmed state, confirmed state (resending).
