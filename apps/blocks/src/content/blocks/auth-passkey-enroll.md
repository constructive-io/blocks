# auth-passkey-enroll

**Type:** `registry:block`
**Status:** `v1 (frontend ready, backend pending)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-mfa.md`
**Master entry:** `blocks-master.md#auth-passkey-enroll`

**Backend status: pending** — Frontend spec is complete. The default hook references `constructive_auth_private.webauthn_begin_registration` and `constructive_auth_private.webauthn_finish_registration`. These are private-schema procedures; public-schema wrappers (`passkey_begin_registration`, `passkey_finish_registration`) are required before these blocks are callable via the PostGraphile GraphQL API. See `backend-spec/future-procedures.md` for the wrapper procedure specs.

**Pairing:** No page block — this block is used inside `[[auth-account-security-card]]` (account settings security section). Consumers of this block: `[[auth-account-security-card]]`.

## Purpose

Registers a new WebAuthn credential (passkey) for the current user. Orchestrates the two-call dance: `webauthn_begin_registration` → browser `startRegistration` → `webauthn_finish_registration`. Detects browser WebAuthn capability and hides itself gracefully when unsupported. Accepts a user-supplied credential name so users can distinguish passkeys later in `[[auth-passkey-management-list]]`.

## When to use

- On the account security settings page alongside `[[auth-account-security-card]]`.
- During onboarding flows that encourage passkey adoption.
- Not a fit when `allow_webauthn_sign_up` feature flag is disabled — consumer should check the flag before mounting.

## Files shipped (per registry.json)

| File path (in consumer repo) | Type |
|---|---|
| `components/auth/passkey-enroll.tsx` | `registry:component` |
| `components/auth/passkey-enroll.requires.json` | `registry:file` |
| `lib/auth/hooks/use-passkey-enroll.ts` | `registry:lib` |
| `lib/auth/messages/passkey-enroll-messages.ts` | `registry:lib` |

> **WebAuthn ceremony hooks are NOT generated SDK hooks.** The passkey registration ceremony (`webauthn_begin_registration` / `webauthn_finish_registration`) lives in `constructive_auth_private` and is called via **Express middleware**, not directly via the PostGraphile GraphQL API (see `contracts/endpoint-contract.md` §1). `use-passkey-enroll.ts` is therefore a **UTILITY hook** that orchestrates middleware fetch calls + `@simplewebauthn/browser` — it is **AUTHORED and SHIPPED** by this block, not generated. The public-wrapper procedures (`passkey_begin_registration`, `passkey_finish_registration`) are FUTURE — when they land in `constructive_auth_public`, the hook may be upgraded to call generated hooks; until then the middleware fetch path is used. See `contracts/sdk-binding-contract.md` §10.

## Registry dependencies

- `blocks-runtime` (Constructive block; supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `card`, `button`, `input`, `label`, `form`, `dialog`
- `lib/auth-errors`

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `@simplewebauthn/browser` (direct dependency — auto-installed via shadcn CLI; version must match server-side `@simplewebauthn/server`)
- `sonner`

## DB procedures used by default hook

- `constructive_auth_private.webauthn_begin_registration(p_user_id uuid) RETURNS jsonb` — private schema only; called via **Express middleware**, NOT via generated GraphQL hook. See `constructive/graphql/server/src/middleware/auth.ts`.
- `constructive_auth_private.webauthn_finish_registration(...) RETURNS uuid` — private schema only; same middleware path.

**Future public wrappers (FUTURE — not yet deployed):**
- `constructive_auth_public.passkey_begin_registration(...)` → generated op `passkeyBeginRegistration` → hook `usePasskeyBeginRegistrationMutation` — pending; see `backend-spec/future-procedures.md`.
- `constructive_auth_public.passkey_finish_registration(...)` → generated op `passkeyFinishRegistration` → hook `usePasskeyFinishRegistrationMutation` — pending.

Until public wrappers are deployed, the block uses middleware fetch calls (not generated hooks) for the ceremony. The `requires.json` lists the pending ops so `check-sdk.mjs` fails clearly if the host has not deployed them.

## Props

```ts
export type PasskeyEnrollProps = {
  /** The current authenticated user's ID. Required for begin_registration. */
  userId: string;
  /** If false, block renders nothing (consumer controls visibility based on feature flag). Default: auto-detect. */
  enabled?: boolean;
  notifications?: boolean | NotificationConfig;
  messages?: Partial<PasskeyEnrollMessages>;
  /** Adapter override — replaces the full begin/browser/finish orchestration. */
  onSubmit?: (input: { credentialName: string; userId: string }) => Promise<PasskeyEnrollResult>;
  onSuccess?: (result: PasskeyEnrollResult) => void;
  onError?: (err: { message: string; code: string }) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
};

type PasskeyEnrollResult = {
  credentialId: string;
  credentialName: string;
};
```

## Messages catalog

```ts
export type PasskeyEnrollMessages = {
  title: string;
  description: string;
  credentialNameLabel: string;
  credentialNamePlaceholder: string;
  credentialNameHint: string;
  enrollButton: string;
  enrollingButton: string;
  browserPromptHint: string;
  unsupportedBrowser: string;
  successToast: string;
  errors: {
    ALREADY_REGISTERED: string;
    CHALLENGE_FAILED: string;
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultPasskeyEnrollMessages: PasskeyEnrollMessages = {
  title: 'Add a passkey',
  description: 'Passkeys let you sign in with Face ID, Touch ID, or a hardware key — no password needed.',
  credentialNameLabel: 'Passkey name',
  credentialNamePlaceholder: 'e.g. MacBook Touch ID',
  credentialNameHint: 'Give this passkey a name to identify it later.',
  enrollButton: 'Add passkey',
  enrollingButton: 'Follow browser prompts…',
  browserPromptHint: 'Your browser will ask you to authenticate.',
  unsupportedBrowser: 'Your browser does not support passkeys.',
  successToast: 'Passkey added successfully.',
  errors: {
    ALREADY_REGISTERED: 'This passkey is already registered to your account.',
    CHALLENGE_FAILED: 'Failed to start passkey registration. Please try again.',
    PROCEDURE_NOT_FOUND: 'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
```

## Default data hook (utility hook — shipped)

`use-passkey-enroll.ts` is a **UTILITY hook** authored and shipped by this block (not generated). The WebAuthn ceremony calls `constructive_auth_private` procedures via Express middleware, not via PostGraphile generated hooks. Canonical mechanics: `contracts/sdk-binding-contract.md` §10.

- **Module:** `lib/auth/hooks/use-passkey-enroll.ts` (SHIPPED — not generated)
- **Orchestration (consumer does NOT see the protocol):**
  1. `fetch` the begin-registration middleware endpoint (host-configured) → receive `registrationOptions: JsonObject`.
  2. Call `startRegistration(registrationOptions)` from `@simplewebauthn/browser` — triggers browser native dialog.
  3. `fetch` the finish-registration middleware endpoint with the registration response + credential name → receive `credentialId`.
- **Browser detection:** Hook checks `window.PublicKeyCredential` on mount. Sets `isSupported: boolean` returned to the component.
- **Returns:** `{ enroll, isPending, isSupported, error }`.
- **Adapter override:** When `props.onSubmit` is set, the hook calls it instead of the three-step dance. The adapter receives `{ credentialName, userId }` and is responsible for the WebAuthn protocol itself.

### `passkey-enroll.requires.json`

Lists the FUTURE public-wrapper ops so `check-sdk.mjs` fails clearly until they are deployed.

```json
{
  "namespace": "auth",
  "mutations": ["passkeyBeginRegistration", "passkeyFinishRegistration"],
  "queries": [],
  "models": []
}
```

## Callbacks

- `onSuccess(result)` — fires with `{ credentialId, credentialName }` after finish_registration.
- `onError(err)` — fires after error mapping. Includes browser-abort errors (user cancelled the native dialog).
- `onMessage(event)` — fires `{ kind: 'success' | 'error' | 'info' | 'warning', key, message? }`; e.g. `{ kind: 'info', key: 'browser_prompt_shown' }`.

## Captcha

- Not applicable. This action requires an authenticated session — no anonymous rate-limit surface.

## Step-up

- Not required at enrollment time in v1. If the consumer wants step-up before showing the enroll button, wrap at the parent level using `[[use-step-up]]`.

> **Backend pending** — whether `webauthn_begin_registration` enforces step-up itself via `require_step_up()` on the DB side isn't settled yet. In v1 the block adds no client-side step-up gate at enrollment.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| success | `messages.successToast` |
| error → browser abort (user cancelled) | (silent — no toast; `onError` fires) |
| error → `ALREADY_REGISTERED` | `messages.errors.ALREADY_REGISTERED` |
| error → challenge fetch failed | `messages.errors.CHALLENGE_FAILED` |
| error → fallback | `messages.errors.UNKNOWN_ERROR` |

## Accessibility

- Credential name `<input>` is focused on mount.
- `aria-live="polite"` region for async error messages.
- Submit button text changes to `messages.enrollingButton` during `isPending` to inform screen-reader users of the in-progress state.
- The block renders `null` (not hidden via CSS) when `isSupported === false`, optionally replacing itself with an `aria-live` region that announces `messages.unsupportedBrowser`.

## Notes / gotchas

- **Browser compatibility:** WebAuthn is supported in all modern browsers. Older iOS Safari (< 16) and some non-Chromium Android browsers have partial support. The `isSupported` flag accounts for this via `window.PublicKeyCredential` detection. Conditional UI (autocomplete autofill) is a separate concern — see `[[auth-passkey-sign-in]]`.
- **`@simplewebauthn/browser` version pinning:** The version must match the server-side `@simplewebauthn/server` in `constructive-db`. Pin the peer dep range tightly (e.g. `^9.0.0`).
- **Cross-device passkeys:** If the user's device does not have a platform authenticator, the browser may offer to use a cross-device passkey (via QR code). This is handled transparently by the browser — no block-level logic needed.
- **Credential name uniqueness:** Not enforced at DB level in v1. Consumer may want to validate uniqueness client-side against the list from `[[auth-passkey-management-list]]`.
- **`allow_webauthn_sign_up` flag:** Check `app_settings_auth.allow_webauthn_sign_up` before mounting. The block does not query the flag itself — consumer is responsible.
- Cross-reference: credentials enrolled here appear in `[[auth-passkey-management-list]]`.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/passkey-enroll/`
- Storybook states: default, enrolling (pending), success, unsupported browser, error (challenge), error (abort).
- `startRegistration` from `@simplewebauthn/browser` is dynamically imported inside the hook to avoid SSR issues (`typeof window === 'undefined'` guard).
- The block can be rendered as inline card content (within `[[auth-account-security-card]]`) or as a standalone dialog — expose a `variant?: 'inline' | 'dialog'` prop if the design team confirms both uses.
