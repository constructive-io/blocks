# auth-passkey-sign-in

**Type:** `registry:block`
**Status:** `v1 (frontend ready, backend pending)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-mfa.md`
**Master entry:** `blocks-master.md#auth-passkey-sign-in`

**Backend status: pending** — Frontend spec is complete. The default hook references `constructive_auth_private.webauthn_begin_sign_in` and `constructive_auth_private.webauthn_finish_sign_in`. These are private-schema procedures; public-schema wrappers (`passkey_begin_sign_in`, `passkey_finish_sign_in`) are required before these blocks are callable via the PostGraphile GraphQL API. See `backend-spec/future-procedures.md` for the wrapper procedure specs.

**Pairing:** No page block — this block is used inside sign-in cards and the step-up dialog. Consumers of this block: `[[auth-sign-in-card]]`, `[[auth-sign-in-page]]` (as a passkey alternative button), `[[auth-step-up-dialog]]` (step-up passkey path).

## Purpose

WebAuthn sign-in block. Orchestrates the begin/browser/finish dance: `webauthn_begin_sign_in` → browser `startAuthentication` → `webauthn_finish_sign_in`. Supports both targeted (user-ID-known) and usernameless flows based on the `allow_webauthn_usernameless` feature flag. Also supports conditional UI autofill (browser passkey picker in the username field) via `autocomplete="username webauthn"`.

## When to use

- On the sign-in page as an alternative or replacement for password sign-in when `allow_webauthn_sign_in` is enabled.
- As a "Sign in with passkey" button alongside `[[auth-sign-in-card]]`.
- As a step-up option within `[[auth-step-up-dialog]]` when the user has registered passkeys.
- Not a fit when `allow_webauthn_sign_in` is disabled on `app_settings_auth`.

## Files shipped (per registry.json)

| File path (in consumer repo) | Type |
|---|---|
| `components/auth/passkey-sign-in.tsx` | `registry:component` |
| `components/auth/passkey-sign-in.requires.json` | `registry:file` |
| `lib/auth/hooks/use-passkey-sign-in.ts` | `registry:lib` |
| `lib/auth/messages/passkey-sign-in-messages.ts` | `registry:lib` |

> **WebAuthn ceremony hooks are NOT generated SDK hooks.** The passkey sign-in ceremony (`webauthn_begin_sign_in` / `webauthn_finish_sign_in`) lives in `constructive_auth_private` and is called via **Express middleware**, not directly via the PostGraphile GraphQL API (see `contracts/endpoint-contract.md` §1). `use-passkey-sign-in.ts` is therefore a **UTILITY hook** that orchestrates middleware fetch calls + `@simplewebauthn/browser` — it is **AUTHORED and SHIPPED** by this block, not generated. The public-wrapper procedures (`passkey_begin_sign_in`, `passkey_finish_sign_in`) are FUTURE — when they land in `constructive_auth_public`, the hook may be upgraded to call generated hooks. See `contracts/sdk-binding-contract.md` §10.

## Registry dependencies

- `blocks-runtime` (Constructive block; supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `button`
- `lib/auth-errors`

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `@simplewebauthn/browser` (direct dependency — auto-installed via shadcn CLI; version must match server-side `@simplewebauthn/server`)
- `sonner`

## DB procedures used by default hook

- `constructive_auth_private.webauthn_begin_sign_in(p_user_id uuid) RETURNS jsonb` — private schema only; called via **Express middleware**, NOT via generated GraphQL hook. See `constructive/graphql/server/src/middleware/auth.ts`. `p_user_id` is nullable (discoverable-credential flow when null + `allow_webauthn_usernameless` enabled).
- `constructive_auth_private.webauthn_finish_sign_in(...) RETURNS session_row` — private schema only; same middleware path.

**Future public wrappers (FUTURE — not yet deployed):**
- `constructive_auth_public.passkey_begin_sign_in(...)` → generated op `passkeyBeginSignIn` → hook `usePasskeyBeginSignInMutation` — pending; see `backend-spec/future-procedures.md`.
- `constructive_auth_public.passkey_finish_sign_in(...)` → generated op `passkeyFinishSignIn` → hook `usePasskeyFinishSignInMutation` — pending.

Until public wrappers are deployed, the block uses middleware fetch calls (not generated hooks) for the ceremony. The `requires.json` lists the pending ops so `check-sdk.mjs` fails clearly if the host has not deployed them.

## Props

```ts
export type PasskeySignInProps = {
  /**
   * When provided, restricts the WebAuthn challenge to this user's credentials (targeted flow).
   * When null/undefined and allow_webauthn_usernameless is true, a discoverable-credential
   * (usernameless) challenge is issued.
   */
  userId?: string | null;
  /**
   * Enable conditional UI autofill. When true, block calls startAuthentication with
   * `useBrowserAutofill: true` — browser shows passkey suggestions in the username input
   * (pair with an <input autocomplete="username webauthn"> in a sibling sign-in form).
   * Default: false.
   */
  conditionalUI?: boolean;
  /**
   * Render as a full-width button or an icon-only button.
   * Default: 'button'.
   */
  variant?: 'button' | 'icon';
  /** Used in step-up framing — changes button label to "Verify with passkey". */
  stepUpMode?: boolean;
  notifications?: boolean | NotificationConfig;
  messages?: Partial<PasskeySignInMessages>;
  /** Adapter override — replaces full begin/browser/finish orchestration. */
  onSubmit?: (input: { userId?: string | null }) => Promise<PasskeySignInResult>;
  onSuccess?: (result: PasskeySignInResult) => void;
  onError?: (err: { message: string; code: string }) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
};

type PasskeySignInResult = {
  session: { id: string; accessToken: string; expiresAt: string };
  user: { id: string };
  redirectTo?: string;
};
```

## Messages catalog

```ts
export type PasskeySignInMessages = {
  signInButton: string;
  signInButtonStepUp: string;   // used when stepUpMode=true
  signingInButton: string;
  unsupportedBrowser: string;
  successToast: string;
  errors: {
    NO_CREDENTIALS: string;     // no passkeys found for this user
    USER_ABORTED: string;       // user cancelled browser dialog (usually silent)
    CHALLENGE_FAILED: string;
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultPasskeySignInMessages: PasskeySignInMessages = {
  signInButton: 'Sign in with passkey',
  signInButtonStepUp: 'Verify with passkey',
  signingInButton: 'Waiting for passkey…',
  unsupportedBrowser: 'Your browser does not support passkeys.',
  successToast: 'Signed in successfully.',
  errors: {
    NO_CREDENTIALS: 'No passkey found. Sign in with your password instead.',
    USER_ABORTED: 'Passkey sign-in was cancelled.',
    CHALLENGE_FAILED: 'Failed to start passkey sign-in. Please try again.',
    PROCEDURE_NOT_FOUND: 'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
```

## Default data hook (utility hook — shipped)

`use-passkey-sign-in.ts` is a **UTILITY hook** authored and shipped by this block (not generated). The WebAuthn ceremony calls `constructive_auth_private` procedures via Express middleware, not via PostGraphile generated hooks. Canonical mechanics: `contracts/sdk-binding-contract.md` §10.

- **Module:** `lib/auth/hooks/use-passkey-sign-in.ts` (SHIPPED — utility hook)
- **Orchestration (consumer does NOT see the protocol):**
  1. `fetch` the begin-sign-in middleware endpoint → receive `authenticationOptions: JsonObject`.
  2. Call `startAuthentication(authenticationOptions, useBrowserAutofill?)` from `@simplewebauthn/browser`.
  3. `fetch` the finish-sign-in middleware endpoint with the authentication response → receive session row.
- **Conditional UI:** When `conditionalUI=true`, `startAuthentication` is called with `useBrowserAutofill: true` on component mount. The browser attaches the passkey picker to any `<input autocomplete="username webauthn">` on the page. The hook cancels the outstanding conditional request if the user clicks the button explicitly.
- **Returns:** `{ signIn, isPending, isSupported, error }`.
- **Adapter override:** When `props.onSubmit` is set, replaces all three steps.

### `passkey-sign-in.requires.json`

Lists the FUTURE public-wrapper ops so `check-sdk.mjs` fails clearly until they are deployed.

```json
{
  "namespace": "auth",
  "mutations": ["passkeyBeginSignIn", "passkeyFinishSignIn"],
  "queries": [],
  "models": []
}
```

## Callbacks

- `onSuccess(result)` — fires with `{ session, user, redirectTo? }` after successful sign-in.
- `onError(err)` — fires after error mapping. User-abort from native dialog (`NotAllowedError`) is suppressed by default (silent UX); set `notifications` override to surface it.
- `onMessage(event)` — fires `{ kind: 'success' | 'error' | 'info' | 'warning', key, message? }`; e.g. `{ kind: 'info', key: 'conditional_ui_active' }`.

## Captcha

- Not applicable. WebAuthn is inherently a phishing-resistant credential mechanism.

## Step-up

- This block itself provides step-up authentication when `stepUpMode=true`. It is invoked from within `[[auth-step-up-dialog]]` — not a consumer of `[[use-step-up]]`.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| success | `messages.successToast` |
| error → `NO_CREDENTIALS` | `messages.errors.NO_CREDENTIALS` |
| error → user aborted | silent (no toast by default) |
| error → `CHALLENGE_FAILED` | `messages.errors.CHALLENGE_FAILED` |
| error → fallback | `messages.errors.UNKNOWN_ERROR` |

## Accessibility

- Button shows `aria-busy="true"` while `isPending`.
- Browser native dialog is handled by the platform — no block-level a11y needed for the credential picker itself.
- Conditional UI: the associated `<input autocomplete="username webauthn">` must be outside this component (in the sibling sign-in form); document the pairing requirement in install notes.
- Block renders `null` when `isSupported === false`.

## Notes / gotchas

- **Conditional UI and button click conflict:** If `conditionalUI=true` is active and the user clicks the button, the hook must abort the pending `startAuthentication` conditional call before starting a new direct call. `@simplewebauthn/browser` supports an `AbortController` for this — implement carefully.
- **Usernameless flow and targeted flow mutual exclusion:** When `userId` is provided, conditional UI should be `false` — there's no reason to issue a discoverable-credential challenge for a known user.
- **Safari passkey support:** Safari 16+ on macOS and iOS 16+ support platform passkeys. Hardware security keys (cross-platform) require additional OS support. The `isSupported` check does NOT distinguish platform vs cross-platform capability.
- **`allow_webauthn_usernameless` flag:** The consumer should query `app_settings_auth` before setting `userId=null`. The block itself does not query feature flags.
- **Step-up framing:** When used inside `[[auth-step-up-dialog]]`, `stepUpMode=true` changes the button label and calls `onSuccess` with a signal that the step-up is complete (the dialog resolves its Promise). See `[[use-step-up]]` for the Promise contract.
- Cross-reference: credentials are enrolled via `[[auth-passkey-enroll]]` and managed via `[[auth-passkey-management-list]]`.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/passkey-sign-in/`
- Storybook states: default, pending, success, unsupported, no credentials, error (challenge), step-up mode.
- Dynamic import `startAuthentication` from `@simplewebauthn/browser` inside the hook (SSR guard).
- Conditional UI initialization should run in a `useEffect` on mount, with cleanup calling the AbortController on unmount.
- The block is intentionally minimal (button + status) — layout is the consumer's responsibility.
