# auth-account-danger-card

**Type:** `registry:block`
**Status:** `v1 (frontend ready)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-account.md`
**Master entry:** `blocks-master.md#auth-account-danger-card`

**Pairing:** No page block — this card is composed by [[auth-account-settings-page]] (as the bottom "danger zone" section). For the token-confirmation step, see the paired page [[auth-account-deletion-confirm-page]].

## Purpose

Renders the "Delete account" danger zone section. A CTA opens a confirmation dialog; after confirmation, high-severity step-up (`tier: 'high'`) is required; then `send_account_deletion_email()` is called, which enqueues a deletion confirmation email. Tells the user to check their inbox. The actual deletion happens on the `auth-account-deletion-confirm-page` when the user clicks the email link.

## When to use

- As the danger zone section within `auth-account-settings-page`.
- At the bottom of any custom account settings page.
- Not a fit when: account deletion is not supported by the consumer's app (omit from the page composition).

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/auth/account-danger-card.tsx` | `registry:component` |
| `components/auth/account-danger-card.requires.json` | `registry:file` |
| `lib/auth/messages/account-danger-card-messages.ts` | `registry:lib` |

> No data hook is shipped. The `use-account-deletion.ts` hook is removed — the block imports `useSendAccountDeletionEmailMutation` directly from `@/generated/auth`. Only the messages catalog and `requires.json` are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (supplies `QueryClientProvider` + per-namespace `configure()`; React Query reaches this block transitively)
- `card`, `button`, `dialog`
- `use-step-up`
- `lib/auth-errors`

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; arrives transitively via `blocks-runtime`. `@constructive-io/data` is removed.

## DB procedures used by default hook

| Procedure | Signature | Returns | Notes |
|---|---|---|---|
| `constructive_auth_public.send_account_deletion_email` | `()` | `boolean` | Generates `account_deletion_token` in `constructive_encrypted`, enqueues email job. Schema `constructive_auth_public` → **namespace `auth`** → generated op `sendAccountDeletionEmail` → hook `useSendAccountDeletionEmailMutation`. |

The email contains a tokenized link to `/auth/delete-account?token=...&user_id=...`. Actual deletion happens in `auth-account-deletion-confirm-page` via `confirm_delete_account(user_id, token)`.

CSRF token is handled below the block — see `contracts/endpoint-contract.md` §3. Block does NOT pass `csrf_token`.

## Props

```ts
export type AccountDangerCardProps = {
  /** Called after send_account_deletion_email() succeeds. Consumer can show additional instructions. */
  onDeletionEmailSent?: () => void;
  onError?: (err: unknown) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  notifications?: boolean | { success?: boolean; error?: boolean };
  messages?: Partial<AccountDangerCardMessages>;
  /** Override the default hook. */
  onSubmit?: () => Promise<void>;
};
```

## Messages catalog

```ts
export type AccountDangerCardMessages = {
  title: string;
  description: string;
  deleteButton: string;
  confirmDialogTitle: string;
  confirmDialogDescription: string;
  confirmDialogBody: string;
  confirmButton: string;
  cancelButton: string;
  stepUpPrompt: string;
  emailSentTitle: string;
  emailSentDescription: string;
  stepUpCancelled: string;
  errors: {
    UNKNOWN_ERROR: string;
  };
};

export const defaultAccountDangerCardMessages: AccountDangerCardMessages = {
  title: 'Danger zone',
  description: 'Permanently delete your account and all associated data.',
  deleteButton: 'Delete account',
  confirmDialogTitle: 'Delete your account?',
  confirmDialogDescription: 'This action cannot be undone. All your data will be permanently deleted.',
  confirmDialogBody: 'We will send you a confirmation email. Click the link in that email to complete deletion.',
  confirmButton: 'Send deletion email',
  cancelButton: 'Cancel',
  stepUpPrompt: 'Confirm your identity before deleting your account.',
  emailSentTitle: 'Check your inbox',
  emailSentDescription: 'A confirmation email has been sent. Follow the link in the email to permanently delete your account.',
  stepUpCancelled: 'Step-up verification cancelled.',
  errors: {
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The block does **not** ship a `use-account-deletion.ts`. It imports the generated mutation hook from the host's `auth` SDK. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

- **Import:** `import { useSendAccountDeletionEmailMutation } from '@/generated/auth';` (`send_account_deletion_email` → `sendAccountDeletionEmail` → `useSendAccountDeletionEmailMutation`, per `endpoint-contract.md` §7.)
- **Instantiate:**
  ```ts
  const sendDeletionEmail = useSendAccountDeletionEmailMutation({
    selection: { fields: { sendAccountDeletionEmail: true } },
  });
  ```
- **Call + read payload:**
  ```ts
  await sendDeletionEmail.mutateAsync({}).then((d) => d.sendAccountDeletionEmail);
  ```
  `vars` is empty (`()` procedure) — **never** passes `csrf_token`.
- **Returns:** `{ mutateAsync, isPending, error }`.
- **Adapter override:** when `props.onSubmit` is provided, the block awaits it instead. Hybrid `isPending`: `onSubmit ? overridePending : sendDeletionEmail.isPending`.
- **Flow:**
  1. User clicks "Delete account" → opens confirmation dialog.
  2. User confirms in dialog → block calls `await stepUp({ tier: 'high' })`.
  3. Step-up resolves → fires `sendDeletionEmail.mutateAsync({})`.
  4. Success → closes dialog, shows inline success state with `messages.emailSentTitle` and `messages.emailSentDescription`.

### `account-danger-card.requires.json`

```json
{
  "namespace": "auth",
  "mutations": ["sendAccountDeletionEmail"],
  "queries": [],
  "models": []
}
```

## Callbacks

- `onDeletionEmailSent()` — fires after procedure succeeds.
- `onError(err)` — fires on error.
- `onMessage({ kind, key })`.

## Captcha

Not applicable — authenticated action.

## Step-up

- Required: yes, `tier: 'high'` → `useStepUp({ tier: 'high' })` maps to `type: 'mfa'` if user has TOTP enrolled, falls back to `type: 'password'`.
- Step-up fires AFTER confirmation dialog. The flow is: "Delete account" → confirm dialog → step-up → API call.
- If step-up is cancelled, the confirmation dialog re-opens (block returns to confirm state, not initial state). User can re-attempt.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Email sent | Inline message (no toast — render within the card/dialog) |
| Error → unknown | `messages.errors.UNKNOWN_ERROR` toast |

The success state should be an inline message within the card or dialog — not a toast — because the user needs to read the instructions carefully ("check your inbox").

## Accessibility

- "Delete account" button: `aria-label="Delete account permanently"` or equivalent descriptive label.
- Confirmation dialog: `role="alertdialog"`, `aria-labelledby` pointing to title.
- Step-up dialog (from `auth-step-up-dialog`) handles its own accessibility.
- Success state: `role="status"` on the inline message region.

## Notes / gotchas

- Two-step safety: the card itself just sends an email. The user must click the email link to trigger actual deletion (`confirm_delete_account`). This is intentional — prevents accidental deletion and requires physical email access.
- After `sendAccountDeletionEmail` succeeds, the card can render an inline success state instead of the delete button. If the user navigates away and returns, the button reappears (no persistent "email sent" state in the DB to query — unless the consumer stores this in local state).
- The step-up tier is `high` (Q29) — maps to MFA preferred, password fallback. This is appropriate because account deletion is the highest-severity irreversible action.
- Do NOT automatically sign the user out after sending the deletion email. They remain signed in until they confirm via the email link (or until the session expires).

## Implementation notes (for the author)

- Card layout: red/destructive border treatment (use `border-destructive` theme token).
- Warning icon alongside the section title.
- After email sent: replace button with a success callout (check icon, title, description, "Resend?" link if needed).
- Test states: initial, confirmation dialog open, step-up cancelled, email sent (success inline), API error, network error.
- Migration: no existing route to replace; new block.
