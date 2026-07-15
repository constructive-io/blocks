# auth-sign-in-card

**Type:** `registry:block`
**Status:** `v1 (frontend ready)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-credentials.md`
**Master entry:** `blocks-master.md#auth-sign-in-card`

## Purpose

Email + password sign-in form. Calls `constructive_auth_public.sign_in`. Handles MFA branching: if the response includes `mfa_required=true` + `mfa_challenge_token`, fires `onMfaRequired` so the page wrapper can route to [[auth-mfa-totp-challenge]]. Optionally renders a captcha widget before submission. Shows a "last used" badge when the user previously authenticated with this method.

## When to use

- Any route that needs email+password authentication.
- Embedded in `auth-sign-in-page` (the canonical install path).
- Can be dropped into a modal, sidebar, or inline panel without the page wrapper.
- Not a fit when: you need social/OAuth buttons only — compose [[auth-social-providers-grid]] alongside (which wraps the raw social buttons).

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/auth/sign-in-card.tsx` | `registry:component` |
| `components/auth/sign-in-card.requires.json` | `registry:file` |
| `lib/auth/messages/sign-in-card-messages.ts` | `registry:lib` |
| `lib/auth/errors.ts` | `registry:lib` (shared, auto-deduped) |

> No data hook is shipped. The block imports its mutation hook (`useSignInMutation`) from the host's generated `auth` SDK (`@/generated/auth`). Only the messages catalog, the shared errors util, and the `requires.json` manifest are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (Constructive block; supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `card` (shadcn primitive)
- `button` (shadcn primitive)
- `input` (shadcn primitive)
- `label` (shadcn primitive)
- `form` (shadcn primitive, react-hook-form wrapper)
- `auth-social-providers-grid` (optional; rendered below form when `showSocialProviders` is true — the grid is the canonical social composition layer; it wraps `auth-social-buttons` internally)

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `react-hook-form` (^7)
- `zod` (^3)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; it arrives transitively via the `blocks-runtime` registry dependency. The generated `auth` SDK is the host's, not a published dep of this block.
- Captcha libs: lazy-loaded only when `captcha` prop is set
  - `@marsidev/react-turnstile` (turnstile)
  - `react-google-recaptcha` (recaptcha-v2/v3)

## DB procedures used by default hook

- `constructive_auth_public.sign_in(email citext, password text, remember_me bool, credential_kind text, csrf_token text, device_token text)` — schema `constructive_auth_public` → **namespace `auth`** → generated op `signIn` → hook `useSignInMutation`.
  Returns: `(id, user_id, access_token, access_token_expires_at, is_verified, totp_enabled, mfa_required, mfa_challenge_token)`

CSRF token is attached below the block — by the runtime adapter / server (`app_settings_auth.require_csrf_for_auth`), see `contracts/endpoint-contract.md` §3. The block does NOT read or set `csrf_token`; it is omitted from the mutation vars the block passes.

## Props

```ts
export type SignInCardProps = {
  /** Show "Remember me" checkbox. Default: true */
  showRememberMe?: boolean;
  /** Show social sign-in section below form (renders [[auth-social-providers-grid]]). Default: false */
  showSocialProviders?: boolean;
  /** Pre-fill the email field (e.g., from URL param). */
  defaultEmail?: string;
  /** credential_kind forwarded to sign_in. Default: 'bearer' */
  credentialKind?: 'bearer' | 'cookie';
  /** Show "last used method" badge above the form. Default: true */
  showLastUsedBadge?: boolean;
  /**
   * Captcha config (see contracts/captcha-contract.md). Off by default.
   * Shape: { provider, siteKey, mode?, theme? }. Default mode: 'visible'.
   * For invisible providers (recaptcha-v3), pass mode: 'invisible' — no widget is rendered.
   */
  captcha?: CaptchaConfig;
  /** Override toast/notification behavior. Default: true (toasts on). */
  notifications?: boolean | NotificationConfig;
  /** Override all user-facing strings. */
  messages?: Partial<SignInCardMessages>;
  /** Adapter override: replaces the generated useSignInMutation call entirely. */
  onSubmit?: (input: SignInInput) => Promise<SignInResult>;
  /** Fires after successful sign-in. */
  onSuccess?: (result: SignInResult) => void;
  /** Fires on any error (after mapAuthError). */
  onError?: (err: AuthError) => void;
  /** Notification events (captcha loaded, MFA required, etc.). Shape per block-contract.md §4. */
  onMessage?: (msg: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  /** Fires when server returns mfa_required=true. Receives mfa_challenge_token. */
  onMfaRequired?: (challengeToken: string) => void;
};

export type SignInInput = {
  email: string;
  password: string;
  rememberMe: boolean;
  credentialKind: string;
};

export type SignInResult = {
  id: string;
  userId: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  isVerified: boolean;
  totpEnabled: boolean;
  mfaRequired: boolean;
  mfaChallengeToken: string | null;
};
```

## Messages catalog

```ts
export type SignInCardMessages = {
  title: string;
  description: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  rememberMeLabel: string;
  forgotPasswordLink: string;
  submitButton: string;
  submitButtonPending: string;
  lastUsedBadge: string;
  dividerText: string;
  signUpPrompt: string;
  signUpLink: string;
  /** Verification warning (is_verified=false after sign-in) */
  emailNotVerifiedWarning: string;
  /** Error messages — UPPER_SNAKE_CASE keys match err.extensions.code from PostGraphile */
  errors: {
    INVALID_CREDENTIALS: string;
    RATE_LIMITED: string;
    ACCOUNT_LOCKED: string;
    CAPTCHA_FAILED: string;
    SIGN_IN_DISABLED: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultSignInCardMessages: SignInCardMessages = {
  title: 'Sign in',
  description: 'Enter your email and password to continue.',
  emailLabel: 'Email',
  emailPlaceholder: 'you@example.com',
  passwordLabel: 'Password',
  passwordPlaceholder: '••••••••',
  rememberMeLabel: 'Remember me',
  forgotPasswordLink: 'Forgot password?',
  submitButton: 'Sign in',
  submitButtonPending: 'Signing in…',
  lastUsedBadge: 'Last used method',
  dividerText: 'or',
  signUpPrompt: "Don't have an account?",
  signUpLink: 'Sign up',
  emailNotVerifiedWarning: 'Your email address is not verified. Check your inbox.',
  errors: {
    INVALID_CREDENTIALS: 'Invalid email or password.',
    RATE_LIMITED: 'Too many attempts. Please wait before trying again.',
    ACCOUNT_LOCKED: 'Your account has been locked. Contact support.',
    CAPTCHA_FAILED: 'Captcha verification failed. Please try again.',
    SIGN_IN_DISABLED: 'Sign in is currently disabled.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The block does **not** ship a `use-sign-in.ts`. It imports the generated mutation hook from the host's `auth` SDK and drives it with a field `selection`. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

- **Import:** `import { useSignInMutation } from '@/generated/auth';` (real generated name — `sign_in` → `signIn` → `useSignInMutation`, per `endpoint-contract.md` §7. Note the `Mutation` suffix; it is **not** `useSignIn`.)
- **Instantiate with a selection** of exactly the payload fields this card consumes:
  ```ts
  const defaultMutation = useSignInMutation({
    selection: { fields: {
      id: true, userId: true, accessToken: true, accessTokenExpiresAt: true,
      isVerified: true, totpEnabled: true, mfaRequired: true, mfaChallengeToken: true,
    } },
  });
  ```
- **Call + read the payload via the operation key:**
  ```ts
  const result = await (onSubmitOverride
    ? onSubmitOverride(vars)
    : defaultMutation.mutateAsync(vars).then((d) => d.signIn));
  ```
  `vars` carries `email`, `password`, `rememberMe`, `credentialKind`, `deviceToken?` — **never** `csrf_token` (handled below the block). `accessToken` is read off `result` and handed to the host via `onSuccess`; the block never stores it (the runtime's `getToken` reads it back). See `endpoint-contract.md` §2.
- **Returns:** generated hook exposes `{ mutateAsync, isPending, error }` (TanStack Query v5 style).
- **Adapter override:** when `props.onSubmit` is provided, the block awaits it instead of the generated hook. Hybrid pending: `onSubmitOverride ? overridePending : defaultMutation.isPending`.
- **MFA branch:** if `result.mfaRequired === true`, calls `props.onMfaRequired(mfaChallengeToken)` and does NOT call `onSuccess`. If `onMfaRequired` is not wired, fires `onMessage({ kind: 'warning', key: 'mfaRequired' })`.
- **Unverified email:** if `result.isVerified === false`, fires `onMessage({ kind: 'warning', key: 'emailNotVerified' })` and shows the warning banner inline.

### `sign-in-card.requires.json`

The install-time check (`constructive-blocks` skill) reads this to verify the host's generated `auth` SDK exports the named op before the block is installed.

```json
{
  "namespace": "auth",
  "mutations": ["signIn"],
  "queries": [],
  "models": []
}
```

## Callbacks

- `onSuccess(result)` — fires on successful sign-in (mfa_required=false). `result.userId`, `result.accessToken`, `result.accessTokenExpiresAt`.
- `onMfaRequired(challengeToken)` — fires when `mfa_required=true`. Caller routes to [[auth-mfa-totp-challenge]].
- `onError(err)` — fires on any error after `mapAuthError`. `err.message` is user-friendly.
- `onMessage({ kind, key })` — fires for `emailNotVerified`, `mfaRequired`.

## Captcha

- Supported: `turnstile`, `hcaptcha`, `recaptcha-v2`, `recaptcha-v3` (see `contracts/captcha-contract.md`).
- Off by default. When `captcha` prop is set and `mode='visible'` (default), widget renders above the submit button.
- When `mode='invisible'` (e.g., for `recaptcha-v3` or Turnstile invisible), no widget is rendered — token is resolved on submit via the provider's invisible API.
- Captcha response injected as `x-captcha-response` header into the mutation request.
- Block lazy-loads provider script only when prop is present.

## Step-up

- Required: no. Sign-in IS the authentication step; step-up is not applicable here.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Success (is_verified=true) | none by default — navigation is the feedback |
| Success (is_verified=false) | `messages.emailNotVerifiedWarning` (info) |
| `INVALID_CREDENTIALS` | `messages.errors.INVALID_CREDENTIALS` (error) |
| `RATE_LIMITED` | `messages.errors.RATE_LIMITED` (error) |
| `ACCOUNT_LOCKED` | `messages.errors.ACCOUNT_LOCKED` (error) |
| `CAPTCHA_FAILED` | `messages.errors.CAPTCHA_FAILED` (error) |
| `SIGN_IN_DISABLED` | `messages.errors.SIGN_IN_DISABLED` (error) |
| Unknown error | `messages.errors.UNKNOWN_ERROR` (error) |

## Accessibility

- All form labels associated via `htmlFor`.
- Error messages rendered in an `aria-live="polite"` region below each field.
- Submit button disabled + shows `submitButtonPending` text while `isPending`.
- `autoComplete="email"` on email field; `autoComplete="current-password"` on password field.
- `autoFocus` on email field by default (override via CSS if used in modal).

## Notes / gotchas

- `onMfaRequired` is the escape hatch for MFA routing. If not wired, the MFA challenge is a dead end. The page wrapper handles this — see [[auth-sign-in-page]].
- `mfa_challenge_token` format: `cnc_live_mfa_...` (opaque). Pass as-is to [[auth-mfa-totp-challenge]].
- `is_verified=false` after sign-in does NOT block access — the session is active. Show [[auth-verify-email-banner]] in the app shell.
- `credential_kind` defaults to `'bearer'`. Use `'cookie'` only when `enable_cookie_auth` is set in `app_settings_auth`.
- `showSocialProviders=true` renders [[auth-social-providers-grid]] below a divider. The grid is the canonical social composition layer for primary sign-in/up surfaces; it wraps `auth-social-buttons` internally and adds mode context and last-used badges. Providers are loaded dynamically from DB unless `auth-social-providers-grid`'s `providers` prop is set.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/sign-in-card/`
- Form validation: zod schema — `email` (email format), `password` (min 1 char — server enforces strength).
- States requiring Storybook stories: default, pending, error (INVALID_CREDENTIALS), error (RATE_LIMITED), unverified email warning, with captcha widget, last-used badge visible.
