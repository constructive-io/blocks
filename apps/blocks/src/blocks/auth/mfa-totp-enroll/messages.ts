/**
 * mfa-totp-enroll — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend error
 * CODE (UPPER_SNAKE_CASE) and is handed straight to `parseGraphQLError` as
 * `customMessages`, so a host localizes any code by overriding a single key.
 *
 * PROCEDURE_NOT_FOUND is included because all three ops (enableTotp,
 * confirmTotpSetup, generateBackupCodes) are backend-pending — they will surface
 * this code at runtime until the procedures are deployed.
 */

export type MfaTotpEnrollMessages = {
  // Step 1: Setup
  setupTitle: string;
  setupDescription: string;
  qrInstructions: string;
  manualEntryLabel: string;
  nextButton: string;
  // Step 2: Verify
  verifyTitle: string;
  verifyDescription: string;
  codeLabel: string;
  codePlaceholder: string;
  verifyButton: string;
  verifyingButton: string;
  backButton: string;
  // Step 3: Backup codes (delegated to auth-mfa-backup-codes-display)
  // Shared
  errors: {
    INVALID_TOTP: string;
    RATE_LIMITED: string;
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

/**
 * Override type: top-level is shallow-partial; `errors` is itself partial so a
 * host can localize a single error code without restating the map.
 */
export type MfaTotpEnrollMessageOverrides = Partial<Omit<MfaTotpEnrollMessages, 'errors'>> & {
  errors?: Partial<MfaTotpEnrollMessages['errors']>;
};

export const defaultMfaTotpEnrollMessages: MfaTotpEnrollMessages = {
  setupTitle: 'Set up two-factor authentication',
  setupDescription: 'Scan the QR code with your authenticator app, then enter the code it shows.',
  qrInstructions: 'Or enter this key manually into your authenticator app:',
  manualEntryLabel: 'Manual entry key',
  nextButton: 'Next',
  verifyTitle: 'Verify your authenticator',
  verifyDescription: 'Enter the 6-digit code from your authenticator app to confirm setup.',
  codeLabel: 'Verification code',
  codePlaceholder: '000000',
  verifyButton: 'Verify and enable',
  verifyingButton: 'Verifying…',
  backButton: 'Back',
  errors: {
    INVALID_TOTP: 'Invalid code. Check your authenticator app and try again.',
    RATE_LIMITED: 'Too many attempts. Please wait before trying again.',
    PROCEDURE_NOT_FOUND:
      'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};
