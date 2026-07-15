# auth-cross-origin-link

**Type:** `registry:block`
**Status:** `v1 (frontend ready)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-credentials.md`
**Master entry:** `blocks-master.md#auth-cross-origin-link`

## Purpose

Generates a one-time cross-origin authentication token by calling `constructive_auth_public.request_cross_origin_token(email, password, origin, remember_me)`. Renders a clickable link (or button) targeting the destination origin with the token in the URL. Used for seamless multi-domain UX — e.g., marketing site (`example.com`) authenticating into the app subdomain (`app.example.com`). Requires `app_settings_auth.allow_cross_origin_token=true`.

## When to use

- Marketing/landing pages that need to sign users into a separate app domain without a second sign-in.
- "Open in app" links from email-gated content.
- Not a fit when: both surfaces share the same origin — use regular session cookies or bearer tokens instead.
- Not a fit when: `allow_cross_origin_token=false` in `app_settings_auth`.

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/auth/cross-origin-link.tsx` | `registry:component` |
| `components/auth/cross-origin-link.requires.json` | `registry:file` |
| `lib/auth/messages/cross-origin-link-messages.ts` | `registry:lib` |
| `lib/auth/errors.ts` | `registry:lib` (shared, auto-deduped) |

> No data hook is shipped. The block imports its mutation hooks (`useRequestCrossOriginTokenMutation`) from the host's generated `auth` SDK (`@/generated/auth`). Only the messages catalog, the shared errors util, and the `requires.json` manifest are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (Constructive block; supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `button` (shadcn primitive)

## Runtime (npm) dependencies

- `react` (peer, ^19)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; it arrives transitively via the `blocks-runtime` registry dependency.

## DB procedures used by default hook

- `constructive_auth_public.request_cross_origin_token(email citext, password text, origin text, remember_me bool)` — schema `constructive_auth_public` → **namespace `auth`** → generated op `requestCrossOriginToken` → hook `useRequestCrossOriginTokenMutation`.
  Returns: `text` (the one-time token, format `cnc_live_ot_...`)

- `constructive_auth_public.sign_in_cross_origin(token text, credential_kind text)` → session row
  Called by the DESTINATION app after the user lands with the token. NOT called by this block.

CSRF token is attached below the block — by the runtime adapter / server, see `contracts/endpoint-contract.md` §3. The block does NOT read or set `csrf_token`.

## Props

```ts
export type CrossOriginLinkProps = {
  /** Email for credential verification. */
  email: string;
  /** Password for credential verification. */
  password: string;
  /** Target origin (e.g., 'https://app.example.com'). */
  destinationOrigin: string;
  /**
   * Path on destination to redirect to after token exchange.
   * Token is appended as ?token=<token>.
   * Default: '/auth/cross-origin'
   */
  destinationPath?: string;
  rememberMe?: boolean;
  /** Render as a link (<a>) or a button. Default: 'button' */
  renderAs?: 'button' | 'link';
  /** Content rendered inside the link/button. */
  children?: React.ReactNode;
  notifications?: boolean | NotificationConfig;
  messages?: Partial<CrossOriginLinkMessages>;
  onSubmit?: (input: CrossOriginLinkInput) => Promise<string>;
  onSuccess?: (token: string, url: string) => void;
  onError?: (err: { message: string; code: string }) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  /** Pass-through to the underlying Button/anchor. */
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  className?: string;
};

export type CrossOriginLinkInput = {
  email: string;
  password: string;
  origin: string;
  rememberMe: boolean;
};
```

## Messages catalog

```ts
export type CrossOriginLinkMessages = {
  defaultButtonText: string;
  pendingText: string;
  /** Shown when token is generated (before navigation) */
  successMessage: string;
  /** Error messages — UPPER_SNAKE_CASE keys match err.extensions.code from PostGraphile */
  errors: {
    INVALID_CREDENTIALS: string;
    CROSS_ORIGIN_DISABLED: string;
    RATE_LIMITED: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultCrossOriginLinkMessages: CrossOriginLinkMessages = {
  defaultButtonText: 'Continue to app',
  pendingText: 'Connecting…',
  successMessage: 'Redirecting to app…',
  errors: {
    INVALID_CREDENTIALS: 'Invalid email or password.',
    CROSS_ORIGIN_DISABLED: 'Cross-origin authentication is not enabled.',
    RATE_LIMITED: 'Too many attempts. Please wait.',
    UNKNOWN_ERROR: 'Failed to generate link. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The block does **not** ship a `use-cross-origin-link.ts`. It imports the generated mutation hook from the host's `auth` SDK. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

- **Import:** `import { useRequestCrossOriginTokenMutation } from '@/generated/auth';` (real generated name — `request_cross_origin_token` → `requestCrossOriginToken` → `useRequestCrossOriginTokenMutation`, per `endpoint-contract.md` §7.)
- **Instantiate with a selection:**
  ```ts
  const defaultMutation = useRequestCrossOriginTokenMutation({
    selection: { fields: { requestCrossOriginToken: true } },
  });
  ```
- **Call + read the payload:**
  ```ts
  const token = await (onSubmitOverride
    ? onSubmitOverride(vars)
    : defaultMutation.mutateAsync(vars).then((d) => d.requestCrossOriginToken));
  ```
  `vars` carries `email`, `password`, `origin`, `rememberMe` — **never** `csrf_token` (handled below the block).
- **Returns:** generated hook exposes `{ mutateAsync, isPending, error }` (TanStack Query v5 style).
- **Adapter override:** When `props.onSubmit` is provided, the block awaits it instead of the generated hook. Hybrid pending: `onSubmitOverride ? overridePending : defaultMutation.isPending`.
- **Post-mutation:** Constructs `${destinationOrigin}${destinationPath}?token=${encodeURIComponent(token)}` and navigates via `window.location.href` (cross-origin navigation, not `router.push`). Fires `onSuccess(token, url)` before navigating.

### `cross-origin-link.requires.json`

```json
{
  "namespace": "auth",
  "mutations": ["requestCrossOriginToken"],
  "queries": [],
  "models": []
}
```

## Callbacks

- `onSuccess(token, url)` — fires after token generation, before redirect.
- `onError(err)` — fires on credential failure, disabled flag, or rate-limit.
- `onMessage({ kind, key })` — fires `successMessage` on success.

## Captcha

- N/A in v1. The block already requires valid credentials (email + password verification happens server-side). Rate-limiting is server-side. If needed, add `captcha` prop in v1.1.

## Step-up

- Required: no (the block IS the credential verification step).

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Success | `messages.successMessage` (info) |
| `INVALID_CREDENTIALS` | `messages.errors.INVALID_CREDENTIALS` (error) |
| `CROSS_ORIGIN_DISABLED` | `messages.errors.CROSS_ORIGIN_DISABLED` (error) |
| `RATE_LIMITED` | `messages.errors.RATE_LIMITED` (error) |
| Unknown | `messages.errors.UNKNOWN_ERROR` (error) |

## Accessibility

- Button/link shows `pendingText` and `aria-busy="true"` during `isPending`.
- When rendered as `<a>`, use `role="button"` if behavior is button-like (triggers fetch, not direct navigation).

## Notes / gotchas

- This block MUST have access to the user's plaintext password (passed as prop). It is intended for use in a form context where the user just typed their credentials — do NOT store the password in state beyond the form submit event.
- The token `cnc_live_ot_...` is a one-time token with short expiry. The destination app calls `sign_in_cross_origin(token, credential_kind)` to exchange it for a session. The destination route (`/auth/cross-origin`) is NOT provided by this block — it must be set up by the destination app.
- `destinationOrigin` must match an allowlisted origin on the server (checked inside `request_cross_origin_token`). Mismatches return an error.
- `window.location.href` navigation is intentional — this is a cross-origin redirect.

**Pairing:** No page block — used as: an inline component embedded in a sign-in form or marketing page where credentials are collected and cross-origin token generation is the final action. The destination app must have a complementary route that calls `sign_in_cross_origin`. This block has no standalone page because it requires caller-provided credentials and a known destination origin.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/cross-origin-link/`
- This block is typically used inside a sign-in form — the consuming parent collects credentials, then passes them to this block for the cross-origin token generation. The block does not contain its own email/password inputs.
- Storybook states: default, pending, error (INVALID_CREDENTIALS), error (CROSS_ORIGIN_DISABLED).
- The destination app needs a complementary page that calls `sign_in_cross_origin` — document this in the cross-reference section of the skill reference doc.
