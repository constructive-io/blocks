# auth-sign-up-card

**Type:** `registry:block`
**Status:** `v1 (frontend ready)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-credentials.md`
**Master entry:** `blocks-master.md#auth-sign-up-card`

## Purpose

Email + password registration form. Calls `constructive_auth_public.sign_up`. Renders inline password-strength feedback using a zxcvbn-style scorer (shipped with the block). HIBP (Have I Been Pwned) breach check is a planned hook point — the prop interface is defined in v1, but the actual HTTP call to HIBP is NOT executed (marked as v1.1 extension). Optionally renders captcha before submission.

## When to use

- Any route that needs new user registration.
- Embedded in `auth-sign-up-page` (canonical install path).
- Drop into a modal or inline panel when needed without the page wrapper.
- Not a fit when: you need social sign-up only — compose [[auth-social-providers-grid]] (the canonical social composition layer for primary sign-up pages, which wraps `auth-social-buttons` internally).
- Not a fit when: `app_settings_auth.allow_sign_up=false` or `allow_password_sign_up=false` — check at page level and hide form or show a "sign-up disabled" message.

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/auth/sign-up-card.tsx` | `registry:component` |
| `components/auth/sign-up-card.requires.json` | `registry:file` |
| `lib/auth/utils/password-strength.ts` | `registry:lib` |
| `lib/auth/messages/sign-up-card-messages.ts` | `registry:lib` |
| `lib/auth/errors.ts` | `registry:lib` (shared, auto-deduped) |

> No data hook is shipped. The block imports its mutation hook (`useSignUpMutation`) from the host's generated `auth` SDK (`@/generated/auth`). Only the messages catalog, the shared errors util, the password-strength util, and the `requires.json` manifest are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (Constructive block; supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `card`, `button`, `input`, `label`, `form` (shadcn primitives)
- `progress` (shadcn, for password strength meter)
- `auth-social-providers-grid` (optional; rendered below form when `showSocialProviders` is true — the grid is the canonical social composition layer; it wraps `auth-social-buttons` internally)

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `react-hook-form` (^7)
- `zod` (^3)
- `sonner`
- `zxcvbn` (bundled via `lib/auth/utils/password-strength.ts` — lightweight scorer)
- `@tanstack/react-query` — **not declared per-block**; it arrives transitively via the `blocks-runtime` registry dependency. The generated `auth` SDK is the host's, not a published dep of this block.
- Captcha libs: lazy-loaded only when `captcha` prop is set
  - `@marsidev/react-turnstile` (turnstile)
  - `react-google-recaptcha` (recaptcha-v2/v3)

## DB procedures used by default hook

- `constructive_auth_public.sign_up(email citext, password text, remember_me bool, credential_kind text, csrf_token text)` — schema `constructive_auth_public` → **namespace `auth`** → generated op `signUp` → hook `useSignUpMutation`.
  Returns: `(id, user_id, access_token, access_token_expires_at, is_verified, totp_enabled)`

CSRF token is attached below the block — by the runtime adapter / server (`app_settings_auth.require_csrf_for_auth`), see `contracts/endpoint-contract.md` §3. The block does NOT read or set `csrf_token`; it is omitted from the mutation vars the block passes.

## Props

```ts
export type SignUpCardProps = {
  /** Show "Remember me" checkbox. Default: true */
  showRememberMe?: boolean;
  /** Show password strength meter. Default: true */
  showPasswordStrength?: boolean;
  /** Show password confirm field. Default: true */
  showPasswordConfirm?: boolean;
  /** credential_kind forwarded to sign_up. Default: 'bearer' */
  credentialKind?: 'bearer' | 'cookie';
  /**
   * HIBP breach check hook (v1 interface, v1.1 implementation).
   * If provided, called with the password before submission.
   * Return true if password is safe, false if breached.
   * In v1, this prop is wired but the block does NOT provide a default HIBP fetcher.
   */
  onCheckPasswordBreach?: (password: string) => Promise<boolean>;
  /**
   * Captcha config. Off by default.
   * Shape: { provider, siteKey, mode?, theme? }. Default mode: 'visible'.
   * For invisible providers (recaptcha-v3), pass mode: 'invisible' — no widget is rendered.
   */
  captcha?: CaptchaConfig;
  notifications?: boolean | NotificationConfig;
  messages?: Partial<SignUpCardMessages>;
  /** Adapter override: replaces the generated useSignUpMutation hook entirely. */
  onSubmit?: (input: SignUpInput) => Promise<SignUpResult>;
  onSuccess?: (result: SignUpResult) => void;
  onError?: (err: AuthError) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
};

export type SignUpInput = {
  email: string;
  password: string;
  rememberMe: boolean;
  credentialKind: string;
};

export type SignUpResult = {
  id: string;
  userId: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  isVerified: boolean;
  totpEnabled: boolean;
};
```

## Messages catalog

```ts
export type SignUpCardMessages = {
  title: string;
  description: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  passwordConfirmLabel: string;
  passwordConfirmPlaceholder: string;
  rememberMeLabel: string;
  submitButton: string;
  submitButtonPending: string;
  signInPrompt: string;
  signInLink: string;
  passwordStrengthWeak: string;
  passwordStrengthFair: string;
  passwordStrengthGood: string;
  passwordStrengthStrong: string;
  passwordMismatch: string;
  /** HIBP warning (shown when onCheckPasswordBreach returns false) */
  passwordBreached: string;
  /** Verification reminder shown after successful sign-up */
  verificationEmailSent: string;
  /** Error messages — UPPER_SNAKE_CASE keys match err.extensions.code from PostGraphile */
  errors: {
    EMAIL_TAKEN: string;
    WEAK_PASSWORD: string;
    RATE_LIMITED: string;
    CAPTCHA_FAILED: string;
    SIGN_UP_DISABLED: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultSignUpCardMessages: SignUpCardMessages = {
  title: 'Create an account',
  description: 'Enter your email and choose a password to get started.',
  emailLabel: 'Email',
  emailPlaceholder: 'you@example.com',
  passwordLabel: 'Password',
  passwordPlaceholder: '••••••••',
  passwordConfirmLabel: 'Confirm password',
  passwordConfirmPlaceholder: '••••••••',
  rememberMeLabel: 'Remember me',
  submitButton: 'Create account',
  submitButtonPending: 'Creating account…',
  signInPrompt: 'Already have an account?',
  signInLink: 'Sign in',
  passwordStrengthWeak: 'Weak',
  passwordStrengthFair: 'Fair',
  passwordStrengthGood: 'Good',
  passwordStrengthStrong: 'Strong',
  passwordMismatch: 'Passwords do not match.',
  passwordBreached: 'This password has appeared in a known data breach. Choose a different one.',
  verificationEmailSent: 'Account created! Check your email to verify your address.',
  errors: {
    EMAIL_TAKEN: 'An account with this email already exists.',
    WEAK_PASSWORD: 'Password does not meet minimum requirements.',
    RATE_LIMITED: 'Too many sign-up attempts. Please wait before trying again.',
    CAPTCHA_FAILED: 'Captcha verification failed. Please try again.',
    SIGN_UP_DISABLED: 'New registrations are currently disabled.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The block does **not** ship a `use-sign-up.ts`. It imports the generated mutation hook from the host's `auth` SDK and drives it with a field `selection`. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

- **Import:** `import { useSignUpMutation } from '@/generated/auth';` (real generated name — `sign_up` → `signUp` → `useSignUpMutation`, per `endpoint-contract.md` §7. Note the `Mutation` suffix; it is **not** `useSignUp`.)
- **Instantiate with a selection** of exactly the payload fields this card consumes:
  ```ts
  const defaultMutation = useSignUpMutation({
    selection: { fields: {
      id: true, userId: true, accessToken: true, accessTokenExpiresAt: true,
      isVerified: true, totpEnabled: true,
    } },
  });
  ```
- **Call + read the payload via the operation key:**
  ```ts
  const result = await (onSubmitOverride
    ? onSubmitOverride(vars)
    : defaultMutation.mutateAsync(vars).then((d) => d.signUp));
  ```
  `vars` carries `email`, `password`, `rememberMe`, `credentialKind` — **never** `csrf_token` (handled below the block). See `endpoint-contract.md` §3.
- **Returns:** generated hook exposes `{ mutateAsync, isPending, error }` (TanStack Query v5 style).
- **Adapter override:** when `props.onSubmit` is provided, the block awaits it instead of the generated hook. Hybrid pending: `onSubmitOverride ? overridePending : defaultMutation.isPending`.
- **HIBP branch:** if `onCheckPasswordBreach` prop is set, the block calls it with the raw password before invoking the mutation. If it returns `false`, submission is blocked and `passwordBreached` message is shown inline (no toast, no `onError`). The block does NOT default-implement HIBP — deferred to v1.1.
- **Post-success:** fires `onSuccess(result)` and `onMessage({ kind: 'success', key: 'verificationEmailSent', message: messages.verificationEmailSent })`.

### `sign-up-card.requires.json`

The install-time check (`constructive-blocks` skill) reads this to verify the host's generated `auth` SDK exports the named op before the block is installed.

```json
{
  "namespace": "auth",
  "mutations": ["signUp"],
  "queries": [],
  "models": []
}
```

## Callbacks

- `onSuccess(result)` — fires after account creation. `result.userId`, `result.accessToken`, `result.isVerified`.
- `onError(err)` — fires after `mapAuthError`.
- `onMessage({ kind, key, message? })` — fires `{ kind: 'success', key: 'verificationEmailSent', message: messages.verificationEmailSent }` on success.

## Captcha

- Supported: `turnstile`, `hcaptcha`, `recaptcha-v2`, `recaptcha-v3` (see `contracts/captcha-contract.md`).
- Off by default. When `captcha` prop is set and `mode='visible'` (default), widget renders above the submit button.
- When `mode='invisible'` (e.g., for `recaptcha-v3` or Turnstile invisible), no widget is rendered — token is resolved on submit via the provider's invisible API.
- Captcha response injected as `x-captcha-response` header into the mutation request.
- Block lazy-loads provider script only when prop is present.

## Step-up

- Required: no.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Success | `messages.verificationEmailSent` (info) |
| `EMAIL_TAKEN` | `messages.errors.EMAIL_TAKEN` (error) |
| `WEAK_PASSWORD` | `messages.errors.WEAK_PASSWORD` (error) |
| `RATE_LIMITED` | `messages.errors.RATE_LIMITED` (error) |
| `CAPTCHA_FAILED` | `messages.errors.CAPTCHA_FAILED` (error) |
| `SIGN_UP_DISABLED` | `messages.errors.SIGN_UP_DISABLED` (error) |
| Unknown | `messages.errors.UNKNOWN_ERROR` (error) |

## Accessibility

- All labels associated via `htmlFor`.
- Password strength meter uses `role="progressbar"` with `aria-valuenow`.
- Password confirm mismatch announced via `aria-live="polite"`.
- `autoComplete="email"` on email; `autoComplete="new-password"` on password fields.
- Submit button disabled during `isPending`.

## Notes / gotchas

- `check_password` procedure enforces `min_password_length` server-side. Client-side strength scorer is UX-only — don't gate submission on client score (only on server rejection).
- HIBP check (`onCheckPasswordBreach`) is intentionally synchronous to the UX flow — it blocks submission. Make it fast (debounced k-anonymity lookup). The default implementation ships in v1.1.
- `is_verified=false` after sign-up is the expected state (email verification required). Show [[auth-verify-email-banner]] in the post-sign-up app shell.
- `EMAIL_TAKEN` error is returned even if the existing account uses OAuth — Constructive merges by email. Advise the user to sign in instead.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/sign-up-card/`
- Password strength scorer: use a minimal bundled version of zxcvbn logic — do NOT import the full 500KB library. Consider `zxcvbn-ts` with only the `common` dictionary or an inline entropy estimator.
- States for Storybook: default, pending, error (EMAIL_TAKEN), error (WEAK_PASSWORD), password strength levels (4 states), password mismatch, HIBP warning.
