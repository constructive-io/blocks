# auth-mfa-backup-codes-display

**Type:** `registry:block`
**Status:** `v1 (frontend ready)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-mfa.md`
**Master entry:** `blocks-master.md#auth-mfa-backup-codes-display`

**Pairing:** No page block — this is a display card used inside other blocks. Consumers of this block: `[[auth-mfa-totp-enroll]]` (step 3 after TOTP setup), `[[auth-mfa-backup-codes-regenerate]]` (after regenerating codes).

## Purpose

Read-only block that displays a set of backup codes passed in via props. Grid layout, copy-all button, download-as-txt, and a "I have saved these codes" confirmation gate before the consumer can dismiss or proceed. This block has no direct DB calls — it is purely a display surface. Its callers (`[[auth-mfa-totp-enroll]]`, `[[auth-mfa-backup-codes-regenerate]]`) are responsible for fetching codes via `generate_backup_codes()`.

## When to use

- As step 3 of `[[auth-mfa-totp-enroll]]` immediately after TOTP setup is confirmed.
- After `[[auth-mfa-backup-codes-regenerate]]` generates a new set of codes.
- Not a fit for repeated display of previously-generated codes — backup codes are write-once (display immediately after generation; they are not re-readable per the security model).

## Files shipped (per registry.json)

| File path (in consumer repo) | Type |
|---|---|
| `components/auth/mfa-backup-codes-display.tsx` | `registry:component` |
| `lib/auth/messages/mfa-backup-codes-display-messages.ts` | `registry:lib` |

> No data hook is shipped. This block is display-only — codes are passed in via the `codes` prop. No generated hook import, no `requires.json` manifest. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `button`, `card`, `badge`, `checkbox`

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)

## DB procedures used by default hook

- None. This block is display-only. Codes are passed in via the `codes` prop.

## Props

```ts
export type MfaBackupCodesDisplayProps = {
  /** The backup codes to display. Returned from generate_backup_codes(). */
  codes: string[];
  /**
   * When true, renders a "I have saved these codes" checkbox gate.
   * The onConfirm callback fires only after the user checks the box.
   * Default: true.
   */
  requireConfirmation?: boolean;
  /** Fires when user confirms they have saved the codes. */
  onConfirm?: () => void;
  messages?: Partial<MfaBackupCodesDisplayMessages>;
};
```

## Messages catalog

```ts
export type MfaBackupCodesDisplayMessages = {
  title: string;
  description: string;
  warningText: string;
  copyAllButton: string;
  copiedButton: string;
  downloadButton: string;
  confirmCheckboxLabel: string;
  continueButton: string;
};

export const defaultMfaBackupCodesDisplayMessages: MfaBackupCodesDisplayMessages = {
  title: 'Save your backup codes',
  description:
    'If you lose access to your authenticator app, you can use one of these codes to sign in. Each code can only be used once.',
  warningText: 'Store these codes somewhere safe. They will not be shown again.',
  copyAllButton: 'Copy all',
  copiedButton: 'Copied!',
  downloadButton: 'Download as .txt',
  confirmCheckboxLabel: 'I have saved my backup codes in a safe place.',
  continueButton: 'Continue',
};
```

## Layout

- Codes displayed in a 2-column grid of monospace `<code>` cells (single column on mobile).
- Each code is selectable text (do NOT prevent selection with CSS).
- "Copy all" copies all codes as newline-separated text to clipboard.
- "Download as .txt" triggers a client-side download of a plain text file with one code per line + a header identifying the account.
- "Continue" button disabled until `requireConfirmation` checkbox is checked (when `requireConfirmation=true`).

## Captcha

- Not applicable.

## Step-up

- Not applicable. This block is display-only.

## Accessibility

- Each code cell is in a `<code>` element within a `<li>` — rendered as a `<ul>` list for screen readers.
- Copy-all and download buttons have descriptive `aria-label` attributes.
- The confirmation checkbox is associated to its label via `htmlFor`.
- Continue button has `aria-disabled="true"` (not just visually disabled) until the checkbox is checked.

## Notes / gotchas

- **Codes are secrets:** Do NOT log them, do NOT include them in error reports or analytics events.
- **Write-once:** The block intentionally has no "go back" — codes are shown exactly once after generation.
- **Backup code format:** Depends on `generate_backup_codes()` implementation. Assume 8-character alphanumeric strings. The block renders whatever strings it receives without formatting assumptions.
- **Download filename:** Suggest `backup-codes.txt` with a header line like `# Backup codes for your account — keep these safe`.
- Cross-reference: `[[auth-mfa-totp-enroll]]` and `[[auth-mfa-backup-codes-regenerate]]` are the only callers.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/mfa-backup-codes-display/`
- Storybook states: default (8 codes), requireConfirmation=false, copied state (copy-all clicked), continue enabled after checkbox.
- No async operations in this block — it is purely presentational.
