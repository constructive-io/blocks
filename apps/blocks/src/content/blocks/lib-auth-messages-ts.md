# auth/messages.ts

**Type:** `registry:lib`
**Status:** `v1`
**Pattern source:** `src/blocks/auth/<block>/messages.ts` (e.g. `sign-in-card`, `org/invite-dialog`)
**Reference:** block-contract.md §4, §10

The shared message-catalog convention every auth, org, user, and shell block follows. Each block ships a `messages.ts` that exports a catalog **type** and a **`default…Messages`** value; the block prop `messages` accepts a partial override that is merged over the defaults at render. This is how all user-facing copy is localized or rebranded by the host — one key at a time, no fork of the component.

## Purpose

Keep every string a block can render in one typed, overridable place. A block never hard-codes UI copy inline; it reads from a merged catalog so a host can:

- translate or rebrand any label by passing `messages={{ … }}`,
- override a single backend error code's copy without restating the whole map,
- and rely on the type to catch typos / missing keys at build time.

There is no central runtime module — the "helper" is a **shape contract** plus two small, repeated mechanics (shallow-with-nested-errors merge, and `{{key}}` interpolation) that each block implements identically.

## Catalog shape

A catalog is a flat record of camelCase copy keys, plus a nested `errors` map keyed by backend error CODE (UPPER_SNAKE_CASE). The `errors` map is handed straight to `parseGraphQLError` as `customMessages` (see the `auth-errors` lib), and `errors.UNKNOWN_ERROR` is passed as its `defaultMessage`.

```ts
export type SignInCardMessages = {
  title: string;
  description: string;
  emailLabel: string;
  submitLabel: string;
  loadingLabel: string;
  successMessage: string;
  // …all other UI copy…
  errors: {
    INVALID_CREDENTIALS: string;
    INCORRECT_PASSWORD: string;
    ACCOUNT_LOCKED_EXCEED_ATTEMPTS: string;
    ACCOUNT_DISABLED: string;
    UNKNOWN_ERROR: string;       // fallback when no known code matches
  };
};

export const defaultSignInCardMessages: SignInCardMessages = {
  title: 'Sign in',
  description: 'Enter your credentials to access your account.',
  emailLabel: 'Email',
  submitLabel: 'Sign in',
  loadingLabel: 'Signing in...',
  successMessage: 'Signed in.',
  // …
  errors: {
    INVALID_CREDENTIALS: 'Invalid email or password.',
    INCORRECT_PASSWORD: 'The password you entered is incorrect. Please try again.',
    ACCOUNT_LOCKED_EXCEED_ATTEMPTS: 'Your account has been temporarily locked…',
    ACCOUNT_DISABLED: 'Your account has been disabled. Please contact support…',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};
```

The default `errors` entries mirror the `auth-errors` lib's `ERROR_MESSAGES` for the codes that block can surface; codes a catalog omits still resolve because `parseGraphQLError` falls back to the lib's full map.

## Overrides type

Blocks expose a `messages` prop typed as a **partial** of the catalog. Top-level keys are shallow-partial; `errors` is itself partial so a host can localize a single code without restating the map:

```ts
export type OrgInviteDialogMessageOverrides =
  Partial<Omit<OrgInviteDialogMessages, 'errors'>> & {
    errors?: Partial<OrgInviteDialogMessages['errors']>;
  };
```

(Some blocks declare this explicitly; others accept `messages?: Partial<XxxMessages>` directly. Either way the override is partial and merged, never required.)

## Merge semantics

The block merges the host override over its defaults at render. Top level is a shallow spread; `errors` gets its own nested spread so overriding one code does not wipe the rest:

```ts
const merged: SignInCardMessages = {
  ...defaultSignInCardMessages,
  ...messageOverrides,
  errors: { ...defaultSignInCardMessages.errors, ...messageOverrides?.errors }
};
```

Result: every key resolves to the host value when provided, otherwise the default. Because the nested `errors` map is merged separately, `messages={{ errors: { ACCOUNT_DISABLED: '…' } }}` changes exactly one error string and leaves every other label and code untouched.

## `{{key}}` interpolation

Catalog strings that need runtime values use `{{key}}` mustache placeholders (documented inline on the type, e.g. `/** Supports {{email}} interpolation. */`). Blocks fill them with a tiny replacer:

```ts
/** Simple {{key}} mustache interpolation for message templates. */
function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''));
}

// e.g. successToast: 'Invitation sent to {{email}}.'
const successMsg = interpolate(merged.successToast, { email: values.email });
```

An unknown placeholder resolves to an empty string rather than throwing, so a partial override can never crash the render.

## Usage

```tsx
import { SignInCard } from '@/blocks/auth/sign-in-card/sign-in-card';

// Localize one label and one error code; everything else keeps its default.
<SignInCard
  messages={{
    submitLabel: 'Log in',
    errors: { ACCOUNT_DISABLED: 'This account is turned off.' }
  }}
/>;
```

```ts
// Reuse a block's defaults outside the component (tests, previews, SSR copy):
import { defaultSignInCardMessages } from '@/blocks/auth/sign-in-card/messages';

const heading = defaultSignInCardMessages.title; // 'Sign in'
```

## Notes

- The catalog type + `default…Messages` value live next to the block (`messages.ts`) and ship as a `registry:lib` file with it, so consumers get both the types and the editable defaults.
- Keep `errors` keys aligned with the backend codes the block can surface and with the `auth-errors` lib; `UNKNOWN_ERROR` is the required fallback used as `parseGraphQLError`'s `defaultMessage`.
- The merge + interpolation mechanics are intentionally tiny and repeated per block rather than centralized, so each block stays self-contained and independently installable.
