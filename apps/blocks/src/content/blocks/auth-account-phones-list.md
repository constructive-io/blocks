# auth-account-phones-list

**Type:** `registry:block`
**Status:** `v1 (frontend ready, backend pending)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-account.md`
**Master entry:** `blocks-master.md#auth-account-phones-list`

**Pairing:** No page block — this card is composed by [[auth-account-settings-page]] as an optional section (only rendered when `allow_sms_sign_in = true` or `allow_sms_sign_up = true`). Install the page to get the full settings surface; install this card alone for a standalone phone-management widget.

**Backend status: pending** — SMS OTP procedures (`send_sms_otp`, `verify_phone_otp`) are not yet deployed in `constructive_auth_public`. The `constructive_user_identifiers_public.phone_numbers` table IS deployed. The frontend spec is complete; the default hook calls the procedures-we-want. See `backend-spec/future-procedures.md`.

## Purpose

Multi-phone management card. Lists phone numbers from `constructive_user_identifiers_public.phone_numbers`. Allows adding a new number (triggers OTP verification via SMS), verifying with the OTP inline, setting a primary number, and deleting with confirmation. Country code selector on add. Pattern mirrors `auth-account-emails-list`.

## When to use

- As an optional section within `auth-account-settings-page` when the consumer's app has `allow_sms_sign_in = true` or `allow_sms_sign_up = true`.
- On any custom settings page where phone number management is needed.
- Not a fit when: SMS features are disabled (`allow_sms_sign_in` and `allow_sms_sign_up` are both false — omit the card entirely).

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/auth/account-phones-list.tsx` | `registry:component` |
| `components/auth/account-phones-list.requires.json` | `registry:file` |
| `lib/auth/messages/account-phones-list-messages.ts` | `registry:lib` |

> No data hook is shipped. The `use-user-phones.ts` hook is removed — the block imports generated hooks from `@/generated/auth`. Only the messages catalog and `requires.json` are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (supplies `QueryClientProvider` + per-namespace `configure()`; React Query reaches this block transitively)
- `card`, `button`, `badge`, `input`, `label`, `form`, `dialog`, `separator`
- `lib/auth-errors`
- Country code picker (ships as part of this block — a minimal `<select>` with E.164 country codes; no heavy libphonenumber dependency)

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `react-hook-form` (^7)
- `zod` (^3)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; arrives transitively via `blocks-runtime`. `@constructive-io/data` is removed.

## DB procedures used by default hook

| Operation | Procedure | Schema → namespace → hook | Status |
|---|---|---|---|
| List phone numbers | `constructive_user_identifiers_public.phone_numbers` — **FLAG: requires a public `PhoneNumbersConnection` type** (see FLAG below) | conditional on generated Connection | Table deployed ✅ |
| Add phone + send OTP | `constructive_auth_public.send_sms_otp(phone citext, otp_type text)` | `auth` → `sendSmsOtp` → `useSendSmsOtpMutation` | Backend pending ⏳ |
| Verify OTP inline | `constructive_auth_public.verify_phone_otp(phone citext, code text)` | `auth` → `verifyPhoneOtp` → `useVerifyPhoneOtpMutation` | Backend pending ⏳ |
| Set primary | `updatePhoneNumber(input: { id, patch: { isPrimary: true } })` — **FLAG: verify generated mutation name** | `auth` → `useUpdatePhoneNumberMutation` | Needs verification ⏳ |
| Delete phone | `deletePhoneNumber(input: { id })` — **FLAG: verify generated mutation name** | `auth` → `useDeletePhoneNumberMutation` | Needs verification ⏳ |

> **FLAG — phone numbers list query:** `constructive_user_identifiers_public.phone_numbers` is a public schema. PostGraphile likely emits a `PhoneNumbersConnection` type. Confirm the generated query hook name (likely `usePhoneNumbersQuery`) from the host's generated `auth` SDK `.d.ts`. Add `"queries": ["phoneNumbers"], "models": ["phoneNumber"]` to `requires.json` once confirmed.

> **FLAG — backend-pending mutations:** `send_sms_otp` and `verify_phone_otp` are not yet deployed. Their generated hook names follow inflection (`sendSmsOtp` → `useSendSmsOtpMutation`; `verifyPhoneOtp` → `useVerifyPhoneOtpMutation`) but they will not appear in the SDK until deployed. `requires.json` names them so `check-sdk.mjs` fails clearly.

> **Backend pending** — a few details of these procedures are still unsettled: whether `send_sms_otp` also inserts the `phone_numbers` row when one does not already exist, the generated mutation names for `updatePhoneNumber` and `deletePhoneNumber` (and whether RLS restricts those writes to the owner's own rows), and whether `verify_phone_otp` ships as its own procedure or is folded into `sign_in_sms_otp`. These settle once the procedures are deployed and codegen is re-run.

CSRF token is handled below the block — see `contracts/endpoint-contract.md` §3. Block does NOT pass `csrf_token`.

## Props

```ts
export type AccountPhonesListProps = {
  onPhoneAdded?: (phone: PhoneRow) => void;
  onPhoneVerified?: (phone: PhoneRow) => void;
  onPrimaryChanged?: (phone: PhoneRow) => void;
  onPhoneDeleted?: (phoneId: string) => void;
  onError?: (err: unknown) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  notifications?: boolean | { success?: boolean; error?: boolean };
  messages?: Partial<AccountPhonesListMessages>;
  /** Default country code for the country picker. Default: 'US'. */
  defaultCountry?: string;
  /** Disables add/delete/primary operations. Read-only display mode. */
  readOnly?: boolean;
  /** Max number of phone numbers allowed. Default: 5. */
  maxPhones?: number;
};

export type PhoneRow = {
  id: string;
  phone: string;          // E.164 format, e.g. +14155552671
  isPrimary: boolean;
  isVerified: boolean;
  createdAt: string;
};
```

## Messages catalog

```ts
export type AccountPhonesListMessages = {
  title: string;
  description: string;
  addPhoneButton: string;
  addPhoneDialogTitle: string;
  countryCodeLabel: string;
  phoneLabel: string;
  phonePlaceholder: string;
  addPhoneSubmit: string;
  addPhoneSubmitting: string;
  primaryBadge: string;
  verifiedBadge: string;
  unverifiedBadge: string;
  verifyButton: string;
  resendButton: string;
  setPrimaryButton: string;
  deleteButton: string;
  deleteConfirmTitle: string;
  deleteConfirmDescription: string;
  deleteConfirmButton: string;
  deleteCancelButton: string;
  otpLabel: string;
  otpPlaceholder: string;
  otpSubmit: string;
  otpSubmitting: string;
  otpSentToast: string;
  otpResendCooldown: string;  // e.g. 'Resend in {{seconds}}s'
  phoneAddedToast: string;
  phoneVerifiedToast: string;
  primaryChangedToast: string;
  phoneDeletedToast: string;
  cannotDeletePrimary: string;
  errors: {
    INVALID_PHONE: string;
    INVALID_OTP: string;
    RATE_LIMITED: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultAccountPhonesListMessages: AccountPhonesListMessages = {
  title: 'Phone numbers',
  description: 'Manage your phone numbers. Your primary number is used for SMS sign-in and notifications.',
  addPhoneButton: 'Add phone number',
  addPhoneDialogTitle: 'Add phone number',
  countryCodeLabel: 'Country',
  phoneLabel: 'Phone number',
  phonePlaceholder: '(555) 000-0000',
  addPhoneSubmit: 'Send verification code',
  addPhoneSubmitting: 'Sending…',
  primaryBadge: 'Primary',
  verifiedBadge: 'Verified',
  unverifiedBadge: 'Unverified',
  verifyButton: 'Verify',
  resendButton: 'Resend code',
  setPrimaryButton: 'Set as primary',
  deleteButton: 'Remove',
  deleteConfirmTitle: 'Remove phone number?',
  deleteConfirmDescription: 'This phone number will be removed from your account.',
  deleteConfirmButton: 'Remove',
  deleteCancelButton: 'Cancel',
  otpLabel: 'Verification code',
  otpPlaceholder: '000000',
  otpSubmit: 'Verify',
  otpSubmitting: 'Verifying…',
  otpSentToast: 'Verification code sent.',
  otpResendCooldown: 'Resend in {{seconds}}s',
  phoneAddedToast: 'Phone number added. Enter the code we sent to verify it.',
  phoneVerifiedToast: 'Phone number verified.',
  primaryChangedToast: 'Primary phone number updated.',
  phoneDeletedToast: 'Phone number removed.',
  cannotDeletePrimary: 'You cannot remove your primary phone number.',
  errors: {
    INVALID_PHONE: 'Please enter a valid phone number.',
    INVALID_OTP: 'Incorrect code. Please try again.',
    RATE_LIMITED: 'Too many requests. Please wait before trying again.',
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The block does **not** ship a `use-user-phones.ts`. It imports generated hooks from the host's `auth` SDK. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

**Mutations (when deployed):**
```ts
import { useSendSmsOtpMutation, useVerifyPhoneOtpMutation } from '@/generated/auth';
// (plus useUpdatePhoneNumberMutation, useDeletePhoneNumberMutation once names verified)
```
- Call: `await sendOtp.mutateAsync({ phone, otpType }).then((d) => d.sendSmsOtp)` — vars carry `phone`, `otpType`, **never** `csrf_token`.
- **Returns:** `{ mutateAsync, isPending, error }` per hook.
- **Adapter override:** when `props.onSubmit` is provided, block awaits it instead.

**Phone numbers list query (conditional — FLAG):**
- If `PhoneNumbersConnection` is confirmed: `import { usePhoneNumbersQuery } from '@/generated/auth';`
- Add `"queries": ["phoneNumbers"], "models": ["phoneNumber"]` to `requires.json` once confirmed.

**Backend-pending guard:** if the mutation hook fires against a deployment missing the procedure, PostGraphile returns `PROCEDURE_NOT_FOUND`. Block maps this via `mapAuthError` → `messages.errors.PROCEDURE_NOT_FOUND`. Include that key in the messages catalog for this block.

### `account-phones-list.requires.json`

```json
{
  "namespace": "auth",
  "mutations": ["sendSmsOtp", "verifyPhoneOtp"],
  "queries": [],
  "models": []
}
```

> `mutations` lists the two pending-backend ops so `check-sdk.mjs` fails clearly when they are absent. Add verified CRUD mutation names once confirmed. Add `queries`/`models` once phone numbers Connection is confirmed.

## Callbacks

- `onPhoneAdded(phone)` — fires after phone row created and OTP sent.
- `onPhoneVerified(phone)` — fires after OTP verified successfully.
- `onPrimaryChanged(phone)` — fires after primary promotion.
- `onPhoneDeleted(phoneId)` — fires after deletion.
- `onError(err)` — fires on any error after `mapAuthError` mapping.
- `onMessage({ kind, key })` — e.g. `{ kind: 'info', key: 'otp_sent' }`.

## Captcha

Not required for authenticated phone management. Rate limiting is enforced by `constructive_auth_private.auth_rate_limits`.

## Step-up

Not required in v1. If the consumer wants to gate phone changes behind a password re-entry, they can wrap the add/delete actions with `use-step-up` — not built in by default.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| OTP sent | `messages.otpSentToast` |
| Phone added | `messages.phoneAddedToast` |
| Phone verified | `messages.phoneVerifiedToast` |
| Primary changed | `messages.primaryChangedToast` |
| Phone deleted | `messages.phoneDeletedToast` |
| Error → `INVALID_PHONE` | `messages.errors.INVALID_PHONE` (inline, not toast) |
| Error → `INVALID_OTP` | `messages.errors.INVALID_OTP` (inline on OTP field) |
| Error → `RATE_LIMITED` | `messages.errors.RATE_LIMITED` |
| Error → unknown | `messages.errors.UNKNOWN_ERROR` |

## Accessibility

- Each row in the list has a unique `id`-based key.
- Verified/unverified badge uses `role="status"` with descriptive text.
- OTP input: `inputmode="numeric"`, `autocomplete="one-time-code"`, `maxlength="6"`, `pattern="[0-9]*"`.
- Delete confirmation dialog traps focus.
- "Set as primary" button is visually hidden for already-primary rows (`aria-hidden`).
- Error messages via `aria-live="polite"`.
- Resend countdown: `aria-live="polite"` region updates as seconds tick down.

## Notes / gotchas

- **OTP UX**: after submitting a phone number, the add-dialog transitions to show an inline 6-digit OTP input. The dialog should NOT close — the user enters the OTP in place. 60-second resend cooldown timer shown.
- The primary phone cannot be deleted. The "Remove" button for the primary row should be disabled (not hidden) with a tooltip explaining why.
- After adding a phone, the row appears immediately in the list as "Unverified". Do not wait for verification to show it.
- OTP expiry: typically 10 minutes. If the code expires before the user submits, surface a "Code expired — resend?" prompt.
- `send_sms_otp` is rate-limited per factsheet. Handle `RATE_LIMITED` gracefully with countdown or explanatory hint.
- E.164 normalisation: combine country code + local number before sending to the DB. The DB stores in E.164 format. Display the number in local format for UX, normalise on submit.
- Country code picker: minimal `<select>` with top countries first (US, GB, CA, AU) then alphabetical. Full libphonenumber is out of scope.
- `maxPhones` guard: disable and hide the "Add phone" button when limit reached, show descriptive message.

## Implementation notes (for the author)

- OTP input UX: inline 6-digit code input appears below the newly added unverified phone row (or within the dialog after number submission). Auto-submit on 6th digit entry.
- Resend timer: `useInterval` decrement from 60 to 0; re-enable resend button at 0.
- Test states: no phones, single phone (primary, verified), multiple phones, unverified phone (OTP pending), OTP entry error, OTP expired, max phones reached, deletion of non-primary, primary protection, error states.
- The block should render a `(Backend pending)` note in development mode if the API returns a procedure-not-found error, to help developers identify the backend gap.
- Migration: no existing route; new block. This block is NOT rendered by `auth-account-settings-page` in v1 until the backend procedures are confirmed deployed.
