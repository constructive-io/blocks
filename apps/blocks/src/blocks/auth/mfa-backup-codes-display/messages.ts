/**
 * mfa-backup-codes-display — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy. This block has no error-code map because it is
 * purely display-only — errors from clipboard/download APIs are handled inline.
 * The `errors` object is minimal but present per block-contract pattern; it
 * includes PROCEDURE_NOT_FOUND as a sentinel for future wiring (the backend
 * `generate_backup_codes` proc is not yet deployed; this block's callers will
 * surface that error when it ships, and a host can override this key).
 */

export type MfaBackupCodesDisplayMessages = {
  title: string;
  description: string;
  warningText: string;
  copyAllButton: string;
  copiedButton: string;
  downloadButton: string;
  confirmCheckboxLabel: string;
  continueButton: string;
  errors: {
    /**
     * Sentinel: the `generate_backup_codes` backend procedure is not yet
     * deployed. Callers that wrap this block and call the future hook should
     * surface this message when the mutation fails with PROCEDURE_NOT_FOUND.
     */
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

export type MfaBackupCodesDisplayMessageOverrides = Partial<Omit<MfaBackupCodesDisplayMessages, 'errors'>> & {
  errors?: Partial<MfaBackupCodesDisplayMessages['errors']>;
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
  errors: {
    PROCEDURE_NOT_FOUND:
      'Backup code generation is not available yet. Contact your administrator.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};
