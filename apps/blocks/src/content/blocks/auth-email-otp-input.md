# auth-email-otp-input

**Type:** `registry:block`
**Status:** `v1 (frontend ready, backend pending)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-credentials.md`
**Master entry:** `blocks-master.md#auth-email-otp-input`

**Backend status:** pending — `sign_in_email_otp` is not deployed in `constructive_auth_public` today. It must be compiled from `proc_sign_in_email_otp_body` (AST generator) and deployed. See `backend-spec/future-procedures.md`.

**Pairing:** No page block — used as: an inline code-entry step rendered by [[auth-email-otp-request-card]] (when `showOtpInputInline=true`) or embedded in a custom page. There is no standalone `auth-email-otp-input-page`; consuming pages own the surrounding layout and call this block directly.

## Purpose

Reusable 6-segment OTP code input with countdown timer, resend CTA, and attempt feedback. Default behavior: calls `constructive_auth_public.sign_in_email_otp(email, code)` for sign-in flows. Custom verify function injectable via `onVerify` adapter prop for other OTP types (verify, reset, change-email). Designed to be rendered inline by [[auth-email-otp-request-card]] or as a standalone block.

## When to use

- Email OTP code entry step after [[auth-email-otp-request-card]] sends the code.
- Can be used standalone for any 6-digit code entry (e.g., backup codes, email verification codes) via the `onVerify` adapter.
- Gated by `app_settings_auth.allow_email_otp_sign_in=true` for the default sign-in flow.
- Not a fit when: you need magic link token exchange — use [[auth-magic-link-callback-page]].

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/auth/email-otp-input.tsx` | `registry:component` |
| `components/auth/email-otp-input.requires.json` | `registry:file` |
| `lib/auth/messages/email-otp-input-messages.ts` | `registry:lib` |
| `lib/auth/errors.ts` | `registry:lib` (shared, auto-deduped) |

> No data hook is shipped. The block imports its mutation hook (`useSignInEmailOtpMutation`) from the host's generated `auth` SDK (`@/generated/auth`). Only the messages catalog, the shared errors util, and the `requires.json` manifest are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (Constructive block; supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `button` (shadcn primitive)
- `input` (shadcn primitive, used for each segment or as a single input with auto-splitting)

## Runtime (npm) dependencies

- `react` (peer, ^19)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; it arrives transitively via the `blocks-runtime` registry dependency. The generated `auth` SDK is the host's, not a published dep of this block.

## DB procedures used by default hook

- `constructive_auth_public.sign_in_email_otp(email citext, code text)` — schema `constructive_auth_public` → **namespace `auth`** → generated op `signInEmailOtp` → hook `useSignInEmailOtpMutation`.
  Backend source: `proc_sign_in_email_otp_body` in `constructive-db/packages/ast-plpgsql/`.
  Returns same shape as `sign_in`: `(id, user_id, access_token, access_token_expires_at, is_verified, totp_enabled, mfa_required, mfa_challenge_token)`.

CSRF token is attached below the block — by the runtime adapter / server (`app_settings_auth.require_csrf_for_auth`), see `contracts/endpoint-contract.md` §3. The block does NOT read or set `csrf_token`; it is omitted from the mutation vars the block passes.

## Props

```ts
export type EmailOtpInputProps = {
  /** Email the OTP was sent to (required for the default sign-in hook). */
  email: string;
  /** Number of OTP segments. Default: 6 */
  length?: number;
  /** Countdown timer duration in seconds before resend is enabled. Default: 60 */
  resendCooldownSeconds?: number;
  /**
   * Custom verify function. Replaces default sign_in_email_otp call.
   * Use for non-sign-in OTP types (verify, reset, change-email).
   */
  onVerify?: (email: string, code: string) => Promise<EmailOtpVerifyResult>;
  /** Resend action. Default: calls send_email_otp via useEmailOtpRequest hook. */
  onResend?: (email: string) => Promise<void>;
  notifications?: boolean | NotificationConfig;
  messages?: Partial<EmailOtpInputMessages>;
  onSuccess?: (result: EmailOtpVerifyResult) => void;
  onError?: (err: AuthError) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
};

export type EmailOtpVerifyResult = {
  id?: string;
  userId?: string;
  accessToken?: string;
  accessTokenExpiresAt?: string;
  isVerified?: boolean;
  mfaRequired?: boolean;
  mfaChallengeToken?: string | null;
  /** For non-sign-in flows: simple success boolean. */
  success?: boolean;
};
```

## Messages catalog

```ts
export type EmailOtpInputMessages = {
  title: string;
  /** Runtime interpolation: {{email}} */
  description: string;
  inputLabel: string;
  submitButton: string;
  submitButtonPending: string;
  resendButton: string;
  resendPending: string;
  /** Runtime interpolation: {{seconds}} */
  resendCooldown: string;
  resendSuccess: string;
  /** Error messages — UPPER_SNAKE_CASE keys match err.extensions.code from PostGraphile */
  errors: {
    INVALID_OTP: string;
    EXPIRED_TOKEN: string;
    RATE_LIMITED: string;
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultEmailOtpInputMessages: EmailOtpInputMessages = {
  title: 'Enter your code',
  description: 'We sent a 6-digit code to {{email}}.',
  inputLabel: 'One-time code',
  submitButton: 'Verify',
  submitButtonPending: 'Verifying…',
  resendButton: 'Resend code',
  resendPending: 'Resending…',
  resendCooldown: 'Resend in {{seconds}}s',
  resendSuccess: 'Code resent. Check your inbox.',
  errors: {
    INVALID_OTP: 'Invalid code. Please check and try again.',
    EXPIRED_TOKEN: 'This code has expired. Please request a new one.',
    RATE_LIMITED: 'Too many attempts. Please wait before trying again.',
    PROCEDURE_NOT_FOUND: 'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
```

Note: `{{email}}` and `{{seconds}}` are runtime interpolation tokens substituted by `interpolate(template, values)` from `lib/auth-messages`.

## Default data hook (generated, not shipped)

The block does **not** ship a `use-email-otp-sign-in.ts`. It imports the generated mutation hook from the host's `auth` SDK. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

- **Import:** `import { useSignInEmailOtpMutation } from '@/generated/auth';` (real generated name — `sign_in_email_otp` → `signInEmailOtp` → `useSignInEmailOtpMutation`, per `endpoint-contract.md` §7.)
- **Instantiate with a selection** of exactly the payload fields this block consumes:
  ```ts
  const defaultMutation = useSignInEmailOtpMutation({
    selection: { fields: {
      id: true, userId: true, accessToken: true, accessTokenExpiresAt: true,
      isVerified: true, mfaRequired: true, mfaChallengeToken: true,
    } },
  });
  ```
- **Call + read the payload via the operation key:**
  ```ts
  const result = await (onVerifyOverride
    ? onVerifyOverride(email, code)
    : defaultMutation.mutateAsync({ email, code }).then((d) => d.signInEmailOtp));
  ```
  `vars` carries `email`, `code` — **never** `csrf_token` (handled below the block).
- **Returns:** generated hook exposes `{ mutateAsync, isPending, error }` (TanStack Query v5 style).
- **Adapter override:** when `props.onVerify` is provided, the block calls it instead of the generated hook. Hybrid pending: `onVerifyOverride ? overridePending : defaultMutation.isPending`.
- **Auto-submit:** when all `length` segments are filled, the form submits automatically (no explicit click needed).
- **Resend:** calls `props.onResend(email)` if provided; otherwise calls `useSendEmailOtpMutation` from `@/generated/auth` with `{ email, type: 'sign_in' }`. Resets countdown on success.

> **Backend pending** — `sign_in_email_otp` is not yet deployed. The block ships its `requires.json` so the `check-sdk.mjs` install-time check will fail with a precise message if the host SDK does not export the named op.

### `email-otp-input.requires.json`

```json
{
  "namespace": "auth",
  "mutations": ["signInEmailOtp", "sendEmailOtp"],
  "queries": [],
  "models": []
}
```

## Callbacks

- `onSuccess(result)` — fires on valid code. For sign-in flow, includes `accessToken`, `userId`, etc.
- `onError(err)` — fires on invalid code (with inline attempt feedback).
- `onMessage({ kind, key, message? })` — fires `resendSuccess` (kind: `'info'`), `codeExpired` (kind: `'warning'`).

## Step-up

N/A — this IS the verification step.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Resend success | `messages.resendSuccess` (info) |
| `INVALID_OTP` | `messages.errors.INVALID_OTP` (error, shown inline) |
| `EXPIRED_TOKEN` | `messages.errors.EXPIRED_TOKEN` (error) |
| `RATE_LIMITED` | `messages.errors.RATE_LIMITED` (error) |
| Unknown | `messages.errors.UNKNOWN_ERROR` (error) |

## Accessibility

- Each segment input has `aria-label` with position (e.g., "Digit 1 of 6").
- Auto-focus first segment on mount.
- Paste support: pasting a full 6-digit code fills all segments and auto-submits.
- `aria-live="polite"` for attempt feedback and resend messages.
- Resend button disabled + shows countdown text during cooldown.

## Notes / gotchas

- Auto-submit: fires on `length`-digit fill, not on explicit submit button click. Submit button is a fallback for paste/accessibility flows.
- Paste support: split pasted string across segments. Strip non-digit characters.
- Attempt tracking: show inline attempt counter (`X attempts remaining`) if server returns partial failure info.
- Countdown timer: track in component state with `setInterval`. Reset on resend success.
- `onVerify` adapter: allows this component to be used for TOTP backup codes, email-based MFA, etc. The block's default behavior is overridden entirely when `onVerify` is set.
- Error code: PostGraphile may return `INVALID_TOTP` or `INVALID_OTP` for email OTP failures — confirm the exact code and update `errors.INVALID_OTP` key name accordingly.

> **Backend pending** — it isn't yet settled whether PostGraphile returns `INVALID_TOTP` or `INVALID_OTP` for email OTP failures. The block currently keys its `errors` map (and the NotificationTable entry) on `INVALID_OTP` and will follow whichever code the server emits once fixed.

## Cross-references

- Request step: [[auth-email-otp-request-card]]
- MFA follow-up if `mfa_required=true`: [[auth-mfa-totp-challenge]] (cross-vertical)

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/email-otp-input/`
- Implement segments as a controlled component with `inputMode="numeric"`, `pattern="[0-9]*"`.
- Storybook states: default (empty), filling, auto-submitting, error (INVALID_OTP), error (EXPIRED_TOKEN), resend cooldown, resend pending.
