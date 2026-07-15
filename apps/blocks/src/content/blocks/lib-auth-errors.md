# auth-errors

**Type:** `registry:lib`
**Status:** `v1`
**Import:** `@/blocks/lib/auth-errors`
**Source:** `src/blocks/lib/auth-errors.ts`

The shared error layer every auth block depends on. It turns whatever an auth mutation throws — a PostGraphile/GraphQL error with an `extensions.code`, a thrown `AuthError`, a Zod-like validation error, a bare `Error`, or a string — into a single, user-facing message and a normalized code. Self-contained with zero imports, so it ships as one standalone `auth-errors` registry item and is auto-deduped when several blocks pull it in.

## Purpose

Auth UI must never surface a raw `GraphQLError: ... (Code: ACCOUNT_DISABLED)` or a network stack trace to an end user. `parseGraphQLError` is the funnel: it extracts the backend error code from any of the shapes an error can arrive in, maps known codes to friendly copy, and falls back to a safe generic message for anything technical or unrecognized. Blocks call it from their `catch` block with the block's own `messages.errors` map as `customMessages`, so a host can localize any single code by overriding one key — no fork of the parser required.

## Exports

| Export | Kind | What it is |
|---|---|---|
| `parseGraphQLError(error, options?)` | function | Main entry — `unknown` error → `ParsedGraphQLError`. |
| `AuthError` | class | Typed error carrying a known `code` + resolved `userMessage`. |
| `createInvalidCredentialsError()` | function | Builds an `AuthError('INVALID_CREDENTIALS')` (enumeration-safe login failure). |
| `isKnownErrorCode(code)` | type guard | `true` when a string is one of the `ERROR_CODES`. |
| `getErrorMessage(code)` | function | The default user message for a known `ErrorCode`. |
| `ERROR_CODES` | const | Map of the known backend codes (see table below). |
| `ERROR_MESSAGES` | const | `Record<ErrorCode, string>` of the default copy per code. |
| `DEFAULT_ERROR_MESSAGE` | const | `'Something went wrong. Please try again.'` — the generic fallback. |
| `ErrorCode` | type | Union of the `ERROR_CODES` values. |
| `ParseGraphQLErrorOptions` | type | `{ defaultMessage?, customMessages? }`. |
| `ParsedGraphQLError` | type | `{ code, message, isKnownError, originalError }`. |

## Signatures

```ts
function parseGraphQLError(
  error: unknown,
  options?: ParseGraphQLErrorOptions
): ParsedGraphQLError;

interface ParseGraphQLErrorOptions {
  /** Fallback when no known code matches. Default: DEFAULT_ERROR_MESSAGE. */
  defaultMessage?: string;
  /** Extra/override code→message map, merged over ERROR_MESSAGES (custom wins). */
  customMessages?: Record<string, string>;
}

interface ParsedGraphQLError {
  /** Extracted error code, or null if none was recognized. */
  code: string | null;
  /** User-friendly message — always safe to render. */
  message: string;
  /** Whether a known code was matched. */
  isKnownError: boolean;
  /** Original error, for logging/debugging. */
  originalError: unknown;
}

class AuthError extends Error {
  readonly code: ErrorCode;
  readonly userMessage: string;
  constructor(code: ErrorCode, customMessage?: string);
  static isCode(error: unknown, code: ErrorCode): error is AuthError;
}
```

## Error codes

`ERROR_CODES` covers the backend codes auth surfaces today; `ERROR_MESSAGES` holds the default copy. The major families:

| Code | Default message |
|---|---|
| `INVALID_CREDENTIALS` | Invalid email or password. *(generic — prevents user enumeration)* |
| `INCORRECT_PASSWORD` | The password you entered is incorrect. Please try again. |
| `ACCOUNT_LOCKED_EXCEED_ATTEMPTS` | Your account has been temporarily locked due to too many failed login attempts… |
| `ACCOUNT_DISABLED` | Your account has been disabled. Please contact support for assistance. |
| `PASSWORD_INSECURE` | This password is not secure enough. Please choose a stronger password. |
| `PASSWORD_LEN` | Password must be between 8 and 63 characters long. |
| `ACCOUNT_EXISTS` | An account with this email already exists. Please sign in or use a different email. |
| `INVITE_NOT_FOUND` | The invitation code is invalid or has expired… |
| `INVITE_LIMIT` | This invitation has reached its usage limit. Please request a new invitation. |
| `INVITE_EMAIL_NOT_FOUND` | This email is not associated with the invitation… |

Two codes are produced by the parser itself rather than declared in `ERROR_CODES`: a Zod-like validation error yields `code: 'VALIDATION_ERROR'` with the first issue's `message`, and `defaultMessage` (or `DEFAULT_ERROR_MESSAGE`) is used when nothing matches.

## How a code is extracted

`parseGraphQLError` resolves the code in priority order, so it works regardless of which client threw:

1. An `AuthError` instance → its typed `.code` (fast path; the `userMessage` is returned verbatim).
2. A Zod-like error (`name === 'ZodError'` with a non-empty `issues[]`) → `VALIDATION_ERROR` + the first issue message.
3. A `GraphQLRequestError` with an `errors[]` array → first entry's `extensions.code`, else a `(Code: XXX)` pattern or a known code substring in its `message`.
4. A single GraphQL-error-like object → `extensions.code`.
5. A plain object with a string `code` property.
6. A `(Code: ERROR_CODE)` pattern, or any known code appearing in the message string.

If the matched message is "technical" (mentions graphql/fetch/network/timeout/null/undefined/…), it is suppressed in favor of `defaultMessage` so internals never leak; a `GraphQLRequestError` whose own message is technical still gets a chance to surface a friendly inner-error message.

## Usage — inside a block (with a messages map)

This is the canonical pattern every auth block uses: pass the block's own `messages.errors` as `customMessages` and its `UNKNOWN_ERROR` entry as `defaultMessage`.

```tsx
import { parseGraphQLError, createInvalidCredentialsError } from '@/blocks/lib/auth-errors';

try {
  const result = await signIn(values);
  // A null token means bad credentials — throw the enumeration-safe error.
  if (!result?.token) throw createInvalidCredentialsError();
} catch (err) {
  const { code, message } = parseGraphQLError(err, {
    customMessages: merged.errors,          // block's errors map (host can override one key)
    defaultMessage: merged.errors.UNKNOWN_ERROR
  });
  setFormError(message);                     // always safe to render
  onError?.({ code, message });
}
```

## Usage — standalone

Use it directly anywhere you call a mutation, without a block:

```ts
import { parseGraphQLError, AuthError, isKnownErrorCode } from '@/blocks/lib/auth-errors';

const { code, message, isKnownError } = parseGraphQLError(err, {
  defaultMessage: 'Unable to sign in. Please try again.',
  customMessages: { CUSTOM_ERROR: 'A custom error occurred.' }
});

// Or branch on a typed AuthError:
if (AuthError.isCode(err, 'ACCOUNT_DISABLED')) showSupportLink();
if (isKnownErrorCode(code)) track('auth_error', { code });
```

## Overrides & i18n

There is no separate i18n file — message resolution is plain object merge, and overrides win:

- **Defaults:** `ERROR_MESSAGES` is the base `code → string` map.
- **Per-call override:** `customMessages` is spread over `ERROR_MESSAGES` (`{ ...ERROR_MESSAGES, ...customMessages }`), so any key you pass replaces the default for that one call; codes you omit still resolve from the defaults. The set of "known" codes is recomputed as the keys of the merged map, so adding a brand-new code in `customMessages` makes it matchable too.
- **From a block:** a host localizes by passing `messages={{ errors: { ACCOUNT_DISABLED: 'Localized copy.' } }}` — the block merges that into its catalog, then hands the merged `errors` map down as `customMessages`. One key, one language, no fork.
- **Fallback:** if nothing matches, `defaultMessage` (or `DEFAULT_ERROR_MESSAGE`) is returned, never a raw/technical string.

## Notes

- Zero runtime dependencies and zero imports — ported verbatim from the Constructive admin app, so it is safe as a shared, auto-deduped registry lib.
- Validation errors are detected by duck typing (`name === 'ZodError'` + `issues[]`), not by importing Zod, so the module stays portable.
- `parseGraphQLError` never throws; the returned `message` is always render-safe.
