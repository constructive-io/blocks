# auth-anonymous-sign-in-button

**Type:** `registry:block`
**Status:** `v1 (frontend ready, backend pending)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-credentials.md`
**Master entry:** `blocks-master.md#auth-anonymous-sign-in-button`

## Purpose

Single-click guest session button. Creates an anonymous session (`sessions.is_anonymous=true`) without requiring any credentials. Intended for try-before-you-register flows. Only renders when `app_settings_auth.allow_anonymous_sessions=true` (queried at render time, or gated by consumer at page level). Minimal block — no form, no validation.

## When to use

- Sign-in/sign-up pages where guest access is enabled.
- Landing pages with a "Try without signing up" CTA.
- Not a fit when: `allow_anonymous_sessions=false` in your deployment — hide it server-side.

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/auth/anonymous-sign-in-button.tsx` | `registry:component` |
| `components/auth/anonymous-sign-in-button.requires.json` | `registry:file` |
| `lib/auth/messages/anonymous-sign-in-button-messages.ts` | `registry:lib` |
| `lib/auth/errors.ts` | `registry:lib` (shared, auto-deduped) |

> No data hook is shipped. The block imports its mutation hook (`useAnonymousSignInMutation`) from the host's generated `auth` SDK (`@/generated/auth`). Only the messages catalog, the shared errors util, and the `requires.json` manifest are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (Constructive block; supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `button` (shadcn primitive)

## Runtime (npm) dependencies

- `react` (peer, ^19)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; it arrives transitively via the `blocks-runtime` registry dependency. The generated `auth` SDK is the host's, not a published dep of this block.

## DB procedures used by default hook

- `constructive_auth_public.anonymous_sign_in(remember_me bool, credential_kind text)` — schema `constructive_auth_public` → **namespace `auth`** → generated op `anonymousSignIn` → hook `useAnonymousSignInMutation`. Returns session row.

**Backend status:** pending — `anonymous_sign_in` is not deployed in `constructive_auth_public` today. The infrastructure exists (`sessions.is_anonymous` column, `allow_anonymous_sessions` feature flag in `app_settings_auth`), but the public creation endpoint is absent. See `backend-spec/future-procedures.md`.

The block names the pending op in its `requires.json` so the `constructive-blocks` install-time check (`check-sdk.mjs`) fails with a clear message if the SDK does not export `anonymousSignIn`. When the procedure is deployed and codegen is re-run, no frontend changes are required. Until then, `useAnonymousSignInMutation` will be absent from the generated SDK and the install-time check will block installation.

## Props

```ts
export type AnonymousSignInButtonProps = {
  /** Button text override (uses messages.buttonText by default). */
  children?: React.ReactNode;
  credential_kind?: 'bearer' | 'cookie';
  rememberMe?: boolean;
  notifications?: boolean | NotificationConfig;
  messages?: Partial<AnonymousSignInButtonMessages>;
  onSubmit?: () => Promise<AnonymousSignInResult>;
  onSuccess?: (result: AnonymousSignInResult) => void;
  onError?: (err: AuthError) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  /** Pass-through to the underlying Button component. */
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  className?: string;
};

export type AnonymousSignInResult = {
  id: string;
  userId: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  isAnonymous: true;
};
```

## Messages catalog

```ts
export type AnonymousSignInButtonMessages = {
  buttonText: string;
  buttonPending: string;
  successMessage: string;
  /** Error messages — UPPER_SNAKE_CASE keys match err.extensions.code from PostGraphile */
  errors: {
    PROCEDURE_NOT_FOUND: string;
    ANONYMOUS_DISABLED: string;
    RATE_LIMITED: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultAnonymousSignInButtonMessages: AnonymousSignInButtonMessages = {
  buttonText: 'Continue as guest',
  buttonPending: 'Starting session…',
  successMessage: 'Guest session started.',
  errors: {
    PROCEDURE_NOT_FOUND: 'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures',
    ANONYMOUS_DISABLED: 'Guest access is not available.',
    RATE_LIMITED: 'Too many requests. Please wait.',
    UNKNOWN_ERROR: 'Failed to start guest session. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The block does **not** ship a `use-anonymous-sign-in.ts`. It imports the generated mutation hook from the host's `auth` SDK and drives it with a field `selection`. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

> **Backend pending:** `anonymous_sign_in` is not yet deployed in `constructive_auth_public`. The `useAnonymousSignInMutation` hook will be absent from the generated SDK until the procedure ships and `cnc codegen` is re-run. The `constructive-blocks` install-time check will fail with a clear message naming the missing op.

- **Import:** `import { useAnonymousSignInMutation } from '@/generated/auth';` (real generated name — `anonymous_sign_in` → `anonymousSignIn` → `useAnonymousSignInMutation`. Note the `Mutation` suffix; it is **not** `useAnonymousSignIn`.)
- **Instantiate with a selection** of exactly the payload fields this button consumes:
  ```ts
  const defaultMutation = useAnonymousSignInMutation({
    selection: { fields: {
      id: true, userId: true, accessToken: true, accessTokenExpiresAt: true,
    } },
  });
  ```
- **Call + read the payload via the operation key:**
  ```ts
  const result = await (onSubmitOverride
    ? onSubmitOverride()
    : defaultMutation.mutateAsync({ rememberMe, credentialKind }).then((d) => d.anonymousSignIn));
  ```
  `vars` carry `rememberMe`, `credentialKind` — **never** `csrf_token` (handled below the block). See `endpoint-contract.md` §3.
- **Returns:** generated hook exposes `{ mutateAsync, isPending, error }` (TanStack Query v5 style).
- **Adapter override:** when `props.onSubmit` is provided, the block awaits it instead of the generated hook. Hybrid pending: `onSubmitOverride ? overridePending : defaultMutation.isPending`.

### `anonymous-sign-in-button.requires.json`

The install-time check (`constructive-blocks` skill) reads this to verify the host's generated `auth` SDK exports the named op before the block is installed. Because the procedure is backend-pending, this check is expected to fail until the procedure is deployed.

```json
{
  "namespace": "auth",
  "mutations": ["anonymousSignIn"],
  "queries": [],
  "models": []
}
```

## Callbacks

- `onSuccess(result)` — fires on session creation. Caller navigates to the app.
- `onError(err)` — fires on any failure (including `PROCEDURE_NOT_FOUND` when backend is pending).
- `onMessage({ kind, key, message? })` — unused in default flow.

## Captcha

- N/A in v1. Anonymous sessions can be abused but captcha on a single-click button adds significant friction. Rate-limiting is server-side. If abuse becomes a concern, add `captcha` prop in v1.1.

## Step-up

- Required: no.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Success | `messages.successMessage` (info) |
| `ANONYMOUS_DISABLED` | `messages.errors.ANONYMOUS_DISABLED` (error) |
| `RATE_LIMITED` | `messages.errors.RATE_LIMITED` (error) |
| Unknown | `messages.errors.UNKNOWN_ERROR` (error) |

## Accessibility

- Button shows `buttonPending` text and `aria-busy="true"` during `isPending`.
- `aria-disabled` when disabled (e.g., if consumer detects `allow_anonymous_sessions=false`).

## Notes / gotchas

- Anonymous sessions have limited capabilities (determined by server-side RLS policies). The block does not enforce any client-side capability gating — that is the consumer's responsibility.
- Anonymous session upgrade (convert to a real account after guest usage) is a separate flow — not part of this block. It would involve linking the anonymous `user_id` to a new email registration.
- `allow_anonymous_sessions` is a server feature flag. Consumer should query it (or make it a deploy-time config) and either not render this button or pass `disabled` when the flag is off.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/anonymous-sign-in-button/`
- Thin component — essentially a Button wrapping a mutation call.
- Storybook states: default, pending, error.
- This block is intentionally minimal. Resist feature creep. If complexity grows (e.g., invite-code required for anonymous), that is a separate block.
