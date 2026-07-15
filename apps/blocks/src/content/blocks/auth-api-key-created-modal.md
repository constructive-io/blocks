# auth-api-key-created-modal

**Type:** `registry:block`
**Status:** `v1 (frontend ready)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-account.md`
**Master entry:** `blocks-master.md#auth-api-key-created-modal`

**Pairing:** No page block — this modal is opened by [[auth-account-api-keys-list]] immediately after [[auth-api-key-create-dialog]] succeeds. Not intended for standalone installation; part of the API-key creation sub-flow inside [[auth-account-settings-page]].

## Purpose

One-time-display modal showing the raw `cnc_live_sk_...` API key immediately after creation. The raw key is unrecoverable after this view — the DB stores only the SHA-256 hash. The modal enforces an explicit "I have saved this key" acknowledgement gate before allowing dismiss. Exists as a distinct block because the UX pattern (mandatory confirmation, large monospace display, copy button) deserves a self-contained, reusable spec.

## When to use

- Opened by `auth-account-api-keys-list` immediately after `auth-api-key-create-dialog` succeeds.
- Never opened directly by the consumer — always triggered by the list block passing the raw key.
- Not a fit when: the consumer wants to display the key inline (e.g. in a CI/CD setup wizard) — adapt the pattern but don't use this modal directly.

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/auth/api-key-created-modal.tsx` | `registry:component` |
| `lib/auth/messages/api-key-created-modal-messages.ts` | `registry:lib` |

## Registry dependencies

- `dialog`, `button`, `badge`

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)

No `@constructive-io/data` dependency — this block performs no mutations. It is purely a display + copy + acknowledgement component.

## DB procedures used by default hook

None. This is a **presentational block** — no generated hook, no `requires.json` (per `contracts/sdk-binding-contract.md` §7). The raw key is passed in as a prop by the parent. No `blocks-runtime` registry dependency required.

## Props

```ts
export type ApiKeyCreatedModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The raw API key (cnc_live_sk_...). Passed by auth-account-api-keys-list after create_api_key succeeds. */
  apiKey: string;
  /** Human-readable name of the key, shown in the modal title. */
  keyName: string;
  /** Optional expiry timestamp for display only. */
  expiresAt?: string | null;
  /** Called when user dismisses the modal after acknowledging they saved the key. */
  onDismissed?: () => void;
  messages?: Partial<ApiKeyCreatedModalMessages>;
};
```

## Messages catalog

```ts
export type ApiKeyCreatedModalMessages = {
  title: string;
  warningHeading: string;
  warningBody: string;
  keyLabel: string;
  expiresLabel: string;
  noExpiry: string;
  copyButton: string;
  copiedButton: string;
  acknowledgementLabel: string;
  dismissButton: string;
};

export const defaultApiKeyCreatedModalMessages: ApiKeyCreatedModalMessages = {
  title: 'API key created',
  warningHeading: 'Save this key now',
  warningBody: 'This is the only time you will see this key. It cannot be recovered once you close this window.',
  keyLabel: 'Your new API key',
  expiresLabel: 'Expires',
  noExpiry: 'Never',
  copyButton: 'Copy',
  copiedButton: 'Copied!',
  acknowledgementLabel: 'I have copied and saved this API key in a secure location.',
  dismissButton: 'Done',
};
```

## Default hook contract

No hook. State managed locally:

```ts
type LocalState = {
  hasCopied: boolean;
  hasAcknowledged: boolean;
};
```

- `hasCopied`: toggled to `true` after `navigator.clipboard.writeText(apiKey)` succeeds. Resets to `false` after 2 seconds.
- `hasAcknowledged`: controlled by the checkbox. The "Done" button is disabled until `hasAcknowledged === true`.

## Callbacks

- `onDismissed()` — fires after the user checks the acknowledgement box and clicks "Done". Parent can use this to refetch the key list.
- `onOpenChange(false)` — fires when dialog overlay is clicked or Escape is pressed. The modal should treat this the same as "Done" only if `hasAcknowledged === true`. If not acknowledged, the modal should NOT close on overlay click / Escape — it must be explicitly dismissed via the "Done" button.

## Captcha

Not applicable.

## Step-up

Not applicable.

## Notifications (default toasts)

None. This block manages its own inline state for copy feedback.

## Accessibility

- Dialog: `role="alertdialog"` (not `dialog`) — signals to screen readers that this requires user action before proceeding.
- `aria-modal="true"`.
- The key is rendered in a `<code>` element with `role="textbox"` (read-only), `aria-label="API key"`.
- Copy button: `aria-live="polite"` region announces "Copied!" after success.
- Acknowledgement checkbox: `id` + `htmlFor` pair; required (`aria-required="true"`).
- "Done" button: `aria-disabled="true"` when `hasAcknowledged === false` (not native `disabled` — native disabled removes from tab order).
- Escape key: blocked from closing the modal when `hasAcknowledged === false`. The block intercepts `keydown` on the dialog root.

## Notes / gotchas

- **The raw key is never logged, stored, or transmitted by this block.** It exists only in React state (passed as a prop). Once `onOpenChange(false)` fires, the consumer should clear the raw key from their state.
- **The modal MUST NOT close via overlay click or Escape if the user has not acknowledged.** This is the primary UX safety rail. Implement this by overriding the dialog's `onPointerDownOutside` and `onEscapeKeyDown` (Base UI / shadcn Dialog API) to call `e.preventDefault()` conditionally.
- `hasCopied` visual feedback: change button text to `messages.copiedButton` for 2 seconds, then revert. Use `useTimeout` or `setTimeout` + cleanup.
- The key display area should be visually prominent: large font, monospace, word-break, possibly with a subtle `bg-muted` background. Do not truncate — the full key must be copyable.
- Consumer must clear `apiKey` prop after `onDismissed` fires (or when `open` becomes `false`) to avoid re-displaying a stale key if the modal is ever accidentally reopened.

## Implementation notes (for the author)

- Render layout: warning banner (amber, icon) → key display area (monospace, copy button) → optional expiry line → separator → acknowledgement checkbox → "Done" button.
- The "Done" button should be `type="button"`, not `type="submit"`.
- Test states: key displayed, copy success, copy failure (clipboard API unavailable — show inline error), not acknowledged (Done disabled), acknowledged (Done enabled), dismissal.
- No Storybook story should hard-code a real key — use `cnc_live_sk_EXAMPLE00000000` as a placeholder.
- Migration: no existing route to replace; new block.
