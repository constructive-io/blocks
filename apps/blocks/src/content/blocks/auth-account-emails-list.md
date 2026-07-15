# auth-account-emails-list

**Type:** `registry:block`
**Status:** `v1 (frontend ready)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-account.md`
**Master entry:** `blocks-master.md#auth-account-emails-list`

**Pairing:** No page block — this card is composed by [[auth-account-settings-page]]. Install the page to get the full settings surface; install this card alone for a standalone email-management widget.

## Purpose

Manages the signed-in user's email addresses. Displays all rows from `constructive_user_identifiers_public.emails`, lets the user add a new address (triggers verification), promote any verified address to primary, and delete non-primary addresses. Each row shows a verified/unverified badge and a "Verify" CTA for unverified addresses.

## When to use

- As the email-management section within `auth-account-settings-page`.
- On any custom settings page where multi-email is needed.
- Not a fit when: the consumer only needs a single email display (use a plain read-only field).

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/auth/account-emails-list.tsx` | `registry:component` |
| `components/auth/account-emails-list.requires.json` | `registry:file` |
| `lib/auth/messages/account-emails-list-messages.ts` | `registry:lib` |

> No data hook is shipped. The `use-user-emails.ts` hook is removed — the block imports generated hooks from `@/generated/auth`. Only the messages catalog and `requires.json` are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (supplies `QueryClientProvider` + per-namespace `configure()`; React Query reaches this block transitively)
- `card`, `button`, `badge`, `input`, `label`, `form`, `dialog`, `separator`
- `lib/auth-errors`

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `react-hook-form` (^7)
- `zod` (^3)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; arrives transitively via `blocks-runtime`. `@constructive-io/data` is removed.

## DB procedures used by default hook

| Operation | Procedure | Schema → namespace → hook |
|---|---|---|
| List emails | `constructive_user_identifiers_public.emails` — **FLAG: requires a public `EmailsConnection` type in the generated SDK** (see FLAG below) | conditional on generated Connection |
| Add / resend verification | `constructive_auth_public.send_verification_email(email citext)` | `constructive_auth_public` → `auth` → `sendVerificationEmail` → `useSendVerificationEmailMutation` — DEPLOYED |
| Set primary | GraphQL mutation `updateEmail(input: { id, patch: { isPrimary: true } })` — **FLAG: verify generated mutation name** | `auth` → `useUpdateEmailMutation` (pending verification) |
| Delete email | GraphQL mutation `deleteEmail(input: { id })` — **FLAG: verify generated mutation name** | `auth` → `useDeleteEmailMutation` (pending verification) |

> **FLAG — emails list query:** `constructive_user_identifiers_public.emails` is a public schema (vs private). PostGraphile likely emits an `EmailsConnection` type. Confirm the generated list hook name (likely `useEmailsQuery`) from the host's generated `auth` SDK `.d.ts`. If confirmed, add `"queries": ["emails"]` and `"models": ["email"]` to `requires.json`. Until confirmed, the list query is conditional on a generated Connection per `contracts/sdk-binding-contract.md` §5.

Whether `send_verification_email` also inserts the email row when one doesn't already exist — or whether a separate `add_email` procedure is needed for that — is still open.

The generated PostGraphile mutation names for the set-primary and delete operations are assumed to be `updateEmail` and `deleteEmail` but haven't been confirmed against the host SDK; both also rely on RLS scoping the writes to the signed-in user's own rows.

CSRF token is handled below the block — see `contracts/endpoint-contract.md` §3. Block does NOT pass `csrf_token`.

## Props

```ts
export type AccountEmailsListProps = {
  onEmailAdded?: (email: EmailRow) => void;
  onEmailVerified?: (email: EmailRow) => void;
  onPrimaryChanged?: (email: EmailRow) => void;
  onEmailDeleted?: (emailId: string) => void;
  onError?: (err: unknown) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  notifications?: boolean | { success?: boolean; error?: boolean; info?: boolean };
  messages?: Partial<AccountEmailsListMessages>;
  /** Disables add/delete/primary operations. Read-only display mode. */
  readOnly?: boolean;
  /** Max number of email addresses allowed. Default: pulled from app_settings_auth or 10. */
  maxEmails?: number;
};

export type EmailRow = {
  id: string;
  email: string;
  isPrimary: boolean;
  isVerified: boolean;
  name: string | null;
  createdAt: string;
};
```

## Messages catalog

```ts
export type AccountEmailsListMessages = {
  title: string;
  description: string;
  addEmailButton: string;
  addEmailDialogTitle: string;
  addEmailLabel: string;
  addEmailPlaceholder: string;
  addEmailSubmit: string;
  addEmailSubmitting: string;
  primaryBadge: string;
  verifiedBadge: string;
  unverifiedBadge: string;
  verifyButton: string;
  setPrimaryButton: string;
  deleteButton: string;
  deleteConfirmTitle: string;
  deleteConfirmDescription: string;
  deleteConfirmButton: string;
  deleteCancelButton: string;
  verificationSentToast: string;
  emailAddedToast: string;
  primaryChangedToast: string;
  emailDeletedToast: string;
  cannotDeletePrimary: string;
  errors: {
    EMAIL_TAKEN: string;
    RATE_LIMITED: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultAccountEmailsListMessages: AccountEmailsListMessages = {
  title: 'Email addresses',
  description: 'Manage your email addresses. Your primary email is used for sign-in and notifications.',
  addEmailButton: 'Add email address',
  addEmailDialogTitle: 'Add email address',
  addEmailLabel: 'Email address',
  addEmailPlaceholder: 'you@example.com',
  addEmailSubmit: 'Add address',
  addEmailSubmitting: 'Adding…',
  primaryBadge: 'Primary',
  verifiedBadge: 'Verified',
  unverifiedBadge: 'Unverified',
  verifyButton: 'Verify',
  setPrimaryButton: 'Set as primary',
  deleteButton: 'Remove',
  deleteConfirmTitle: 'Remove email address?',
  deleteConfirmDescription: 'This email address will be removed from your account.',
  deleteConfirmButton: 'Remove',
  deleteCancelButton: 'Cancel',
  verificationSentToast: 'Verification email sent.',
  emailAddedToast: 'Email address added. Check your inbox to verify it.',
  primaryChangedToast: 'Primary email address updated.',
  emailDeletedToast: 'Email address removed.',
  cannotDeletePrimary: 'You cannot remove your primary email address.',
  errors: {
    EMAIL_TAKEN: 'This email address is already associated with another account.',
    RATE_LIMITED: 'Too many requests. Please wait before trying again.',
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The block does **not** ship a `use-user-emails.ts`. It imports generated hooks from the host's `auth` SDK. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

**Send verification email mutation (buildable):**
- **Import:** `import { useSendVerificationEmailMutation } from '@/generated/auth';`
- **Call:** `await sendVerification.mutateAsync({ email }).then((d) => d.sendVerificationEmail)` — vars carry `email`, **never** `csrf_token`.
- **Returns:** `{ mutateAsync, isPending, error }`.

**Update / delete email mutations (buildable — pending name verification):**
- `import { useUpdateEmailMutation, useDeleteEmailMutation } from '@/generated/auth';`
- Instantiate with appropriate `selection` fields per the generated `.d.ts`.

**Emails list query (conditional — FLAG):**
- If `EmailsConnection` is confirmed in the generated SDK: `import { useEmailsQuery } from '@/generated/auth';`
- Add `"queries": ["emails"], "models": ["email"]` to `requires.json` once confirmed.

**Adapter override:** when `props.onSubmit` is provided, the block awaits it instead. Hybrid `isPending`.

### `account-emails-list.requires.json`

```json
{
  "namespace": "auth",
  "mutations": ["sendVerificationEmail"],
  "queries": [],
  "models": []
}
```

> `mutations` lists only `sendVerificationEmail` (confirmed deployed). Add `updateEmail`, `deleteEmail` once mutation names are verified. Add `queries` and `models` once the emails Connection is confirmed.

## Callbacks

- `onEmailAdded(email)` — fires after row created and verification email queued.
- `onEmailVerified(email)` — fires after `verify_email` completes (see `auth-verify-email-page` owned by credentials vertical).
- `onPrimaryChanged(email)` — fires after primary promotion.
- `onEmailDeleted(emailId)` — fires after deletion.
- `onError(err)` — fires on any error after `mapAuthError` mapping.
- `onMessage({ kind, key })` — e.g. `{ kind: 'info', key: 'verification_sent' }`.

## Captcha

Not required — email management is behind authentication. Rate limiting is enforced by `constructive_auth_private.auth_rate_limits`.

## Step-up

Not required in v1. If the consumer wants to gate email changes behind a password re-entry (recommended for sensitive accounts), they can wrap the add/delete actions with `use-step-up` — not built in by default.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Email added | `messages.emailAddedToast` |
| Verification sent | `messages.verificationSentToast` |
| Primary changed | `messages.primaryChangedToast` |
| Email deleted | `messages.emailDeletedToast` |
| Error → `EMAIL_TAKEN` | `messages.errors.EMAIL_TAKEN` |
| Error → `RATE_LIMITED` | `messages.errors.RATE_LIMITED` |
| Error → unknown | `messages.errors.UNKNOWN_ERROR` |

## Accessibility

- Each row in the list has a unique `id`-based key.
- Verified/unverified badge uses `role="status"` with descriptive text.
- Delete confirmation dialog traps focus.
- "Set as primary" button is visually hidden for already-primary rows (`aria-hidden`).
- Error messages in the add-email dialog via `aria-live="polite"`.

## Notes / gotchas

- The primary email cannot be deleted. The "Remove" button for the primary row should be disabled (not hidden) with a tooltip explaining why.
- After adding an email, the row appears immediately in the list as "Unverified". Do not wait for verification to show it.
- Verification is performed on a separate page/flow (`auth-verify-email-page` in credentials vertical). This block only triggers the email; it does not handle the token link.
- `send_verification_email` is rate-limited — handle `RATE_LIMITED` gracefully (show countdown or "check your spam folder" hint).
- If `maxEmails` is reached, hide (or disable) the "Add email" button and show a descriptive message.

## Implementation notes (for the author)

- Add-email UX: inline form below the list or a dialog — dialog preferred to keep the list scannable.
- Each row layout: `[email] [badge] [Set as primary?] [Verify?] [Remove]` — use a table or flex-based list.
- Optimistic updates acceptable for delete (remove row immediately, roll back on error).
- Test states: single email (primary, verified), multiple emails, unverified email, max emails reached, deletion of non-primary, error states.
- Migration: no existing route; new block.
