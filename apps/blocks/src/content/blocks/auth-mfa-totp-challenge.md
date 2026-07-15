# auth-mfa-totp-challenge

**Type:** `registry:block`
**Status:** `v1 (frontend ready, backend pending)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-mfa.md`
**Master entry:** `blocks-master.md#auth-mfa-totp-challenge`

> **Backend status: pending** — `complete_mfa_challenge` does not exist in `constructive_auth_public` today. The default hook is written against the procedure-we-want. See `backend-spec/future-procedures.md`. `verify_totp` exists but returns only `boolean` and is for step-up on authenticated sessions — it is NOT the procedure for completing a sign-in MFA gate.

**Pairing:** Paired with [[auth-mfa-totp-challenge-page]] — the page reads `?token=` from searchParams and mounts this card. Consumers of this block: `[[auth-sign-in-page]]` (routes to the challenge page on `mfa_required=true`), `[[auth-magic-link-callback-page]]` (same). The page handles URL param parsing and routing on success; this card handles the TOTP input and mutation.

## Purpose

Presents a 6-digit TOTP code input when `sign_in` returns `mfa_required=true` with a non-null `mfa_challenge_token`. Calls `constructive_auth_public.complete_mfa_challenge(challenge_token, totp_code, mfa_method, credential_kind)` to exchange the challenge token for a valid session. Handles the step immediately after the primary credential check — the consumer flow calls this block when the sign-in result signals MFA is needed.

## When to use

- After `[[auth-sign-in-card]]` returns `result.mfa_required === true` — render this block to complete the MFA leg.
- Embedded in a multi-step sign-in flow managed by `[[auth-sign-in-page]]`.
- Not a fit when TOTP is not enrolled (check `totp_enabled` on `sign_in` result before mounting).

## Files shipped (per registry.json)

| File path (in consumer repo) | Type |
|---|---|
| `components/auth/mfa-totp-challenge.tsx` | `registry:component` |
| `components/auth/mfa-totp-challenge.requires.json` | `registry:file` |
| `lib/auth/messages/mfa-totp-challenge-messages.ts` | `registry:lib` |

> No data hook is shipped. The block imports its mutation hook (`useCompleteMfaChallengeMutation`) from the host's generated `auth` SDK (`@/generated/auth`). Only the messages catalog and the `requires.json` manifest are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (Constructive block; supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `card`, `button`, `input`, `label`, `form`
- `lib/auth-errors` (shared error mapper)

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; it arrives transitively via the `blocks-runtime` registry dependency.

## DB procedures used by default hook

- `constructive_auth_public.complete_mfa_challenge(challenge_token text, totp_code text, mfa_method text, credential_kind text, device_token text, remember_me bool) RETURNS sign_in_result` — schema `constructive_auth_public` → **namespace `auth`** → generated op `completeMfaChallenge` → hook `useCompleteMfaChallengeMutation`.
  — Validates the `mfa_challenge_token` from the `sign_in` response, verifies the TOTP code, creates the real session, and returns the full sign-in result including session and user. `device_token` and `remember_me` mirror the contract from `sign_in` — if `remember_me=true`, the server extends the session per `app_settings_auth.remember_me_duration`.

CSRF token is attached below the block — by the runtime adapter / server, see `contracts/endpoint-contract.md` §3. The block does NOT read or set `csrf_token`.

> **Backend status: pending** — `complete_mfa_challenge` is compiled from `proc_complete_mfa_challenge_body` in the AST generator but not yet deployed to `constructive_auth_public`. See `backend-spec/future-procedures.md`.

## Props

```ts
export type MfaTotpChallengeProps = {
  /** The mfa_challenge_token from the sign_in result. Required. */
  challengeToken: string;
  /** The credential_kind to pass to complete_mfa_challenge. Default: 'totp'. */
  mfaMethod?: string;
  /** The credential_kind to use for session creation. Default: 'bearer'. */
  credentialKind?: string;
  /** Whether the "Trust this device for 30 days" checkbox is shown. Default true. */
  showTrustDevice?: boolean;
  /** Backup-code path affordance — locked false in v1; enable when verify_backup_code lands. */
  allowBackupCode?: false;
  notifications?: boolean | NotificationConfig;
  messages?: Partial<MfaTotpChallengeMessages>;
  /** Adapter override — replaces default complete_mfa_challenge mutation. */
  onSubmit?: (input: {
    totpValue: string;
    trustDevice: boolean;
    challengeToken: string;
    mfaMethod: string;
    credentialKind: string;
    deviceToken?: string;
    rememberMe?: boolean;
  }) => Promise<MfaChallengeResult>;
  onSuccess?: (result: MfaChallengeResult) => void;
  onError?: (err: { message: string; code: string }) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
};

type MfaChallengeResult = {
  session: { id: string; accessToken: string; expiresAt: string };
  user: { id: string; [key: string]: unknown };
  redirectTo?: string;
};
```

## Messages catalog

```ts
export type MfaTotpChallengeMessages = {
  title: string;
  description: string;
  codeLabel: string;
  codePlaceholder: string;
  trustDeviceLabel: string;
  trustDeviceHint: string;
  submitButton: string;
  backupCodeLink: string;   // v1.1 affordance label; hidden in v1
  successToast: string;
  errors: {
    INVALID_TOTP: string;
    EXPIRED_TOKEN: string;
    RATE_LIMITED: string;
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultMfaTotpChallengeMessages: MfaTotpChallengeMessages = {
  title: 'Two-factor authentication',
  description: 'Enter the 6-digit code from your authenticator app.',
  codeLabel: 'Authentication code',
  codePlaceholder: '000000',
  trustDeviceLabel: 'Trust this device for 30 days',
  trustDeviceHint: 'Skip two-factor on this device for 30 days.',
  submitButton: 'Verify',
  backupCodeLink: 'Use a backup code instead',
  successToast: 'Verified successfully.',
  errors: {
    INVALID_TOTP: 'Invalid code. Check your authenticator app and try again.',
    EXPIRED_TOKEN: 'Your session expired. Please sign in again.',
    RATE_LIMITED: 'Too many attempts. Please wait before trying again.',
    PROCEDURE_NOT_FOUND: 'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The block does **not** ship a `use-mfa-totp-challenge.ts`. It imports the generated mutation hook from the host's `auth` SDK and drives it with a field `selection`. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

- **Import:** `import { useCompleteMfaChallengeMutation } from '@/generated/auth';` (real generated name — `complete_mfa_challenge` → `completeMfaChallenge` → `useCompleteMfaChallengeMutation`, per `endpoint-contract.md` §7.)
- **Instantiate with a selection** of exactly the payload fields this card consumes:
  ```ts
  const defaultMutation = useCompleteMfaChallengeMutation({
    selection: { fields: {
      session: { id: true, accessToken: true, expiresAt: true },
      user: { id: true },
      redirectTo: true,
    } },
  });
  ```
- **Call + read the payload via the operation key:**
  ```ts
  const result = await (onSubmitOverride
    ? onSubmitOverride(vars)
    : defaultMutation.mutateAsync(vars).then((d) => d.completeMfaChallenge));
  ```
  `vars` carries `challengeToken`, `totpCode`, `mfaMethod`, `credentialKind`, `deviceToken?`, `rememberMe?` — **never** `csrf_token` (handled below the block).
- **Trust device:** If `trustDevice=true`, the block passes `rememberMe=true` and a `deviceToken` (from `getDeviceToken()` utility) as mutation vars. The server extends the session per `app_settings_auth.remember_me_duration`.
- **Returns:** generated hook exposes `{ mutateAsync, isPending, error }` (TanStack Query v5 style).
- **Adapter override:** When `props.onSubmit` is provided, the block awaits it instead of the generated hook. Hybrid pending: `onSubmitOverride ? overridePending : defaultMutation.isPending`.

### `mfa-totp-challenge.requires.json`

The install-time check (`constructive-blocks` skill) reads this to verify the host's generated `auth` SDK exports the named op before the block is installed.

```json
{
  "namespace": "auth",
  "mutations": ["completeMfaChallenge"],
  "queries": [],
  "models": []
}
```

## Callbacks

- `onSuccess(result)` — fires after MFA challenge completed and session is active. Receives `{ session: { id, accessToken, expiresAt }, user: { id, ... }, redirectTo? }`.
- `onError(err)` — fires after `mapAuthError(err, messages)` maps the PostGraphile error code using `messages.errors[err.extensions.code]`.
- `onMessage(event)` — fires `{ kind: 'success' | 'error' | 'info' | 'warning', key, message? }`; e.g. `{ kind: 'info', key: 'trust_device_enabled' }`.

## Captcha

- Not applicable. TOTP verification is a second factor, already past the primary rate-limited step.

## Step-up

- Not applicable. This block IS the MFA step.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| success | `messages.successToast` |
| error → `INVALID_TOTP` | `messages.errors.INVALID_TOTP` |
| error → `EXPIRED_TOKEN` | `messages.errors.EXPIRED_TOKEN` |
| error → `RATE_LIMITED` | `messages.errors.RATE_LIMITED` |
| error → fallback | `messages.errors.UNKNOWN_ERROR` |

## Accessibility

- Single `<input type="text" inputMode="numeric" maxLength={6} autoComplete="one-time-code" autoFocus>` for the TOTP code.
- Error message rendered in `aria-live="polite"` region below the input.
- Submit button disabled while `isPending`.
- Paste support: strip spaces/dashes from pasted 6-digit strings automatically.

## Notes / gotchas

- **Auto-submit:** Consider auto-submitting when 6 digits are entered (UX improvement — mark as implementation decision).
- **Backup code affordance (v1.1):** The `backupCodeLink` string is in the messages catalog now to avoid a breaking change later. In v1, render the link as hidden (`allowBackupCode` is `false` by default). In v1.1, when `allow_backup_codes` feature flag is enabled and `verify_backup_code` procedure is deployed, enable the link to toggle to a backup-code input. See `backend-spec/future-procedures.md` for `verify_backup_code` status.
- **Challenge token expiry:** `mfa_challenge_expiry` is a configurable field on `app_settings_auth`. If the user sits on this screen too long, `complete_mfa_challenge` will fail with `EXPIRED_TOKEN` — surface the `errors.EXPIRED_TOKEN` message with a "Sign in again" CTA.
- **Trust device:** Implemented via `remember_me=true` and `device_token` params on `complete_mfa_challenge`, same as `sign_in`. Server reads `app_settings_auth.remember_me_duration` to determine session expiry extension. Checkbox should be hidden if `remember_me_duration` is 0.
- **Wrong procedure for step-up:** `verify_totp` (which is deployed) is for step-up verification on already-authenticated sessions. Do NOT use it here. This block needs `complete_mfa_challenge` to create the session. Wire the adapter if the backend is not yet deployed.
- Cross-reference: `[[auth-sign-in-card]]` is always the block upstream of this one.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/mfa-totp-challenge/`
- Storybook states: idle, submitting, error (invalid code), error (expired), success.
- The block renders inside whatever layout the consumer provides — it is NOT a page. `[[auth-sign-in-page]]` composes the sign-in card + this block as a two-step flow.
- Until `complete_mfa_challenge` is deployed, use the `onSubmit` adapter prop to wire a custom implementation.
